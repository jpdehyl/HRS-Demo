import { GoogleGenAI } from "@google/genai";
import pRetry from "p-retry";
import { getKnowledgebaseContent, getLeadScoringParameters } from "../google/driveClient";
import type { Lead, InsertResearchPacket } from "@shared/schema";
import { gatherCompanyIntel, formatScrapedContentForPrompt, researchContactLinkedIn, extractPhoneFromScrapedContent, type ScrapedIntel, type ContactLinkedInData } from "./websiteScraper";
import { gatherCompanyHardIntel, type CompanyHardIntel } from "./companyHardIntel";

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

export interface ResearchResult {
  companySummary: string;
  companyPainPoints: string[];
  companyTechStack: string[];
  companyRecentNews: string[];
  companyWebsite: string | null;
  contactBackground: string;
  contactCareerHistory: string[];
  contactInterests: string[];
  contactLinkedIn: string | null;
  contactTitle: string | null;
  fitScore: number;
  fitRationale: string;
  productMatches: string[];
  talkTrackOpener: string;
  talkTrackQuestions: string[];
  talkTrackObjectionHandles: { objection: string; response: string }[];
}

export interface ResearchResultWithSources extends ResearchResult {
  sources: string[];
  scrapedIntel?: ScrapedIntel;
  contactLinkedInData?: ContactLinkedInData | null;
  companyHardIntel?: CompanyHardIntel | null;
  extractedPhone?: string | null;
}

