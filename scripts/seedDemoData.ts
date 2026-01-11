import { db } from "../server/db";
import { 
  users, managers, sdrs, accountExecutives, leads, 
  researchPackets, callSessions, managerCallAnalyses 
} from "../shared/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

const DEMO_PASSWORD = "demo2024";

const MANAGER_DATA = [
  { name: "Roberto Hernandez", email: "roberto.hernandez@hawkridge.com" },
  { name: "Carmen Delgado", email: "carmen.delgado@hawkridge.com" },
  { name: "Luis Morales", email: "luis.morales@hawkridge.com" },
];

const SDR_DATA = [
  { name: "Carlos Martinez", email: "carlos.martinez@hawkridge.com", gender: "male" },
  { name: "Maria Rodriguez", email: "maria.rodriguez@hawkridge.com", gender: "female" },
  { name: "Juan Gonzalez", email: "juan.gonzalez@hawkridge.com", gender: "male" },
  { name: "Ana Torres", email: "ana.torres@hawkridge.com", gender: "female" },
  { name: "Diego Ramirez", email: "diego.ramirez@hawkridge.com", gender: "male" },
  { name: "Sofia Vargas", email: "sofia.vargas@hawkridge.com", gender: "female" },
  { name: "Miguel Flores", email: "miguel.flores@hawkridge.com", gender: "male" },
  { name: "Isabella Sanchez", email: "isabella.sanchez@hawkridge.com", gender: "female" },
  { name: "Fernando Castro", email: "fernando.castro@hawkridge.com", gender: "male" },
  { name: "Valentina Reyes", email: "valentina.reyes@hawkridge.com", gender: "female" },
  { name: "Alejandro Mendoza", email: "alejandro.mendoza@hawkridge.com", gender: "male" },
  { name: "Camila Ortiz", email: "camila.ortiz@hawkridge.com", gender: "female" },
  { name: "Gabriel Jimenez", email: "gabriel.jimenez@hawkridge.com", gender: "male" },
  { name: "Lucia Romero", email: "lucia.romero@hawkridge.com", gender: "female" },
  { name: "Andres Navarro", email: "andres.navarro@hawkridge.com", gender: "male" },
  { name: "Paula Gutierrez", email: "paula.gutierrez@hawkridge.com", gender: "female" },
  { name: "Sebastian Ruiz", email: "sebastian.ruiz@hawkridge.com", gender: "male" },
  { name: "Elena Diaz", email: "elena.diaz@hawkridge.com", gender: "female" },
  { name: "Ricardo Herrera", email: "ricardo.herrera@hawkridge.com", gender: "male" },
  { name: "Daniela Aguilar", email: "daniela.aguilar@hawkridge.com", gender: "female" },
];

const AE_DATA = [
  { name: "Patricia Vega", email: "patricia.vega@hawkridge.com", region: "West", specialty: "Enterprise" },
  { name: "Eduardo Silva", email: "eduardo.silva@hawkridge.com", region: "East", specialty: "Mid-Market" },
  { name: "Monica Cruz", email: "monica.cruz@hawkridge.com", region: "Central", specialty: "Manufacturing" },
  { name: "Felipe Ramos", email: "felipe.ramos@hawkridge.com", region: "South", specialty: "Healthcare" },
  { name: "Teresa Luna", email: "teresa.luna@hawkridge.com", region: "Northeast", specialty: "Technology" },
];

