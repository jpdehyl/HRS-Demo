import { GoogleGenAI } from "@google/genai";
import pRetry from "p-retry";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export interface QualificationDraft {
  qualificationNotes: string;
  buySignals: string;
  budget: string;
  timeline: string;
  decisionMakers: string;
  source: "call_transcript" | "no_data";
  confidence: "high" | "medium" | "low";
}

export async function extractQualificationFromTranscript(
  transcript: string,
  leadName?: string,
  companyName?: string
): Promise<QualificationDraft> {
  if (!transcript || transcript.trim().length < 50) {
    return {
      qualificationNotes: "",
      buySignals: "",
      budget: "",
      timeline: "",
      decisionMakers: "",
      source: "no_data",
      confidence: "low"
    };
  }

  const extract = async () => {
    const prompt = `You are a sales intelligence analyst helping SDRs qualify leads for Account Executives.

Analyze the following sales call transcript and extract qualification information:

## Lead Info
- Contact: ${leadName || "Unknown"}
- Company: ${companyName || "Unknown"}

## Call Transcript:
${transcript}

## Task:
Extract the following information from the conversation. If something wasn't discussed or is unclear, leave that field empty. Be specific and quote relevant parts when possible.

1. **Qualification Notes**: Key discoveries from the conversation - what did you learn about their situation, needs, current solutions, and challenges?

2. **Buy Signals**: Pain points expressed, urgency indicators, competitive mentions, timing pressure, budget discussions, or any indication they're actively looking for a solution.

3. **Budget**: Any budget figures, ranges, or constraints mentioned. Include context like "approved budget", "looking to spend", "allocated for this project", etc.

4. **Timeline**: Any timing references - when they need a solution, project deadlines, evaluation periods, decision timeframes.

5. **Decision Makers**: Names, titles, and roles of people involved in the decision. Note who needs to approve, who influences the decision, and the buying committee structure.

## Response Format (JSON only):
{
  "qualificationNotes": "Key discoveries and situation analysis from the call...",
  "buySignals": "Pain points, urgency signals, competitive mentions...",
  "budget": "$X-$Y range or specific figures mentioned...",
  "timeline": "Q2 2025, by end of month, etc...",
  "decisionMakers": "Names, titles, and their roles in the decision...",
  "confidence": "high|medium|low"
}

Rules:
- Only include information that was actually discussed in the transcript
- Leave fields empty ("") if that topic wasn't covered
- Be concise but specific
- Set confidence to "high" if multiple data points support the extraction, "medium" if some info is available, "low" if sparse data`;

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
      throw new Error("Empty response from Gemini");
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from qualification response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      qualificationNotes: parsed.qualificationNotes || "",
      buySignals: parsed.buySignals || "",
      budget: parsed.budget || "",
      timeline: parsed.timeline || "",
      decisionMakers: parsed.decisionMakers || "",
      source: "call_transcript" as const,
      confidence: parsed.confidence || "medium"
    };
  };

  try {
    return await pRetry(extract, {
      retries: 2,
      onFailedAttempt: (error) => {
        console.log(`[QualificationExtractor] Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
      },
    });
  } catch (error) {
    console.error("[QualificationExtractor] Failed to extract qualification:", error);
    return {
      qualificationNotes: "",
      buySignals: "",
      budget: "",
      timeline: "",
      decisionMakers: "",
      source: "no_data",
      confidence: "low"
    };
  }
}
