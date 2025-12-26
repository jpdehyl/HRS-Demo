import type { Lead } from "@shared/schema";

export interface XIntelResult {
  xHandle: string | null;
  profileUrl: string | null;
  bio: string | null;
  followerCount: string | null;
  recentPosts: Array<{
    content: string;
    date?: string;
    engagement?: string;
  }>;
  conversationStarters: string[];
  industryTrends: string[];
  hashtags: string[];
  engagementStyle: string;
  professionalTone: string;
  topicsOfInterest: string[];
  companyMentions: string[];
  recentNews: string[];
  error?: string;
}

export async function researchLeadOnX(lead: Lead): Promise<XIntelResult> {
  const xaiApiKey = process.env.XAI_API;
  
  if (!xaiApiKey) {
    console.log("[XResearch] XAI_API not configured, skipping X.com research");
    return getEmptyXIntel("XAI_API not configured");
  }

  try {
    console.log(`[XResearch] Researching ${lead.contactName} at ${lead.companyName} on X.com...`);
    
    const prompt = `You are an expert researcher with real-time access to X.com (Twitter). Research this person and their company THOROUGHLY:

CONTACT:
- Name: ${lead.contactName}
- Title: ${lead.contactTitle || "Unknown"}
- Company: ${lead.companyName}
- Industry: ${lead.companyIndustry || "Unknown"}
- Email domain: ${lead.contactEmail.split("@")[1]}

RESEARCH TASKS:
1. Find their personal X/Twitter handle and profile
2. Find their company's X/Twitter handle
3. Analyze their recent posts, retweets, and engagement
4. Look for industry discussions and trends they follow
5. Find any company news, announcements, product launches
6. Identify conversation starters based on their activity
7. Note relevant hashtags they use or follow

Return a JSON object with these EXACT keys:

{
  "xHandle": "@username or null if not found",
  "profileUrl": "https://x.com/username or null",
  "bio": "Their X bio if found",
  "followerCount": "approximate count like '2.5K' or null",
  "recentPosts": [
    {"content": "Summary of a notable recent post", "date": "approximate date", "engagement": "likes/retweets"},
    {"content": "Another notable post", "date": "date", "engagement": "engagement"}
  ],
  "conversationStarters": [
    "Personalized opener referencing their recent post about X",
    "Congrats on [specific achievement or announcement you found]",
    "I saw your thoughts on [topic] - interesting perspective on [specific point]"
  ],
  "industryTrends": [
    "Manufacturing automation trends they discuss",
    "Industry challenges they've mentioned",
    "Technology adoption topics they engage with"
  ],
  "hashtags": ["#relevanthashtag1", "#industry", "#technology"],
  "engagementStyle": "Are they a thought leader, casual poster, industry commentator, or lurker?",
  "professionalTone": "Formal, casual, technical, inspirational, etc.",
  "topicsOfInterest": ["Topic 1 they frequently discuss", "Topic 2", "Topic 3"],
  "companyMentions": ["Recent company news or mentions found on X", "Product launches", "Hiring announcements"],
  "recentNews": ["Any breaking news about the person or company", "Recent achievements", "Industry recognition"]
}

BE SPECIFIC. Reference actual posts, dates, and topics when possible. Make conversation starters that reference REAL things you found. If you can't find their profile, research the company's X presence instead.`;

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${xaiApiKey}`
      },
      body: JSON.stringify({
        model: "grok-3-latest",
        messages: [
          {
            role: "system",
            content: "You are Grok, an AI with real-time access to X.com posts and profiles. Provide accurate, current intelligence about people and companies on X. Be specific with dates, handles, and post content. If you find relevant information, cite it specifically."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[XResearch] xAI API error:", errorText);
      throw new Error(`xAI API error: ${response.status}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices?.[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in xAI response");
    }

    const raw = JSON.parse(jsonMatch[0]);
    
    const result: XIntelResult = {
      xHandle: raw.xHandle || null,
      profileUrl: raw.profileUrl || null,
      bio: raw.bio || null,
      followerCount: raw.followerCount || null,
      recentPosts: Array.isArray(raw.recentPosts) ? raw.recentPosts : [],
      conversationStarters: Array.isArray(raw.conversationStarters) ? raw.conversationStarters : [],
      industryTrends: Array.isArray(raw.industryTrends) ? raw.industryTrends : [],
      hashtags: Array.isArray(raw.hashtags) ? raw.hashtags : [],
      engagementStyle: raw.engagementStyle || "Unknown",
      professionalTone: raw.professionalTone || "Unknown",
      topicsOfInterest: Array.isArray(raw.topicsOfInterest) ? raw.topicsOfInterest : [],
      companyMentions: Array.isArray(raw.companyMentions) ? raw.companyMentions : [],
      recentNews: Array.isArray(raw.recentNews) ? raw.recentNews : []
    };
    
    console.log(`[XResearch] Completed X.com research for ${lead.contactName} - Handle: ${result.xHandle || "not found"}`);
    
    return result;
  } catch (error) {
    console.error("[XResearch] Error:", error);
    return getEmptyXIntel(error instanceof Error ? error.message : "Unknown error");
  }
}

function getEmptyXIntel(error: string): XIntelResult {
  return {
    xHandle: null,
    profileUrl: null,
    bio: null,
    followerCount: null,
    recentPosts: [],
    conversationStarters: [],
    industryTrends: [],
    hashtags: [],
    engagementStyle: "Unknown",
    professionalTone: "Unknown",
    topicsOfInterest: [],
    companyMentions: [],
    recentNews: [],
    error
  };
}

export function formatXIntel(intel: XIntelResult): string {
  if (intel.error && !intel.xHandle && intel.recentPosts.length === 0) {
    return `X.com Research: ${intel.error}`;
  }

  const sections = [];
  
  if (intel.xHandle) {
    sections.push(`Handle: @${intel.xHandle.replace("@", "")}`);
  }
  
  if (intel.bio) {
    sections.push(`Bio: ${intel.bio}`);
  }
  
  if (intel.followerCount) {
    sections.push(`Followers: ${intel.followerCount}`);
  }
  
  sections.push(`Style: ${intel.engagementStyle}`);
  sections.push(`Tone: ${intel.professionalTone}`);
  
  if (intel.topicsOfInterest.length > 0) {
    sections.push(`Topics: ${intel.topicsOfInterest.join(", ")}`);
  }
  
  if (intel.conversationStarters.length > 0) {
    sections.push(`Conversation Starters:\n${intel.conversationStarters.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`);
  }
  
  if (intel.industryTrends.length > 0) {
    sections.push(`Industry Trends:\n${intel.industryTrends.map((t, i) => `  - ${t}`).join("\n")}`);
  }
  
  if (intel.hashtags.length > 0) {
    sections.push(`Hashtags: ${intel.hashtags.join(" ")}`);
  }
  
  if (intel.recentPosts.length > 0) {
    sections.push(`Recent Posts:\n${intel.recentPosts.map((p, i) => `  ${i + 1}. ${p.content}${p.date ? ` (${p.date})` : ""}`).join("\n")}`);
  }
  
  if (intel.companyMentions.length > 0) {
    sections.push(`Company News:\n${intel.companyMentions.map(m => `  - ${m}`).join("\n")}`);
  }
  
  return sections.join("\n\n");
}
