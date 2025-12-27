# Lead Intel Replication Guide

This document provides complete specifications to replicate the AI-powered lead intelligence system. It includes all prompts, architecture details, API integrations, and key techniques that produce high-quality research results.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Required API Keys](#required-api-keys)
3. [Files to Download](#files-to-download)
4. [Data Flow](#data-flow)
5. [AI Prompts (Complete)](#ai-prompts-complete)
6. [Website Scraping](#website-scraping)
7. [Google Docs Integration](#google-docs-integration)
8. [Key Techniques for Quality Results](#key-techniques-for-quality-results)
9. [Database Schema](#database-schema)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The Lead Intel system uses a **parallel execution model** that gathers intelligence from 5 sources simultaneously:

```
Lead Input
    │
    ├──► Website Scraper (direct HTTP fetch)
    ├──► LinkedIn Company Research (Gemini + googleSearch)
    ├──► Contact LinkedIn Lookup (SerpAPI)
    ├──► Company Hard Intel (Gemini + googleSearch)
    └──► X.com Research (xAI Grok-3) [optional]
    │
    ▼
All Results Combined
    │
    ▼
Main Research Prompt (Gemini 2.0 Flash + googleSearch)
    │
    ▼
Structured JSON Output → Database Storage
```

### Why This Architecture Works

1. **Parallel execution** - 5 API calls run simultaneously, reducing total time from ~30s to ~10s
2. **Pre-scraped content** - Website content is fetched BEFORE the AI call, preventing hallucination
3. **Multiple verification sources** - Cross-references data from website, LinkedIn, news, SEC filings
4. **Structured output** - JSON-only responses with strict schema enforcement

---

## Required API Keys

Store these as environment secrets:

| Secret Name | Purpose | Where to Get |
|------------|---------|--------------|
| `GEMINI_API_KEY` | Main AI research engine | [Google AI Studio](https://aistudio.google.com/) |
| `SERP_API` | LinkedIn profile discovery | [SerpAPI](https://serpapi.com/) |
| `XAI_API` | X.com/Twitter research | [xAI Console](https://console.x.ai/) |
| `GOOGLE_CLIENT_ID` | Google Docs access | Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google Docs access | Google Cloud Console |
| `GOOGLE_REFRESH_TOKEN` | Google Docs access | OAuth flow |

**Minimum required:** `GEMINI_API_KEY` (for basic research)
**Recommended:** Add `SERP_API` for LinkedIn profile discovery
**Optional:** Add `XAI_API` for X.com social research

---

## Files to Download

Copy these files to replicate the system:

### Core AI Research Files

```
server/ai/
├── leadResearch.ts      # Main orchestrator - calls all sources
├── websiteScraper.ts    # HTTP scraper + LinkedIn company AI lookup
├── companyHardIntel.ts  # Financial, contracts, executives, news
├── xResearch.ts         # X.com research via xAI Grok-3
└── serpApiClient.ts     # LinkedIn profile discovery via SerpAPI
```

### Google Integration Files

```
server/google/
└── driveClient.ts       # Google Docs reader for knowledge base
```

### Database Schema

```
shared/
└── schema.ts            # Lead and research_packets tables
```

### Frontend Display

```
client/src/pages/
└── lead-intel.tsx       # Research display UI
```

---

## Data Flow

### Step 1: Parallel Data Gathering

```typescript
const [knowledgeBase, scrapedIntel, contactLinkedInData, companyHardIntel, scoringParams] = await Promise.all([
  getKnowledgebaseContent(),                                    // Google Doc
  gatherCompanyIntel(lead.companyName, lead.companyWebsite),   // Website + LinkedIn
  researchContactLinkedIn(lead.contactName, lead.companyName), // SerpAPI
  gatherCompanyHardIntel(lead.companyName, lead.companyWebsite), // Gemini search
  getLeadScoringParameters()                                    // Google Doc
]);
```

### Step 2: Format Scraped Content

```typescript
const scrapedContent = formatScrapedContentForPrompt(scrapedIntel);
```

### Step 3: Main AI Research Call

```typescript
const response = await ai.models.generateContent({
  model: "gemini-2.0-flash",
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  config: {
    tools: [{ googleSearch: {} }],  // CRITICAL: Enables web grounding
  }
});
```

### Step 4: Parse and Store

```typescript
const jsonMatch = text.match(/\{[\s\S]*\}/);
const parsed = JSON.parse(jsonMatch[0]);
```

---

## AI Prompts (Complete)

### 1. Main Lead Research Prompt

This is the primary prompt that generates the complete research packet:

```
You are a lead research assistant for Hawk Ridge, a company that sells engineering software solutions (SolidWorks, CAD/CAM, PDM, simulation, 3D printing, and related services).

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
- Output ONLY valid JSON, no markdown or explanation
```

---

### 2. Company Hard Intel Prompt

Gathers factual business intelligence (HQ, financials, contracts, executives, news):

```
You are a business intelligence researcher. Find FACTUAL, VERIFIABLE information about this company.

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
- Output ONLY valid JSON, no markdown or explanation
```

---

### 3. LinkedIn Company Research Prompt

```
You are a research assistant. Search for the LinkedIn company page for "${companyName}" and extract the following information.

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
- Output ONLY valid JSON, no markdown or explanation
```

---

### 4. Web Contact Enrichment Prompt

```
You are a research assistant helping to find contact information for a sales lead.

## Lead to Research:
- Contact Name: ${lead.contactName}
- Company: ${lead.companyName}
- Known Email: ${lead.contactEmail || "Not provided"}
- Known Phone: ${lead.contactPhone || "Not provided"}
- Known LinkedIn: ${lead.contactLinkedIn || "Not provided"}

## Search Query to Use:
"${lead.contactName} ${lead.companyName} contact information phone email LinkedIn"

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
- Output ONLY valid JSON, no markdown or explanation
```

---

### 5. X.com Research Prompt (via xAI Grok-3)

```
You are Grok, with access to real-time X.com (Twitter) data. Research this sales lead and find their X/Twitter presence.

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
- Output ONLY valid JSON
```

---

## Website Scraping

### How It Works

The scraper fetches 5 common pages in parallel:

```typescript
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
```

### HTML Text Extraction

```typescript
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
```

### Content Character Limits

- Each page: 8,000 characters max
- Knowledge base in prompt: 12,000 characters max
- This prevents token overflow while preserving key content

---

## Google Docs Integration

### Reading Knowledge Base

```typescript
export async function getKnowledgebaseContent(): Promise<string> {
  const auth = getAuth();
  const docs = google.docs({ version: "v1", auth });

  const response = await docs.documents.get({
    documentId: DRIVE_CONFIG.KNOWLEDGE_DOC_ID
  });

  const content = response.data.body?.content || [];
  let text = "";

  for (const element of content) {
    if (element.paragraph?.elements) {
      for (const textElement of element.paragraph.elements) {
        if (textElement.textRun?.content) {
          text += textElement.textRun.content;
        }
      }
    }
  }

  return text.trim();
}
```

### Environment Variables

```
DRIVE_KNOWLEDGE_DOC_ID=1NxcQYGHXaVfEGK7Vs5AiOjse8bsRbHBEiwdLsMr0LME
DRIVE_LEAD_SCORING_PARAMS_DOC_ID=1xERqop5Y9iBNjghbwPF4jNpPKVMW8SlPkJEUnczXL5E
```

---

## Key Techniques for Quality Results

### 1. USE THE SCRAPED CONTENT Directive

This is the single most important technique. Without it, the AI will hallucinate:

```
**CRITICAL: Base your company summary on the ACTUAL SCRAPED CONTENT above. Do NOT say "Unable to find information" if website or LinkedIn data is provided - USE THAT DATA.**
```

### 2. Pre-Fetch All Data

Scrape websites BEFORE the AI call. Don't rely on the AI to fetch pages:

```typescript
// GOOD - Data fetched before AI call
const scrapedIntel = await gatherCompanyIntel(lead.companyName, lead.companyWebsite);
const prompt = `...${formatScrapedContentForPrompt(scrapedIntel)}...`;

// BAD - Hoping AI will search
const prompt = `Search the website ${lead.companyWebsite} and...`;
```

### 3. Enable googleSearch Tool

This enables Gemini's web grounding for live searches:

```typescript
config: {
  tools: [{ googleSearch: {} }],
}
```

### 4. JSON-Only Output

Force JSON responses to prevent formatting issues:

```
## Response Format (JSON only):
{...}

IMPORTANT:
- Output ONLY valid JSON, no markdown or explanation
```

### 5. Retry Logic

Use p-retry for resilience:

```typescript
import pRetry from "p-retry";

return pRetry(research, {
  retries: 3,
  onFailedAttempt: (error) => {
    console.log(`Attempt ${error.attemptNumber} failed. Retrying...`);
  },
});
```

### 6. SerpAPI Company Name Simplification

For LinkedIn searches, simplify company names:

```typescript
let simplifiedCompany = companyName
  .replace(/,?\s*(Inc\.?|LLC\.?|Corp\.?|Corporation|Ltd\.?|Company|Co\.?)$/i, '')
  .replace(/\s+/g, ' ')
  .trim();

// Handle special cases
if (simplifiedCompany.toLowerCase() === 'super micro computer') {
  simplifiedCompany = 'Supermicro';
}
```

### 7. Confidence Scoring for LinkedIn Matches

```typescript
let confidence: 'high' | 'medium' | 'low' = 'low';
if ((nameMatchCount >= 2 || nameInUrl >= 2) && companyMatch) {
  confidence = 'high';
} else if ((nameMatchCount >= 1 || nameInUrl >= 1) && companyMatch) {
  confidence = 'high';
} else if (nameMatchCount >= 2 || nameInUrl >= 2) {
  confidence = 'medium';
}
```

---

## Database Schema

### Leads Table

```typescript
export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyName: text("company_name").notNull(),
  companyWebsite: text("company_website"),
  companyIndustry: text("company_industry"),
  companySize: text("company_size"),
  contactName: text("contact_name").notNull(),
  contactTitle: text("contact_title"),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  contactLinkedIn: text("contact_linkedin"),
  status: text("status").default("new").notNull(),
  source: text("source"),
  assignedTo: text("assigned_to"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Research Packets Table

```typescript
export const researchPackets = pgTable("research_packets", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id").notNull().references(() => leads.id),
  companyIntel: text("company_intel"),       // JSON string
  contactIntel: text("contact_intel"),       // JSON string
  painSignals: text("pain_signals"),         // JSON array
  competitorPresence: text("competitor_presence"),
  fitAnalysis: text("fit_analysis"),         // JSON with score, rationale
  talkTrack: text("talk_track"),
  discoveryQuestions: text("discovery_questions"),  // JSON array
  objectionHandles: text("objection_handles"),      // JSON array
  companyHardIntel: text("company_hard_intel"),     // JSON object
  sources: text("sources"),                  // JSON array of URLs
  verificationStatus: text("verification_status").default("unverified"),
  researchedAt: timestamp("researched_at").defaultNow(),
});
```

---

## Troubleshooting

### Problem: AI says "Unable to find information"

**Solution:** Check that scraped content is being passed correctly. Add logging:

```typescript
console.log(`[LeadResearch] Scraped content length: ${scrapedContent.length}`);
```

### Problem: Empty or null results

**Solution:** Check API keys are set:

```typescript
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY");
}
```

### Problem: JSON parse errors

**Solution:** Use regex to extract JSON:

```typescript
const jsonMatch = text.match(/\{[\s\S]*\}/);
if (!jsonMatch) {
  throw new Error("Could not parse JSON from response");
}
```

### Problem: LinkedIn profiles not found

**Solution:** Check SerpAPI key and company name simplification:

```typescript
const searchQuery = `"${personName}" ${simplifiedCompany} site:linkedin.com/in`;
console.log(`[SerpAPI] Searching: ${searchQuery}`);
```

### Problem: X.com research failing

**Solution:** Verify XAI_API key and use correct model:

```typescript
model: "grok-3-latest"  // NOT "grok-2" or other
```

---

## Summary

The key to high-quality lead research:

1. **Pre-fetch website content** before AI calls
2. **Use the `googleSearch` tool** in Gemini for live web grounding
3. **Explicitly tell the AI to use scraped content** (multiple times in prompt)
4. **Run data gathering in parallel** with `Promise.all()`
5. **Use structured JSON output** for reliable parsing
6. **Implement retry logic** for resilience
7. **Simplify company names** for better SerpAPI results
8. **Store raw sources** for verification

This architecture produces research that is:
- Specific to the actual company (not generic)
- Verifiable from multiple sources
- Actionable for sales calls
- Fast (parallel execution)
- Reliable (retry logic + error handling)
