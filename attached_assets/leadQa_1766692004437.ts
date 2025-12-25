import { GoogleGenAI } from "@google/genai";
import pRetry from "p-retry";
import { getKnowledgebaseContent } from "../google/driveClient";
import { storage } from "../storage";
import type { Lead, ResearchPacket, LeadQaThread, InsertLeadQaThread } from "@shared/schema";

function getAiClient() {
  const apiKey =
    process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Please set GEMINI_API_KEY or configure AI integration.",
    );
  }
  return new GoogleGenAI({ apiKey });
}

export interface QaResult {
  answer: string;
  sources: string;
  confidence: "high" | "medium" | "low";
}

function parseResearchPacket(packet: ResearchPacket | undefined) {
  if (!packet) return null;
  
  const safeJsonParse = (str: string | null) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };
  
  return {
    companyIntel: safeJsonParse(packet.companyIntel),
    contactIntel: safeJsonParse(packet.contactIntel),
    painSignals: safeJsonParse(packet.painSignals),
    fitAnalysis: safeJsonParse(packet.fitAnalysis),
    talkTrack: packet.talkTrack,
    discoveryQuestions: safeJsonParse(packet.discoveryQuestions),
    objectionHandles: safeJsonParse(packet.objectionHandles),
  };
}

export async function answerLeadQuestion(
  lead: Lead,
  question: string,
  useWebSearch: boolean = false
): Promise<QaResult> {
  const researchPacket = await storage.getResearchPacket(lead.id);
  const parsedResearch = parseResearchPacket(researchPacket);
  
  const recentQa = await storage.getLeadQaThreads(lead.id, 5);
  const qaContext = recentQa.length > 0 
    ? recentQa.map(q => `Q: ${q.question}\nA: ${q.answer}`).reverse().join("\n\n")
    : "";

  let knowledgeBase = "";
  try {
    knowledgeBase = await getKnowledgebaseContent();
  } catch (e) {
    console.log("[LeadQA] Could not load knowledge base:", e);
  }

  const qa = async () => {
    const ai = getAiClient();

    const prompt = `You are an AI research assistant helping an SDR prepare for a sales call. Answer the question about this lead.

## Lead Information:
- Company Name: ${lead.companyName}
- Company Website: ${lead.companyWebsite || "Not provided"}
- Company Industry: ${lead.companyIndustry || "Not provided"}
- Company Size: ${lead.companySize || "Not provided"}
- Contact Name: ${lead.contactName}
- Contact Title: ${lead.contactTitle || "Not provided"}
- Contact Email: ${lead.contactEmail}
- Contact Phone: ${lead.contactPhone || "Not on file"}
- Contact LinkedIn: ${lead.contactLinkedIn || "Not provided"}

## Existing Research:
${parsedResearch ? JSON.stringify(parsedResearch, null, 2) : "No research available yet"}

## Prior Q&A in this session:
${qaContext || "No prior questions"}

## Hawk Ridge Knowledge Base (for context):
${knowledgeBase.substring(0, 8000)}

## User Question:
${question}

${useWebSearch ? `## IMPORTANT: The user has requested web search. Use your knowledge of public information about this company, industry news, common contact lookup methods, and general business intelligence to provide the most helpful answer. If you cannot find specific information, suggest how the SDR could find it (LinkedIn, company website, etc).` : ""}

## Response Requirements:
1. Answer the question directly and specifically
2. If you have the information in the lead data or research, use it
3. If you need to infer or speculate, clearly indicate this
4. For contact lookups (phone numbers, additional contacts), suggest practical methods to find them
5. Be concise but actionable

## Response Format (JSON only):
{
  "answer": "Your detailed answer to the question",
  "sources": "cached" | "web_search" | "inferred",
  "confidence": "high" | "medium" | "low"
}

IMPORTANT: Output ONLY valid JSON, no markdown or explanation.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
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
      throw new Error("Could not parse JSON from response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as QaResult;

    if (!parsed.answer) {
      throw new Error("Response missing answer field");
    }

    return parsed;
  };

  return pRetry(qa, {
    retries: 2,
    onFailedAttempt: (error) => {
      console.log(`[LeadQA] Attempt ${error.attemptNumber} failed. Retrying...`);
    },
  });
}

export async function askLeadQuestion(
  leadId: string,
  question: string,
  useWebSearch: boolean = false
): Promise<LeadQaThread> {
  const lead = await storage.getLead(leadId);
  if (!lead) {
    throw new Error("Lead not found");
  }

  console.log(`[LeadQA] Processing question for ${lead.companyName}: "${question.substring(0, 50)}..."`);
  
  const result = await answerLeadQuestion(lead, question, useWebSearch);
  
  const thread: InsertLeadQaThread = {
    leadId,
    question,
    answer: result.answer,
    sources: result.sources,
    webSearchUsed: useWebSearch,
  };
  
  const saved = await storage.createLeadQaThread(thread);
  console.log(`[LeadQA] Saved Q&A thread ${saved.id}`);
  
  return saved;
}
