import { GoogleGenAI } from "@google/genai";
import pRetry from "p-retry";

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Gemini API key");
  }
  return new GoogleGenAI({ apiKey });
}

export interface CompanyHardIntel {
  headquarters: string | null;
  address: string | null;
  phone: string | null;
  industry: string | null;
  subIndustry: string | null;
  employeeCount: string | null;
  yearFounded: string | null;
  isPubliclyTraded: boolean;
  stockTicker: string | null;
  stockExchange: string | null;
  stockPrice: string | null;
  marketCap: string | null;
  annualRevenue: string | null;
  recentContracts: { title: string; value: string | null; date: string | null; source: string | null }[];
  governmentBids: { title: string; agency: string | null; status: string | null; value: string | null }[];
  majorProjects: { name: string; description: string | null; date: string | null }[];
  keyExecutives: { name: string; title: string }[];
  recentNews: { headline: string; date: string | null; source: string | null; summary: string | null }[];
  competitors: string[];
  certifications: string[];
  sources: string[];
  researchedAt: string;
}

export async function gatherCompanyHardIntel(companyName: string, companyWebsite: string | null): Promise<CompanyHardIntel> {
  console.log(`[HardIntel] Gathering hard intel for ${companyName}`);
  
  const fetchHardIntel = async (): Promise<CompanyHardIntel> => {
    const ai = getAiClient();
    
    const prompt = `You are a business intelligence researcher. Find FACTUAL, VERIFIABLE information about this company.

## Company to Research:
- Company Name: ${companyName}
- Website: ${companyWebsite || "Unknown"}

## Research Requirements:
Search for and provide HARD FACTS ONLY - no speculation or assumptions. If you cannot find a piece of information, return null for that field.

### Required Information:
1. **Company Basics**:
   - Headquarters city/state/country
   - Full business address
   - Main phone number
   - Primary industry (e.g., "Manufacturing", "Technology", "Healthcare")
   - Sub-industry (e.g., "Precision Machining", "Server Hardware", "Medical Devices")
   - Approximate employee count
   - Year founded

2. **Financial/Stock Information** (if publicly traded):
   - Is company publicly traded? (true/false)
   - Stock ticker symbol
   - Stock exchange (NYSE, NASDAQ, etc.)
   - Current stock price (with date)
   - Market capitalization
   - Annual revenue (most recent available)

3. **Contracts & Projects**:
   - Recent major contracts won (last 2 years)
   - Government bids or contracts (if any)
   - Major projects announced or completed

4. **Leadership**:
   - Key executives (CEO, CTO, VP Engineering, etc.) - names and titles

5. **Recent News**:
   - 3-5 recent news items about the company (with dates and sources)

6. **Market Position**:
   - Main competitors
   - Industry certifications (ISO, AS9100, ITAR, etc.)

## Response Format (JSON only):
{
  "headquarters": "San Jose, CA, USA",
  "address": "123 Tech Blvd, San Jose, CA 95134",
  "phone": "+1-408-555-1234",
  "industry": "Technology",
  "subIndustry": "Server Hardware & Data Center Solutions",
  "employeeCount": "5,000-10,000",
  "yearFounded": "1993",
  "isPubliclyTraded": true,
  "stockTicker": "SMCI",
  "stockExchange": "NASDAQ",
  "stockPrice": "$45.23 (as of Dec 2024)",
  "marketCap": "$25.4B",
  "annualRevenue": "$14.9B (FY2024)",
  "recentContracts": [
    {"title": "AWS Data Center Supply Agreement", "value": "$500M", "date": "Oct 2024", "source": "Bloomberg"}
  ],
  "governmentBids": [
    {"title": "DOD Cloud Infrastructure", "agency": "Department of Defense", "status": "Awarded", "value": "$50M"}
  ],
  "majorProjects": [
    {"name": "AI Factory Expansion", "description": "Building new AI server manufacturing facility", "date": "Q4 2024"}
  ],
  "keyExecutives": [
    {"name": "John Smith", "title": "CEO"},
    {"name": "Jane Doe", "title": "CTO"}
  ],
  "recentNews": [
    {"headline": "Company announces new AI server line", "date": "Dec 2024", "source": "TechCrunch", "summary": "Launched new servers optimized for AI workloads"}
  ],
  "competitors": ["Dell", "HPE", "Lenovo"],
  "certifications": ["ISO 9001", "ISO 14001"],
  "sources": ["company website", "SEC filings", "Bloomberg", "LinkedIn"]
}

CRITICAL:
- Only include information you can verify from reliable sources
- Include source attribution where possible
- For private companies, stock fields should be null and isPubliclyTraded should be false
- Return null for any field you cannot verify
- Output ONLY valid JSON, no markdown or explanation`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
      }
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

    console.log(`[HardIntel] Raw response (first 500 chars): ${text.substring(0, 500)}`);

    if (!text) {
      throw new Error("Empty response from Gemini for hard intel");
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from hard intel response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`[HardIntel] Successfully parsed hard intel for ${companyName}`);

    return {
      headquarters: parsed.headquarters || null,
      address: parsed.address || null,
      phone: parsed.phone || null,
      industry: parsed.industry || null,
      subIndustry: parsed.subIndustry || null,
      employeeCount: parsed.employeeCount || null,
      yearFounded: parsed.yearFounded || null,
      isPubliclyTraded: parsed.isPubliclyTraded === true,
      stockTicker: parsed.stockTicker || null,
      stockExchange: parsed.stockExchange || null,
      stockPrice: parsed.stockPrice || null,
      marketCap: parsed.marketCap || null,
      annualRevenue: parsed.annualRevenue || null,
      recentContracts: Array.isArray(parsed.recentContracts) ? parsed.recentContracts : [],
      governmentBids: Array.isArray(parsed.governmentBids) ? parsed.governmentBids : [],
      majorProjects: Array.isArray(parsed.majorProjects) ? parsed.majorProjects : [],
      keyExecutives: Array.isArray(parsed.keyExecutives) ? parsed.keyExecutives : [],
      recentNews: Array.isArray(parsed.recentNews) ? parsed.recentNews : [],
      competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
      researchedAt: new Date().toISOString(),
    };
  };

  try {
    return await pRetry(fetchHardIntel, {
      retries: 2,
      onFailedAttempt: (error) => {
        console.log(`[HardIntel] Attempt ${error.attemptNumber} failed for ${companyName}`);
      }
    });
  } catch (error) {
    console.error(`[HardIntel] Failed to gather hard intel for ${companyName}:`, error);
    return {
      headquarters: null,
      address: null,
      phone: null,
      industry: null,
      subIndustry: null,
      employeeCount: null,
      yearFounded: null,
      isPubliclyTraded: false,
      stockTicker: null,
      stockExchange: null,
      stockPrice: null,
      marketCap: null,
      annualRevenue: null,
      recentContracts: [],
      governmentBids: [],
      majorProjects: [],
      keyExecutives: [],
      recentNews: [],
      competitors: [],
      certifications: [],
      sources: [],
      researchedAt: new Date().toISOString(),
    };
  }
}
