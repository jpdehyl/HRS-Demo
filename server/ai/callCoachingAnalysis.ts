import { callClaudeWithRetry, extractJsonFromResponse } from "./claudeClient";

export interface CoachingAnalysisResult {
  overallScore: number;
  strengths: string[];
  areasForImprovement: string[];
  keyMoments: Array<{
    timestamp?: string;
    description: string;
    type: "positive" | "negative" | "neutral";
  }>;
  recommendedActions: string[];
  callSummary: string;
  talkRatio: {
    rep: number;
    prospect: number;
  };
  questionQuality: {
    score: number;
    openEnded: number;
    closedEnded: number;
    notes: string;
  };
  objectionHandling: {
    score: number;
    objections: string[];
    responses: string[];
    notes: string;
  };
  nextSteps: string[];
}

export async function analyzeCallTranscript(
  transcript: string,
  leadContext?: {
    companyName?: string;
    contactName?: string;
    industry?: string;
    researchNotes?: string;
  }
): Promise<CoachingAnalysisResult> {
  const contextInfo = leadContext
    ? `
## Lead Context
- Company: ${leadContext.companyName || "Unknown"}
- Contact: ${leadContext.contactName || "Unknown"}
- Industry: ${leadContext.industry || "Unknown"}
${leadContext.researchNotes ? `- Research Notes: ${leadContext.researchNotes}` : ""}
`
    : "";

  const systemPrompt = `You are an expert B2B sales coach analyzing sales development representative (SDR) calls. 
Your role is to provide actionable coaching feedback based on call transcripts.
Focus on:
- Discovery question quality and technique
- Active listening and response quality
- Objection handling
- Value proposition delivery
- Call control and pacing
- Next step setting

Be specific, constructive, and actionable in your feedback.`;

  const prompt = `Analyze this sales call transcript and provide detailed coaching feedback.
${contextInfo}

## Call Transcript
${transcript}

---

Provide your analysis in the following JSON format:
{
  "overallScore": <number 1-100>,
  "callSummary": "<brief summary of the call and outcome>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "areasForImprovement": ["<area 1>", "<area 2>", ...],
  "keyMoments": [
    {
      "timestamp": "<if available>",
      "description": "<what happened>",
      "type": "positive|negative|neutral"
    }
  ],
  "recommendedActions": ["<specific action 1>", "<specific action 2>", ...],
  "talkRatio": {
    "rep": <percentage 0-100>,
    "prospect": <percentage 0-100>
  },
  "questionQuality": {
    "score": <number 1-10>,
    "openEnded": <count>,
    "closedEnded": <count>,
    "notes": "<analysis of questioning technique>"
  },
  "objectionHandling": {
    "score": <number 1-10>,
    "objections": ["<objection raised>"],
    "responses": ["<how rep handled it>"],
    "notes": "<analysis of objection handling>"
  },
  "nextSteps": ["<agreed next step>", ...]
}

Return ONLY the JSON object, no additional text.`;

  console.log("[CallCoaching] Analyzing transcript with Claude Opus 4.5...");
  const response = await callClaudeWithRetry({
    prompt,
    systemPrompt,
    maxTokens: 4000,
    temperature: 0.3,
  });

  const parsed = extractJsonFromResponse(response) as unknown as CoachingAnalysisResult;
  console.log("[CallCoaching] Analysis complete, score:", parsed.overallScore);

  return parsed;
}

export async function generateQuickCoachingTips(
  recentTranscript: string,
  context?: string
): Promise<string[]> {
  const systemPrompt = `You are a real-time sales coach. Provide 2-3 quick, actionable tips based on the conversation so far.`;

  const prompt = `Based on this conversation snippet, provide 2-3 quick coaching tips for the sales rep:

${context ? `Context: ${context}\n` : ""}
${recentTranscript}

Return tips as a JSON array of strings: ["tip 1", "tip 2", ...]`;

  const response = await callClaudeWithRetry({
    prompt,
    systemPrompt,
    maxTokens: 500,
    temperature: 0.5,
  });

  const parsed = extractJsonFromResponse(response);
  return Array.isArray(parsed) ? parsed : (parsed as { tips?: string[] }).tips || [];
}
