import { GoogleGenAI } from "@google/genai";
import type { CallSession, Lead } from '@shared/schema';
import { storage } from '../storage.js';

/**
 * Get configured AI client (Gemini)
 */
function getAiClient() {
  const directKey = process.env.GEMINI_API_KEY;
  if (directKey) {
    return new GoogleGenAI({ apiKey: directKey });
  }

  const replitKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  const replitBase = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  if (replitKey && replitBase) {
    return new GoogleGenAI({
      apiKey: replitKey,
      httpOptions: { baseUrl: replitBase }
    });
  }

  throw new Error("No Gemini API key configured");
}

export interface ExtractedBANT {
  budget: string | null;
  timeline: string | null;
  decisionMakers: string | null;
  needs: string[];
  confidence: {
    budget: 'high' | 'medium' | 'low' | 'none';
    timeline: 'high' | 'medium' | 'low' | 'none';
    decisionMakers: 'high' | 'medium' | 'low' | 'none';
  };
  extractionSummary: string;
}

/**
 * Extract BANT (Budget, Authority, Need, Timeline) data from call transcript
 * using AI analysis. Auto-populates lead qualification fields.
 */
export async function extractBANTFromTranscript(
  callSessionId: string
): Promise<ExtractedBANT> {
  // Get the call session
  const callSession = await storage.getCallSession(callSessionId);
  if (!callSession) {
    throw new Error('Call session not found');
  }

  const transcript = callSession.transcriptText;
  if (!transcript || transcript.trim().length < 100) {
    return {
      budget: null,
      timeline: null,
      decisionMakers: null,
      needs: [],
      confidence: {
        budget: 'none',
        timeline: 'none',
        decisionMakers: 'none',
      },
      extractionSummary: 'Transcript too short for BANT extraction (minimum 100 characters required)',
    };
  }

  // Get the associated lead if available
  let leadContext = '';
  if (callSession.leadId) {
    const lead = await storage.getLead(callSession.leadId);
    if (lead) {
      leadContext = `
Lead Context:
Company: ${lead.companyName}
Contact: ${lead.contactName}
Title: ${lead.contactTitle || 'Unknown'}
Industry: ${lead.companyIndustry || 'Unknown'}
Company Size: ${lead.companySize || 'Unknown'}
`;
    }
  }

  try {
    const ai = getAiClient();

    const prompt = `You are analyzing a sales call transcript to extract BANT qualification data.

${leadContext}

Call Transcript:
${transcript}

## Task: Extract BANT Information

Analyze the transcript and extract:

1. **Budget (B)**:
   - Mentioned budget range or approval amount
   - Financial constraints or spending authority
   - If not mentioned, return "Not discussed"

2. **Authority (A) - Decision Makers**:
   - Who makes the purchasing decision?
   - Names and roles mentioned
   - Committee or individual buyer?
   - If not clear, return "Not discussed"

3. **Need (N)**:
   - What problems are they trying to solve?
   - Pain points mentioned
   - Requirements discussed
   - Return as array of specific needs

4. **Timeline (T)**:
   - When do they need a solution?
   - Any deadlines or urgency mentioned?
   - If not discussed, return "Not discussed"

## Confidence Assessment
For each field (budget, timeline, decisionMakers), assess confidence:
- "high": Explicitly stated with details
- "medium": Implied or partially discussed
- "low": Vague mention or unclear
- "none": Not discussed

## Response Format (JSON only):
{
  "budget": "string or null",
  "timeline": "string or null",
  "decisionMakers": "string or null",
  "needs": ["need1", "need2", "need3"],
  "confidence": {
    "budget": "high|medium|low|none",
    "timeline": "high|medium|low|none",
    "decisionMakers": "high|medium|low|none"
  },
  "extractionSummary": "1-2 sentence summary of what BANT data was found"
}

IMPORTANT: Return ONLY the JSON object. No markdown, no code blocks, no explanations.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const candidate = response.candidates?.[0];
    const textPart = candidate?.content?.parts?.find(
      (part: { text?: string }) => part.text
    );
    const responseText = textPart?.text?.trim() || '';

    // Remove markdown code blocks if present
    const cleanedText = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    const extracted: ExtractedBANT = JSON.parse(cleanedText);

    // Auto-update lead if available and high confidence data was extracted
    if (callSession.leadId) {
      const updates: Partial<Lead> = {};

      if (extracted.budget && extracted.confidence.budget !== 'none') {
        updates.budget = extracted.budget;
      }
      if (extracted.timeline && extracted.confidence.timeline !== 'none') {
        updates.timeline = extracted.timeline;
      }
      if (extracted.decisionMakers && extracted.confidence.decisionMakers !== 'none') {
        updates.decisionMakers = extracted.decisionMakers;
      }

      // Only update if we have at least one field to update
      if (Object.keys(updates).length > 0) {
        await storage.updateLead(callSession.leadId, updates);
        console.log(`[BANT] Auto-updated lead ${callSession.leadId} with extracted BANT data`);
      }
    }

    return extracted;
  } catch (error) {
    console.error('[BANT] Extraction failed:', error);
    throw new Error(`Failed to extract BANT: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
