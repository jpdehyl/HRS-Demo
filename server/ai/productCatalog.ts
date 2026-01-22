// BSA Solutions Service Catalog
// Talent outsourcing services from Philippines and Malaysia

export interface BSAService {
  id: string;
  name: string;
  category: string;
  description: string;
  idealFor: string[];
  painPointsSolved: string[];
  industries: string[];
  companySizeMatch: string[];
  keywords: string[];
  engagementModel: 'shared' | 'dedicated' | 'build-transfer';
  typicalTeamSize: string;
  monthlyPriceRange: string;
}

export const BSA_SERVICES: BSAService[] = [
  {
    id: "customer-support-team",
    name: "Customer Support Team",
    category: "Customer Experience",
    description: "Dedicated or shared customer service representatives handling phone, email, and chat support with 24/7 coverage options",
    idealFor: ["E-commerce businesses with high ticket volume", "SaaS companies scaling support", "Service businesses needing 24/7 coverage"],
    painPointsSolved: ["Long customer response times", "High support costs", "Inability to provide 24/7 coverage", "Scaling support during peak seasons", "Customer satisfaction issues"],
    industries: ["E-Commerce", "SaaS", "Healthcare", "Financial Services", "Hospitality", "Retail"],
    companySizeMatch: ["10-50", "51-200", "201-500", "500+"],
    keywords: ["customer service", "support", "help desk", "chat support", "call center", "tickets", "zendesk", "intercom", "freshdesk"],
    engagementModel: "dedicated",
    typicalTeamSize: "3-15 agents",
    monthlyPriceRange: "$1,500-$3,000/agent"
  },
  {
    id: "virtual-assistant-team",
    name: "Virtual Assistant Team",
    category: "Administrative Support",
    description: "Executive and administrative assistants handling scheduling, email management, research, travel coordination, and general admin tasks",
    idealFor: ["Busy executives needing leverage", "Growing teams without admin support", "Entrepreneurs wearing too many hats"],
    painPointsSolved: ["Executive time wasted on admin tasks", "No administrative support budget", "Calendar chaos and scheduling conflicts", "Email overload", "Research bottlenecks"],
    industries: ["All Industries", "Professional Services", "Real Estate", "Consulting", "Technology", "Healthcare"],
    companySizeMatch: ["1-10", "10-50", "51-200"],
    keywords: ["virtual assistant", "admin", "executive assistant", "scheduling", "email management", "calendar", "travel", "research"],
    engagementModel: "dedicated",
    typicalTeamSize: "1-5 VAs",
    monthlyPriceRange: "$1,200-$2,500/VA"
  },
  {
    id: "accounting-finance-team",
    name: "Accounting & Finance Team",
    category: "Finance Operations",
    description: "Bookkeepers, accountants, and financial analysts handling AP/AR, reconciliation, financial reporting, and analysis",
    idealFor: ["Companies outgrowing part-time bookkeepers", "Businesses needing better financial visibility", "CFOs wanting to focus on strategy"],
    painPointsSolved: ["Backlogged bookkeeping", "Inaccurate financial data", "Slow monthly close process", "Lack of financial insights", "High cost of local accountants"],
    industries: ["E-Commerce", "Professional Services", "Real Estate", "Manufacturing", "Retail", "SaaS"],
    companySizeMatch: ["10-50", "51-200", "201-500"],
    keywords: ["bookkeeping", "accounting", "finance", "AP", "AR", "reconciliation", "quickbooks", "xero", "netsuite", "financial reporting"],
    engagementModel: "dedicated",
    typicalTeamSize: "2-8 staff",
    monthlyPriceRange: "$1,800-$3,500/accountant"
  },
  {
    id: "digital-marketing-team",
    name: "Digital Marketing Team",
    category: "Marketing & Growth",
    description: "Social media managers, content creators, PPC specialists, and SEO experts driving online growth and brand awareness",
    idealFor: ["Brands building online presence", "Companies scaling paid acquisition", "Businesses needing content at scale"],
    painPointsSolved: ["Inconsistent social media presence", "High agency fees", "Slow content production", "Poor ad performance", "SEO neglected"],
    industries: ["E-Commerce", "SaaS", "Consumer Brands", "Real Estate", "Hospitality", "Professional Services"],
    companySizeMatch: ["10-50", "51-200", "201-500"],
    keywords: ["social media", "content", "seo", "ppc", "marketing", "ads", "facebook", "instagram", "tiktok", "google ads", "content marketing"],
    engagementModel: "dedicated",
    typicalTeamSize: "2-6 specialists",
    monthlyPriceRange: "$1,500-$3,000/specialist"
  },
  {
    id: "software-development-team",
    name: "Software Development Team",
    category: "Technology",
    description: "Full-stack developers, QA engineers, and DevOps specialists building and maintaining software applications",
    idealFor: ["Startups extending runway", "Companies with dev hiring challenges", "Businesses needing specific tech skills"],
    painPointsSolved: ["High developer salaries in US/UK", "Slow hiring for tech roles", "Lack of specific skill sets", "Development backlogs", "QA bottlenecks"],
    industries: ["Technology", "SaaS", "FinTech", "HealthTech", "E-Commerce"],
    companySizeMatch: ["10-50", "51-200", "201-500", "500+"],
    keywords: ["developer", "software", "engineering", "full-stack", "qa", "testing", "devops", "react", "node", "python", "aws", "mobile"],
    engagementModel: "dedicated",
    typicalTeamSize: "3-12 developers",
    monthlyPriceRange: "$2,500-$5,000/developer"
  },
  {
    id: "data-entry-processing",
    name: "Data Entry & Processing Team",
    category: "Back Office Operations",
    description: "Data entry specialists handling high-volume processing, data cleansing, document management, and digitization",
    idealFor: ["Companies with data backlogs", "Businesses needing accurate data entry", "Organizations digitizing records"],
    painPointsSolved: ["Data entry backlogs", "Poor data quality", "Expensive local data entry staff", "Slow document processing", "Inconsistent data formats"],
    industries: ["Healthcare", "Insurance", "Real Estate", "Legal", "Financial Services", "Logistics"],
    companySizeMatch: ["51-200", "201-500", "500+"],
    keywords: ["data entry", "data processing", "document management", "digitization", "data cleansing", "scanning", "indexing"],
    engagementModel: "shared",
    typicalTeamSize: "5-20 specialists",
    monthlyPriceRange: "$1,000-$1,800/specialist"
  },
  {
    id: "ecommerce-operations",
    name: "E-Commerce Operations Team",
    category: "E-Commerce",
    description: "Product listing specialists, inventory managers, and marketplace coordinators for online retail operations",
    idealFor: ["Amazon/eBay sellers scaling operations", "Shopify store owners", "Multi-channel retailers"],
    painPointsSolved: ["Product listing backlogs", "Inventory management chaos", "Poor marketplace optimization", "Slow catalog updates", "Order processing delays"],
    industries: ["E-Commerce", "Retail", "Consumer Products", "Wholesale", "Dropshipping"],
    companySizeMatch: ["10-50", "51-200", "201-500"],
    keywords: ["amazon", "ebay", "shopify", "product listing", "inventory", "ecommerce", "marketplace", "catalog", "order management"],
    engagementModel: "dedicated",
    typicalTeamSize: "2-10 specialists",
    monthlyPriceRange: "$1,300-$2,500/specialist"
  },
  {
    id: "graphic-design-team",
    name: "Graphic Design & Creative Team",
    category: "Creative Services",
    description: "Graphic designers, video editors, and creative specialists producing visual content for marketing and branding",
    idealFor: ["Brands needing consistent visuals", "Marketing teams with design bottlenecks", "Agencies needing overflow capacity"],
    painPointsSolved: ["Design bottlenecks slowing campaigns", "Inconsistent brand visuals", "High freelancer costs", "Slow creative turnaround", "Video content gaps"],
    industries: ["Marketing Agencies", "E-Commerce", "Consumer Brands", "Media", "Real Estate", "SaaS"],
    companySizeMatch: ["10-50", "51-200", "201-500"],
    keywords: ["graphic design", "video editing", "creative", "photoshop", "illustrator", "canva", "video", "branding", "social media graphics"],
    engagementModel: "dedicated",
    typicalTeamSize: "2-8 designers",
    monthlyPriceRange: "$1,400-$2,800/designer"
  },
  {
    id: "recruitment-hr-team",
    name: "Recruitment & HR Support Team",
    category: "Human Resources",
    description: "Recruiters, sourcers, and HR coordinators supporting talent acquisition and HR operations",
    idealFor: ["Fast-growing companies with hiring needs", "Staffing agencies", "Companies with high-volume hiring"],
    painPointsSolved: ["Slow time-to-hire", "High recruitment agency fees", "Limited sourcing capacity", "HR admin overload", "Candidate screening bottlenecks"],
    industries: ["Technology", "Staffing", "Healthcare", "Professional Services", "Retail", "Hospitality"],
    companySizeMatch: ["51-200", "201-500", "500+"],
    keywords: ["recruiting", "sourcing", "hr", "talent acquisition", "hiring", "linkedin recruiter", "ats", "onboarding", "screening"],
    engagementModel: "dedicated",
    typicalTeamSize: "2-6 recruiters",
    monthlyPriceRange: "$1,600-$3,000/recruiter"
  },
  {
    id: "technical-support-team",
    name: "Technical Support Team",
    category: "IT & Technical Support",
    description: "Tier 1-2 technical support specialists handling software troubleshooting, IT help desk, and product support",
    idealFor: ["SaaS companies with technical products", "IT service providers", "Tech companies with product support needs"],
    painPointsSolved: ["Long ticket resolution times", "High technical support costs", "Lack of technical expertise", "24/7 coverage gaps", "Escalation bottlenecks"],
    industries: ["SaaS", "Technology", "IT Services", "Telecommunications", "Software"],
    companySizeMatch: ["51-200", "201-500", "500+"],
    keywords: ["tech support", "it support", "help desk", "troubleshooting", "tier 1", "tier 2", "technical", "software support", "IT helpdesk"],
    engagementModel: "dedicated",
    typicalTeamSize: "3-10 specialists",
    monthlyPriceRange: "$1,800-$3,200/specialist"
  },
  {
    id: "sales-development-team",
    name: "Sales Development Team",
    category: "Sales & Revenue",
    description: "SDRs, lead researchers, and appointment setters supporting sales pipeline generation and qualification",
    idealFor: ["B2B companies scaling outbound", "Sales teams with lead gen bottlenecks", "Companies entering new markets"],
    painPointsSolved: ["Empty sales pipeline", "AEs doing prospecting instead of closing", "High cost per meeting", "Inconsistent outreach", "Lead research taking too long"],
    industries: ["SaaS", "Technology", "Professional Services", "Financial Services", "Manufacturing", "B2B Services"],
    companySizeMatch: ["51-200", "201-500", "500+"],
    keywords: ["sdr", "sales development", "lead generation", "prospecting", "appointment setting", "cold calling", "outbound", "sales", "pipeline"],
    engagementModel: "dedicated",
    typicalTeamSize: "3-8 SDRs",
    monthlyPriceRange: "$1,800-$3,200/SDR"
  },
  {
    id: "build-transfer-program",
    name: "Build & Transfer Program",
    category: "Strategic Outsourcing",
    description: "Full offshore team establishment with eventual ownership transfer - BSA builds and operates your team until you're ready to take over",
    idealFor: ["Companies wanting their own offshore presence", "Businesses planning long-term expansion", "Organizations wanting full control eventually"],
    painPointsSolved: ["Want offshore but need guidance to start", "Don't know how to set up foreign entity", "Need experienced management during ramp", "Want eventual full ownership and control"],
    industries: ["All Industries"],
    companySizeMatch: ["201-500", "500+"],
    keywords: ["build transfer", "captive center", "offshore operations", "gbs", "shared services", "subsidiary", "expansion"],
    engagementModel: "build-transfer",
    typicalTeamSize: "15-100+ staff",
    monthlyPriceRange: "Custom pricing"
  }
];

