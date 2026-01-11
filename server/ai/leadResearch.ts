import type { Lead, InsertResearchPacket } from "@shared/schema";
import { researchLeadOnX, formatXIntel, type XIntelResult } from "./xResearch";
import { gatherCompanyHardIntel, formatCompanyHardIntel, type CompanyHardIntel } from "./companyHardIntel";
import { HAWK_RIDGE_PRODUCTS, getProductCatalogPrompt, matchProductsToLead } from "./productCatalog";
import { 
  gatherCompanyIntel, 
  researchContactLinkedIn as scrapeContactLinkedIn,
  formatScrapedContentForPrompt,
  extractPhoneFromScrapedContent,
  type ScrapedIntel,
  type ContactLinkedInData
} from "./websiteScraper";
import { getKnowledgebaseContent, getLeadScoringParameters } from "../google/driveClient";
import { callClaudeWithRetry, extractJsonFromResponse } from "./claudeClient";

const HAWK_RIDGE_CONTEXT = `
Hawk Ridge Systems is a leading provider of 3D design, manufacturing, and product data management solutions.

${getProductCatalogPrompt()}

TARGET INDUSTRIES:
- Aerospace & Defense
- Medical Devices
- Industrial Machinery
- Consumer Products
- Automotive
- Electronics
- Manufacturing

IDEAL FIT SIGNALS:
- Uses legacy CAD (AutoCAD 2D, Pro/E, Inventor) - ready to upgrade
- Growing engineering team - need collaboration tools
- Manufacturing in-house or planning to - need CAM software
- Rapid prototyping needs - 3D printing opportunity
- Compliance requirements (FDA, AS9100) - need PDM
- Design bottlenecks - simulation and optimization
`;

export interface ProductMatch {
  productId: string;
  productName: string;
  category: string;
  matchScore: number;
  rationale: string;
  valueProposition: string;
}

export interface PainPoint {
  pain: string;
  severity: "high" | "medium" | "low";
  hawkRidgeSolution: string;
}

export interface CareerHistoryItem {
  title: string;
  company: string;
  duration: string;
  relevance: string;
}

export interface ConfidenceAssessment {
  overall: "high" | "medium" | "low";
  companyInfoConfidence: "high" | "medium" | "low";
  contactInfoConfidence: "high" | "medium" | "low";
  reasoning: string;
  warnings: string[];
}

export interface LeadDossier {
  companySummary: string;
  companyNews: string[];
  painPoints: PainPoint[];
  productMatches: ProductMatch[];
  techStackIntel: string[];
  buyingTriggers: string[];
  
  contactBackground: string;
  careerHistory: CareerHistoryItem[];
  professionalInterests: string[];
  decisionMakingStyle: string;
  
  commonGround: string[];
  openingLine: string;
  talkTrack: string[];
  discoveryQuestions: string[];
  objectionHandles: Array<{ objection: string; response: string }>;
  theAsk: string;
  
  fitScore: number;
  fitScoreBreakdown: string;
  priority: "hot" | "warm" | "cool" | "cold";
  
  sources: string;
  linkedInUrl?: string;
  phoneNumber?: string;
  jobTitle?: string;
  companyWebsite?: string;
  companyAddress?: string;
  
  confidenceAssessment?: ConfidenceAssessment;
}

export interface LinkedInProfile {
  profileUrl?: string;
  headline?: string;
  currentPosition?: {
    title?: string;
    company?: string;
  };
  error?: string;
}

function formatContactLinkedInAsProfile(data: ContactLinkedInData | null): LinkedInProfile {
  if (!data) {
    return { error: "LinkedIn profile not found" };
  }
  return {
    profileUrl: data.linkedInUrl || undefined,
    headline: data.headline || undefined,
    currentPosition: {
      title: data.currentTitle || undefined,
      company: data.currentCompany || undefined,
    },
  };
}

