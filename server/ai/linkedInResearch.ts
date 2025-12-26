import type { Lead } from "@shared/schema";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export interface CareerPosition {
  title: string;
  company: string;
  duration: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  isCurrent: boolean;
}

export interface Education {
  school: string;
  degree?: string;
  field?: string;
  year?: string;
}

export interface LinkedInProfile {
  profileUrl: string | null;
  headline: string | null;
  summary: string | null;
  location: string | null;
  connections: string | null;
  currentPosition: CareerPosition | null;
  careerHistory: CareerPosition[];
  education: Education[];
  skills: string[];
  certifications: string[];
  professionalInterests: string[];
  careerProgression: string;
  decisionMakingStyle: string;
  likelyPriorities: string[];
  error?: string;
}

export async function researchContactLinkedIn(lead: Lead): Promise<LinkedInProfile> {
  const serpApiKey = process.env.SERP_API;
  
  console.log(`[LinkedInResearch] Starting research for ${lead.contactName} at ${lead.companyName}...`);

  let profileUrl: string | null = null;
  let searchSnippet: string | null = null;

  if (serpApiKey) {
    try {
      const searchQuery = `${lead.contactName} ${lead.companyName} site:linkedin.com/in`;
      const encodedQuery = encodeURIComponent(searchQuery);
      
      const response = await fetch(
        `https://serpapi.com/search.json?q=${encodedQuery}&api_key=${serpApiKey}&engine=google&num=5`
      );

      if (response.ok) {
        const data = await response.json() as {
          organic_results?: Array<{
            link?: string;
            title?: string;
            snippet?: string;
          }>;
        };
        
        const linkedInResult = data.organic_results?.find(
          (result) => result.link?.includes("linkedin.com/in/")
        );

        if (linkedInResult) {
          profileUrl = linkedInResult.link || null;
          searchSnippet = linkedInResult.snippet || null;
          console.log(`[LinkedInResearch] Found LinkedIn profile: ${profileUrl}`);
        }
      }
    } catch (error) {
      console.error("[LinkedInResearch] SerpAPI error:", error);
    }
  }

  try {
    const prompt = `You are an expert B2B sales researcher. Research this person's professional background THOROUGHLY:

CONTACT:
- Name: ${lead.contactName}
- Title: ${lead.contactTitle || "Unknown"}
- Company: ${lead.companyName}
- Industry: ${lead.companyIndustry || "Unknown"}
- Email: ${lead.contactEmail}
${profileUrl ? `- LinkedIn URL found: ${profileUrl}` : ""}
${searchSnippet ? `- Search snippet: ${searchSnippet}` : ""}

RESEARCH AND RETURN a detailed JSON object with these EXACT keys:

{
  "profileUrl": "${profileUrl || "LinkedIn URL if you can find it, or null"}",
  "headline": "Their professional headline/tagline",
  "summary": "2-3 sentence professional summary about them",
  "location": "City, State/Country",
  "connections": "Approximate network size like '500+' or '1000+'",
  
  "currentPosition": {
    "title": "Current job title",
    "company": "Current company",
    "duration": "Time in role like '2 years 3 months'",
    "startDate": "Month Year",
    "isCurrent": true,
    "description": "Brief role description if known"
  },
  
  "careerHistory": [
    {
      "title": "Previous title",
      "company": "Previous company",
      "duration": "Time in role",
      "startDate": "Start date",
      "endDate": "End date",
      "isCurrent": false,
      "description": "Role description"
    }
  ],
  
  "education": [
    {
      "school": "University name",
      "degree": "Degree type (BS, MBA, etc.)",
      "field": "Field of study",
      "year": "Graduation year"
    }
  ],
  
  "skills": ["CAD", "Product Development", "Manufacturing", "relevant technical skills"],
  
  "certifications": ["Any professional certifications"],
  
  "professionalInterests": [
    "Design efficiency",
    "Manufacturing optimization", 
    "Topics they care about professionally"
  ],
  
  "careerProgression": "Analysis of their career trajectory - are they rising? Lateral moves? Technical to management?",
  
  "decisionMakingStyle": "Based on their background, how do they likely make decisions? Data-driven? Relationship-based? Risk-averse? Innovative?",
  
  "likelyPriorities": [
    "What they probably care most about in their current role",
    "Their likely KPIs or success metrics",
    "What keeps them up at night"
  ]
}

Be thorough and specific. Use web search to find accurate information. Make intelligent inferences based on their role, company, and industry when specific data isn't available.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.5,
        maxOutputTokens: 3000,
      },
    });

    let text = "";
    if (response.text) {
      text = response.text;
    } else if (response.candidates?.[0]?.content?.parts) {
      const textPart = response.candidates[0].content.parts.find(
        (part: { text?: string }) => part.text
      );
      text = textPart?.text || "";
    }
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const raw = JSON.parse(jsonMatch[0]);
    
    const profile: LinkedInProfile = {
      profileUrl: raw.profileUrl || profileUrl,
      headline: raw.headline || null,
      summary: raw.summary || null,
      location: raw.location || null,
      connections: raw.connections || null,
      currentPosition: raw.currentPosition || null,
      careerHistory: Array.isArray(raw.careerHistory) ? raw.careerHistory : [],
      education: Array.isArray(raw.education) ? raw.education : [],
      skills: Array.isArray(raw.skills) ? raw.skills : [],
      certifications: Array.isArray(raw.certifications) ? raw.certifications : [],
      professionalInterests: Array.isArray(raw.professionalInterests) ? raw.professionalInterests : [],
      careerProgression: raw.careerProgression || "",
      decisionMakingStyle: raw.decisionMakingStyle || "",
      likelyPriorities: Array.isArray(raw.likelyPriorities) ? raw.likelyPriorities : []
    };

    console.log(`[LinkedInResearch] Completed research for ${lead.contactName}`);
    return profile;

  } catch (error) {
    console.error("[LinkedInResearch] Error:", error);
    return {
      profileUrl,
      headline: null,
      summary: null,
      location: null,
      connections: null,
      currentPosition: null,
      careerHistory: [],
      education: [],
      skills: [],
      certifications: [],
      professionalInterests: [],
      careerProgression: "",
      decisionMakingStyle: "",
      likelyPriorities: [],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export function formatLinkedInIntel(profile: LinkedInProfile): string {
  if (profile.error && !profile.profileUrl && profile.careerHistory.length === 0) {
    return `LinkedIn Research: ${profile.error}`;
  }

  const sections = [];
  
  if (profile.profileUrl) {
    sections.push(`Profile: ${profile.profileUrl}`);
  }
  
  if (profile.headline) {
    sections.push(`Headline: ${profile.headline}`);
  }
  
  if (profile.location) {
    sections.push(`Location: ${profile.location}`);
  }
  
  if (profile.connections) {
    sections.push(`Network: ${profile.connections} connections`);
  }
  
  if (profile.summary) {
    sections.push(`About: ${profile.summary}`);
  }
  
  if (profile.currentPosition) {
    const pos = profile.currentPosition;
    sections.push(`Current: ${pos.title} at ${pos.company} (${pos.duration})`);
  }
  
  if (profile.careerHistory.length > 0) {
    const history = profile.careerHistory.map(p => 
      `  - ${p.title} at ${p.company} (${p.duration})`
    ).join("\n");
    sections.push(`Career History:\n${history}`);
  }
  
  if (profile.education.length > 0) {
    const edu = profile.education.map(e => 
      `  - ${e.degree || ""} ${e.field || ""} - ${e.school}${e.year ? ` (${e.year})` : ""}`
    ).join("\n");
    sections.push(`Education:\n${edu}`);
  }
  
  if (profile.skills.length > 0) {
    sections.push(`Skills: ${profile.skills.join(", ")}`);
  }
  
  if (profile.professionalInterests.length > 0) {
    sections.push(`Interests: ${profile.professionalInterests.join(", ")}`);
  }
  
  if (profile.careerProgression) {
    sections.push(`Career Trajectory: ${profile.careerProgression}`);
  }
  
  if (profile.decisionMakingStyle) {
    sections.push(`Decision Style: ${profile.decisionMakingStyle}`);
  }
  
  return sections.join("\n\n");
}
