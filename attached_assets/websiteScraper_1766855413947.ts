import { GoogleGenAI } from "@google/genai";
import { searchLinkedInProfile } from "./serpApiClient";

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing Gemini API key");
  }
  return new GoogleGenAI({ apiKey });
}

export interface WebsiteContent {
  url: string;
  homepage: string | null;
  aboutPage: string | null;
  servicesPage: string | null;
  productPage: string | null;
  contactPage: string | null;
  fetchedAt: string;
  error?: string;
}

export interface LinkedInCompanyData {
  companyName: string;
  industry: string | null;
  companySize: string | null;
  headquarters: string | null;
  description: string | null;
  specialties: string[];
  linkedInUrl: string | null;
  fetchedAt: string;
}

export interface ScrapedIntel {
  website: WebsiteContent | null;
  linkedInCompany: LinkedInCompanyData | null;
  sources: string[];
}

async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HawkRidgeBot/1.0; +https://hawkridgesys.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`[WebScraper] Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    const text = extractTextFromHtml(html);
    return text.substring(0, 8000);
  } catch (error) {
    console.log(`[WebScraper] Error fetching ${url}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  
  return text;
}

function normalizeUrl(url: string): string {
  if (!url) return '';
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }
  try {
    const parsed = new URL(normalized);
    return parsed.origin + '/';
  } catch {
    if (!normalized.endsWith('/')) {
      normalized += '/';
    }
    return normalized;
  }
}

export async function scrapeCompanyWebsite(websiteUrl: string | null): Promise<WebsiteContent | null> {
  if (!websiteUrl) {
    return null;
  }
  
  const baseUrl = normalizeUrl(websiteUrl);
  console.log(`[WebScraper] Scraping company website: ${baseUrl}`);
  
  const commonAboutPaths = ['about', 'about-us', 'company', 'who-we-are'];
  const commonServicesPaths = ['services', 'solutions', 'what-we-do', 'capabilities'];
  const commonProductPaths = ['products', 'our-products', 'offerings'];
  const commonContactPaths = ['contact', 'contacts', 'contact-us', 'get-in-touch'];
  
  const [homepage, ...otherPages] = await Promise.all([
    fetchPageContent(baseUrl),
    ...commonAboutPaths.map(path => fetchPageContent(baseUrl + path)),
    ...commonServicesPaths.map(path => fetchPageContent(baseUrl + path)),
    ...commonProductPaths.map(path => fetchPageContent(baseUrl + path)),
    ...commonContactPaths.map(path => fetchPageContent(baseUrl + path)),
  ]);
  
  const aboutPages = otherPages.slice(0, commonAboutPaths.length);
  const servicesPages = otherPages.slice(commonAboutPaths.length, commonAboutPaths.length + commonServicesPaths.length);
  const productPages = otherPages.slice(commonAboutPaths.length + commonServicesPaths.length, commonAboutPaths.length + commonServicesPaths.length + commonProductPaths.length);
  const contactPages = otherPages.slice(commonAboutPaths.length + commonServicesPaths.length + commonProductPaths.length);
  
  const aboutPage = aboutPages.find(p => p !== null) || null;
  const servicesPage = servicesPages.find(p => p !== null) || null;
  const productPage = productPages.find(p => p !== null) || null;
  const contactPage = contactPages.find(p => p !== null) || null;
  
  if (!homepage && !aboutPage && !servicesPage && !productPage && !contactPage) {
    console.log(`[WebScraper] Could not fetch any content from ${baseUrl}`);
    return {
      url: baseUrl,
      homepage: null,
      aboutPage: null,
      servicesPage: null,
      productPage: null,
      contactPage: null,
      fetchedAt: new Date().toISOString(),
      error: "Could not fetch any content from website"
    };
  }
  
  console.log(`[WebScraper] Successfully scraped ${baseUrl}: homepage=${!!homepage}, about=${!!aboutPage}, services=${!!servicesPage}, products=${!!productPage}, contact=${!!contactPage}`);
  
  return {
    url: baseUrl,
    homepage,
    aboutPage,
    servicesPage,
    productPage,
    contactPage,
    fetchedAt: new Date().toISOString()
  };
}

export async function researchLinkedInCompany(companyName: string): Promise<LinkedInCompanyData | null> {
  console.log(`[LinkedInResearch] Researching LinkedIn company page for: ${companyName}`);
  
  try {
    const ai = getAiClient();
    
    const prompt = `You are a research assistant. Search for the LinkedIn company page for "${companyName}" and extract the following information.

## Search Task:
Find the LinkedIn company page for "${companyName}" and extract:
1. Official company name as listed on LinkedIn
2. Industry
3. Company size (e.g., "51-200 employees", "1,001-5,000 employees")
4. Headquarters location
5. Company description/overview
6. Specialties listed on the page
7. The LinkedIn company page URL

## Response Format (JSON only):
{
  "companyName": "Official Company Name",
  "industry": "Manufacturing" or null,
  "companySize": "51-200 employees" or null,
  "headquarters": "City, State, Country" or null,
  "description": "Company description from their LinkedIn About section" or null,
  "specialties": ["specialty1", "specialty2"] or [],
  "linkedInUrl": "https://www.linkedin.com/company/company-name/" or null
}

IMPORTANT:
- Only provide information you can actually find on their LinkedIn page
- If you cannot find a LinkedIn company page for this company, return null values
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
      console.log(`[LinkedInResearch] Empty response for ${companyName}`);
      return null;
    }
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`[LinkedInResearch] Could not parse JSON for ${companyName}`);
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]) as LinkedInCompanyData;
    parsed.fetchedAt = new Date().toISOString();
    
    console.log(`[LinkedInResearch] Found LinkedIn data for ${companyName}: ${parsed.linkedInUrl || 'no URL'}`);
    
    return parsed;
  } catch (error) {
    console.error(`[LinkedInResearch] Error researching ${companyName}:`, error);
    return null;
  }
}

