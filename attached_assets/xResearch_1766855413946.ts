import pRetry from "p-retry";
import type { Lead } from "@shared/schema";

interface XaiClient {
  chat: {
    completions: {
      create: (params: {
        model: string;
        messages: { role: string; content: string }[];
        response_format?: { type: string };
      }) => Promise<{
        choices: { message: { content: string } }[];
      }>;
    };
  };
}

function getXaiClient(): XaiClient {
  const apiKey = process.env.XAI_API;
  if (!apiKey) {
    throw new Error("Missing XAI_API secret. Please add your xAI API key.");
  }
  
  const baseURL = "https://api.x.ai/v1";
  
  return {
    chat: {
      completions: {
        create: async (params) => {
          const response = await fetch(`${baseURL}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify(params),
          });
          
          if (!response.ok) {
            const error = await response.text();
            throw new Error(`xAI API error: ${response.status} - ${error}`);
          }
          
          return response.json();
        },
      },
    },
  };
}

export interface XResearchResult {
  contactXHandle: string | null;
  contactRecentPosts: string[];
  contactTopics: string[];
  companyXHandle: string | null;
  companyRecentPosts: string[];
  industryTrends: string[];
  conversationStarters: string[];
  relevantHashtags: string[];
}

export async function researchLeadOnX(lead: Lead): Promise<XResearchResult | null> {
  const apiKey = process.env.XAI_API;
  if (!apiKey) {
    console.log("[XResearch] No XAI_API key configured, skipping X.com research");
    return null;
  }

  console.log(`[XResearch] Starting X.com research for ${lead.contactName} at ${lead.companyName}`);

  const research = async () => {
    const client = getXaiClient();

    const prompt = `You are Grok, with access to real-time X.com (Twitter) data. Research this sales lead and find their X/Twitter presence.

## Lead Information:
- Contact Name: ${lead.contactName}
- Contact Title: ${lead.contactTitle || "Not provided"}
- Contact Email: ${lead.contactEmail}
- Company Name: ${lead.companyName}
- Company Industry: ${lead.companyIndustry || "Not provided"}
- Company Website: ${lead.companyWebsite || "Not provided"}

## Research Task:
Search X.com for information about this contact and their company. Find:

1. **Contact's X Profile**:
   - Search for "${lead.contactName}" who works at "${lead.companyName}"
   - Find their X/Twitter handle if they have one
   - Look at their recent posts/tweets (last 30 days)
   - Identify topics they frequently discuss

2. **Company's X Presence**:
   - Find the company's official X account for "${lead.companyName}"
   - Recent announcements or posts
   - Company news shared on X

3. **Industry Context**:
   - Trending topics in their industry (${lead.companyIndustry || "engineering/manufacturing"})
   - Relevant hashtags they might follow
   - Conversation starters based on X activity

## Response Format (JSON only):
{
  "contactXHandle": "@username or null if not found",
  "contactRecentPosts": ["Summary of recent post 1", "Summary of recent post 2"] or [],
  "contactTopics": ["Topic they discuss 1", "Topic 2"] or [],
  "companyXHandle": "@company or null",
  "companyRecentPosts": ["Company announcement 1"] or [],
  "industryTrends": ["Trending topic 1", "Trend 2"] or [],
  "conversationStarters": ["Hey, I saw your post about X...", "I noticed your company recently..."],
  "relevantHashtags": ["#hashtag1", "#hashtag2"] or []
}

IMPORTANT:
- Only include real data you can find on X.com
- If you can't find someone, use null for handles and empty arrays for posts
- Keep post summaries brief (1-2 sentences each)
- Focus on professional/industry content, not personal posts
- Output ONLY valid JSON`;

    const response = await client.chat.completions.create({
      model: "grok-3-latest",
      messages: [
        { role: "system", content: "You are Grok, an AI with access to real-time X.com data. Search X.com to find information about people and companies. Return only JSON." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content || "";
    console.log(`[XResearch] Raw xAI response: ${text.substring(0, 500)}...`);

    let cleaned = text.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    const result: XResearchResult = JSON.parse(cleaned);
    console.log(`[XResearch] Parsed X.com research for ${lead.contactName}`);
    
    return result;
  };

  try {
    return await pRetry(research, {
      retries: 2,
      onFailedAttempt: (error: unknown) => {
        const err = error as { attemptNumber?: number; message?: string };
        console.log(`[XResearch] Attempt ${err.attemptNumber ?? "?"} failed: ${err.message ?? "Unknown error"}`);
      },
    });
  } catch (error) {
    console.error("[XResearch] All retries failed:", error);
    return null;
  }
}