export function formatLinkedInIntel(profile: LinkedInProfile): string {
  if (profile.error) {
    return `LinkedIn: ${profile.error}`;
  }
  const parts: string[] = [];
  if (profile.profileUrl) parts.push(`Profile: ${profile.profileUrl}`);
  if (profile.headline) parts.push(`Headline: ${profile.headline}`);
  if (profile.currentPosition?.title) parts.push(`Title: ${profile.currentPosition.title}`);
  if (profile.currentPosition?.company) parts.push(`Company: ${profile.currentPosition.company}`);
  return parts.length > 0 ? parts.join("\n") : "No LinkedIn data available";
}

interface PreScrapedData {
  scrapedIntel: ScrapedIntel;
  contactLinkedIn: ContactLinkedInData | null;
  companyHardIntel: CompanyHardIntel;
  xIntel: XIntelResult;
  knowledgeBase: string;
  scoringParams: string;
}

async function gatherAllIntelInParallel(lead: Lead): Promise<PreScrapedData> {
  console.log(`[LeadResearch] Starting PARALLEL pre-fetch for ${lead.contactName} at ${lead.companyName}`);
  
  const [
    scrapedIntel,
    contactLinkedIn,
    companyHardIntel,
    xIntel,
    knowledgeBase,
    scoringParams
  ] = await Promise.all([
    gatherCompanyIntel(lead.companyName, lead.companyWebsite || null),
    scrapeContactLinkedIn(lead.contactName, lead.companyName, lead.contactEmail),
    gatherCompanyHardIntel(lead).catch((err) => {
      console.error(`[LeadResearch] CompanyHardIntel failed for ${lead.companyName}:`, err.message);
      return { keyExecutives: [], competitors: [], recentNews: [], certifications: [], techStack: [], error: err.message } as CompanyHardIntel;
    }),
    researchLeadOnX(lead).catch((err) => {
      console.error(`[LeadResearch] X research failed for ${lead.contactName}:`, err.message);
      return {
        xHandle: null, profileUrl: null, bio: null, followerCount: null,
        recentPosts: [], conversationStarters: [], industryTrends: [], hashtags: [],
        engagementStyle: "", professionalTone: "", topicsOfInterest: [],
        companyMentions: [], recentNews: [], error: err.message
      } as XIntelResult;
    }),
    getKnowledgebaseContent().catch(() => ""),
    getLeadScoringParameters().catch(() => "")
  ]);
  
  console.log(`[LeadResearch] Pre-fetch complete. Website: ${!!scrapedIntel.website}, LinkedIn contact: ${!!contactLinkedIn}, LinkedIn company: ${!!scrapedIntel.linkedInCompany}`);
  
  return {
    scrapedIntel,
    contactLinkedIn,
    companyHardIntel,
    xIntel,
    knowledgeBase,
    scoringParams
  };
}

