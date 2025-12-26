import { GoogleGenAI } from "@google/genai";
import type { Lead, InsertResearchPacket } from "@shared/schema";
import { researchLeadOnX, formatXIntel, type XIntelResult } from "./xResearch";
import { researchContactLinkedIn, formatLinkedInIntel, type LinkedInProfile } from "./linkedInResearch";
import { gatherCompanyHardIntel, formatCompanyHardIntel, type CompanyHardIntel } from "./companyHardIntel";
import { HAWK_RIDGE_PRODUCTS, getProductCatalogPrompt, matchProductsToLead } from "./productCatalog";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

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
}

export async function generateLeadDossier(lead: Lead): Promise<LeadDossier> {
  const prompt = `You are an expert B2B sales intelligence analyst preparing a COMPREHENSIVE dossier for a sales call to sell Hawk Ridge Systems solutions.

${HAWK_RIDGE_CONTEXT}

LEAD INFORMATION:
- Contact Name: ${lead.contactName}
- Job Title: ${lead.contactTitle || "Unknown"}
- Company: ${lead.companyName}
- Industry: ${lead.companyIndustry || "Unknown"}
- Company Size: ${lead.companySize || "Unknown"}
- Website: ${lead.companyWebsite || "Unknown"}
- LinkedIn: ${lead.contactLinkedIn || "Not provided"}
- Email Domain: ${lead.contactEmail.split("@")[1]}

RESEARCH THIS LEAD AND COMPANY THOROUGHLY. Search the web for recent news, company information, and professional background.

Return a JSON object with these EXACT keys:

{
  "companySummary": "2-3 paragraph detailed overview of what this company does, their products/services, market position, and recent developments",
  
  "companyNews": [
    "Recent news item 1 with date if known",
    "Recent news item 2",
    "Product launches, funding, expansions, etc."
  ],
  
  "painPoints": [
    {"pain": "Specific challenge they face", "severity": "high", "hawkRidgeSolution": "SOLIDWORKS Premium with Simulation"},
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
  
  "contactBackground": "2-3 paragraphs about this person's professional background, career path, expertise, and what drives them",
  
  "careerHistory": [
    {"title": "Current Title", "company": "Current Company", "duration": "2 years", "relevance": "Why this experience matters for our conversation"},
    {"title": "Previous Title", "company": "Previous Company", "duration": "3 years", "relevance": "Relevant experience"}
  ],
  
  "professionalInterests": ["Design efficiency", "Manufacturing automation", "Team productivity", "specific interests based on their role"],
  
  "decisionMakingStyle": "How this person likely makes decisions - data-driven, relationship-based, consensus-builder, etc. based on their role and background",
  
  "commonGround": [
    "Specific conversation starter based on their background",
    "Shared interest or connection point",
    "Reference to their work or company achievement"
  ],
  
  "openingLine": "A personalized 2-3 sentence opener that references something SPECIFIC about them or their company. Make it conversational and show you've done your research.",
  
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
  
  "fitScore": 0-100 based on: industry fit (25), company size (20), pain signals (25), tech readiness (15), buying triggers (15),
  
  "fitScoreBreakdown": "Detailed breakdown of how each factor contributed to the score",
  
  "priority": "hot (80-100), warm (60-79), cool (40-59), or cold (0-39)",
  
  "linkedInUrl": "LinkedIn profile URL if found",
  "phoneNumber": "Phone number if found",
  "jobTitle": "Accurate job title",
  "companyWebsite": "Company website URL",
  "companyAddress": "Company headquarters address if found"
}

BE THOROUGH. Search the web. Find real information. Make specific product recommendations based on their situation.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 6000,
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
    
    const dossier: LeadDossier = {
      companySummary: raw.companySummary || "",
      companyNews: Array.isArray(raw.companyNews) ? raw.companyNews : [],
      painPoints: Array.isArray(raw.painPoints) ? raw.painPoints : [],
      productMatches: Array.isArray(raw.productMatches) ? raw.productMatches : [],
      techStackIntel: Array.isArray(raw.techStackIntel) ? raw.techStackIntel : [],
      buyingTriggers: Array.isArray(raw.buyingTriggers) ? raw.buyingTriggers : [],
      
      contactBackground: raw.contactBackground || "",
      careerHistory: Array.isArray(raw.careerHistory) ? raw.careerHistory : [],
      professionalInterests: Array.isArray(raw.professionalInterests) ? raw.professionalInterests : [],
      decisionMakingStyle: raw.decisionMakingStyle || "",
      
      commonGround: Array.isArray(raw.commonGround) ? raw.commonGround : [],
      openingLine: raw.openingLine || "",
      talkTrack: Array.isArray(raw.talkTrack) ? raw.talkTrack : [],
      discoveryQuestions: Array.isArray(raw.discoveryQuestions) ? raw.discoveryQuestions : [],
      objectionHandles: Array.isArray(raw.objectionHandles) ? raw.objectionHandles : [],
      theAsk: raw.theAsk || "",
      
      fitScore: typeof raw.fitScore === "number" ? raw.fitScore : 50,
      fitScoreBreakdown: raw.fitScoreBreakdown || "",
      priority: ["hot", "warm", "cool", "cold"].includes(raw.priority) ? raw.priority : "cool",
      
      sources: "Gemini AI with web grounding",
      linkedInUrl: raw.linkedInUrl,
      phoneNumber: raw.phoneNumber,
      jobTitle: raw.jobTitle,
      companyWebsite: raw.companyWebsite,
      companyAddress: raw.companyAddress
    };
    
    return dossier;
  } catch (error) {
    console.error("[LeadResearch] Error generating dossier:", error);
    
    return {
      companySummary: `${lead.companyName} - ${lead.companyIndustry || "Industry unknown"}. Research pending.`,
      companyNews: [],
      painPoints: [{ pain: "Manual research recommended", severity: "medium", hawkRidgeSolution: "Discovery call needed" }],
      productMatches: [],
      techStackIntel: ["Check company website and job postings"],
      buyingTriggers: ["Needs discovery call to identify"],
      
      contactBackground: "Research pending - unable to generate at this time",
      careerHistory: [],
      professionalInterests: [],
      decisionMakingStyle: "Unknown - needs discovery",
      
      commonGround: ["Research pending"],
      openingLine: `Hi ${lead.contactName.split(" ")[0]}, I'm reaching out because we help companies like ${lead.companyName} streamline their design and manufacturing processes.`,
      talkTrack: ["Focus on design efficiency, manufacturing integration, and data management."],
      discoveryQuestions: [
        "What CAD tools are you currently using?",
        "What's your biggest challenge in product development?",
        "Are you looking to bring any manufacturing in-house?",
        "How do you currently manage design data and revisions?",
        "What's your timeline for making improvements to your design process?"
      ],
      objectionHandles: [
        { objection: "We're happy with our current tools", response: "Understood. Many of our customers felt the same before seeing a 30% improvement in design time. Would a quick comparison be valuable?" },
        { objection: "Budget is tight", response: "We offer flexible licensing and financing. Plus, customers typically see ROI within 6 months through efficiency gains." },
        { objection: "Too busy to switch", response: "We provide full migration support and training. Most teams are fully productive within 2 weeks." }
      ],
      theAsk: "I'd love to show you a quick demo tailored to your workflow. Do you have 20 minutes this week?",
      
      fitScore: 50,
      fitScoreBreakdown: "Default score - research unavailable",
      priority: "cool",
      
      sources: "Fallback template - AI research unavailable",
    };
  }
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
  
  const [dossier, xIntel, linkedInProfile, companyHardIntel] = await Promise.all([
    generateLeadDossier(lead),
    researchLeadOnX(lead),
    researchContactLinkedIn(lead),
    gatherCompanyHardIntel(lead)
  ]);

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
    companyHardIntel: formatCompanyHardIntel(companyHardIntel),
    xIntel: formatXIntel(xIntel),
    linkedInIntel: formatLinkedInIntel(linkedInProfile),
    sources: [
      dossier.sources,
      xIntel.error ? `X.com: ${xIntel.error}` : `X.com: ${xIntel.xHandle || "researched"}`,
      linkedInProfile.error ? `LinkedIn: ${linkedInProfile.error}` : `LinkedIn: ${linkedInProfile.profileUrl || "researched"}`
    ].join(" | "),
    verificationStatus: "ai_generated",
    painPointsJson: dossier.painPoints,
    productMatchesJson: dossier.productMatches,
    linkedInProfileJson: linkedInProfile,
    xIntelJson: xIntel,
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
      xIntel,
      linkedInProfile,
      companyHardIntel
    }
  };
}
