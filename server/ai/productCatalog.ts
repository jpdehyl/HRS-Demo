export interface HawkRidgeProduct {
  id: string;
  name: string;
  category: string;
  description: string;
  idealFor: string[];
  painPointsSolved: string[];
  industries: string[];
  companySizeMatch: string[];
  keywords: string[];
}

export const HAWK_RIDGE_PRODUCTS: HawkRidgeProduct[] = [
  {
    id: "solidworks-standard",
    name: "SOLIDWORKS Standard",
    category: "3D CAD",
    description: "3D CAD software for part and assembly modeling with 2D drawings",
    idealFor: ["Engineers new to 3D CAD", "Small design teams", "Companies moving from 2D to 3D"],
    painPointsSolved: ["2D design limitations", "Slow design iteration", "Difficulty visualizing products"],
    industries: ["Manufacturing", "Consumer Products", "Industrial Machinery"],
    companySizeMatch: ["1-50", "51-200"],
    keywords: ["cad", "3d design", "mechanical design", "part modeling"]
  },
  {
    id: "solidworks-professional",
    name: "SOLIDWORKS Professional",
    category: "3D CAD",
    description: "Standard plus advanced productivity tools, design libraries, and collaboration features",
    idealFor: ["Growing engineering teams", "Companies needing design automation", "Teams sharing designs"],
    painPointsSolved: ["Design reuse inefficiencies", "Collaboration bottlenecks", "Tolerance analysis needs"],
    industries: ["Manufacturing", "Aerospace", "Medical Devices", "Automotive"],
    companySizeMatch: ["51-200", "201-500"],
    keywords: ["design automation", "toolbox", "ecad", "collaboration"]
  },
  {
    id: "solidworks-premium",
    name: "SOLIDWORKS Premium",
    category: "3D CAD + Simulation",
    description: "Professional plus simulation, advanced surfacing, and reverse engineering",
    idealFor: ["Companies needing FEA simulation", "Complex surface modeling", "Product validation"],
    painPointsSolved: ["Physical prototype costs", "Design validation delays", "Complex geometry challenges"],
    industries: ["Aerospace", "Medical Devices", "Automotive", "Consumer Electronics"],
    companySizeMatch: ["51-200", "201-500", "500+"],
    keywords: ["simulation", "fea", "cfd", "surfacing", "reverse engineering"]
  },
  {
    id: "camworks",
    name: "CAMWorks",
    category: "CAM / Manufacturing",
    description: "Intelligent CNC programming integrated with SOLIDWORKS",
    idealFor: ["Machine shops", "In-house manufacturing", "CNC operations"],
    painPointsSolved: ["Manual CNC programming", "Design-to-manufacturing gaps", "Machining errors"],
    industries: ["Manufacturing", "Aerospace", "Automotive", "Medical Devices"],
    companySizeMatch: ["1-50", "51-200", "201-500"],
    keywords: ["cnc", "machining", "cam", "manufacturing", "milling", "turning"]
  },
  {
    id: "solidworks-pdm",
    name: "SOLIDWORKS PDM Professional",
    category: "Data Management",
    description: "Product data management for version control, workflows, and secure data storage",
    idealFor: ["Teams needing version control", "Regulated industries", "Distributed engineering teams"],
    painPointsSolved: ["File management chaos", "Version control issues", "Compliance requirements", "Lost design data"],
    industries: ["Medical Devices", "Aerospace", "Defense", "Automotive"],
    companySizeMatch: ["51-200", "201-500", "500+"],
    keywords: ["pdm", "vault", "version control", "workflow", "compliance", "iso", "fda", "as9100"]
  },
  {
    id: "3dexperience",
    name: "3DEXPERIENCE Platform",
    category: "Cloud / PLM",
    description: "Cloud-based collaboration platform for design, simulation, and data management",
    idealFor: ["Global teams", "Cloud-first companies", "Full PLM needs"],
    painPointsSolved: ["Remote collaboration", "Legacy PLM costs", "Multi-site coordination"],
    industries: ["All industries", "Enterprise", "Global companies"],
    companySizeMatch: ["201-500", "500+"],
    keywords: ["cloud", "plm", "collaboration", "remote", "platform"]
  },
  {
    id: "solidworks-simulation",
    name: "SOLIDWORKS Simulation",
    category: "Simulation / Analysis",
    description: "FEA and CFD simulation for stress, thermal, and flow analysis",
    idealFor: ["Engineers validating designs", "Reducing physical testing", "Performance optimization"],
    painPointsSolved: ["Expensive physical prototypes", "Design failures in field", "Slow validation cycles"],
    industries: ["Aerospace", "Automotive", "Medical Devices", "Industrial Machinery"],
    companySizeMatch: ["51-200", "201-500", "500+"],
    keywords: ["fea", "cfd", "stress analysis", "thermal", "flow simulation", "structural"]
  },
  {
    id: "solidworks-electrical",
    name: "SOLIDWORKS Electrical",
    category: "Electrical Design",
    description: "Electrical schematic and 3D electrical design integrated with mechanical",
    idealFor: ["Mechatronics teams", "Machine builders", "Control panel designers"],
    painPointsSolved: ["Electrical-mechanical disconnect", "Wiring errors", "BOM inaccuracies"],
    industries: ["Industrial Machinery", "Automation", "Electronics", "Robotics"],
    companySizeMatch: ["51-200", "201-500"],
    keywords: ["electrical", "wiring", "schematics", "mechatronics", "control systems"]
  },
  {
    id: "stratasys-3dprinting",
    name: "Stratasys 3D Printers",
    category: "Additive Manufacturing",
    description: "Industrial FDM and PolyJet 3D printers for prototyping and production",
    idealFor: ["Rapid prototyping", "Tooling and fixtures", "End-use parts"],
    painPointsSolved: ["Long prototype lead times", "Expensive tooling", "Complex geometry production"],
    industries: ["Aerospace", "Automotive", "Medical", "Consumer Products"],
    companySizeMatch: ["51-200", "201-500", "500+"],
    keywords: ["3d printing", "additive", "prototyping", "fdm", "polyjet"]
  },
  {
    id: "markforged-3dprinting",
    name: "Markforged 3D Printers",
    category: "Additive Manufacturing",
    description: "Carbon fiber and metal 3D printing for strong functional parts",
    idealFor: ["Strong end-use parts", "Metal part replacement", "Tooling and fixtures"],
    painPointsSolved: ["Metal part costs", "Custom tooling needs", "Strength requirements"],
    industries: ["Manufacturing", "Defense", "Automotive", "Industrial"],
    companySizeMatch: ["51-200", "201-500"],
    keywords: ["carbon fiber", "metal printing", "strong parts", "tooling"]
  },
  {
    id: "driveworks",
    name: "DriveWorks Design Automation",
    category: "Automation",
    description: "Automate SOLIDWORKS designs and generate quotes for configure-to-order products",
    idealFor: ["Configure-to-order manufacturers", "Repetitive design work", "Sales automation"],
    painPointsSolved: ["Repetitive design tasks", "Quote generation delays", "Engineering bottlenecks"],
    industries: ["Industrial Machinery", "Furniture", "Building Products"],
    companySizeMatch: ["51-200", "201-500"],
    keywords: ["automation", "configurator", "rules-based", "quote generation"]
  },
  {
    id: "solidworks-composer",
    name: "SOLIDWORKS Composer",
    category: "Technical Communication",
    description: "Create technical documentation and interactive 3D content from CAD data",
    idealFor: ["Technical writers", "Training content creators", "Service documentation"],
    painPointsSolved: ["Outdated documentation", "Assembly instruction creation", "Training material needs"],
    industries: ["All manufacturing", "Defense", "Consumer Products"],
    companySizeMatch: ["51-200", "201-500", "500+"],
    keywords: ["documentation", "technical illustrations", "training", "assembly instructions"]
  }
];