const COMPANIES = [
  { name: "Acme Manufacturing", website: "https://acmemfg.com", industry: "Manufacturing", size: "500-1000" },
  { name: "TechVentures Inc", website: "https://techventures.io", industry: "Technology", size: "100-250" },
  { name: "Global Aerospace", website: "https://globalaero.com", industry: "Aerospace", size: "1000-5000" },
  { name: "Metro Healthcare", website: "https://metrohealthcare.org", industry: "Healthcare", size: "250-500" },
  { name: "Summit Engineering", website: "https://summiteng.com", industry: "Engineering", size: "50-100" },
  { name: "Pacific Robotics", website: "https://pacificrobotics.com", industry: "Robotics", size: "100-250" },
  { name: "Northern Energy", website: "https://northernenergy.com", industry: "Energy", size: "500-1000" },
  { name: "Coastal Defense Systems", website: "https://coastaldefense.com", industry: "Defense", size: "250-500" },
  { name: "Mountain Medical Devices", website: "https://mountainmedical.com", industry: "Medical Devices", size: "100-250" },
  { name: "Valley Automotive", website: "https://valleyauto.com", industry: "Automotive", size: "1000-5000" },
  { name: "Sunrise Semiconductors", website: "https://sunrisesemi.com", industry: "Semiconductors", size: "500-1000" },
  { name: "Eastern Plastics", website: "https://easternplastics.com", industry: "Manufacturing", size: "250-500" },
  { name: "Midwest Construction", website: "https://midwestconstruction.com", industry: "Construction", size: "100-250" },
  { name: "Urban Transit Solutions", website: "https://urbantransit.com", industry: "Transportation", size: "500-1000" },
  { name: "Delta Precision", website: "https://deltaprecision.com", industry: "Precision Manufacturing", size: "50-100" },
  { name: "Omega Biotech", website: "https://omegabiotech.com", industry: "Biotechnology", size: "100-250" },
  { name: "Alpha Dynamics", website: "https://alphadynamics.com", industry: "Engineering", size: "250-500" },
  { name: "Beta Innovations", website: "https://betainnovations.com", industry: "Technology", size: "50-100" },
  { name: "Gamma Industries", website: "https://gammaindustries.com", industry: "Industrial", size: "500-1000" },
  { name: "Epsilon Metals", website: "https://epsilonmetals.com", industry: "Metals", size: "250-500" },
  { name: "Zeta Electronics", website: "https://zetaelectronics.com", industry: "Electronics", size: "100-250" },
  { name: "Theta Chemicals", website: "https://thetachemicals.com", industry: "Chemicals", size: "500-1000" },
  { name: "Iota Aerospace", website: "https://iotaaero.com", industry: "Aerospace", size: "1000-5000" },
  { name: "Kappa Defense", website: "https://kappadefense.com", industry: "Defense", size: "250-500" },
  { name: "Lambda Pharma", website: "https://lambdapharma.com", industry: "Pharmaceutical", size: "500-1000" },
  { name: "Mu Technologies", website: "https://mutech.com", industry: "Technology", size: "100-250" },
  { name: "Nu Robotics", website: "https://nurobotics.com", industry: "Robotics", size: "50-100" },
  { name: "Xi Engineering", website: "https://xieng.com", industry: "Engineering", size: "250-500" },
  { name: "Omicron Systems", website: "https://omicronsystems.com", industry: "Systems", size: "100-250" },
  { name: "Pi Manufacturing", website: "https://pimfg.com", industry: "Manufacturing", size: "500-1000" },
  { name: "Rho Automation", website: "https://rhoauto.com", industry: "Automation", size: "250-500" },
  { name: "Sigma Logistics", website: "https://sigmalogistics.com", industry: "Logistics", size: "1000-5000" },
  { name: "Tau Energy", website: "https://tauenergy.com", industry: "Energy", size: "500-1000" },
  { name: "Upsilon Materials", website: "https://upsilonmaterials.com", industry: "Materials", size: "100-250" },
  { name: "Phi Composites", website: "https://phicomposites.com", industry: "Composites", size: "50-100" },
  { name: "Chi Medical", website: "https://chimedical.com", industry: "Medical", size: "250-500" },
  { name: "Psi Semiconductors", website: "https://psisemi.com", industry: "Semiconductors", size: "500-1000" },
  { name: "Omega Precision", website: "https://omegaprecision.com", industry: "Precision", size: "100-250" },
  { name: "Nova Aerospace", website: "https://novaaero.com", industry: "Aerospace", size: "1000-5000" },
  { name: "Stellar Defense", website: "https://stellardefense.com", industry: "Defense", size: "500-1000" },
  { name: "Quantum Industries", website: "https://quantumindustries.com", industry: "Industrial", size: "250-500" },
  { name: "Nexus Technologies", website: "https://nexustech.com", industry: "Technology", size: "100-250" },
  { name: "Vertex Manufacturing", website: "https://vertexmfg.com", industry: "Manufacturing", size: "500-1000" },
  { name: "Apex Engineering", website: "https://apexeng.com", industry: "Engineering", size: "250-500" },
  { name: "Zenith Robotics", website: "https://zenithrobotics.com", industry: "Robotics", size: "100-250" },
  { name: "Pinnacle Systems", website: "https://pinnaclesystems.com", industry: "Systems", size: "500-1000" },
  { name: "Summit Biotech", website: "https://summitbiotech.com", industry: "Biotechnology", size: "50-100" },
  { name: "Crest Electronics", website: "https://crestelectronics.com", industry: "Electronics", size: "250-500" },
  { name: "Peak Dynamics", website: "https://peakdynamics.com", industry: "Dynamics", size: "100-250" },
  { name: "Horizon Medical", website: "https://horizonmedical.com", industry: "Medical", size: "500-1000" },
];

