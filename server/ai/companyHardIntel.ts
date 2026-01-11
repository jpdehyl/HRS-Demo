import type { Lead } from "@shared/schema";
import { callClaudeWithRetry, extractJsonFromResponse } from "./claudeClient";

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

  const text = await callClaudeWithRetry({
    prompt,
    systemPrompt: "You are a business intelligence analyst. Return only valid JSON, no markdown code blocks.",
    maxTokens: 2000,
    temperature: 0.3
  });
  
  console.log(`[CompanyHardIntel] Raw response length: ${text.length}`);
  
  const raw = extractJsonFromResponse(text);
  const intel = raw as unknown as CompanyHardIntel;
  
  intel.keyExecutives = intel.keyExecutives || [];
  intel.competitors = intel.competitors || [];
  intel.recentNews = intel.recentNews || [];
  intel.certifications = intel.certifications || [];
  intel.techStack = intel.techStack || [];

  console.log(`[CompanyHardIntel] Completed hard intel for ${lead.companyName}`);
  
  return intel;
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