export function matchProductsToLead(
  industry: string | null,
  companySize: string | null,
  painPoints: string[],
  techStack: string[]
): Array<{ product: HawkRidgeProduct; score: number; rationale: string }> {
  const matches: Array<{ product: HawkRidgeProduct; score: number; rationale: string }> = [];

  for (const product of HAWK_RIDGE_PRODUCTS) {
    let score = 0;
    const reasons: string[] = [];

    if (industry && product.industries.some(i => 
      i.toLowerCase().includes(industry.toLowerCase()) || 
      industry.toLowerCase().includes(i.toLowerCase()) ||
      i === "All industries"
    )) {
      score += 25;
      reasons.push(`Industry match: ${industry}`);
    }

    if (companySize && product.companySizeMatch.some(size => {
      if (size === "500+") return parseInt(companySize) >= 500;
      const [min, max] = size.split("-").map(Number);
      const sizeNum = parseInt(companySize);
      return sizeNum >= min && sizeNum <= max;
    })) {
      score += 20;
      reasons.push(`Company size fit`);
    }

    const matchedPainPoints = painPoints.filter(pain => 
      product.painPointsSolved.some(solved => 
        pain.toLowerCase().includes(solved.toLowerCase()) ||
        solved.toLowerCase().includes(pain.toLowerCase())
      ) ||
      product.keywords.some(keyword => 
        pain.toLowerCase().includes(keyword)
      )
    );
    if (matchedPainPoints.length > 0) {
      score += Math.min(matchedPainPoints.length * 15, 35);
      reasons.push(`Addresses: ${matchedPainPoints.slice(0, 2).join(", ")}`);
    }

    const techMatches = techStack.filter(tech =>
      product.keywords.some(keyword => 
        tech.toLowerCase().includes(keyword) ||
        keyword.includes(tech.toLowerCase())
      )
    );
    if (techMatches.length > 0) {
      score += 20;
      reasons.push(`Tech alignment: ${techMatches.slice(0, 2).join(", ")}`);
    }

    if (score >= 30) {
      matches.push({
        product,
        score: Math.min(score, 100),
        rationale: reasons.join(". ")
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, 5);
}

export function getProductCatalogPrompt(): string {
  return `HAWK RIDGE SYSTEMS PRODUCT CATALOG:

${HAWK_RIDGE_PRODUCTS.map(p => `
**${p.name}** (${p.category})
- ${p.description}
- Ideal for: ${p.idealFor.join(", ")}
- Pain points solved: ${p.painPointsSolved.join(", ")}
- Best industries: ${p.industries.join(", ")}
`).join("\n")}

When matching products, consider:
1. Industry alignment (25 points)
2. Company size fit (20 points) 
3. Pain points addressed (35 points)
4. Tech stack compatibility (20 points)
`;
}
