import { GoogleGenAI } from "@google/genai";
import type { Lead, InsertResearchPacket } from "@shared/schema";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const HAWK_RIDGE_CONTEXT = `
Hawk Ridge Systems is a leading provider of 3D design, manufacturing, and product data management solutions.

PRIMARY OFFERINGS:
1. SOLIDWORKS - 3D CAD design software for mechanical engineering
2. CAMWorks - Computer-aided manufacturing for CNC machining
3. 3D Printing / Additive Manufacturing - Stratasys, Desktop Metal, Markforged
4. Data Management - SOLIDWORKS PDM, 3DEXPERIENCE
5. Simulation - SOLIDWORKS Simulation, Flow Analysis
6. Technical Support & Training

TARGET INDUSTRIES:
- Aerospace & Defense
- Medical Devices
- Industrial Machinery
- Consumer Products
- Automotive
- Electronics

COMMON PAIN POINTS WE SOLVE:
- Legacy CAD systems (AutoCAD 2D, Pro/E, Inventor)
- Manual manufacturing processes
- Poor design collaboration
- Long product development cycles
- Prototype costs and delays
- Data management chaos
`;

export interface LeadDossier {
  personalBackground: string;
  commonGround: string;
  companyContext: string;
  painSignals: string;
  techStackIntel: string;
  buyingTriggers: string;
  hawkRidgeFit: string;
  talkTrack: string;
  discoveryQuestions: string;
  objectionHandles: string;
  sources: string;
  linkedInUrl?: string;
  phoneNumber?: string;
  jobTitle?: string;
  companyWebsite?: string;
}

export async function generateLeadDossier(lead: Lead): Promise<LeadDossier> {
  const prompt = `You are an expert B2B sales intelligence analyst preparing a comprehensive dossier for a sales call.

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

Research this lead and company thoroughly. Generate a comprehensive sales intelligence dossier with the following sections. Be specific and actionable.

Return a JSON object with these exact keys (each value should be a detailed string):

{
  "personalBackground": "Career history, education, interests, professional achievements. What drives this person professionally? What's their likely decision-making style?",
  
  "commonGround": "Specific conversation starters and rapport-building topics. Shared interests, connections, or experiences an SDR could reference. Be creative but professional.",
  
  "companyContext": "What does this company do? Recent news, funding, growth trajectory, key initiatives. What stage is the company at? What pressures is leadership under?",
  
  "painSignals": "Specific challenges this person/company likely faces that Hawk Ridge can solve. Look for: design bottlenecks, manufacturing inefficiencies, legacy software complaints, hiring for CAD roles, compliance requirements.",
  
  "techStackIntel": "Current tools they likely use (CAD software, PLM systems, manufacturing tech). Job postings, LinkedIn skills, website clues. What integrations matter?",
  
  "buyingTriggers": "Why would they buy NOW? Look for: new product launches, expansion, funding, new executives, competitive pressure, regulatory changes, fiscal year timing.",
  
  "hawkRidgeFit": "Which specific Hawk Ridge solutions match their needs? Prioritize 1-3 products with clear reasoning. Include relevant case studies or ROI points.",
  
  "talkTrack": "A personalized opening script (2-3 sentences) and 3 key value propositions tailored to this lead. Make it conversational, not salesy.",
  
  "discoveryQuestions": "5-7 strategic questions to uncover needs, budget, timeline, and decision process. Start broad, then get specific.",
  
  "objectionHandles": "Top 3 likely objections (price, timing, competition, change resistance) with specific response strategies.",
  
  "linkedInUrl": "The contact's LinkedIn profile URL if found (e.g., https://linkedin.com/in/username). Return null if not found.",
  
  "phoneNumber": "The contact's phone number if found. Return null if not found.",
  
  "jobTitle": "The contact's current job title if discovered. Return null if not found.",
  
  "companyWebsite": "The company's website URL if found. Return null if not found."
}

Be thorough but concise. Focus on actionable intelligence that helps close the sale.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 4000,
      },
    });

    const text = response.text || "";
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const dossier = JSON.parse(jsonMatch[0]) as LeadDossier;
    dossier.sources = "Gemini AI analysis based on available lead data";
    
    return dossier;
  } catch (error) {
    console.error("[LeadResearch] Error generating dossier:", error);
    
    return {
      personalBackground: "Research pending - unable to generate at this time",
      commonGround: "Research pending",
      companyContext: `${lead.companyName} - ${lead.companyIndustry || "Industry unknown"}`,
      painSignals: "Manual research recommended",
      techStackIntel: "Check company website and job postings",
      buyingTriggers: "Needs discovery call to identify",
      hawkRidgeFit: "Recommend SOLIDWORKS suite based on industry",
      talkTrack: `Hi ${lead.contactName.split(" ")[0]}, I'm reaching out because we help companies like ${lead.companyName} streamline their design and manufacturing processes.`,
      discoveryQuestions: "1. What CAD tools are you currently using?\n2. What's your biggest challenge in product development?\n3. Are you looking to bring any manufacturing in-house?",
      objectionHandles: "Focus on ROI and time savings. Offer pilot program.",
      sources: "Fallback template - AI research unavailable",
    };
  }
}

export function dossierToResearchPacket(leadId: string, dossier: LeadDossier): InsertResearchPacket {
  return {
    leadId,
    companyIntel: dossier.companyContext,
    contactIntel: dossier.personalBackground,
    painSignals: dossier.painSignals,
    competitorPresence: dossier.techStackIntel,
    fitAnalysis: dossier.hawkRidgeFit,
    talkTrack: dossier.talkTrack,
    discoveryQuestions: dossier.discoveryQuestions,
    objectionHandles: dossier.objectionHandles,
    companyHardIntel: `Common Ground: ${dossier.commonGround}\n\nBuying Triggers: ${dossier.buyingTriggers}`,
    sources: dossier.sources,
    verificationStatus: "ai_generated",
  };
}

export interface ResearchResult {
  packet: InsertResearchPacket;
  discoveredInfo: {
    linkedInUrl?: string;
    phoneNumber?: string;
    jobTitle?: string;
    companyWebsite?: string;
  };
}

export async function researchLead(lead: Lead): Promise<ResearchResult> {
  console.log(`[LeadResearch] Starting research for ${lead.contactName} at ${lead.companyName}`);
  
  const dossier = await generateLeadDossier(lead);
  const packet = dossierToResearchPacket(lead.id, dossier);
  
  console.log(`[LeadResearch] Completed research for ${lead.contactName}`);
  
  return {
    packet,
    discoveredInfo: {
      linkedInUrl: dossier.linkedInUrl && dossier.linkedInUrl !== "null" ? dossier.linkedInUrl : undefined,
      phoneNumber: dossier.phoneNumber && dossier.phoneNumber !== "null" ? dossier.phoneNumber : undefined,
      jobTitle: dossier.jobTitle && dossier.jobTitle !== "null" ? dossier.jobTitle : undefined,
      companyWebsite: dossier.companyWebsite && dossier.companyWebsite !== "null" ? dossier.companyWebsite : undefined,
    }
  };
}
