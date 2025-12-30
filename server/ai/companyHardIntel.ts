import { GoogleGenAI } from "@google/genai";
import type { Lead } from "@shared/schema";

function getAiClient(): GoogleGenAI {
  const directKey = process.env.GEMINI_API_KEY;
  if (directKey) {
    return new GoogleGenAI({ apiKey: directKey });
  }
  
  const replitKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  const replitBase = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  if (replitKey && replitBase) {
    return new GoogleGenAI({
      apiKey: replitKey,
      httpOptions: { apiVersion: "", baseUrl: replitBase },
    });
  }
  
  throw new Error("No Gemini API key configured");
}

export interface CompanyHardIntel {
  headquarters?: string;
  founded?: string;
  employeeCount?: string;
  revenue?: string;
  stockInfo?: string;
  fundingInfo?: string;
  keyExecutives: Array<{ name: string; title: string }>;
  competitors: string[];
  recentNews: string[];
  governmentContracts?: string;
  certifications: string[];
  techStack: string[];
  error?: string;
}

export async function gatherCompanyHardIntel(lead: Lead): Promise<CompanyHardIntel> {
  try {
    console.log(`[CompanyHardIntel] Gathering hard intel for ${lead.companyName}...`);

    const prompt = `Research the company "${lead.companyName}" thoroughly and provide factual, verifiable information.

Company Website: ${lead.companyWebsite || "Unknown"}
Industry: ${lead.companyIndustry || "Unknown"}

Find and return accurate data about this company. Return a JSON object with these exact keys:

{
  "headquarters": "City, State/Country where the company is headquartered",
  "founded": "Year the company was founded",
  "employeeCount": "Approximate number of employees (e.g., '50-100', '1000+')",
  "revenue": "Annual revenue if publicly available (e.g., '$10M-50M', '$1B+')",
  "stockInfo": "Stock ticker and exchange if public (e.g., 'NYSE: XYZ'), null if private",
  "fundingInfo": "Recent funding rounds or investor information if available",
  "keyExecutives": [{"name": "CEO Name", "title": "CEO"}, {"name": "CTO Name", "title": "CTO"}],
  "competitors": ["Competitor 1", "Competitor 2", "Competitor 3"],
  "recentNews": ["Recent news item 1", "Recent news item 2"],
  "governmentContracts": "Any known government contracts or certifications (e.g., 'GSA Schedule holder')",
  "certifications": ["ISO 9001", "SOC 2", etc.],
  "techStack": ["Technologies they use based on job postings, website, etc."]
}

Be accurate. If you cannot find specific information, use null for that field. Do not fabricate data.`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3,
        maxOutputTokens: 2000,
      },
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
    
    if (!text && response.text) {
      text = response.text;
    }
    
    console.log(`[CompanyHardIntel] Raw response length: ${text.length}`);
    
    // Clean up markdown code blocks if present
    let cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.log(`[CompanyHardIntel] Response text (first 500 chars): ${cleanedText.substring(0, 500)}`);
      throw new Error("No JSON found in response");
    }

    const intel = JSON.parse(jsonMatch[0]) as CompanyHardIntel;
    
    intel.keyExecutives = intel.keyExecutives || [];
    intel.competitors = intel.competitors || [];
    intel.recentNews = intel.recentNews || [];
    intel.certifications = intel.certifications || [];
    intel.techStack = intel.techStack || [];

    console.log(`[CompanyHardIntel] Completed hard intel for ${lead.companyName}`);
    
    return intel;
  } catch (error) {
    console.error("[CompanyHardIntel] Error:", error);
    return {
      keyExecutives: [],
      competitors: [],
      recentNews: [],
      certifications: [],
      techStack: [],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export function formatCompanyHardIntel(intel: CompanyHardIntel): string {
  if (intel.error && !intel.headquarters) {
    return `Company Research: ${intel.error}`;
  }

  const sections = [];
  
  if (intel.headquarters) {
    sections.push(`HQ: ${intel.headquarters}`);
  }
  
  if (intel.founded) {
    sections.push(`Founded: ${intel.founded}`);
  }
  
  if (intel.employeeCount) {
    sections.push(`Employees: ${intel.employeeCount}`);
  }
  
  if (intel.revenue) {
    sections.push(`Revenue: ${intel.revenue}`);
  }
  
  if (intel.stockInfo) {
    sections.push(`Stock: ${intel.stockInfo}`);
  }
  
  if (intel.fundingInfo) {
    sections.push(`Funding: ${intel.fundingInfo}`);
  }
  
  if (intel.governmentContracts) {
    sections.push(`Gov Contracts: ${intel.governmentContracts}`);
  }
  
  if (intel.keyExecutives.length > 0) {
    const execs = intel.keyExecutives.map(e => `${e.name} (${e.title})`).join(", ");
    sections.push(`Key Executives: ${execs}`);
  }
  
  if (intel.competitors.length > 0) {
    sections.push(`Competitors: ${intel.competitors.join(", ")}`);
  }
  
  if (intel.certifications.length > 0) {
    sections.push(`Certifications: ${intel.certifications.join(", ")}`);
  }
  
  if (intel.techStack.length > 0) {
    sections.push(`Tech Stack: ${intel.techStack.join(", ")}`);
  }
  
  if (intel.recentNews.length > 0) {
    sections.push(`Recent News:\n${intel.recentNews.map((n, i) => `  ${i + 1}. ${n}`).join("\n")}`);
  }
  
  return sections.join("\n");
}