export async function generateLeadDossier(lead: Lead, preScraped?: PreScrapedData): Promise<LeadDossier> {
  console.log(`[LeadResearch] generateLeadDossier called for ${lead.contactName}`);
  
  let scraped = preScraped;
  if (!scraped) {
    scraped = await gatherAllIntelInParallel(lead);
  }
  
  const scrapedContent = formatScrapedContentForPrompt(scraped.scrapedIntel);
  const phoneFromScrape = extractPhoneFromScrapedContent(scraped.scrapedIntel);
  
  let contactLinkedInSection = "";
  if (scraped.contactLinkedIn) {
    contactLinkedInSection = `
## CONTACT LINKEDIN DATA:
- LinkedIn URL: ${scraped.contactLinkedIn.linkedInUrl || "Not found"}
- Headline: ${scraped.contactLinkedIn.headline || "Unknown"}
- Current Title: ${scraped.contactLinkedIn.currentTitle || "Unknown"}
- Current Company: ${scraped.contactLinkedIn.currentCompany || "Unknown"}
- Location: ${scraped.contactLinkedIn.location || "Unknown"}
- Summary: ${scraped.contactLinkedIn.summary || "Not available"}
- Experience: ${scraped.contactLinkedIn.experience?.map(e => `${e.title} at ${e.company} (${e.duration})`).join("; ") || "Not available"}
- Education: ${scraped.contactLinkedIn.education?.join(", ") || "Not available"}
- Skills: ${scraped.contactLinkedIn.skills?.slice(0, 10).join(", ") || "Not available"}`;
  }
  
  let companyHardIntelSection = "";
  if (scraped.companyHardIntel && !scraped.companyHardIntel.error) {
    const chi = scraped.companyHardIntel;
    companyHardIntelSection = `
## COMPANY HARD INTEL (verified data):
- Employee Count: ${chi.employeeCount || "Unknown"}
- Revenue: ${chi.revenue || "Unknown"}
- Headquarters: ${chi.headquarters || "Unknown"}
- Founded: ${chi.founded || "Unknown"}
- Stock Info: ${chi.stockInfo || "Private"}
- Funding: ${chi.fundingInfo || "Not available"}
- Tech Stack: ${chi.techStack?.join(", ") || "Unknown"}
- Certifications: ${chi.certifications?.join(", ") || "None found"}
- Competitors: ${chi.competitors?.join(", ") || "Unknown"}
- Key Executives: ${chi.keyExecutives?.map(e => `${e.name} (${e.title})`).join(", ") || "Unknown"}
- Recent News: ${chi.recentNews?.slice(0, 3).join("; ") || "None found"}`;
  }
  
  const knowledgeBaseSection = scraped.knowledgeBase ? `
## HAWK RIDGE KNOWLEDGE BASE (Use this for accurate product info):
${scraped.knowledgeBase.substring(0, 12000)}` : "";

  const scoringSection = scraped.scoringParams ? `
## LEAD SCORING PARAMETERS (Use these criteria):
${scraped.scoringParams.substring(0, 4000)}` : "";

  const prompt = `You are an expert B2B sales intelligence analyst preparing a COMPREHENSIVE dossier for a sales call to sell Hawk Ridge Systems solutions.

${HAWK_RIDGE_CONTEXT}

## LEAD INFORMATION:
- Contact Name: ${lead.contactName}
- Job Title: ${lead.contactTitle || "Unknown"}
- Company: ${lead.companyName}
- Industry: ${lead.companyIndustry || "Unknown"}
- Company Size: ${lead.companySize || "Unknown"}
- Website: ${lead.companyWebsite || "Unknown"}
- LinkedIn: ${lead.contactLinkedIn || "Not provided"}
- Email Domain: ${lead.contactEmail.split("@")[1]}

=== PRE-SCRAPED INTELLIGENCE (USE THIS DATA) ===

${scrapedContent}
${contactLinkedInSection}
${companyHardIntelSection}
${knowledgeBaseSection}
${scoringSection}

=== END PRE-SCRAPED INTELLIGENCE ===

CRITICAL: Base your company summary and contact background on the ACTUAL SCRAPED CONTENT above. 
Do NOT say "Unable to find information" or "Research pending" if website, LinkedIn, or hard intel data is provided above - USE THAT DATA.
If the scraped content contains information about the company, products, services, or contact - incorporate it into your analysis.

You may use web search to find additional recent news and to supplement the pre-scraped data, but the pre-scraped data should be your PRIMARY source.

Return a JSON object with these EXACT keys:

{
  "companySummary": "2-3 paragraph detailed overview based on the SCRAPED CONTENT above - what this company does, their products/services, market position, and recent developments",
  
  "companyNews": [
    "Recent news item 1 with date if known",
    "Recent news item 2",
    "Product launches, funding, expansions, etc."
  ],
  
  "painPoints": [
    {"pain": "Specific challenge they face based on their industry/size", "severity": "high", "hawkRidgeSolution": "SOLIDWORKS Premium with Simulation"},
    {"pain": "Another pain point", "severity": "medium", "hawkRidgeSolution": "CAMWorks"},
    {"pain": "Third pain point", "severity": "low", "hawkRidgeSolution": "SOLIDWORKS PDM"}
  ],
  
  "productMatches": [
    {"productId": "solidworks-premium", "productName": "SOLIDWORKS Premium", "category": "3D CAD + Simulation", "matchScore": 90, "rationale": "Why this product fits their needs", "valueProposition": "How it will help them specifically"},
    {"productId": "camworks", "productName": "CAMWorks", "category": "CAM / Manufacturing", "matchScore": 85, "rationale": "Why CAMWorks", "valueProposition": "Specific value"}
  ],
  
  "techStackIntel": [
    "Current CAD tool they likely use",
    "Manufacturing systems",
    "Data management approach",
    "Other relevant technology"
  ],
  
  "buyingTriggers": [
    "Why they would buy NOW - be specific",
    "Recent event that creates urgency",
    "Business pressure or deadline"
  ],
  
  "contactBackground": "2-3 paragraphs about this person based on the CONTACT LINKEDIN DATA above - their career path, expertise, and what drives them",
  
  "careerHistory": [
    {"title": "Current Title", "company": "Current Company", "duration": "2 years", "relevance": "Why this experience matters for our conversation"},
    {"title": "Previous Title", "company": "Previous Company", "duration": "3 years", "relevance": "Relevant experience"}
  ],
  
  "professionalInterests": ["Design efficiency", "Manufacturing automation", "Team productivity", "specific interests based on their role"],
  
  "decisionMakingStyle": "How this person likely makes decisions based on their role and background",
  
  "commonGround": [
    "Specific conversation starter based on their background",
    "Shared interest or connection point",
    "Reference to their work or company achievement"
  ],
  
  "openingLine": "A personalized 2-3 sentence opener that references something SPECIFIC about them or their company from the scraped data. Make it conversational.",
  
  "talkTrack": [
    "Key value proposition 1 tailored to their situation",
    "Key value proposition 2",
    "Key value proposition 3"
  ],
  
  "discoveryQuestions": [
    "Strategic question 1 to uncover needs",
    "Question 2 about current challenges",
    "Question 3 about decision process",
    "Question 4 about timeline",
    "Question 5 about budget/priorities"
  ],
  
  "objectionHandles": [
    {"objection": "We're happy with our current tools", "response": "Specific response referencing their situation"},
    {"objection": "Budget is tight", "response": "ROI-focused response"},
    {"objection": "Too busy to switch", "response": "Migration support response"},
    {"objection": "Need to involve others", "response": "Champion enablement response"}
  ],
  
  "theAsk": "The specific next step to propose based on their likely readiness and situation",
  
  "fitScore": 0-100 STRICT SCORING (follow Lead Scoring Parameters doc if provided above):
    - Industry fit (25 pts max): Manufacturing/engineering = 20-25, Other industrial = 10-15, Non-industrial/unknown = 0-5
    - Company size (20 pts max): 50-500 employees = 20, 501-2000 = 15, 10-49 = 10, <10 or unknown = 0-5
    - Pain signals (25 pts max): Clear CAD/PDM/CAM pain = 20-25, Implied pain = 10-15, No signals = 0-5
    - Tech readiness (15 pts max): Using competitor CAD (AutoCAD/Inventor/Creo) = 12-15, Unknown/no CAD = 5-8, Already SOLIDWORKS = 0-3
    - Buying triggers (15 pts max): Active project/expansion/deadline = 12-15, General interest = 5-8, No triggers = 0-3
    
    PENALTIES (subtract from total):
    - Gmail/personal email with unknown company: -30 points (likely not a real business lead)
    - No company website found: -15 points
    - Contact title unknown or vague: -10 points
    - No industry information: -10 points
    - Company name appears to be a person's name: -25 points (not a valid company)
    
    MINIMUM SCORE IS 0. Maximum is 100. Be CONSERVATIVE with scores.
    A score above 70 should ONLY be given to leads with: clear industry fit, known company size, verified pain signals, and buying triggers.
    Most leads with incomplete data should score between 20-50.
  
  "fitScoreBreakdown": "Detailed breakdown showing points awarded for each factor AND any penalties applied",
  
  "priority": "hot (80-100 - RARE, only verified high-quality leads), warm (60-79 - good potential with some gaps), cool (40-59 - needs more discovery), or cold (0-39 - low quality or incomplete data)",
  
  "linkedInUrl": "LinkedIn profile URL from scraped data or found via search",
  "phoneNumber": "Phone number if found",
  "jobTitle": "Accurate job title from LinkedIn data",
  "companyWebsite": "Company website URL - VERY IMPORTANT: Always include if found from scraped data or search",
  "companyAddress": "Company headquarters address if found",
  
  "confidenceAssessment": {
    "overall": "high/medium/low - Your overall confidence that this research is about the CORRECT company and person",
    "companyInfoConfidence": "high/medium/low - Confidence that company information is accurate and about the right entity",
    "contactInfoConfidence": "high/medium/low - Confidence that contact information matches the right person at this company",
    "reasoning": "Explain WHY you assigned these confidence levels. Be specific about what evidence supports or undermines confidence.",
    "warnings": [
      "List any red flags or concerns about data accuracy",
      "Examples: 'Multiple companies with similar names found', 'Contact may have left company', 'Website domain doesn't match company name', 'Limited verifiable sources'"
    ]
  }
}

CONFIDENCE ASSESSMENT GUIDELINES:
- HIGH confidence: Multiple corroborating sources (website, LinkedIn, news), company domain matches email domain, recent activity confirms current employment
- MEDIUM confidence: Some verification but gaps exist (e.g., LinkedIn found but not recently updated, company website found but contact not mentioned)
- LOW confidence: Significant uncertainty (e.g., common company name with multiple entities, no verifiable website, contact might have wrong company, generic email domain)

BE HONEST about uncertainty. It's better to flag potential issues than give false confidence.

BE THOROUGH. Use the pre-scraped data as your primary source.`;

  console.log(`[LeadResearch] Calling Claude for dossier generation...`);
  console.log(`[LeadResearch] Prompt length: ${prompt.length} chars`);

  const text = await callClaudeWithRetry({
    prompt,
    systemPrompt: "You are an expert B2B sales intelligence analyst preparing comprehensive dossiers for sales calls. Always respond with valid JSON only, no markdown code blocks.",
    maxTokens: 8000,
    temperature: 0.7
  });
  
  console.log(`[LeadResearch] Raw dossier response length: ${text.length}`);
  
  const raw = extractJsonFromResponse(text) as Record<string, unknown>;
  
  let aiScore = typeof raw.fitScore === "number" ? raw.fitScore : 50;
  const penaltyBreakdown: string[] = [];
  
  const emailDomain = lead.contactEmail.split("@")[1]?.toLowerCase() || "";
  const genericDomains = ["gmail.com", "hotmail.com", "live.com", "outlook.com", "yahoo.com", "aol.com", "icloud.com", "mail.com", "protonmail.com", "zoho.com"];
  const isGenericEmail = genericDomains.includes(emailDomain);
  
  if (isGenericEmail) {
    aiScore -= 30;
    penaltyBreakdown.push("-30: Gmail/personal email domain");
  }
  
  if (!lead.companyWebsite && !scraped.scrapedIntel.website) {
    aiScore -= 15;
    penaltyBreakdown.push("-15: No company website found");
  }
  
  if (!lead.contactTitle && !scraped.contactLinkedIn?.currentTitle) {
    aiScore -= 10;
    penaltyBreakdown.push("-10: Contact title unknown");
  }
  
  if (!lead.companyIndustry) {
    aiScore -= 10;
    penaltyBreakdown.push("-10: No industry information");
  }
  
  const companyNameLower = lead.companyName.toLowerCase();
  const contactNameParts = lead.contactName.toLowerCase().split(" ");
  const looksLikePersonName = contactNameParts.some(part => 
    companyNameLower.includes(part) && part.length > 2
  );
  
  if (looksLikePersonName) {
    aiScore -= 25;
    penaltyBreakdown.push("-25: Company name appears to be a person's name");
  }
  
  const finalScore = Math.max(0, Math.min(100, aiScore));
  
  let adjustedPriority: "hot" | "warm" | "cool" | "cold";
  if (finalScore >= 80) adjustedPriority = "hot";
  else if (finalScore >= 60) adjustedPriority = "warm";
  else if (finalScore >= 40) adjustedPriority = "cool";
  else adjustedPriority = "cold";
  
  const fullBreakdown = penaltyBreakdown.length > 0 
    ? `AI Score: ${raw.fitScore || 50}\nPenalties Applied:\n${penaltyBreakdown.join("\n")}\nFinal Score: ${finalScore}\n\n${raw.fitScoreBreakdown || ""}`
    : (raw.fitScoreBreakdown as string) || "";
  
  const confidenceFromAI = (raw.confidenceAssessment || {}) as Record<string, unknown>;
  const confidenceAssessment: ConfidenceAssessment = {
    overall: (["high", "medium", "low"].includes(confidenceFromAI.overall as string) ? confidenceFromAI.overall : "medium") as "high" | "medium" | "low",
    companyInfoConfidence: (["high", "medium", "low"].includes(confidenceFromAI.companyInfoConfidence as string) ? confidenceFromAI.companyInfoConfidence : "medium") as "high" | "medium" | "low",
    contactInfoConfidence: (["high", "medium", "low"].includes(confidenceFromAI.contactInfoConfidence as string) ? confidenceFromAI.contactInfoConfidence : "medium") as "high" | "medium" | "low",
    reasoning: (confidenceFromAI.reasoning as string) || "Confidence assessment not provided by AI",
    warnings: Array.isArray(confidenceFromAI.warnings) ? (confidenceFromAI.warnings as string[]).filter((w: string) => w && !w.startsWith("Examples:")) : []
  };

  const dossier: LeadDossier = {
    companySummary: (raw.companySummary as string) || "",
    companyNews: Array.isArray(raw.companyNews) ? raw.companyNews as string[] : [],
    painPoints: Array.isArray(raw.painPoints) ? raw.painPoints as PainPoint[] : [],
    productMatches: Array.isArray(raw.productMatches) ? raw.productMatches as ProductMatch[] : [],
    techStackIntel: Array.isArray(raw.techStackIntel) ? raw.techStackIntel as string[] : [],
    buyingTriggers: Array.isArray(raw.buyingTriggers) ? raw.buyingTriggers as string[] : [],
    
    contactBackground: (raw.contactBackground as string) || "",
    careerHistory: Array.isArray(raw.careerHistory) ? raw.careerHistory as CareerHistoryItem[] : [],
    professionalInterests: Array.isArray(raw.professionalInterests) ? raw.professionalInterests as string[] : [],
    decisionMakingStyle: (raw.decisionMakingStyle as string) || "",
    
    commonGround: Array.isArray(raw.commonGround) ? raw.commonGround as string[] : [],
    openingLine: (raw.openingLine as string) || "",
    talkTrack: Array.isArray(raw.talkTrack) ? raw.talkTrack as string[] : [],
    discoveryQuestions: Array.isArray(raw.discoveryQuestions) ? raw.discoveryQuestions as string[] : [],
    objectionHandles: Array.isArray(raw.objectionHandles) ? raw.objectionHandles as Array<{ objection: string; response: string }> : [],
    theAsk: (raw.theAsk as string) || "",
    
    fitScore: finalScore,
    fitScoreBreakdown: fullBreakdown,
    priority: adjustedPriority,
    
    sources: scraped.scrapedIntel.sources.join(" | ") + " | Claude AI",
    linkedInUrl: scraped.contactLinkedIn?.linkedInUrl || (raw.linkedInUrl as string),
    phoneNumber: phoneFromScrape || (raw.phoneNumber as string),
    jobTitle: scraped.contactLinkedIn?.currentTitle || (raw.jobTitle as string),
    companyWebsite: lead.companyWebsite || scraped.scrapedIntel.website?.url || (raw.companyWebsite as string),
    companyAddress: raw.companyAddress as string,
    confidenceAssessment
  };
  
  console.log(`[LeadResearch] Dossier generated. AI Score: ${raw.fitScore || 50}, Penalties: ${penaltyBreakdown.length}, Final: ${finalScore}, Priority: ${adjustedPriority}, Confidence: ${confidenceAssessment.overall}`);
  
  return dossier;
}