const CONTACT_NAMES = [
  "James Thompson", "Sarah Mitchell", "Michael Chen", "Jennifer Williams", "David Anderson",
  "Lisa Martinez", "Robert Taylor", "Emily Johnson", "William Brown", "Amanda Davis",
  "Christopher Wilson", "Michelle Garcia", "Matthew Miller", "Jessica Moore", "Daniel Jackson",
  "Nicole White", "Andrew Harris", "Stephanie Martin", "Joshua Lee", "Rebecca Clark",
  "Ryan Lewis", "Laura Robinson", "Kevin Walker", "Angela Hall", "Brandon Allen",
  "Melissa Young", "Justin King", "Christina Wright", "Tyler Scott", "Amber Green",
  "Aaron Baker", "Heather Adams", "Nathan Nelson", "Kimberly Hill", "Jacob Campbell",
  "Rachel Mitchell", "Zachary Carter", "Megan Phillips", "Ethan Evans", "Ashley Turner",
  "Nicholas Collins", "Samantha Edwards", "Dylan Stewart", "Brittany Morris", "Jonathan Rogers",
  "Danielle Reed", "Austin Cook", "Lauren Morgan", "Eric Bell", "Courtney Murphy",
];

const TITLES = [
  "VP of Engineering", "Director of Operations", "Chief Technology Officer", "VP of Manufacturing",
  "Engineering Manager", "Director of IT", "Plant Manager", "VP of Product Development",
  "Chief Operating Officer", "Director of Engineering", "Manufacturing Director", "IT Director",
  "VP of R&D", "Operations Manager", "Director of Quality", "Chief Information Officer",
];

const LEAD_STATUSES = ["new", "contacted", "qualified", "meeting-booked", "handed-off"];
const PRIORITIES = ["hot", "warm", "cool", "cold"];
const DISPOSITIONS = ["connected", "voicemail", "no-answer", "busy", "callback-scheduled", "not-interested", "qualified", "meeting-booked"];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  date.setHours(randomInt(8, 18), randomInt(0, 59), 0, 0);
  return date;
}