export function matchServicesToLead(
  industry: string | null,
  companySize: string | null,
  painPoints: string[],
  operationalNeeds: string[]
): Array<{ service: BSAService; score: number; rationale: string }> {
  const matches: Array<{ service: BSAService; score: number; rationale: string }> = [];

  for (const service of BSA_SERVICES) {
    let score = 0;
    const reasons: string[] = [];

    // Industry alignment (25 points)
    if (industry && service.industries.some(i =>
      i.toLowerCase().includes(industry.toLowerCase()) ||
      industry.toLowerCase().includes(i.toLowerCase()) ||
      i === "All Industries"
    )) {
      score += 25;
      reasons.push(`Industry match: ${industry}`);
    }

    // Company size fit (20 points)
    if (companySize && service.companySizeMatch.some(size => {
      if (size === "500+") return parseInt(companySize) >= 500;
      const [min, max] = size.split("-").map(Number);
      const sizeNum = parseInt(companySize);
      return sizeNum >= min && sizeNum <= max;
    })) {
      score += 20;
      reasons.push(`Company size fit`);
    }

    // Pain point matching (35 points max)
    const matchedPainPoints = painPoints.filter(pain =>
      service.painPointsSolved.some(solved =>
        pain.toLowerCase().includes(solved.toLowerCase()) ||
        solved.toLowerCase().includes(pain.toLowerCase())
      ) ||
      service.keywords.some(keyword =>
        pain.toLowerCase().includes(keyword)
      )
    );
    if (matchedPainPoints.length > 0) {
      score += Math.min(matchedPainPoints.length * 15, 35);
      reasons.push(`Addresses: ${matchedPainPoints.slice(0, 2).join(", ")}`);
    }

    // Operational needs alignment (20 points)
    const operationalMatches = operationalNeeds.filter(need =>
      service.keywords.some(keyword =>
        need.toLowerCase().includes(keyword) ||
        keyword.includes(need.toLowerCase())
      )
    );
    if (operationalMatches.length > 0) {
      score += 20;
      reasons.push(`Operational fit: ${operationalMatches.slice(0, 2).join(", ")}`);
    }

    if (score >= 30) {
      matches.push({
        service,
        score: Math.min(score, 100),
        rationale: reasons.join(". ")
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}

export function getServiceCatalogPrompt(): string {
  return `BSA SOLUTIONS SERVICE CATALOG:

BSA Solutions is a talent outsourcing company providing skilled professionals from the Philippines and Malaysia. We offer three engagement models:
- Shared Agents: Cost-effective, 24/7 coverage with agents handling multiple clients
- Dedicated Agents: Exclusive team members working full-time for one client
- Build & Transfer: Establish your own offshore operation with eventual ownership transfer

${BSA_SERVICES.map(s => `
**${s.name}** (${s.category})
- ${s.description}
- Engagement Model: ${s.engagementModel}
- Typical Team Size: ${s.typicalTeamSize}
- Investment: ${s.monthlyPriceRange}
- Ideal for: ${s.idealFor.join(", ")}
- Pain points solved: ${s.painPointsSolved.join(", ")}
- Best industries: ${s.industries.join(", ")}
`).join("\n")}

When matching services to prospects, consider:
1. Industry alignment (25 points)
2. Company size fit (20 points)
3. Pain points addressed (35 points)
4. Operational needs alignment (20 points)

Key differentiators to emphasize:
- 60-70% cost savings vs. US/UK talent
- Great Place to Work certified (talent quality)
- Flexible engagement models (start small, scale up)
- Philippines: 95% English proficiency, cultural alignment with West
- Build & Transfer for companies wanting eventual ownership
`;
}

// Backward compatibility aliases
export type HawkRidgeProduct = BSAService;
export const HAWK_RIDGE_PRODUCTS = BSA_SERVICES;
export const matchProductsToLead = (
  industry: string | null,
  companySize: string | null,
  painPoints: string[],
  techStack: string[]
) => {
  const results = matchServicesToLead(industry, companySize, painPoints, techStack);
  // Map 'service' to 'product' for backward compatibility
  return results.map(r => ({ product: r.service, score: r.score, rationale: r.rationale }));
};
export const getProductCatalogPrompt = getServiceCatalogPrompt;
