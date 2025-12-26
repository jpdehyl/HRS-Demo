import { GoogleGenAI } from "@google/genai";
import pRetry from "p-retry";
import { getPersonaContent, getKnowledgebaseContent, getDailySummaryCriteria } from "../google/driveClient";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export interface AnalysisResult {
  managerSummary: string[];
  coachingMessage: string;
  strength: string;
  improvement: string;
}

export async function analyzeTranscript(
  transcript: string,
  sdrFirstName?: string,
  sdrGender?: string,
): Promise<AnalysisResult> {
  const [personaContent, knowledgeBase] = await Promise.all([
    getPersonaContent(),
    getKnowledgebaseContent(),
  ]);
  
  console.log(`[Analyze] Fetched persona (${personaContent.length} chars) and knowledge base (${knowledgeBase.length} chars)`);

  const analyze = async () => {
    const nameToUse = sdrFirstName || "there";
    
    let languageGuidance = "";
    if (sdrGender === "male") {
      languageGuidance = `Use casual masculine language like "dude", "man", "bro" naturally in your message.`;
    } else if (sdrGender === "female") {
      languageGuidance = `Use supportive language but AVOID masculine terms like "dude", "man", "bro". Instead use phrases like "you crushed it", "that's what I'm talking about", "keep pushing".`;
    } else {
      languageGuidance = `Use gender-neutral encouraging language. Avoid "dude", "man", "bro". Use phrases like "you crushed it", "that's what I'm talking about", "keep pushing".`;
    }

    const prompt = `${personaContent}

## GENDER-SPECIFIC LANGUAGE GUIDANCE:
${languageGuidance}

## Knowledge Base (Company Sales Guidelines & Evaluation Criteria):
${knowledgeBase}

## Sales Call Transcript:
${transcript}

## Task:
Analyze this call and provide TWO things:

1. **Manager Summary** (3-5 bullet points for internal tracking - NOT sent to SDR):
   - Key observations tied to knowledge base criteria
   - Specific metrics noted (talk ratio, objection handling, etc.)
   - Areas for manager follow-up

2. **Coaching Message for ${nameToUse}** (sent directly to the SDR):
   - Start with "Hey ${nameToUse}," 
   - First: Find a KEY MOMENT from the call where they did something great. Quote it. Celebrate it.
   - Second: Give ONE improvement area with a specific script example they can use next time
   - End with encouragement that connects to their hustle and success
   - Sign off with "— Your Lead Intel Coach"

## Response Format (JSON only - NO HTML TAGS):
{
  "managerSummary": ["bullet 1", "bullet 2", "bullet 3"],
  "coachingMessage": "Hey ${nameToUse},\\n\\n[Celebrate a specific moment - quote from the call]\\n\\n[One improvement with script example]\\n\\n[Encouraging close about their hustle]\\n\\n— Your Lead Intel Coach"
}

CRITICAL RULES:
- Output ONLY plain text in the coachingMessage - NO HTML tags
- Use \\n for line breaks
- Be SPECIFIC - reference actual quotes and moments from the transcript
- Sound warm, real, encouraging, connected`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let text = "";
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            text += part.text;
          }
        }
      }
    }

    if (!text) {
      throw new Error("Empty analysis received from Gemini");
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from analysis response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.managerSummary || !parsed.coachingMessage) {
      throw new Error("Analysis missing required fields");
    }

    const managerSummary = Array.isArray(parsed.managerSummary) 
      ? parsed.managerSummary 
      : [parsed.managerSummary];

    const result: AnalysisResult = {
      managerSummary,
      coachingMessage: parsed.coachingMessage,
      strength: JSON.stringify(managerSummary),
      improvement: parsed.coachingMessage,
    };

    return result;
  };

  return pRetry(analyze, {
    retries: 3,
    minTimeout: 1000,
    maxTimeout: 10000,
    onFailedAttempt: (error) => {
      console.log(
        `Analysis attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`,
      );
    },
  });
}

export interface DailySummaryAnalysis {
  keyMoments: string[];
  keyInsights: string[];
  overallPerformance: string;
}

export async function analyzeForDailySummary(
  transcript: string,
  sdrName: string,
  callAction: string,
): Promise<DailySummaryAnalysis> {
  const evaluationCriteria = await getDailySummaryCriteria();
  console.log(`[DailySummary] Fetched evaluation criteria (${evaluationCriteria.length} chars)`);

  const analyze = async () => {
    const prompt = `You are analyzing a sales call for a manager's daily summary. Use the evaluation criteria provided to assess the call.

## Evaluation Criteria (from company guidelines):
${evaluationCriteria}

## Sales Call Information:
- SDR Name: ${sdrName}
- Call Type: ${callAction}

## Transcript:
${transcript}

## Task:
Analyze this call based on the evaluation criteria and provide a summary for the manager. Focus on:
1. **Key Moments**: 2-3 specific moments from the call that stand out (positive or concerning)
2. **Key Insights**: 2-3 actionable insights based on the evaluation criteria
3. **Overall Performance**: One sentence summary of the SDR's performance on this call

## Response Format (JSON only):
{
  "keyMoments": [
    "Moment 1 - brief description of what happened and why it matters",
    "Moment 2 - brief description"
  ],
  "keyInsights": [
    "Insight 1 - actionable observation",
    "Insight 2 - actionable observation"
  ],
  "overallPerformance": "One sentence assessment of this call"
}

CRITICAL RULES:
- Be specific - reference actual quotes or behaviors from the transcript
- Tie observations to the evaluation criteria
- Keep it concise - managers need quick summaries
- Be objective - note both strengths and areas needing attention`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let text = "";
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            text += part.text;
          }
        }
      }
    }

    if (!text) {
      throw new Error("Empty daily summary analysis received from Gemini");
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from daily summary analysis");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.keyMoments || !parsed.keyInsights || !parsed.overallPerformance) {
      throw new Error("Daily summary analysis missing required fields");
    }

    return {
      keyMoments: Array.isArray(parsed.keyMoments) ? parsed.keyMoments : [parsed.keyMoments],
      keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [parsed.keyInsights],
      overallPerformance: parsed.overallPerformance,
    };
  };

  return pRetry(analyze, {
    retries: 3,
    minTimeout: 1000,
    maxTimeout: 10000,
    onFailedAttempt: (error) => {
      console.log(
        `Daily summary analysis attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`,
      );
    },
  });
}