export async function researchLead(lead: Lead): Promise<ResearchResultWithSources> {
  // Gather company intel, knowledge base, contact LinkedIn, hard intel, AND scoring params in parallel
  const [knowledgeBase, scrapedIntel, contactLinkedInData, companyHardIntel, scoringParams] = await Promise.all([
    getKnowledgebaseContent(),
    gatherCompanyIntel(lead.companyName, lead.companyWebsite),
    // Only search for LinkedIn if we don't already have it
    lead.contactLinkedIn ? Promise.resolve(null) : researchContactLinkedIn(lead.contactName, lead.companyName, lead.contactEmail),
    // Gather hard company intel (location, stock, contracts, news)
    gatherCompanyHardIntel(lead.companyName, lead.companyWebsite),
    // Fetch lead scoring parameters from Google Doc
    getLeadScoringParameters()
  ]);
  
  console.log(`[LeadResearch] Gathered hard intel: HQ=${companyHardIntel.headquarters}, public=${companyHardIntel.isPubliclyTraded}, news=${companyHardIntel.recentNews.length}`);
  
  console.log(`[LeadResearch] Loaded knowledge base (${knowledgeBase.length} chars)`);
  console.log(`[LeadResearch] Loaded scoring parameters (${scoringParams.length} chars)`);
  console.log(`[LeadResearch] Scraped intel sources: ${scrapedIntel.sources.join(", ") || "none"}`);
  if (contactLinkedInData?.linkedInUrl) {
    console.log(`[LeadResearch] Found contact LinkedIn: ${contactLinkedInData.linkedInUrl}`);
    scrapedIntel.sources.push(`Contact LinkedIn: ${contactLinkedInData.linkedInUrl}`);
  }
  
  const scrapedContent = formatScrapedContentForPrompt(scrapedIntel);

  const research = async () => {
    const ai = getAiClient();

    const prompt = `You are a lead research assistant for Hawk Ridge, a company that sells engineering software solutions (SolidWorks, CAD/CAM, PDM, simulation, 3D printing, and related services).

## Lead Information:
- Company Name: ${lead.companyName}
- Company Website: ${lead.companyWebsite || "Not provided"}
- Company Industry: ${lead.companyIndustry || "Not provided"}
- Company Size: ${lead.companySize || "Not provided"}
- Contact Name: ${lead.contactName}
- Contact Title: ${lead.contactTitle || "Not provided"}
- Contact Email: ${lead.contactEmail}
- Contact LinkedIn: ${lead.contactLinkedIn || "Not provided"}

${scrapedContent}

## Hawk Ridge Knowledge Base (Products & Services):
${knowledgeBase.substring(0, 12000)}

## Lead Scoring Parameters (USE THESE CRITERIA):
${scoringParams}

## Research Task:
Analyze the SCRAPED WEBSITE CONTENT and LINKEDIN COMPANY DATA above to provide comprehensive intelligence for an SDR pre-call preparation.

**CRITICAL: Base your company summary on the ACTUAL SCRAPED CONTENT above. Do NOT say "Unable to find information" if website or LinkedIn data is provided - USE THAT DATA.**

1. **Company Research** (USE THE SCRAPED CONTENT):
   - Company summary based on their actual website/LinkedIn description
   - Pain points based on their specific industry and what they actually do
   - Technology stack - infer from their services/products what CAD/engineering tools they might use
   - Recent news if mentioned on their site
   - Company website URL

2. **Contact Research**:
   - Background summary based on their title and the company's actual business
   - Likely career history trajectory for someone in their role
   - Professional interests relevant to our solutions
   - **Search for this person's LinkedIn profile** - Look for "${lead.contactName}" at "${lead.companyName}" on LinkedIn
   - Their job title

3. **Portfolio Fit Score** (0-100):
   - Score based on the Lead Scoring Parameters provided above
   - Apply the scoring criteria exactly as defined in the Lead Scoring Parameters document
   - Explain the rationale with specific references to what they do and how it matches the scoring criteria
   - List specific products/services that would be relevant based on the criteria

4. **Personalized Talk Track**:
   - A compelling opening line that references something SPECIFIC from their website/LinkedIn
   - 3-5 discovery questions tailored to their ACTUAL business
   - 2-3 common objections with suggested responses

## Response Format (JSON only):
{
  "companySummary": "Summary based on ACTUAL scraped website/LinkedIn content",
  "companyPainPoints": ["pain point based on their actual industry/services"],
  "companyTechStack": ["inferred tools based on what they actually do"],
  "companyRecentNews": ["news if found"] or [],
  "companyWebsite": "https://company.com" or null,
  "contactBackground": "Summary based on their role at this specific company",
  "contactCareerHistory": ["career stage 1", "career stage 2"],
  "contactInterests": ["interest based on their actual business"],
  "contactLinkedIn": "https://linkedin.com/in/username" or null,
  "contactTitle": "Their job title" or null,
  "fitScore": 75,
  "fitRationale": "Why this score - connect to their ACTUAL business and specific Hawk Ridge offerings",
  "productMatches": ["SolidWorks Premium", "PDM Professional"],
  "talkTrackOpener": "Hi [Name], I saw on your website that you [SPECIFIC THING]...",
  "talkTrackQuestions": ["Question about their ACTUAL business?"],
  "talkTrackObjectionHandles": [
    {"objection": "We already have CAD software", "response": "I understand..."},
    {"objection": "We don't have budget", "response": "That's fair..."}
  ]
}

IMPORTANT:
- USE THE SCRAPED CONTENT - do not ignore it or say you couldn't find information if data is provided
- Be specific and reference actual details from their website/LinkedIn
- Connect everything back to Hawk Ridge's actual offerings
- For LinkedIn profiles, search thoroughly
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

    if (!text) {
      throw new Error("Empty research received from Gemini");
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from research response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as ResearchResult;

    if (!parsed.companySummary || parsed.fitScore === undefined) {
      throw new Error("Research missing required fields");
    }

    // Override with the contact LinkedIn URL if we found it
    if (contactLinkedInData?.linkedInUrl && !parsed.contactLinkedIn) {
      parsed.contactLinkedIn = contactLinkedInData.linkedInUrl;
    }
    if (contactLinkedInData?.currentTitle && !parsed.contactTitle) {
      parsed.contactTitle = contactLinkedInData.currentTitle;
    }
    
    // Extract phone from scraped website content (especially contact page)
    const extractedPhone = extractPhoneFromScrapedContent(scrapedIntel);
    if (extractedPhone) {
      console.log(`[LeadResearch] Extracted phone from website: ${extractedPhone}`);
    }
    
    return {
      ...parsed,
      sources: scrapedIntel.sources,
      scrapedIntel,
      contactLinkedInData,
      companyHardIntel,
      extractedPhone
    };
  };

  return pRetry(research, {
    retries: 3,
    onFailedAttempt: (error) => {
      console.log(
        `[LeadResearch] Attempt ${error.attemptNumber} failed. Retrying...`,
      );
    },
  });
}

export function researchResultToPacket(
  leadId: string,
  result: ResearchResultWithSources
): InsertResearchPacket {
  return {
    leadId,
    companyIntel: JSON.stringify({
      summary: result.companySummary,
      techStack: result.companyTechStack,
      recentNews: result.companyRecentNews,
    }),
    contactIntel: JSON.stringify({
      background: result.contactBackground,
      careerHistory: result.contactCareerHistory,
      interests: result.contactInterests,
    }),
    painSignals: JSON.stringify(result.companyPainPoints),
    competitorPresence: null,
    fitAnalysis: JSON.stringify({
      score: result.fitScore,
      rationale: result.fitRationale,
      productMatches: result.productMatches,
    }),
    talkTrack: result.talkTrackOpener,
    discoveryQuestions: JSON.stringify(result.talkTrackQuestions),
    objectionHandles: JSON.stringify(result.talkTrackObjectionHandles),
    companyHardIntel: result.companyHardIntel ? JSON.stringify(result.companyHardIntel) : null,
    sources: result.sources.length > 0 ? JSON.stringify(result.sources) : null,
    verificationStatus: result.sources.length > 0 ? "verified" : "unverified",
  };
}

// Web-scraped contact enrichment data
export interface ContactEnrichment {
  phone: string | null;
  linkedIn: string | null;
  email: string | null;
  title: string | null;
  location: string | null;
  companyWebsite: string | null;
  sources: string[];
}

/**
 * Web scraping enrichment - searches the web for contact information
 * Uses Gemini's web grounding to find and extract data from public sources like RocketReach, etc.
 */
export async function webEnrichContact(lead: Lead): Promise<ContactEnrichment> {
  console.log(`[WebEnrich] Starting web enrichment for ${lead.contactName} at ${lead.companyName}`);
  
  const ai = getAiClient();
  
  const searchQuery = `${lead.contactName} ${lead.companyName} contact information phone email LinkedIn`;
  
  const prompt = `You are a research assistant helping to find contact information for a sales lead.

## Lead to Research:
- Contact Name: ${lead.contactName}
- Company: ${lead.companyName}
- Known Email: ${lead.contactEmail || "Not provided"}
- Known Phone: ${lead.contactPhone || "Not provided"}
- Known LinkedIn: ${lead.contactLinkedIn || "Not provided"}

## Search Query to Use:
"${searchQuery}"

## Research Task:
Search the web for this person's contact information. Look for:
1. **Phone number** - Direct phone or mobile number
2. **LinkedIn URL** - Their LinkedIn profile URL (format: https://linkedin.com/in/username)
3. **Email** - If different from what we have
4. **Job Title** - Their current title at the company
5. **Location** - City/state where they're based
6. **Company Website** - The company's website URL

Check these types of sources:
- RocketReach profiles (rocketreach.co)
- ZoomInfo profiles
- Company websites and team pages
- Press releases or news articles
- Business directories
- Professional networking sites

## Response Format (JSON only):
{
  "phone": "+1-555-123-4567" or null,
  "linkedIn": "https://linkedin.com/in/username" or null,
  "email": "email@company.com" or null,
  "title": "Senior Engineer" or null,
  "location": "San Francisco, CA" or null,
  "companyWebsite": "https://company.com" or null,
  "sources": ["rocketreach.co", "company website"]
}

IMPORTANT:
- Only include information you actually find - use null if not found
- For phone numbers, include the full number with area code
- For LinkedIn, only provide verified profile URLs
- List the sources where you found the information
- Do NOT make up or guess information
- Output ONLY valid JSON, no markdown or explanation`;

  try {
    console.log(`[WebEnrich] Calling Gemini with web grounding...`);
    
    // Use Gemini with web grounding to search for contact information
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    console.log(`[WebEnrich] Got response from Gemini`);

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
      // Log grounding metadata if available
      if (candidate.groundingMetadata) {
        console.log(`[WebEnrich] Grounding sources used:`, JSON.stringify(candidate.groundingMetadata.webSearchQueries || []));
      }
    }

    if (!text) {
      console.log("[WebEnrich] No text response from web search - response may have failed");
      console.log("[WebEnrich] Raw response:", JSON.stringify(response, null, 2).slice(0, 500));
      return { phone: null, linkedIn: null, email: null, title: null, location: null, companyWebsite: null, sources: [] };
    }

    console.log(`[WebEnrich] Response text (first 300 chars):`, text.slice(0, 300));

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log("[WebEnrich] Could not parse JSON from response. Full text:", text);
      return { phone: null, linkedIn: null, email: null, title: null, location: null, companyWebsite: null, sources: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]) as ContactEnrichment;
    console.log(`[WebEnrich] Successfully parsed data for ${lead.contactName}:`, JSON.stringify(parsed));
    return parsed;
  } catch (error) {
    console.error("[WebEnrich] Error during web enrichment:", error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error("[WebEnrich] Error name:", error.name);
      console.error("[WebEnrich] Error message:", error.message);
      console.error("[WebEnrich] Error stack:", error.stack);
    }
    return { phone: null, linkedIn: null, email: null, title: null, location: null, companyWebsite: null, sources: [] };
  }
}

// LinkedIn Intel - Deep research result from LinkedIn profile
export interface LinkedInIntel {
  currentPosition: string;
  currentCompany: string;
  headline: string;
  tenure: string; // How long at current company
  previousPositions: { title: string; company: string; duration: string }[];
  skills: string[];
  summary: string;
  education: string[];
  researchedAt: string;
}

/**
 * Deep LinkedIn research - triggered when user clicks LinkedIn button
 * Uses SerpAPI to get LinkedIn search data and Gemini to parse profile info
 */
export async function deepLinkedInResearch(lead: Lead): Promise<LinkedInIntel> {
  if (!lead.contactLinkedIn) {
    throw new Error("No LinkedIn URL provided for this lead");
  }

  const research = async () => {
    const { searchLinkedInProfile } = await import("./serpApiClient");
    
    // First, use SerpAPI to search for the LinkedIn profile and get title from search results
    console.log(`[LinkedInResearch] Using SerpAPI to search for ${lead.contactName} at ${lead.companyName}`);
    const serpResult = await searchLinkedInProfile(lead.contactName, lead.companyName, lead.contactEmail ?? undefined);
    
    let serpTitle: string | null = null;
    let serpSnippet: string | null = null;
    
    if (serpResult.title) {
      // LinkedIn search result titles are usually in format: "Name - Title - Company | LinkedIn"
      // Parse out the title
      const titleParts = serpResult.title.split(' - ');
      if (titleParts.length >= 2) {
        // The second part is usually the job title
        serpTitle = titleParts[1].replace(/\s*\|.*$/, '').trim();
        console.log(`[LinkedInResearch] SerpAPI found title: "${serpTitle}"`);
      }
      serpSnippet = serpResult.snippet;
    }
    
    const ai = getAiClient();

    const prompt = `You are researching a sales lead's LinkedIn profile to prepare for a sales call.

## LinkedIn Profile to Research:
URL: ${lead.contactLinkedIn}
Contact Name: ${lead.contactName}
Company: ${lead.companyName}
${serpTitle ? `\n## VERIFIED TITLE FROM LINKEDIN SEARCH:\n"${serpTitle}"\nUse this as the currentPosition - it came directly from LinkedIn search results.` : ''}
${serpSnippet ? `\n## ADDITIONAL CONTEXT FROM LINKEDIN:\n${serpSnippet}` : ''}

## Research Task:
Using the LinkedIn profile URL above, research this person's professional background. Look up their public LinkedIn profile and extract:

1. **Current Position**: Their current job title${serpTitle ? ` (USE "${serpTitle}" - this is verified from LinkedIn)` : ''}
2. **Current Company**: The company they work for now
3. **Headline**: Their LinkedIn headline/tagline
4. **Tenure**: How long they've been at their current company (e.g., "2 years 3 months")
5. **Previous Positions**: Their last 3 previous jobs with company, title, and duration
6. **Skills**: Key skills listed on their profile relevant to engineering/manufacturing/design
7. **Summary**: Brief summary of their career trajectory and expertise
8. **Education**: Their educational background

## Response Format (JSON only):
{
  "currentPosition": "${serpTitle || 'Senior Mechanical Engineer'}",
  "currentCompany": "${lead.companyName}",
  "headline": "Example headline",
  "tenure": "2 years 3 months",
  "previousPositions": [
    {"title": "Previous Title", "company": "Previous Company", "duration": "2 years"}
  ],
  "skills": ["SolidWorks", "CAD Design", "Product Development"],
  "summary": "Experienced professional...",
  "education": ["BS Engineering, University"]
}

IMPORTANT:
- ${serpTitle ? `MUST use "${serpTitle}" as currentPosition - this is verified from LinkedIn search` : 'Search for the actual LinkedIn profile to find the job title'}
- Only include information you can verify from the public profile
- If you cannot find specific information, use "Unknown" or empty arrays
- Output ONLY valid JSON, no markdown or explanation`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
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

    if (!text) {
      throw new Error("Empty LinkedIn research received from Gemini");
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from LinkedIn research response");
    }

    const parsed = JSON.parse(jsonMatch[0]) as Omit<LinkedInIntel, "researchedAt">;
    
    // Override with SerpAPI title if AI didn't use it
    if (serpTitle && (!parsed.currentPosition || parsed.currentPosition === "Unknown" || parsed.currentPosition === null)) {
      console.log(`[LinkedInResearch] Overriding currentPosition with SerpAPI title: ${serpTitle}`);
      parsed.currentPosition = serpTitle;
    }

    // Add timestamp
    const result: LinkedInIntel = {
      ...parsed,
      researchedAt: new Date().toISOString(),
    };

    console.log(`[LinkedInResearch] Final result: ${result.currentPosition} at ${result.currentCompany}`);
    return result;
  };

  return pRetry(research, {
    retries: 3,
    onFailedAttempt: (error) => {
      console.log(
        `[LinkedInResearch] Attempt ${error.attemptNumber} failed. Retrying...`,
      );
    },
  });
}