export interface ResearchResult {
  packet: InsertResearchPacket;
  discoveredInfo: {
    linkedInUrl?: string;
    phoneNumber?: string;
    jobTitle?: string;
    companyWebsite?: string;
  };
  structuredData: {
    dossier: LeadDossier;
    xIntel: XIntelResult;
    linkedInProfile: LinkedInProfile;
    companyHardIntel: CompanyHardIntel;
  };
}

export async function researchLead(lead: Lead): Promise<ResearchResult> {
  console.log(`[LeadResearch] Starting parallel research for ${lead.contactName} at ${lead.companyName}`);
  
  const preScraped = await gatherAllIntelInParallel(lead);
  
  const dossier = await generateLeadDossier(lead, preScraped);
  
  const linkedInProfile = formatContactLinkedInAsProfile(preScraped.contactLinkedIn);

  console.log(`[LeadResearch] All research completed. Fit score: ${dossier.fitScore}, Priority: ${dossier.priority}`);

  const companyIntel = [
    dossier.companySummary,
    "",
    "## Recent News",
    ...dossier.companyNews.map(n => `- ${n}`),
    "",
    "## Tech Stack",
    ...dossier.techStackIntel.map(t => `- ${t}`),
    "",
    "## Buying Triggers",
    ...dossier.buyingTriggers.map(b => `- ${b}`)
  ].join("\n");

  const contactIntel = [
    dossier.contactBackground,
    "",
    "## Career History",
    ...dossier.careerHistory.map(c => `- ${c.title} at ${c.company} (${c.duration}): ${c.relevance}`),
    "",
    "## Professional Interests",
    dossier.professionalInterests.join(", "),
    "",
    "## Decision Making Style",
    dossier.decisionMakingStyle,
    "",
    "## Common Ground",
    ...dossier.commonGround.map(c => `- ${c}`)
  ].join("\n");

  const painSignals = dossier.painPoints.map(p => 
    `[${p.severity.toUpperCase()}] ${p.pain} → ${p.hawkRidgeSolution}`
  ).join("\n");

  const fitAnalysis = [
    `Fit Score: ${dossier.fitScore}/100`,
    `Priority: ${dossier.priority.toUpperCase()}`,
    "",
    "## Score Breakdown",
    dossier.fitScoreBreakdown,
    "",
    "## Product Matches",
    ...dossier.productMatches.map(p => 
      `- ${p.productName} (${p.matchScore}%): ${p.rationale}`
    )
  ].join("\n");

  const talkTrack = [
    "## Opening Line",
    dossier.openingLine,
    "",
    "## Key Value Propositions",
    ...dossier.talkTrack.map((t, i) => `${i + 1}. ${t}`),
    "",
    "## The Ask",
    dossier.theAsk
  ].join("\n");

  const discoveryQuestions = dossier.discoveryQuestions.join("\n");

  const objectionHandles = dossier.objectionHandles.map(o => 
    `**${o.objection}**\n${o.response}`
  ).join("\n\n");

  const packet: InsertResearchPacket = {
    leadId: lead.id,
    companyIntel,
    contactIntel,
    painSignals,
    competitorPresence: dossier.techStackIntel.join(", "),
    fitAnalysis,
    fitScore: dossier.fitScore,
    priority: dossier.priority,
    talkTrack,
    discoveryQuestions,
    objectionHandles,
    companyHardIntel: formatCompanyHardIntel(preScraped.companyHardIntel),
    xIntel: formatXIntel(preScraped.xIntel),
    linkedInIntel: formatLinkedInIntel(linkedInProfile),
    sources: dossier.sources,
    verificationStatus: "ai_generated",
    painPointsJson: dossier.painPoints,
    productMatchesJson: dossier.productMatches,
    linkedInProfileJson: linkedInProfile,
    xIntelJson: preScraped.xIntel,
    careerHistoryJson: dossier.careerHistory,
    dossierJson: dossier
  };

  return {
    packet,
    discoveredInfo: {
      linkedInUrl: linkedInProfile.profileUrl || dossier.linkedInUrl,
      phoneNumber: dossier.phoneNumber,
      jobTitle: linkedInProfile.currentPosition?.title || dossier.jobTitle,
      companyWebsite: dossier.companyWebsite
    },
    structuredData: {
      dossier,
      xIntel: preScraped.xIntel,
      linkedInProfile,
      companyHardIntel: preScraped.companyHardIntel
    }
  };
}