function generateTranscript(contactName: string, companyName: string, outcome: string): string {
  const intros = [
    `SDR: Hi ${contactName}, this is calling from Hawk Ridge Systems. Do you have a moment to discuss your CAD and engineering software needs?`,
    `SDR: Good morning ${contactName}, I'm reaching out from Hawk Ridge Systems regarding ${companyName}'s design and manufacturing workflows.`,
    `SDR: Hello ${contactName}, hope I'm not catching you at a bad time. I wanted to connect about how ${companyName} handles product development.`,
  ];
  
  const middles = [
    `${contactName}: Yes, we've been looking at updating our SOLIDWORKS licenses actually.
SDR: That's great to hear! Are you currently using SOLIDWORKS for your design work?
${contactName}: Yes, we have about 20 seats but they're getting outdated.
SDR: I understand. Many of our clients in ${companyName}'s industry face similar challenges. What's driving the need for an update?`,
    `${contactName}: We're actually in the middle of evaluating different PLM solutions.
SDR: Perfect timing then. Have you considered how SOLIDWORKS PDM might integrate with your current workflow?
${contactName}: We haven't looked at that specifically. Tell me more.
SDR: Absolutely. SOLIDWORKS PDM provides seamless version control and collaboration features that...`,
    `${contactName}: I'm not really the right person for this. You should talk to our engineering director.
SDR: I appreciate you pointing me in the right direction. Could you share their contact information?
${contactName}: Sure, that would be Mark Stevens. I can transfer you or give you his email.`,
  ];
  
  const endings: Record<string, string[]> = {
    qualified: [
      `SDR: Based on what you've shared, it sounds like there's a real opportunity to improve your design efficiency. Would you be open to a more detailed conversation with one of our solution engineers?
${contactName}: Yes, that would be helpful. We're actively evaluating options.
SDR: Excellent! I'll have our team reach out to schedule a deeper dive. Thank you for your time today.`,
    ],
    "meeting-booked": [
      `SDR: This has been a great conversation. I'd love to set up a demo where we can show you exactly how SOLIDWORKS can address these challenges. How does next Tuesday at 2 PM look?
${contactName}: That works for me. Send me a calendar invite.
SDR: Perfect! I'll send that over right now. Looking forward to showing you what we can do for ${companyName}.`,
    ],
    connected: [
      `SDR: I really appreciate you taking the time to chat today. Can I send over some information about our solutions?
${contactName}: Sure, email me the details and I'll take a look.
SDR: Will do! I'll follow up next week to see if you have any questions.`,
    ],
    "not-interested": [
      `${contactName}: We're actually locked into a contract with another vendor for the next two years.
SDR: I understand completely. Would it be alright if I checked back in about 18 months as you approach renewal?
${contactName}: That would be fine. Thanks for understanding.`,
    ],
    voicemail: [
      `SDR: Hi ${contactName}, this is a message from Hawk Ridge Systems. I was hoping to connect about your engineering software needs. Please give me a call back at your convenience.`,
    ],
  };
  
  const outcomeKey = outcome === "meeting-booked" ? "meeting-booked" : 
                     outcome === "qualified" ? "qualified" :
                     outcome === "not-interested" ? "not-interested" :
                     outcome === "voicemail" ? "voicemail" : "connected";
  
  return `${randomItem(intros)}\n\n${randomItem(middles)}\n\n${randomItem(endings[outcomeKey] || endings.connected)}`;
}

function generateCoachingAnalysis(score: number): string {
  const strengths = [
    "Strong opening with clear value proposition",
    "Good rapport building with prospect",
    "Effective use of open-ended questions",
    "Professional tone throughout the call",
    "Good product knowledge demonstrated",
    "Handled objections with confidence",
    "Active listening skills evident",
    "Clear next steps established",
  ];
  
  const improvements = [
    "Could ask more discovery questions",
    "Consider slowing down the pace slightly",
    "More focus on prospect pain points needed",
    "Better qualification of decision-making authority",
    "Could improve transition to closing",
    "More personalization based on research",
    "Strengthen value articulation",
    "Better handling of silence/pauses",
  ];
  
  const actions = [
    "Practice discovery question techniques",
    "Review objection handling playbook",
    "Study competitor differentiation points",
    "Work on call opening variations",
    "Improve closing statement delivery",
    "Focus on BANT qualification",
  ];
  
  const analysis = {
    overallScore: score,
    callSummary: `The SDR demonstrated ${score >= 7 ? "strong" : score >= 5 ? "adequate" : "developing"} skills during this call. ${score >= 7 ? "Good opportunity identified." : "Room for improvement on key metrics."}`,
    strengths: strengths.slice(0, randomInt(2, 4)),
    areasForImprovement: improvements.slice(0, randomInt(2, 3)),
    talkListenRatio: {
      sdrTalkTime: randomInt(40, 65),
      prospectTalkTime: randomInt(35, 60),
      notes: score >= 7 ? "Good balance of speaking and listening" : "Consider letting the prospect speak more"
    },
    questionQuality: {
      openEnded: randomInt(3, 8),
      closedEnded: randomInt(2, 6),
      score: randomInt(score - 2, score + 1),
      notes: "Focus on open-ended discovery questions"
    },
    objectionHandling: {
      objections: ["Price concern", "Timing issue", "Need to check with team"],
      score: randomInt(score - 1, score + 1),
      notes: score >= 7 ? "Objections handled professionally" : "Practice objection handling techniques"
    },
    recommendedActions: actions.slice(0, randomInt(2, 4)),
    nextSteps: ["Follow up in 3 days", "Send product information", "Schedule demo call"]
  };
  
  return JSON.stringify(analysis);
}