// Contact LinkedIn profile research
export interface ContactLinkedInData {
  linkedInUrl: string | null;
  headline: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  location: string | null;
  summary: string | null;
  experience: { title: string; company: string; duration: string }[];
  education: string[];
  skills: string[];
  fetchedAt: string;
}

export async function researchContactLinkedIn(
  contactName: string, 
  companyName: string,
  contactEmail?: string | null
): Promise<ContactLinkedInData | null> {
  // Try to extract a fuller name from the email if we only have a first name
  let searchName = contactName;
  if (contactEmail && contactName.split(' ').length === 1) {
    const emailUsername = contactEmail.split('@')[0].toLowerCase();
    const firstName = contactName.toLowerCase();
    
    const nameParts = emailUsername.split(/[._]/);
    if (nameParts.length >= 2) {
      const meaningfulParts = nameParts.filter(p => p.length > 1);
      searchName = meaningfulParts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    } else if (emailUsername.startsWith(firstName) && emailUsername.length > firstName.length + 1) {
      const remainder = emailUsername.slice(firstName.length);
      
      if (remainder.length >= 5) {
        const lastName = remainder.slice(1).charAt(0).toUpperCase() + remainder.slice(2);
        searchName = `${contactName} ${lastName}`;
      } else if (remainder.length >= 2) {
        const lastName = remainder.charAt(0).toUpperCase() + remainder.slice(1);
        searchName = `${contactName} ${lastName}`;
      }
    }
  }
  
  console.log(`[ContactLinkedIn] Searching for ${searchName} at ${companyName}`);
  
  try {
    // Step 1: Use SerpAPI to find the LinkedIn profile URL (much more reliable than Gemini grounding)
    const serpResult = await searchLinkedInProfile(searchName, companyName, contactEmail || undefined);
    
    if (!serpResult.profileUrl) {
      console.log(`[ContactLinkedIn] SerpAPI could not find LinkedIn for ${searchName}`);
      return null;
    }
    
    console.log(`[ContactLinkedIn] SerpAPI found profile: ${serpResult.profileUrl} (confidence: ${serpResult.confidence})`);
    
    // Step 2: Use Gemini to extract details from the found profile URL
    const ai = getAiClient();
    
    const prompt = `You are a research assistant. Research the LinkedIn profile at this URL: ${serpResult.profileUrl}

## Known Information:
- Profile URL: ${serpResult.profileUrl}
- Name: ${searchName}
- Company: ${companyName}
- Search result title: ${serpResult.title || 'N/A'}
- Search result snippet: ${serpResult.snippet || 'N/A'}

## Task:
Based on the LinkedIn profile URL and the search result information, provide what you know about this person. Use web search to verify and gather additional details.

## Response Format (JSON only):
{
  "linkedInUrl": "${serpResult.profileUrl}",
  "headline": "Their LinkedIn headline" or null,
  "currentTitle": "Job Title" or null,
  "currentCompany": "Company Name" or null,
  "location": "City, State" or null,
  "summary": "Brief summary of their professional background" or null,
  "experience": [
    {"title": "Job Title", "company": "Company", "duration": "2020-Present"}
  ],
  "education": ["University Name - Degree"],
  "skills": ["Skill 1", "Skill 2"]
}

IMPORTANT:
- The linkedInUrl MUST be exactly: ${serpResult.profileUrl}
- Extract as much information as you can find about this person
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
      // Even if Gemini fails to research details, we still have the URL from SerpAPI
      console.log(`[ContactLinkedIn] Gemini returned empty, but we have URL from SerpAPI`);
      return {
        linkedInUrl: serpResult.profileUrl,
        headline: serpResult.title || null,
        currentTitle: null,
        currentCompany: companyName,
        location: null,
        summary: serpResult.snippet || null,
        experience: [],
        education: [],
        skills: [],
        fetchedAt: new Date().toISOString()
      };
    }
    
    let cleanText = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log(`[ContactLinkedIn] Could not parse Gemini response, using SerpAPI data`);
      return {
        linkedInUrl: serpResult.profileUrl,
        headline: serpResult.title || null,
        currentTitle: null,
        currentCompany: companyName,
        location: null,
        summary: serpResult.snippet || null,
        experience: [],
        education: [],
        skills: [],
        fetchedAt: new Date().toISOString()
      };
    }
    
    let parsed: ContactLinkedInData;
    try {
      parsed = JSON.parse(jsonMatch[0]) as ContactLinkedInData;
    } catch (parseError) {
      console.log(`[ContactLinkedIn] JSON parse error, using SerpAPI data`);
      return {
        linkedInUrl: serpResult.profileUrl,
        headline: serpResult.title || null,
        currentTitle: null,
        currentCompany: companyName,
        location: null,
        summary: serpResult.snippet || null,
        experience: [],
        education: [],
        skills: [],
        fetchedAt: new Date().toISOString()
      };
    }
    
    // Ensure we always use the SerpAPI URL (don't let Gemini override it with something wrong)
    parsed.linkedInUrl = serpResult.profileUrl;
    parsed.fetchedAt = new Date().toISOString();
    
    console.log(`[ContactLinkedIn] Found LinkedIn for ${contactName}: ${parsed.linkedInUrl}`);
    
    return parsed;
  } catch (error) {
    console.error(`[ContactLinkedIn] Error researching ${contactName}:`, error);
    return null;
  }
}

export async function gatherCompanyIntel(companyName: string, websiteUrl: string | null): Promise<ScrapedIntel> {
  console.log(`[CompanyIntel] Gathering intel for ${companyName}`);
  
  const [website, linkedInCompany] = await Promise.all([
    scrapeCompanyWebsite(websiteUrl),
    researchLinkedInCompany(companyName)
  ]);
  
  const sources: string[] = [];
  if (website?.homepage || website?.aboutPage || website?.servicesPage || website?.productPage) {
    sources.push(`Company Website: ${website.url}`);
  }
  if (linkedInCompany?.linkedInUrl) {
    sources.push(`LinkedIn Company Page: ${linkedInCompany.linkedInUrl}`);
  }
  
  return {
    website,
    linkedInCompany,
    sources
  };
}

/**
 * Extract phone numbers from scraped website content
 * Looks for common phone patterns in contact pages and homepage
 */
export function extractPhoneFromScrapedContent(intel: ScrapedIntel): string | null {
  const contentToSearch: string[] = [];
  
  // Prioritize contact page, then homepage, then about page
  if (intel.website?.contactPage) {
    contentToSearch.push(intel.website.contactPage);
  }
  if (intel.website?.homepage) {
    contentToSearch.push(intel.website.homepage);
  }
  if (intel.website?.aboutPage) {
    contentToSearch.push(intel.website.aboutPage);
  }
  
  if (contentToSearch.length === 0) {
    return null;
  }
  
  // Phone number patterns - international and US formats
  const phonePatterns = [
    // International format: +1-XXX-XXX-XXXX or +1 (XXX) XXX-XXXX
    /\+1[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/g,
    // Standard US: (XXX) XXX-XXXX or XXX-XXX-XXXX
    /\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/g,
    // With country code prefix: 1-XXX-XXX-XXXX
    /\b1[-.\s](\d{3})[-.\s](\d{3})[-.\s](\d{4})\b/g,
    // Toll free: 1-800-XXX-XXXX, 1-888-XXX-XXXX etc
    /\b1[-.\s]?(800|888|877|866|855|844|833)[-.\s](\d{3})[-.\s](\d{4})\b/g,
  ];
  
  for (const content of contentToSearch) {
    for (const pattern of phonePatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        // Return the first valid phone number found
        const phone = matches[0].trim();
        // Clean up the phone number to a standard format
        const digits = phone.replace(/[^\d+]/g, '');
        if (digits.length >= 10) {
          // Format as +1-XXX-XXX-XXXX if it's a US number
          if (digits.startsWith('+1') || digits.startsWith('1')) {
            const core = digits.replace(/^\+?1/, '');
            if (core.length === 10) {
              return `+1-${core.slice(0,3)}-${core.slice(3,6)}-${core.slice(6)}`;
            }
          } else if (digits.length === 10) {
            return `+1-${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
          }
          return phone;
        }
      }
    }
  }
  
  return null;
}