async function seedDemoData() {
  console.log("🌱 Starting demo data seed...\n");
  
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  
  console.log("📝 Creating managers...");
  const createdManagers: { id: string; email: string }[] = [];
  for (const manager of MANAGER_DATA) {
    const [created] = await db.insert(managers).values({
      name: manager.name,
      email: manager.email,
    }).onConflictDoNothing().returning();
    
    if (created) {
      createdManagers.push({ id: created.id, email: created.email });
      
      await db.insert(users).values({
        email: manager.email,
        password: hashedPassword,
        name: manager.name,
        role: "manager",
        managerId: created.id,
      }).onConflictDoNothing();
    } else {
      const existing = await db.select().from(managers).where(sql`email = ${manager.email}`).limit(1);
      if (existing[0]) createdManagers.push({ id: existing[0].id, email: existing[0].email });
    }
  }
  console.log(`   ✅ Created ${createdManagers.length} managers\n`);
  
  console.log("👥 Creating SDRs...");
  const createdSdrs: { id: string; name: string; managerId: string }[] = [];
  for (let i = 0; i < SDR_DATA.length; i++) {
    const sdr = SDR_DATA[i];
    const manager = createdManagers[i % createdManagers.length];
    const sdrId = `sdr_${sdr.email.split("@")[0].replace(".", "_")}`;
    
    const [created] = await db.insert(sdrs).values({
      id: sdrId,
      name: sdr.name,
      email: sdr.email,
      managerEmail: manager.email,
      managerId: manager.id,
      gender: sdr.gender,
      timezone: "America/Los_Angeles",
    }).onConflictDoNothing().returning();
    
    if (created) {
      createdSdrs.push({ id: created.id, name: created.name, managerId: manager.id });
      
      await db.insert(users).values({
        email: sdr.email,
        password: hashedPassword,
        name: sdr.name,
        role: "sdr",
        sdrId: created.id,
      }).onConflictDoNothing();
    } else {
      const existing = await db.select().from(sdrs).where(sql`id = ${sdrId}`).limit(1);
      if (existing[0]) createdSdrs.push({ id: existing[0].id, name: existing[0].name, managerId: manager.id });
    }
  }
  console.log(`   ✅ Created ${createdSdrs.length} SDRs\n`);
  
  console.log("💼 Creating Account Executives...");
  const createdAEs: { id: string }[] = [];
  for (const ae of AE_DATA) {
    const [created] = await db.insert(accountExecutives).values({
      name: ae.name,
      email: ae.email,
      region: ae.region,
      specialty: ae.specialty,
      phone: `+1${randomInt(200, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`,
    }).onConflictDoNothing().returning();
    
    if (created) {
      createdAEs.push({ id: created.id });
      
      await db.insert(users).values({
        email: ae.email,
        password: hashedPassword,
        name: ae.name,
        role: "account_specialist",
        accountSpecialistId: created.id,
      }).onConflictDoNothing();
    } else {
      const existing = await db.select().from(accountExecutives).where(sql`email = ${ae.email}`).limit(1);
      if (existing[0]) createdAEs.push({ id: existing[0].id });
    }
  }
  console.log(`   ✅ Created ${createdAEs.length} Account Executives\n`);
  
  console.log("🎯 Creating leads with research...");
  const createdLeads: { id: string; companyName: string; contactName: string; sdrId: string }[] = [];
  const statusDistribution = { new: 12, contacted: 15, qualified: 12, "meeting-booked": 6, "handed-off": 5 };
  
  let leadIndex = 0;
  for (const [status, count] of Object.entries(statusDistribution)) {
    for (let i = 0; i < count; i++) {
      const company = COMPANIES[leadIndex % COMPANIES.length];
      const contactName = CONTACT_NAMES[leadIndex % CONTACT_NAMES.length];
      const sdr = createdSdrs[leadIndex % createdSdrs.length];
      const ae = status === "handed-off" ? randomItem(createdAEs) : null;
      const fitScore = randomInt(25, 95);
      const priority = fitScore >= 80 ? "hot" : fitScore >= 60 ? "warm" : fitScore >= 40 ? "cool" : "cold";
      
      const [lead] = await db.insert(leads).values({
        companyName: company.name,
        companyWebsite: company.website,
        companyIndustry: company.industry,
        companySize: company.size,
        contactName: contactName,
        contactTitle: randomItem(TITLES),
        contactEmail: `${contactName.toLowerCase().replace(" ", ".")}@${company.website?.replace("https://", "")}`,
        contactPhone: `+1${randomInt(200, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`,
        source: randomItem(["manual", "google_sheets", "salesforce", "referral"]),
        status: status,
        fitScore: fitScore,
        priority: priority,
        assignedSdrId: sdr.id,
        assignedAeId: ae?.id || null,
        qualificationNotes: status !== "new" ? `Lead ${status === "qualified" ? "shows strong buying signals" : status === "meeting-booked" ? "highly engaged, ready for demo" : "requires nurturing"}` : null,
        budget: status === "qualified" || status === "meeting-booked" || status === "handed-off" ? randomItem(["$50k-100k", "$100k-250k", "$250k-500k", "$500k+"]) : null,
        timeline: status !== "new" ? randomItem(["Q1 2026", "Q2 2026", "Next 6 months", "Evaluating"]) : null,
        handedOffAt: status === "handed-off" ? randomDate(30) : null,
        lastContactedAt: status !== "new" ? randomDate(14) : null,
      }).returning();
      
      if (lead) {
        createdLeads.push({ 
          id: lead.id, 
          companyName: company.name, 
          contactName: contactName,
          sdrId: sdr.id 
        });
        
        await db.insert(researchPackets).values({
          leadId: lead.id,
          companyIntel: `${company.name} is a ${company.size} employee ${company.industry} company. They have been in business for ${randomInt(5, 40)} years and have shown consistent growth in their market segment. Key focus areas include operational efficiency, digital transformation, and product innovation.`,
          contactIntel: `${contactName} has been with ${company.name} for ${randomInt(2, 15)} years. They have a strong technical background and are known for driving technology adoption initiatives. Active on LinkedIn with ${randomInt(500, 5000)} connections.`,
          painSignals: `- Current CAD software is outdated and causing productivity issues\n- Integration between design and manufacturing is fragmented\n- Version control challenges with distributed teams\n- Need for better simulation capabilities`,
          competitorPresence: `Currently using ${randomItem(["AutoCAD", "Inventor", "Fusion 360", "PTC Creo", "Siemens NX"])}. Some concerns about support quality and upgrade costs.`,
          fitAnalysis: `Strong fit for SOLIDWORKS ${company.industry === "Manufacturing" ? "CAM and PDM" : company.industry === "Aerospace" ? "Simulation and PDM" : "Professional and PDM"} solutions. Budget aligns with ${priority === "hot" ? "enterprise" : priority === "warm" ? "mid-market" : "SMB"} package.`,
          fitScore: fitScore,
          priority: priority,
          talkTrack: `Opening: "Hi ${contactName}, I noticed ${company.name} has been expanding your ${company.industry} operations. Many companies in your space are finding that modern CAD solutions can significantly improve time-to-market..."\n\nValue Prop: Focus on ROI from improved design efficiency and reduced errors.\n\nCall to Action: Offer a technical assessment of their current workflow.`,
          discoveryQuestions: `1. What CAD/CAM software are you currently using?\n2. How many engineers work with design files daily?\n3. What's your biggest challenge with the current solution?\n4. When does your current licensing agreement expire?\n5. Who else would be involved in evaluating a new solution?`,
          objectionHandles: `Price: "Let me show you the ROI calculator that demonstrates typical 3-year savings..."\nTiming: "I understand. Many of our clients start with a pilot program..."\nCompetitor: "That's a great solution too. The key differentiator for your use case would be..."`,
          verificationStatus: "verified",
        }).onConflictDoNothing();
      }
      
      leadIndex++;
    }
  }
  console.log(`   ✅ Created ${createdLeads.length} leads with research packets\n`);
  
  console.log("📞 Creating call sessions with analysis...");
  let callCount = 0;
  
  const userRecords = await db.select().from(users).where(sql`role = 'sdr'`);
  
  for (const sdr of createdSdrs) {
    const sdrUser = userRecords.find(u => u.sdrId === sdr.id);
    if (!sdrUser) continue;
    
    const sdrLeads = createdLeads.filter(l => l.sdrId === sdr.id);
    const callsPerSdr = randomInt(4, 8);
    
    for (let i = 0; i < callsPerSdr; i++) {
      const lead = sdrLeads[i % sdrLeads.length] || randomItem(createdLeads);
      const callDate = randomDate(60);
      const disposition = randomItem(DISPOSITIONS);
      const duration = disposition === "voicemail" ? randomInt(20, 60) : 
                       disposition === "no-answer" ? 0 :
                       disposition === "meeting-booked" ? randomInt(600, 1200) :
                       randomInt(180, 600);
      const score = disposition === "meeting-booked" ? randomInt(8, 10) :
                    disposition === "qualified" ? randomInt(7, 9) :
                    disposition === "connected" ? randomInt(5, 8) :
                    randomInt(4, 7);
      
      const transcript = generateTranscript(lead.contactName, lead.companyName, disposition);
      const coachingNotes = generateCoachingAnalysis(score);
      
      const [session] = await db.insert(callSessions).values({
        callSid: `demo_call_${sdr.id}_${i}_${Date.now()}`,
        userId: sdrUser.id,
        leadId: lead.id,
        direction: "outbound",
        fromNumber: "+18885551234",
        toNumber: `+1${randomInt(200, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`,
        status: "completed",
        duration: duration,
        transcriptText: duration > 60 ? transcript : null,
        coachingNotes: duration > 180 ? coachingNotes : null,
        managerSummary: duration > 180 && Math.random() > 0.5 ? `Good call by ${sdr.name}. ${disposition === "meeting-booked" ? "Meeting successfully scheduled." : disposition === "qualified" ? "Lead shows strong potential." : "Follow-up required."}` : null,
        startedAt: callDate,
        endedAt: new Date(callDate.getTime() + duration * 1000),
        disposition: disposition,
        sentimentScore: score,
        keyTakeaways: duration > 180 ? `Key interest in ${randomItem(["SOLIDWORKS Professional", "PDM", "Simulation", "CAM"])}` : null,
        nextSteps: disposition === "meeting-booked" ? "Demo scheduled" : 
                   disposition === "qualified" ? "Send proposal" :
                   disposition === "callback-scheduled" ? "Call back next week" : null,
      }).returning();
      
      if (session && duration > 180) {
        await db.insert(managerCallAnalyses).values({
          callSessionId: session.id,
          sdrId: sdr.id,
          sdrName: sdr.name,
          callDate: callDate,
          callType: "outbound_prospecting",
          durationSeconds: duration,
          overallScore: score,
          openingScore: randomInt(score - 2, score + 1),
          discoveryScore: randomInt(score - 1, score + 1),
          listeningScore: randomInt(score - 1, score + 2),
          objectionScore: randomInt(score - 2, score + 1),
          valuePropositionScore: randomInt(score - 1, score + 1),
          closingScore: randomInt(score - 2, score + 1),
          complianceScore: randomInt(7, 10),
          keyObservations: `${sdr.name} demonstrated ${score >= 7 ? "strong" : "adequate"} sales skills. ${disposition === "meeting-booked" ? "Successfully secured meeting." : "Room for improvement on closing."}`,
          recommendations: `Focus on ${randomItem(["discovery questions", "objection handling", "closing techniques", "value articulation"])}`,
          summary: `${disposition === "meeting-booked" ? "Excellent call resulting in meeting." : disposition === "qualified" ? "Good call with qualified lead." : "Standard prospecting call."}`,
        }).onConflictDoNothing();
      }
      
      callCount++;
    }
  }
  console.log(`   ✅ Created ${callCount} call sessions with analyses\n`);
  
  console.log("🎉 Demo data seeding complete!\n");
  console.log("📊 Summary:");
  console.log(`   - ${createdManagers.length} Managers`);
  console.log(`   - ${createdSdrs.length} SDRs`);
  console.log(`   - ${createdAEs.length} Account Executives`);
  console.log(`   - ${createdLeads.length} Leads with research`);
  console.log(`   - ${callCount} Call sessions with analysis`);
  console.log(`\n🔑 All demo accounts use password: ${DEMO_PASSWORD}`);
}

seedDemoData()
  .then(() => {
    console.log("\n✅ Seed completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  });