export function formatScrapedContentForPrompt(intel: ScrapedIntel): string {
  const sections: string[] = [];
  
  const hasWebsiteContent = intel.website && (
    intel.website.homepage || intel.website.aboutPage || 
    intel.website.servicesPage || intel.website.productPage || intel.website.contactPage
  );
  
  const hasLinkedInContent = intel.linkedInCompany && (
    intel.linkedInCompany.description || intel.linkedInCompany.industry ||
    intel.linkedInCompany.companySize || intel.linkedInCompany.specialties?.length
  );
  
  if (hasWebsiteContent && intel.website) {
    sections.push("## SCRAPED WEBSITE CONTENT");
    sections.push(`Source: ${intel.website.url}`);
    
    if (intel.website.homepage) {
      sections.push("\n### Homepage Content:");
      sections.push(intel.website.homepage.substring(0, 3000));
    }
    if (intel.website.aboutPage) {
      sections.push("\n### About Page Content:");
      sections.push(intel.website.aboutPage.substring(0, 2000));
    }
    if (intel.website.servicesPage) {
      sections.push("\n### Services/Capabilities:");
      sections.push(intel.website.servicesPage.substring(0, 2000));
    }
    if (intel.website.productPage) {
      sections.push("\n### Products:");
      sections.push(intel.website.productPage.substring(0, 2000));
    }
    if (intel.website.contactPage) {
      sections.push("\n### Contact Page:");
      sections.push(intel.website.contactPage.substring(0, 2000));
    }
  }
  
  if (hasLinkedInContent && intel.linkedInCompany) {
    sections.push("\n## LINKEDIN COMPANY DATA");
    if (intel.linkedInCompany.linkedInUrl) {
      sections.push(`Source: ${intel.linkedInCompany.linkedInUrl}`);
    }
    if (intel.linkedInCompany.industry) {
      sections.push(`Industry: ${intel.linkedInCompany.industry}`);
    }
    if (intel.linkedInCompany.companySize) {
      sections.push(`Company Size: ${intel.linkedInCompany.companySize}`);
    }
    if (intel.linkedInCompany.headquarters) {
      sections.push(`Headquarters: ${intel.linkedInCompany.headquarters}`);
    }
    if (intel.linkedInCompany.description) {
      sections.push(`\nLinkedIn Description:\n${intel.linkedInCompany.description}`);
    }
    if (intel.linkedInCompany.specialties && intel.linkedInCompany.specialties.length > 0) {
      sections.push(`\nSpecialties: ${intel.linkedInCompany.specialties.join(", ")}`);
    }
  }
  
  if (sections.length === 0) {
    return "## NO SCRAPED CONTENT AVAILABLE\nNo website or LinkedIn company data could be retrieved. Use web search to find information about this company.";
  }
  
  return sections.join("\n");
}
