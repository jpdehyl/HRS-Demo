import { db } from "../server/db";
import { 
  users, managers, sdrs, accountExecutives, leads, 
  researchPackets, callSessions, managerCallAnalyses 
} from "../shared/schema";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

const DEMO_PASSWORD = "demo2024";

const MANAGER_DATA = [
  { 
    name: "Roberto Hernandez", 
    email: "roberto.hernandez@hawkridge.com",
    phone: "+1 (555) 234-5678",
    title: "Senior Sales Manager",
    bio: "15+ years in B2B software sales. Former top performer at PTC who transitioned to leadership. Passionate about developing SDRs into top closers through data-driven coaching and weekly call reviews.",
    coachingStyle: "Collaborative and metrics-focused. Believes in celebrating wins publicly and coaching improvements privately. Known for detailed call breakdowns and role-playing exercises.",
    specialties: "SOLIDWORKS Enterprise, Complex Deal Cycles, Objection Handling",
    yearsExperience: 15,
    certifications: "Sandler Sales Certification, SPIN Selling, Challenger Sale Methodology"
  },
  { 
    name: "Carmen Delgado", 
    email: "carmen.delgado@hawkridge.com",
    phone: "+1 (555) 345-6789",
    title: "Regional Sales Manager - West",
    bio: "Started as an SDR at Hawk Ridge 8 years ago and worked her way up. Deep understanding of the manufacturing sector and aerospace verticals. Champions a growth mindset approach.",
    coachingStyle: "Empathetic listener who focuses on building confidence. Uses real customer stories to illustrate best practices. Weekly 1:1s are sacred.",
    specialties: "Manufacturing Vertical, Aerospace Clients, New Hire Onboarding",
    yearsExperience: 8,
    certifications: "Miller Heiman Strategic Selling, CAD/CAM Product Specialist"
  },
  { 
    name: "Luis Morales", 
    email: "luis.morales@hawkridge.com",
    phone: "+1 (555) 456-7890",
    title: "Director of Sales Development",
    bio: "Former engineering background gives him technical credibility with prospects. Built the SDR program from scratch when he joined 5 years ago. Now oversees all SDR training and development.",
    coachingStyle: "Technical mentor who helps SDRs understand the product deeply. Focuses on discovery questions and value-based selling. Runs monthly SDR bootcamps.",
    specialties: "Technical Sales, Value Selling, PDM/PLM Solutions",
    yearsExperience: 12,
    certifications: "Mechanical Engineering Degree, MEDDIC Certified, Solution Selling"
  },
];

const SDR_DATA = [
  { name: "Carlos Martinez", email: "carlos.martinez@hawkridge.com", gender: "male", bio: "Top performer who joined 2 years ago from SaaS sales. Natural relationship builder with strong discovery skills. Working on improving objection handling with technical decision-makers.", strengths: "Rapport building, Discovery questions, Follow-up discipline", developmentAreas: "Technical objections, C-level conversations", goals: "Move to AE role within 18 months", yearsExperience: 2, previousCompany: "HubSpot", specialties: "SMB Manufacturing" },
  { name: "Maria Rodriguez", email: "maria.rodriguez@hawkridge.com", gender: "female", bio: "Highest connect rate on the team. Former teacher who brings exceptional communication skills. Excels at building trust quickly but working on being more assertive in closing.", strengths: "Communication, Active listening, Call prep", developmentAreas: "Assertiveness, Closing techniques", goals: "Consistently hit 120% of quota", yearsExperience: 1, previousCompany: "Education Sector", specialties: "Healthcare, Medical Devices" },
  { name: "Juan Gonzalez", email: "juan.gonzalez@hawkridge.com", gender: "male", bio: "Engineering background makes him highly credible with technical buyers. Sometimes spends too long on technical discussions. Working on qualifying faster.", strengths: "Technical knowledge, Problem identification, Demo skills", developmentAreas: "Time management, Qualification speed", goals: "Become the technical SME for the team", yearsExperience: 3, previousCompany: "Siemens PLM", specialties: "Aerospace, Defense" },
  { name: "Ana Torres", email: "ana.torres@hawkridge.com", gender: "female", bio: "Rising star who broke the monthly meeting record last quarter. Highly competitive and loves the leaderboard. Coaching her on sustainable pacing and work-life balance.", strengths: "Persistence, Competitive drive, Energy", developmentAreas: "Pacing, Account research depth", goals: "President's Club qualification", yearsExperience: 1, previousCompany: "Salesforce", specialties: "Technology, Startups" },
  { name: "Diego Ramirez", email: "diego.ramirez@hawkridge.com", gender: "male", bio: "Steady performer who never misses quota. Great mentor to new hires. Working on pushing beyond comfort zone to achieve stretch goals.", strengths: "Consistency, Mentorship, Process discipline", developmentAreas: "Risk-taking, Enterprise pursuit", goals: "Team lead position", yearsExperience: 4, previousCompany: "Oracle", specialties: "Mid-Market, Industrial" },
  { name: "Sofia Vargas", email: "sofia.vargas@hawkridge.com", gender: "female", bio: "Creative approach to prospecting with strong LinkedIn game. Sometimes over-relies on digital channels. Working on phone confidence.", strengths: "Social selling, Creative messaging, Research", developmentAreas: "Cold calling, Voice presence", goals: "Develop multi-channel mastery", yearsExperience: 1, previousCompany: "Marketing Agency", specialties: "Consumer Products, Retail" },
  { name: "Miguel Flores", email: "miguel.flores@hawkridge.com", gender: "male", bio: "Recently promoted from BDR. Strong work ethic but still building product knowledge. Putting in extra time on training modules.", strengths: "Work ethic, Coachability, Positive attitude", developmentAreas: "Product knowledge, Industry expertise", goals: "Master the full SOLIDWORKS portfolio", yearsExperience: 1, previousCompany: "Inside Sales at Dell", specialties: "General Manufacturing" },
  { name: "Isabella Sanchez", email: "isabella.sanchez@hawkridge.com", gender: "female", bio: "Data-driven approach to sales. Uses analytics to optimize call times and messaging. Sometimes over-analyzes instead of acting.", strengths: "Analytics, Strategy, A/B testing", developmentAreas: "Speed to action, Intuitive selling", goals: "Build the team's data playbook", yearsExperience: 2, previousCompany: "ZoomInfo", specialties: "Enterprise Accounts" },
  { name: "Fernando Castro", email: "fernando.castro@hawkridge.com", gender: "male", bio: "Experienced rep who joined from a competitor. Deep industry knowledge but adapting to our sales methodology. Excellent at identifying pain points.", strengths: "Industry expertise, Pain discovery, Competitive positioning", developmentAreas: "Adopting new processes, CRM discipline", goals: "Top 3 performer by year end", yearsExperience: 5, previousCompany: "Autodesk", specialties: "Architecture, Construction" },
  { name: "Valentina Reyes", email: "valentina.reyes@hawkridge.com", gender: "female", bio: "Excellent at handling objections with empathy. Strong emotional intelligence helps her navigate difficult conversations. Building more industry knowledge.", strengths: "Empathy, Objection handling, Relationship depth", developmentAreas: "Industry terminology, Technical credibility", goals: "Increase average deal size", yearsExperience: 2, previousCompany: "Insurance Sales", specialties: "Professional Services" },
  { name: "Alejandro Mendoza", email: "alejandro.mendoza@hawkridge.com", gender: "male", bio: "High-volume caller who focuses on activity metrics. Working on quality over quantity - having deeper conversations instead of quick dials.", strengths: "Activity volume, Energy, Resilience", developmentAreas: "Conversation depth, Qualification rigor", goals: "Improve conversion rate by 20%", yearsExperience: 1, previousCompany: "Call Center", specialties: "SMB, Quick Wins" },
  { name: "Camila Ortiz", email: "camila.ortiz@hawkridge.com", gender: "female", bio: "Strongest email writer on the team. Personalized sequences get high open rates. Phone skills improving with practice.", strengths: "Written communication, Personalization, Creativity", developmentAreas: "Phone presence, Live discovery", goals: "Develop phone confidence to match email strength", yearsExperience: 1, previousCompany: "Content Marketing", specialties: "Education, Research" },
  { name: "Gabriel Jimenez", email: "gabriel.jimenez@hawkridge.com", gender: "male", bio: "Former CAD operator who knows the product inside and out. Can sometimes get too technical too fast. Learning to lead with business value.", strengths: "Product mastery, Technical demos, User empathy", developmentAreas: "Business case building, Executive messaging", goals: "Become certified pre-sales engineer", yearsExperience: 2, previousCompany: "Manufacturing Plant", specialties: "Simulation, Analysis" },
  { name: "Lucia Romero", email: "lucia.romero@hawkridge.com", gender: "female", bio: "New hire showing tremendous promise. Fast learner who asks great questions. In ramp period but already booking meetings.", strengths: "Curiosity, Quick learning, Positive attitude", developmentAreas: "Building experience, Handling pressure", goals: "Complete ramp in record time", yearsExperience: 0, previousCompany: "Recent Graduate", specialties: "Learning all verticals" },
  { name: "Andres Navarro", email: "andres.navarro@hawkridge.com", gender: "male", bio: "Consistent mid-performer working on breakthrough to top tier. Has the skills but needs more confidence. Focus on mindset coaching.", strengths: "Reliability, Follow-through, Preparation", developmentAreas: "Confidence, Asking for the meeting", goals: "Break into top 5 performers", yearsExperience: 2, previousCompany: "Telecommunications", specialties: "Utilities, Energy" },
  { name: "Paula Gutierrez", email: "paula.gutierrez@hawkridge.com", gender: "female", bio: "Excellent at researching accounts and building targeted messaging. Sometimes spends too long preparing vs. calling. Balance in progress.", strengths: "Research depth, Account planning, Targeting", developmentAreas: "Execution speed, Call volume", goals: "Optimize research-to-call ratio", yearsExperience: 1, previousCompany: "Market Research", specialties: "Enterprise, Strategic Accounts" },
  { name: "Sebastian Ruiz", email: "sebastian.ruiz@hawkridge.com", gender: "male", bio: "Strong closer who excels at getting meetings from qualified conversations. Working on earlier qualification to avoid wasted time on bad fits.", strengths: "Closing, Urgency creation, Confidence", developmentAreas: "Early qualification, Discovery discipline", goals: "Highest meeting-to-opportunity rate", yearsExperience: 3, previousCompany: "Real Estate Sales", specialties: "Fast-moving deals" },
  { name: "Elena Diaz", email: "elena.diaz@hawkridge.com", gender: "female", bio: "Bilingual advantage helps with Latin American accounts. Building relationships across borders. Working on navigating longer sales cycles.", strengths: "Bilingual, Cultural intelligence, Patience", developmentAreas: "Urgency tactics, Shortening cycles", goals: "Expand LATAM territory success", yearsExperience: 2, previousCompany: "International Trade", specialties: "LATAM, Multinational" },
  { name: "Ricardo Herrera", email: "ricardo.herrera@hawkridge.com", gender: "male", bio: "Struggled initially but has made remarkable improvement over past 6 months. Example of coachability and persistence paying off.", strengths: "Coachability, Persistence, Growth mindset", developmentAreas: "Consistency, Peak performance", goals: "Maintain top-half performance", yearsExperience: 1, previousCompany: "Retail Management", specialties: "Consumer Goods" },
  { name: "Daniela Aguilar", email: "daniela.aguilar@hawkridge.com", gender: "female", bio: "Team collaborator who shares wins and learnings freely. Strong network within accounts. Building individual contributor strength.", strengths: "Collaboration, Account mapping, Team spirit", developmentAreas: "Solo performance, Competitive edge", goals: "Balance team contribution with personal results", yearsExperience: 2, previousCompany: "Account Management", specialties: "Existing Customer Expansion" },
];

const AE_DATA = [
  { name: "Patricia Vega", email: "patricia.vega@hawkridge.com", phone: "+1 (555) 567-8901", region: "West", specialty: "Enterprise", title: "Senior Account Executive", bio: "President's Club winner 3 years running. Expert at navigating complex enterprise sales with multiple stakeholders. Known for large strategic deals in aerospace and defense.", dealFocus: "Enterprise deals $500K+", yearsExperience: 12, quotaAttainment: 142, avgDealSize: 450000 },
  { name: "Eduardo Silva", email: "eduardo.silva@hawkridge.com", phone: "+1 (555) 678-9012", region: "East", specialty: "Mid-Market", title: "Account Executive", bio: "High-volume closer who excels at mid-market manufacturing deals. Fast deal cycles and strong closing skills. Former SDR who knows how to work with the team.", dealFocus: "Mid-market $50K-$200K deals", yearsExperience: 6, quotaAttainment: 118, avgDealSize: 85000 },
  { name: "Monica Cruz", email: "monica.cruz@hawkridge.com", phone: "+1 (555) 789-0123", region: "Central", specialty: "Manufacturing", title: "Account Executive - Manufacturing", bio: "Deep manufacturing expertise from previous role at a production plant. Understands shop floor challenges and speaks the customer's language. Growing enterprise skills.", dealFocus: "Discrete manufacturing, job shops", yearsExperience: 5, quotaAttainment: 105, avgDealSize: 120000 },
  { name: "Felipe Ramos", email: "felipe.ramos@hawkridge.com", phone: "+1 (555) 890-1234", region: "South", specialty: "Healthcare", title: "Account Executive - Medical Devices", bio: "Specialized in medical device and life sciences accounts. Understands regulatory requirements and validation needs. Building pipeline in emerging biotech.", dealFocus: "Medical devices, FDA-regulated", yearsExperience: 8, quotaAttainment: 95, avgDealSize: 180000 },
  { name: "Teresa Luna", email: "teresa.luna@hawkridge.com", phone: "+1 (555) 901-2345", region: "Northeast", specialty: "Technology", title: "Account Executive - Technology", bio: "Tech sector specialist who works with hardware companies, electronics, and semiconductor firms. Strong at competitive displacement from Autodesk and Siemens.", dealFocus: "High-tech, electronics, semiconductor", yearsExperience: 7, quotaAttainment: 112, avgDealSize: 95000 },
];

const REAL_COMPANIES = [
  { name: "Boeing Commercial Airplanes", website: "https://boeing.com", industry: "Aerospace", size: "10000+", painPoints: ["Legacy PLM system integration issues", "Multi-site collaboration delays", "Simulation bottlenecks delaying certification"], products: "Commercial aircraft, defense systems" },
  { name: "Lockheed Martin Aeronautics", website: "https://lockheedmartin.com", industry: "Aerospace & Defense", size: "10000+", painPoints: ["Model-based definition adoption", "Supply chain design collaboration", "Security-compliant CAD workflows"], products: "F-35, military aircraft" },
  { name: "Northrop Grumman Systems", website: "https://northropgrumman.com", industry: "Defense", size: "5000-10000", painPoints: ["ITAR compliance in design handoffs", "Cross-functional simulation sharing", "PDM version control challenges"], products: "Autonomous systems, space technology" },
  { name: "General Dynamics Land Systems", website: "https://gdls.com", industry: "Defense Manufacturing", size: "5000-10000", painPoints: ["Heavy assembly design optimization", "Manufacturing process simulation", "Legacy AutoCAD migration needs"], products: "Military vehicles, tanks" },
  { name: "Raytheon Missiles & Defense", website: "https://raytheon.com", industry: "Defense", size: "10000+", painPoints: ["Complex assembly management", "Thermal/stress simulation requirements", "Multi-CAD environment consolidation"], products: "Missile systems, radar" },
  { name: "SpaceX", website: "https://spacex.com", industry: "Aerospace", size: "5000-10000", painPoints: ["Rapid iteration design workflows", "Rocket component simulation", "Reusability analysis tools"], products: "Rockets, Starlink satellites" },
  { name: "Blue Origin", website: "https://blueorigin.com", industry: "Aerospace", size: "1000-5000", painPoints: ["Propulsion system design tools", "Additive manufacturing integration", "Simulation-driven design adoption"], products: "Space vehicles, lunar landers" },
  { name: "Virgin Galactic", website: "https://virgingalactic.com", industry: "Aerospace", size: "500-1000", painPoints: ["Hybrid aerospace-consumer design", "Lightweight materials optimization", "Cabin pressurization simulation"], products: "Space tourism vehicles" },
  { name: "Caterpillar Inc", website: "https://caterpillar.com", industry: "Heavy Equipment", size: "10000+", painPoints: ["Global design standardization", "Equipment lifecycle simulation", "Dealer collaboration on customizations"], products: "Construction and mining equipment" },
  { name: "John Deere", website: "https://deere.com", industry: "Agricultural Equipment", size: "10000+", painPoints: ["Precision agriculture integration", "Autonomous equipment design", "Electrification transition workflows"], products: "Tractors, harvesters, autonomous systems" },
  { name: "CNH Industrial", website: "https://cnhindustrial.com", industry: "Agricultural & Construction", size: "5000-10000", painPoints: ["Multi-brand design platform consolidation", "Emissions compliance simulation", "Global manufacturing coordination"], products: "Case IH, New Holland equipment" },
  { name: "AGCO Corporation", website: "https://agcocorp.com", industry: "Agricultural Equipment", size: "5000-10000", painPoints: ["Smart farming equipment design", "Hydraulic systems optimization", "Regional customization management"], products: "Fendt, Massey Ferguson tractors" },
  { name: "Komatsu America", website: "https://komatsu.com", industry: "Mining & Construction", size: "5000-10000", painPoints: ["Autonomous mining vehicle design", "Durability testing simulation", "Aftermarket parts design"], products: "Excavators, dump trucks" },
  { name: "Tesla Engineering", website: "https://tesla.com", industry: "Automotive & Energy", size: "10000+", painPoints: ["Battery pack thermal simulation", "Gigacasting design optimization", "Rapid prototyping workflows"], products: "Electric vehicles, energy storage" },
  { name: "Rivian Automotive", website: "https://rivian.com", industry: "Electric Vehicles", size: "5000-10000", painPoints: ["Adventure vehicle durability simulation", "Battery cooling system design", "Supplier collaboration tools"], products: "R1T, R1S electric trucks" },
  { name: "Lucid Motors", website: "https://lucidmotors.com", industry: "Electric Vehicles", size: "1000-5000", painPoints: ["Luxury EV interior design", "Aerodynamic optimization", "Powertrain efficiency simulation"], products: "Lucid Air sedan" },
  { name: "Ford Motor Company", website: "https://ford.com", industry: "Automotive", size: "10000+", painPoints: ["EV transition design workflows", "F-150 Lightning production optimization", "Legacy system modernization"], products: "F-Series, Mustang Mach-E" },
  { name: "General Motors", website: "https://gm.com", industry: "Automotive", size: "10000+", painPoints: ["Ultium platform design standardization", "Multi-brand collaboration", "Autonomous vehicle simulation"], products: "Chevrolet, GMC, Cadillac EVs" },
  { name: "Stellantis North America", website: "https://stellantis.com", industry: "Automotive", size: "10000+", painPoints: ["Multi-brand platform consolidation", "Electric Jeep development", "Manufacturing footprint optimization"], products: "Jeep, Ram, Chrysler" },
  { name: "Honda R&D Americas", website: "https://honda.com", industry: "Automotive", size: "5000-10000", painPoints: ["Fuel cell vehicle design", "Crash simulation workflows", "Motorcycle-auto design sharing"], products: "Accord, CR-V, powersports" },
  { name: "Medtronic", website: "https://medtronic.com", industry: "Medical Devices", size: "10000+", painPoints: ["FDA 21 CFR Part 11 compliance", "Implant miniaturization design", "Biocompatibility simulation"], products: "Pacemakers, surgical robots" },
  { name: "Boston Scientific", website: "https://bostonscientific.com", industry: "Medical Devices", size: "10000+", painPoints: ["Catheter design optimization", "Regulatory documentation automation", "Sterilization process simulation"], products: "Stents, endoscopy equipment" },
  { name: "Abbott Laboratories", website: "https://abbott.com", industry: "Medical Devices", size: "10000+", painPoints: ["Wearable device miniaturization", "Glucose monitoring design", "Global regulatory compliance"], products: "FreeStyle Libre, diagnostics" },
  { name: "Stryker Corporation", website: "https://stryker.com", industry: "Medical Devices", size: "10000+", painPoints: ["Surgical robot arm design", "Hip/knee implant customization", "OR equipment ergonomics"], products: "Joint replacements, Mako robots" },
  { name: "Zimmer Biomet", website: "https://zimmerbiomet.com", industry: "Medical Devices", size: "5000-10000", painPoints: ["Patient-specific implant design", "3D printed orthopedic parts", "Surgeon collaboration tools"], products: "Orthopedic implants, robotics" },
  { name: "Edwards Lifesciences", website: "https://edwards.com", industry: "Medical Devices", size: "5000-10000", painPoints: ["Heart valve simulation", "Transcatheter device design", "Hemodynamic modeling"], products: "Heart valves, monitoring systems" },
  { name: "Intuitive Surgical", website: "https://intuitive.com", industry: "Medical Devices", size: "5000-10000", painPoints: ["da Vinci system iterations", "Surgical instrument miniaturization", "Haptic feedback simulation"], products: "da Vinci surgical systems" },
  { name: "Siemens Energy", website: "https://siemens-energy.com", industry: "Energy", size: "10000+", painPoints: ["Gas turbine blade design", "Hydrogen combustion simulation", "Grid equipment modernization"], products: "Turbines, grid infrastructure" },
  { name: "GE Vernova", website: "https://gevernova.com", industry: "Energy", size: "10000+", painPoints: ["Wind turbine optimization", "Power plant digital twin", "Decarbonization design tools"], products: "Wind turbines, power equipment" },
  { name: "Vestas Wind Systems", website: "https://vestas.com", industry: "Renewable Energy", size: "5000-10000", painPoints: ["Offshore wind turbine design", "Blade structural analysis", "Nacelle weight optimization"], products: "Wind turbines" },
  { name: "First Solar", website: "https://firstsolar.com", industry: "Renewable Energy", size: "5000-10000", painPoints: ["Thin-film panel design", "Manufacturing equipment optimization", "Tracker system simulation"], products: "Solar panels, utility projects" },
  { name: "Fluor Corporation", website: "https://fluor.com", industry: "Engineering & Construction", size: "10000+", painPoints: ["Plant layout optimization", "Piping stress analysis", "EPC project collaboration"], products: "Oil & gas, infrastructure projects" },
  { name: "Bechtel Corporation", website: "https://bechtel.com", industry: "Engineering & Construction", size: "10000+", painPoints: ["Mega-project design coordination", "Nuclear plant design tools", "Multi-discipline clash detection"], products: "Infrastructure, nuclear, LNG" },
  { name: "Jacobs Engineering", website: "https://jacobs.com", industry: "Engineering Services", size: "10000+", painPoints: ["Water treatment plant design", "Sustainability simulation tools", "Client design handoff workflows"], products: "Infrastructure, environmental" },
  { name: "AECOM", website: "https://aecom.com", industry: "Engineering & Construction", size: "10000+", painPoints: ["Transportation infrastructure design", "BIM-CAD integration", "Climate resilience analysis"], products: "Infrastructure, buildings" },
  { name: "Parker Hannifin", website: "https://parker.com", industry: "Motion & Control", size: "10000+", painPoints: ["Hydraulic system design", "Aerospace component certification", "Electrification of motion systems"], products: "Hydraulics, pneumatics, filtration" },
  { name: "Eaton Corporation", website: "https://eaton.com", industry: "Power Management", size: "10000+", painPoints: ["Electrical panel design", "Vehicle electrification components", "Data center cooling simulation"], products: "Power distribution, vehicle systems" },
  { name: "Emerson Electric", website: "https://emerson.com", industry: "Automation", size: "10000+", painPoints: ["Process automation design", "Valve and actuator simulation", "Plant digitalization tools"], products: "Automation systems, valves" },
  { name: "Rockwell Automation", website: "https://rockwellautomation.com", industry: "Industrial Automation", size: "5000-10000", painPoints: ["Factory floor simulation", "PLC cabinet design", "Digital twin integration"], products: "Allen-Bradley, FactoryTalk" },
  { name: "Illinois Tool Works", website: "https://itw.com", industry: "Diversified Manufacturing", size: "10000+", painPoints: ["Welding equipment design", "Packaging machinery optimization", "80/20 product rationalization"], products: "Welding, packaging, automotive" },
  { name: "Stanley Black & Decker", website: "https://stanleyblackanddecker.com", industry: "Tools & Industrial", size: "10000+", painPoints: ["Power tool ergonomics", "Battery platform design", "Manufacturing automation tools"], products: "DeWalt, Stanley, Craftsman" },
  { name: "Snap-on Incorporated", website: "https://snapon.com", industry: "Tools & Equipment", size: "5000-10000", painPoints: ["Diagnostic tool design", "Tool storage optimization", "Ergonomic handle simulation"], products: "Hand tools, diagnostics" },
  { name: "Textron Aviation", website: "https://txtav.com", industry: "Aviation", size: "5000-10000", painPoints: ["Business jet design iteration", "Cabin configuration tools", "Composite structure analysis"], products: "Cessna, Beechcraft aircraft" },
  { name: "Gulfstream Aerospace", website: "https://gulfstream.com", industry: "Aviation", size: "5000-10000", painPoints: ["Ultra-long-range aircraft design", "Cabin noise simulation", "Aerodynamic efficiency optimization"], products: "G700, G650 business jets" },
  { name: "Bombardier Aviation", website: "https://bombardier.com", industry: "Aviation", size: "5000-10000", painPoints: ["Global aircraft platform updates", "Wing design optimization", "Supplier CAD collaboration"], products: "Global, Challenger jets" },
  { name: "Spirit AeroSystems", website: "https://spiritaero.com", industry: "Aerospace Manufacturing", size: "10000+", painPoints: ["Fuselage manufacturing design", "OEM collaboration workflows", "Quality documentation systems"], products: "Aircraft fuselages, structures" },
  { name: "Howmet Aerospace", website: "https://howmet.com", industry: "Aerospace Components", size: "5000-10000", painPoints: ["Turbine blade casting design", "Fastener stress analysis", "Lightweight alloy optimization"], products: "Engine components, fasteners" },
  { name: "TE Connectivity", website: "https://te.com", industry: "Connectors & Sensors", size: "10000+", painPoints: ["Miniature connector design", "Automotive sensor simulation", "High-speed data connector optimization"], products: "Connectors, sensors" },
  { name: "Amphenol Corporation", website: "https://amphenol.com", industry: "Connectors", size: "10000+", painPoints: ["Military connector certification", "RF connector design", "Fiber optic connector simulation"], products: "Electronic connectors" },
  { name: "Cummins Inc", website: "https://cummins.com", industry: "Engines & Power", size: "10000+", painPoints: ["Hydrogen engine development", "Emissions compliance simulation", "Electrified powertrain design"], products: "Diesel engines, generators" },
  { name: "BorgWarner", website: "https://borgwarner.com", industry: "Automotive Powertrain", size: "10000+", painPoints: ["eDrive system design", "Turbocharger optimization", "Thermal management simulation"], products: "EV components, propulsion" },
  { name: "Dana Incorporated", website: "https://dana.com", industry: "Automotive Drivetrain", size: "5000-10000", painPoints: ["Electric axle design", "Off-highway drivetrain simulation", "Lightweighting initiatives"], products: "Axles, drivetrains" },
  { name: "Oshkosh Corporation", website: "https://oshkoshcorp.com", industry: "Specialty Vehicles", size: "5000-10000", painPoints: ["Fire truck ladder design", "Military vehicle protection simulation", "Airport equipment optimization"], products: "Defense, fire & emergency vehicles" },
  { name: "PACCAR", website: "https://paccar.com", industry: "Commercial Vehicles", size: "5000-10000", painPoints: ["Heavy truck aerodynamics", "EV truck development", "Driver comfort simulation"], products: "Peterbilt, Kenworth trucks" },
  { name: "Navistar International", website: "https://navistar.com", industry: "Commercial Vehicles", size: "5000-10000", painPoints: ["Electric bus design", "Fleet management integration", "Emissions system optimization"], products: "International trucks, buses" },
  { name: "Terex Corporation", website: "https://terex.com", industry: "Heavy Equipment", size: "5000-10000", painPoints: ["Crane stability simulation", "Aerial work platform design", "Material processing equipment optimization"], products: "Cranes, aerial lifts" },
  { name: "Manitowoc Company", website: "https://manitowoc.com", industry: "Cranes & Lifting", size: "1000-5000", painPoints: ["Tower crane design", "Boom deflection simulation", "Transport configuration optimization"], products: "Grove, Manitowoc cranes" },
  { name: "Lincoln Electric", website: "https://lincolnelectric.com", industry: "Welding", size: "5000-10000", painPoints: ["Welding robot design", "Consumable optimization", "Automated welding simulation"], products: "Welding equipment, consumables" },
  { name: "Graco Inc", website: "https://graco.com", industry: "Fluid Handling", size: "1000-5000", painPoints: ["Spray equipment design", "Pump simulation", "Contractor equipment ergonomics"], products: "Spray equipment, pumps" },
  { name: "Dover Corporation", website: "https://dovercorporation.com", industry: "Diversified Industrial", size: "5000-10000", painPoints: ["Fuel dispenser design", "Refrigeration equipment optimization", "Marking equipment simulation"], products: "Fuel systems, refrigeration" },
  { name: "IDEX Corporation", website: "https://idexcorp.com", industry: "Fluid & Metering", size: "5000-10000", painPoints: ["Precision pump design", "Flow meter simulation", "Fire suppression system optimization"], products: "Pumps, valves, meters" },
  { name: "Roper Technologies", website: "https://ropertech.com", industry: "Diversified Technology", size: "5000-10000", painPoints: ["Medical imaging design", "Industrial IoT integration", "Software-hardware co-design"], products: "Medical, industrial equipment" },
  { name: "Fortive Corporation", website: "https://fortive.com", industry: "Industrial Technology", size: "5000-10000", painPoints: ["Test equipment design", "Calibration tool simulation", "Connected device integration"], products: "Fluke, Tektronix instruments" },
  { name: "Ingersoll Rand", website: "https://ingersollrand.com", industry: "Industrial Equipment", size: "5000-10000", painPoints: ["Compressor efficiency design", "Material handling optimization", "IoT-connected equipment"], products: "Compressors, pumps, tools" },
  { name: "Flowserve Corporation", website: "https://flowserve.com", industry: "Flow Control", size: "5000-10000", painPoints: ["Industrial pump design", "Valve reliability simulation", "Seal system optimization"], products: "Pumps, valves, seals" },
  { name: "Chart Industries", website: "https://chartindustries.com", industry: "Cryogenic Equipment", size: "1000-5000", painPoints: ["LNG tank design", "Hydrogen storage simulation", "Heat exchanger optimization"], products: "Cryogenic equipment" },
  { name: "Watts Water Technologies", website: "https://watts.com", industry: "Water Technology", size: "1000-5000", painPoints: ["Valve design", "Plumbing product simulation", "Flow control optimization"], products: "Plumbing, heating products" },
  { name: "Mueller Water Products", website: "https://muellerwaterproducts.com", industry: "Water Infrastructure", size: "1000-5000", painPoints: ["Fire hydrant design", "Water main valve simulation", "Leak detection integration"], products: "Water infrastructure products" },
  { name: "Applied Materials", website: "https://appliedmaterials.com", industry: "Semiconductor Equipment", size: "10000+", painPoints: ["Wafer processing equipment design", "Chamber simulation", "Precision motion control"], products: "Chip manufacturing equipment" },
  { name: "Lam Research", website: "https://lamresearch.com", industry: "Semiconductor Equipment", size: "10000+", painPoints: ["Etch equipment design", "Deposition chamber simulation", "Cleanroom equipment optimization"], products: "Wafer fabrication equipment" },
  { name: "KLA Corporation", website: "https://kla.com", industry: "Semiconductor Equipment", size: "5000-10000", painPoints: ["Metrology tool design", "Optical inspection simulation", "Precision stage optimization"], products: "Inspection, metrology tools" },
  { name: "ASML", website: "https://asml.com", industry: "Semiconductor Equipment", size: "10000+", painPoints: ["Lithography system design", "EUV mirror simulation", "Ultra-precision mechanics"], products: "Lithography systems" },
  { name: "Brooks Automation", website: "https://brooks.com", industry: "Semiconductor Automation", size: "1000-5000", painPoints: ["Wafer handling robot design", "Vacuum system simulation", "Contamination control optimization"], products: "Automation, cryogenics" },
  { name: "Nordson Corporation", website: "https://nordson.com", industry: "Precision Technology", size: "5000-10000", painPoints: ["Dispensing equipment design", "Adhesive application simulation", "Electronic packaging tools"], products: "Dispensing, coating equipment" },
  { name: "Moog Inc", website: "https://moog.com", industry: "Motion Control", size: "5000-10000", painPoints: ["Actuation system design", "Flight control simulation", "Precision motion optimization"], products: "Actuators, motion control" },
  { name: "Curtiss-Wright Corporation", website: "https://curtisswright.com", industry: "Defense & Industrial", size: "5000-10000", painPoints: ["Naval equipment design", "Nuclear component simulation", "Rugged electronics optimization"], products: "Defense, nuclear equipment" },
  { name: "Mercury Systems", website: "https://mrcy.com", industry: "Defense Electronics", size: "1000-5000", painPoints: ["Rugged computing design", "RF module simulation", "Thermal management optimization"], products: "Defense processing subsystems" },
  { name: "L3Harris Technologies", website: "https://l3harris.com", industry: "Defense & Aerospace", size: "10000+", painPoints: ["Communication system design", "Sensor integration", "Space electronics optimization"], products: "Defense electronics, space" },
  { name: "BWX Technologies", website: "https://bwxt.com", industry: "Nuclear", size: "5000-10000", painPoints: ["Nuclear component design", "Reactor vessel simulation", "Fuel assembly optimization"], products: "Nuclear reactors, components" },
  { name: "Hexcel Corporation", website: "https://hexcel.com", industry: "Advanced Materials", size: "5000-10000", painPoints: ["Composite layup design", "Carbon fiber simulation", "Honeycomb structure optimization"], products: "Carbon fiber, composites" },
  { name: "Teledyne Technologies", website: "https://teledyne.com", industry: "Instrumentation", size: "10000+", painPoints: ["Imaging sensor design", "Marine instrument simulation", "Test equipment optimization"], products: "Sensors, instrumentation" },
  { name: "Trimble Inc", website: "https://trimble.com", industry: "Positioning Technology", size: "5000-10000", painPoints: ["GPS equipment design", "Construction technology integration", "Agriculture guidance simulation"], products: "Positioning, construction tech" },
  { name: "Zebra Technologies", website: "https://zebra.com", industry: "Enterprise Technology", size: "5000-10000", painPoints: ["Mobile computer design", "Barcode scanner simulation", "Rugged device optimization"], products: "Barcode, mobile computers" },
  { name: "Cognex Corporation", website: "https://cognex.com", industry: "Machine Vision", size: "1000-5000", painPoints: ["Vision system design", "Optical simulation", "AI inspection integration"], products: "Machine vision systems" },
  { name: "FANUC America", website: "https://fanucamerica.com", industry: "Industrial Robotics", size: "5000-10000", painPoints: ["Robot arm design", "Motion path simulation", "Collaborative robot safety"], products: "Industrial robots, CNC" },
  { name: "ABB Robotics", website: "https://abb.com", industry: "Industrial Automation", size: "10000+", painPoints: ["Collaborative robot design", "Welding robot simulation", "Painting robot optimization"], products: "Robots, automation" },
  { name: "KUKA Robotics", website: "https://kuka.com", industry: "Industrial Robotics", size: "5000-10000", painPoints: ["Automotive robot design", "Heavy payload simulation", "Mobile robot integration"], products: "Industrial robots" },
  { name: "Universal Robots", website: "https://universal-robots.com", industry: "Collaborative Robotics", size: "1000-5000", painPoints: ["Cobot arm design", "Force sensing simulation", "Deployment flexibility optimization"], products: "Collaborative robots" },
  { name: "Yaskawa America", website: "https://yaskawa.com", industry: "Motion & Robotics", size: "5000-10000", painPoints: ["Servo motor design", "Arc welding robot simulation", "Motion control optimization"], products: "Robots, drives, controls" },
  { name: "Proto Labs", website: "https://protolabs.com", industry: "Digital Manufacturing", size: "1000-5000", painPoints: ["Rapid prototyping workflow", "CNC programming automation", "3D printing design optimization"], products: "On-demand manufacturing" },
  { name: "Stratasys", website: "https://stratasys.com", industry: "3D Printing", size: "1000-5000", painPoints: ["Industrial 3D printer design", "Material simulation", "Production AM optimization"], products: "3D printers, materials" },
  { name: "3D Systems", website: "https://3dsystems.com", industry: "Additive Manufacturing", size: "1000-5000", painPoints: ["Metal AM system design", "Lattice structure simulation", "Healthcare printing optimization"], products: "3D printers, software" },
  { name: "Desktop Metal", website: "https://desktopmetal.com", industry: "Metal 3D Printing", size: "500-1000", painPoints: ["Binder jetting design", "Sintering simulation", "Production metal AM optimization"], products: "Metal 3D printing systems" },
  { name: "Markforged", website: "https://markforged.com", industry: "Industrial 3D Printing", size: "500-1000", painPoints: ["Continuous fiber design", "Metal FFF simulation", "Digital forge optimization"], products: "Composite, metal 3D printers" },
  { name: "Thermo Fisher Scientific", website: "https://thermofisher.com", industry: "Scientific Instruments", size: "10000+", painPoints: ["Lab equipment design", "Mass spectrometer simulation", "Chromatography optimization"], products: "Analytical instruments" },
  { name: "Agilent Technologies", website: "https://agilent.com", industry: "Life Sciences", size: "10000+", painPoints: ["Measurement instrument design", "Spectroscopy simulation", "Diagnostics equipment optimization"], products: "Life science instruments" },
  { name: "Waters Corporation", website: "https://waters.com", industry: "Analytical Instruments", size: "5000-10000", painPoints: ["HPLC system design", "Mass spec simulation", "Thermal analysis optimization"], products: "Chromatography, mass spec" },
  { name: "PerkinElmer", website: "https://perkinelmer.com", industry: "Life Sciences", size: "5000-10000", painPoints: ["Diagnostic instrument design", "Imaging system simulation", "Screening equipment optimization"], products: "Diagnostics, life science" },
  { name: "Bruker Corporation", website: "https://bruker.com", industry: "Scientific Instruments", size: "5000-10000", painPoints: ["NMR system design", "X-ray diffraction simulation", "Microscopy optimization"], products: "Scientific instruments" },
  { name: "HORIBA", website: "https://horiba.com", industry: "Analytical & Measurement", size: "5000-10000", painPoints: ["Emissions analyzer design", "Particle measurement simulation", "Medical diagnostic optimization"], products: "Analyzers, measurement" },
  { name: "National Instruments", website: "https://ni.com", industry: "Test & Measurement", size: "5000-10000", painPoints: ["DAQ system design", "RF test simulation", "Automated test optimization"], products: "Test systems, LabVIEW" },
  { name: "Keysight Technologies", website: "https://keysight.com", industry: "Test & Measurement", size: "10000+", painPoints: ["5G test equipment design", "Signal analyzer simulation", "Oscilloscope optimization"], products: "Electronic test equipment" },
  { name: "Sensata Technologies", website: "https://sensata.com", industry: "Sensors & Controls", size: "5000-10000", painPoints: ["Automotive sensor design", "Pressure transducer simulation", "Industrial control optimization"], products: "Sensors, controls" },
  { name: "Littelfuse", website: "https://littelfuse.com", industry: "Circuit Protection", size: "5000-10000", painPoints: ["Fuse design", "Power semiconductor simulation", "EV protection optimization"], products: "Fuses, semiconductors" },
  { name: "Vicor Corporation", website: "https://vicorpower.com", industry: "Power Systems", size: "1000-5000", painPoints: ["Power module design", "DC-DC converter simulation", "Thermal management optimization"], products: "Power components" },
  { name: "Advanced Energy Industries", website: "https://advancedenergy.com", industry: "Power Technology", size: "1000-5000", painPoints: ["Plasma power design", "Semiconductor power simulation", "Precision power optimization"], products: "Power solutions" },
  { name: "II-VI Incorporated", website: "https://coherent.com", industry: "Photonics", size: "5000-10000", painPoints: ["Laser component design", "Optical coating simulation", "Semiconductor laser optimization"], products: "Photonics, compound semiconductors" },
  { name: "Coherent Corp", website: "https://coherent.com", industry: "Lasers & Photonics", size: "5000-10000", painPoints: ["Industrial laser design", "Fiber laser simulation", "Photonics packaging optimization"], products: "Lasers, optics" },
  { name: "IPG Photonics", website: "https://ipgphotonics.com", industry: "Fiber Lasers", size: "5000-10000", painPoints: ["High-power laser design", "Beam delivery simulation", "Welding laser optimization"], products: "Fiber lasers" },
  { name: "Gentex Corporation", website: "https://gentex.com", industry: "Automotive Electronics", size: "5000-10000", painPoints: ["Auto-dimming mirror design", "Camera system simulation", "HomeLink integration optimization"], products: "Mirrors, cameras, electronics" },
  { name: "Modine Manufacturing", website: "https://modine.com", industry: "Thermal Management", size: "5000-10000", painPoints: ["Heat exchanger design", "EV thermal simulation", "Data center cooling optimization"], products: "Thermal management systems" },
  { name: "Dorman Products", website: "https://dormanproducts.com", industry: "Automotive Aftermarket", size: "1000-5000", painPoints: ["OE replacement design", "Reverse engineering workflow", "Catalog management tools"], products: "Aftermarket auto parts" },
  { name: "Shyft Group", website: "https://theshyftgroup.com", industry: "Specialty Vehicles", size: "1000-5000", painPoints: ["Delivery vehicle design", "EV chassis simulation", "Upfit configuration optimization"], products: "Specialty vehicles" },
  { name: "REV Group", website: "https://revgroup.com", industry: "Specialty Vehicles", size: "5000-10000", painPoints: ["Fire apparatus design", "Ambulance layout simulation", "RV optimization"], products: "Emergency, recreation vehicles" },
  { name: "Welbilt", website: "https://welbilt.com", industry: "Commercial Foodservice", size: "5000-10000", painPoints: ["Kitchen equipment design", "Cooking appliance simulation", "Refrigeration optimization"], products: "Commercial kitchen equipment" },
  { name: "Middleby Corporation", website: "https://middleby.com", industry: "Commercial Foodservice", size: "5000-10000", painPoints: ["Conveyor oven design", "Ventilation simulation", "Beverage equipment optimization"], products: "Cooking, processing equipment" },
  { name: "Tennant Company", website: "https://tennantco.com", industry: "Cleaning Equipment", size: "1000-5000", painPoints: ["Floor scrubber design", "Autonomous cleaning simulation", "Battery optimization"], products: "Industrial cleaning equipment" },
  { name: "Graco Inc", website: "https://graco.com", industry: "Fluid Handling", size: "1000-5000", painPoints: ["Pump design optimization", "Spray equipment simulation", "Lubrication system integration"], products: "Pumps, spray equipment" },
  { name: "Watts Water Technologies", website: "https://watts.com", industry: "Water Products", size: "1000-5000", painPoints: ["Valve design", "Flow control simulation", "Smart water integration"], products: "Plumbing, flow control" },
  { name: "Franklin Electric", website: "https://franklin-electric.com", industry: "Water & Fuel Systems", size: "1000-5000", painPoints: ["Submersible pump design", "Fueling system simulation", "IoT water monitoring"], products: "Pumps, fueling systems" },
  { name: "Hayward Industries", website: "https://hayward.com", industry: "Pool Equipment", size: "1000-5000", painPoints: ["Pool pump design", "Filtration simulation", "Smart pool optimization"], products: "Pool and spa equipment" },
  { name: "Pentair", website: "https://pentair.com", industry: "Water Solutions", size: "5000-10000", painPoints: ["Pool equipment design", "Industrial filtration simulation", "Residential water optimization"], products: "Water treatment, pool" },
  { name: "Xylem Inc", website: "https://xylem.com", industry: "Water Technology", size: "10000+", painPoints: ["Water pump design", "Analytics platform integration", "Treatment system simulation"], products: "Water technology" },
  { name: "Grundfos", website: "https://grundfos.com", industry: "Pump Technology", size: "10000+", painPoints: ["Intelligent pump design", "Variable speed simulation", "Water utility optimization"], products: "Pumps, water technology" },
  { name: "Sulzer", website: "https://sulzer.com", industry: "Flow Control", size: "5000-10000", painPoints: ["Industrial pump design", "Turbomachinery simulation", "Service tool optimization"], products: "Pumps, mixers, services" },
  { name: "Weir Group", website: "https://weir.com", industry: "Mining & Energy", size: "5000-10000", painPoints: ["Slurry pump design", "Wear simulation", "Mining equipment optimization"], products: "Pumps, valves, mining" },
  { name: "ITT Inc", website: "https://itt.com", industry: "Flow & Motion Control", size: "5000-10000", painPoints: ["Specialty pump design", "Connector simulation", "Brake component optimization"], products: "Pumps, connectors, brakes" },
  { name: "Crane Co", website: "https://craneco.com", industry: "Industrial Products", size: "5000-10000", painPoints: ["Valve design", "Fluid handling simulation", "Aerospace component optimization"], products: "Valves, aerospace, payment" },
  { name: "Circor International", website: "https://circor.com", industry: "Flow Control", size: "1000-5000", painPoints: ["Valve design", "Actuator simulation", "Severe service optimization"], products: "Valves, regulators" },
  { name: "SPX Corporation", website: "https://spx.com", industry: "Industrial Equipment", size: "5000-10000", painPoints: ["HVAC equipment design", "Cooling tower simulation", "Detection system optimization"], products: "HVAC, detection, power" },
  { name: "EnPro Industries", website: "https://enproindustries.com", industry: "Engineered Products", size: "1000-5000", painPoints: ["Sealing product design", "Advanced surface simulation", "Polymer component optimization"], products: "Seals, surface technologies" },
  { name: "Albany International", website: "https://albint.com", industry: "Engineered Composites", size: "1000-5000", painPoints: ["Aerospace composite design", "Paper machine clothing simulation", "Advanced material optimization"], products: "Composites, textiles" },
  { name: "Altra Industrial Motion", website: "https://altramotion.com", industry: "Power Transmission", size: "5000-10000", painPoints: ["Clutch and brake design", "Coupling simulation", "Precision motion optimization"], products: "Clutches, couplings, gearing" },
  { name: "Rexnord Corporation", website: "https://rexnord.com", industry: "Motion & Water", size: "5000-10000", painPoints: ["Conveyor component design", "Bearing simulation", "Water management optimization"], products: "Bearings, couplings, water" },
  { name: "Gates Industrial", website: "https://gates.com", industry: "Power Transmission", size: "10000+", painPoints: ["Belt drive design", "Hose and hydraulics simulation", "Fluid power optimization"], products: "Belts, hoses, hydraulics" },
  { name: "Timken Company", website: "https://timken.com", industry: "Bearings & Motion", size: "10000+", painPoints: ["Tapered bearing design", "Power transmission simulation", "Industrial bearing optimization"], products: "Bearings, power transmission" },
  { name: "SKF USA", website: "https://skf.com", industry: "Bearings & Seals", size: "10000+", painPoints: ["Rolling bearing design", "Lubrication simulation", "Condition monitoring optimization"], products: "Bearings, seals, services" },
  { name: "NSK Americas", website: "https://nsk.com", industry: "Bearings & Precision", size: "5000-10000", painPoints: ["Precision bearing design", "Linear motion simulation", "Automotive bearing optimization"], products: "Bearings, linear motion" },
  { name: "NTN Bearing Corporation", website: "https://ntnamericas.com", industry: "Bearings", size: "5000-10000", painPoints: ["Hub bearing design", "Wind turbine bearing simulation", "Constant velocity joint optimization"], products: "Bearings, driveshafts" },
  { name: "Schaeffler Americas", website: "https://schaeffler.com", industry: "Bearings & Automotive", size: "10000+", painPoints: ["Engine bearing design", "Transmission component simulation", "Electromobility optimization"], products: "Bearings, automotive" },
  { name: "Regal Rexnord", website: "https://regalrexnord.com", industry: "Motion & Power", size: "10000+", painPoints: ["Electric motor design", "Gearbox simulation", "Conveying component optimization"], products: "Motors, drives, conveying" },
  { name: "Nidec Motor Corporation", website: "https://nidec-motor.com", industry: "Motors & Drives", size: "10000+", painPoints: ["HVAC motor design", "Commercial motor simulation", "EV motor optimization"], products: "Electric motors" },
  { name: "WEG Industries", website: "https://weg.net", industry: "Motors & Drives", size: "10000+", painPoints: ["Industrial motor design", "Drive and automation simulation", "Energy efficiency optimization"], products: "Motors, drives, transformers" },
  { name: "ABB Motors & Drives", website: "https://abb.com", industry: "Electrification", size: "10000+", painPoints: ["IE5 motor design", "Variable speed drive simulation", "Digital powertrain optimization"], products: "Motors, drives, automation" },
  { name: "Siemens Digital Industries", website: "https://siemens.com", industry: "Industrial Automation", size: "10000+", painPoints: ["PLC hardware design", "Motion control simulation", "Digital twin optimization"], products: "Automation, drives, software" },
  { name: "Schneider Electric", website: "https://se.com", industry: "Energy Management", size: "10000+", painPoints: ["Switchgear design", "Power distribution simulation", "Building automation optimization"], products: "Power, automation, software" },
  { name: "Honeywell Process Solutions", website: "https://honeywell.com", industry: "Process Automation", size: "10000+", painPoints: ["DCS hardware design", "Safety system simulation", "Connected plant optimization"], products: "Automation, safety, software" },
  { name: "Johnson Controls", website: "https://johnsoncontrols.com", industry: "Building Technology", size: "10000+", painPoints: ["HVAC equipment design", "Building automation simulation", "Fire & security optimization"], products: "HVAC, controls, security" },
  { name: "Trane Technologies", website: "https://tranetechnologies.com", industry: "HVAC", size: "10000+", painPoints: ["Chiller design", "Refrigerant transition simulation", "Building efficiency optimization"], products: "HVAC equipment" },
  { name: "Carrier Global", website: "https://carrier.com", industry: "HVAC & Refrigeration", size: "10000+", painPoints: ["Heat pump design", "Cold chain simulation", "Fire & security optimization"], products: "HVAC, refrigeration, fire" },
  { name: "Lennox International", website: "https://lennox.com", industry: "HVAC", size: "5000-10000", painPoints: ["Residential HVAC design", "Commercial rooftop simulation", "Refrigeration optimization"], products: "Heating, cooling, refrigeration" },
  { name: "Daikin Industries", website: "https://daikin.com", industry: "HVAC", size: "10000+", painPoints: ["VRV system design", "Refrigerant innovation simulation", "Applied equipment optimization"], products: "HVAC equipment" },
  { name: "Wacker Neuson", website: "https://wackerneuson.com", industry: "Compact Equipment", size: "1000-5000", painPoints: ["Compact excavator design", "Concrete equipment simulation", "Electric equipment optimization"], products: "Compact equipment" },
  { name: "Manitou Group", website: "https://manitou.com", industry: "Material Handling", size: "1000-5000", painPoints: ["Telehandler design", "Aerial platform simulation", "Electric forklift optimization"], products: "Telehandlers, forklifts" },
  { name: "JLG Industries", website: "https://jlg.com", industry: "Access Equipment", size: "5000-10000", painPoints: ["Boom lift design", "Scissor lift simulation", "Electric platform optimization"], products: "Aerial work platforms" },
  { name: "Skyjack", website: "https://skyjack.com", industry: "Access Equipment", size: "1000-5000", painPoints: ["Scissor lift design", "Telehandler simulation", "Simplicity optimization"], products: "Scissor lifts, telehandlers" },
  { name: "Genie", website: "https://genielift.com", industry: "Aerial Equipment", size: "5000-10000", painPoints: ["Articulating boom design", "Material lift simulation", "Hybrid power optimization"], products: "Aerial lifts" },
  { name: "Bobcat Company", website: "https://bobcat.com", industry: "Compact Equipment", size: "5000-10000", painPoints: ["Compact loader design", "Attachment simulation", "Electric equipment optimization"], products: "Loaders, excavators, UTVs" },
  { name: "Kubota USA", website: "https://kubota.com", industry: "Compact Equipment", size: "5000-10000", painPoints: ["Compact tractor design", "Construction equipment simulation", "Engine optimization"], products: "Tractors, construction, turf" },
  { name: "STIHL Inc", website: "https://stihl.com", industry: "Outdoor Power", size: "5000-10000", painPoints: ["Chainsaw design", "Battery platform simulation", "Ergonomic optimization"], products: "Chainsaws, trimmers, blowers" },
  { name: "Husqvarna", website: "https://husqvarna.com", industry: "Outdoor Power", size: "5000-10000", painPoints: ["Robotic mower design", "Professional equipment simulation", "Battery platform optimization"], products: "Mowers, chainsaws, robots" },
  { name: "Briggs & Stratton", website: "https://briggsandstratton.com", industry: "Small Engines", size: "1000-5000", painPoints: ["Small engine design", "Electric power simulation", "Commercial turf optimization"], products: "Engines, power products" },
  { name: "Kohler Power", website: "https://kohler.com", industry: "Engines & Power", size: "10000+", painPoints: ["Generator design", "Industrial engine simulation", "Residential power optimization"], products: "Generators, engines" },
  { name: "Generac Power Systems", website: "https://generac.com", industry: "Power Generation", size: "5000-10000", painPoints: ["Home standby design", "Industrial generator simulation", "Energy storage optimization"], products: "Generators, energy storage" },
];

const CONTACT_TITLES = [
  "VP of Engineering", "Director of Engineering", "Chief Technology Officer", "VP of Manufacturing",
  "Engineering Manager", "Director of IT", "Plant Manager", "VP of Product Development",
  "Chief Operating Officer", "Director of Operations", "Manufacturing Director", "IT Director",
  "VP of R&D", "Operations Manager", "Director of Quality", "Chief Information Officer",
  "Director of Design Engineering", "Senior Engineering Manager", "Director of Product Engineering",
  "VP of Technical Operations", "Chief Engineer", "Principal Engineer", "Director of CAD/CAM",
  "Manufacturing Engineering Manager", "Director of New Product Development", "VP of Innovation",
];

const FIRST_NAMES = [
  "James", "Sarah", "Michael", "Jennifer", "David", "Lisa", "Robert", "Emily", "William", "Amanda",
  "Christopher", "Michelle", "Matthew", "Jessica", "Daniel", "Nicole", "Andrew", "Stephanie", "Joshua", "Rebecca",
  "Ryan", "Laura", "Kevin", "Angela", "Brandon", "Melissa", "Justin", "Christina", "Tyler", "Amber",
  "Aaron", "Heather", "Nathan", "Kimberly", "Jacob", "Rachel", "Zachary", "Megan", "Ethan", "Ashley",
  "Nicholas", "Samantha", "Dylan", "Brittany", "Jonathan", "Danielle", "Austin", "Lauren", "Eric", "Courtney",
  "Mark", "Catherine", "Steven", "Elizabeth", "Brian", "Patricia", "Joseph", "Sandra", "Timothy", "Karen",
  "Thomas", "Nancy", "Gregory", "Betty", "Frank", "Margaret", "Raymond", "Dorothy", "Dennis", "Ruth",
  "Peter", "Helen", "Douglas", "Diane", "Henry", "Virginia", "Carl", "Marie", "Arthur", "Janet",
];

const LAST_NAMES = [
  "Thompson", "Mitchell", "Chen", "Williams", "Anderson", "Martinez", "Taylor", "Johnson", "Brown", "Davis",
  "Wilson", "Garcia", "Miller", "Moore", "Jackson", "White", "Harris", "Martin", "Lee", "Clark",
  "Lewis", "Robinson", "Walker", "Hall", "Allen", "Young", "King", "Wright", "Scott", "Green",
  "Baker", "Adams", "Nelson", "Hill", "Campbell", "Carter", "Phillips", "Evans", "Turner", "Collins",
  "Edwards", "Stewart", "Morris", "Rogers", "Reed", "Cook", "Morgan", "Bell", "Murphy", "Bailey",
  "Rivera", "Cooper", "Richardson", "Cox", "Howard", "Ward", "Torres", "Peterson", "Gray", "Ramirez",
  "James", "Watson", "Brooks", "Kelly", "Sanders", "Price", "Bennett", "Wood", "Barnes", "Ross",
  "Henderson", "Coleman", "Jenkins", "Perry", "Powell", "Long", "Patterson", "Hughes", "Flores", "Washington",
];

const LEAD_STATUSES = ["new", "contacted", "qualified", "meeting-booked", "handed-off"];
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

function recentDate(hoursAgo: number): Date {
  const date = new Date();
  date.setTime(date.getTime() - Math.floor(Math.random() * hoursAgo * 60 * 60 * 1000));
  return date;
}

function dateInLastWeek(): Date {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, 6));
  date.setHours(randomInt(8, 18), randomInt(0, 59), 0, 0);
  return date;
}

function generateTranscript(contactName: string, companyName: string, outcome: string, painPoints: string[]): string {
  const sdrName = "SDR";
  const painPoint = painPoints[0] || "CAD software challenges";
  
  const intros = [
    `${sdrName}: Hi ${contactName}, this is calling from Hawk Ridge Systems. I noticed ${companyName} has been expanding operations. Do you have a moment to discuss your engineering design workflows?`,
    `${sdrName}: Good morning ${contactName}, I'm reaching out from Hawk Ridge Systems. We work with many companies in your industry on SOLIDWORKS solutions. Is this a good time?`,
    `${sdrName}: Hello ${contactName}, hope I'm not catching you at a bad time. I wanted to connect about how ${companyName} is handling ${painPoint}?`,
  ];
  
  const discoveries = [
    `${contactName}: Actually, yes. We've been struggling with ${painPoint}. It's been causing delays in our product development.
${sdrName}: I hear that a lot from engineering leaders. Can you tell me more about the specific challenges you're facing?
${contactName}: Well, our current CAD system is over 5 years old, and we're finding it hard to collaborate across our different sites.
${sdrName}: That's a common issue. How many engineers are working with design files on a daily basis?
${contactName}: We have about 45 engineers across three locations. Version control has become a nightmare.`,
    `${contactName}: Yes, actually. We're evaluating different solutions right now.
${sdrName}: Perfect timing then. What's driving the evaluation?
${contactName}: Mainly ${painPoint}. Our current tools just aren't keeping up with what we need.
${sdrName}: I understand. What specific capabilities are you looking for in a new solution?
${contactName}: Better simulation, definitely. And we need seamless PDM integration.`,
    `${contactName}: We're actually locked into a contract, but I'm always interested in learning what's new.
${sdrName}: I appreciate that. When does your current agreement expire?
${contactName}: End of next year. But if there's compelling value, we can always revisit earlier.
${sdrName}: That makes sense. What would make you consider switching before the contract ends?
${contactName}: Significant productivity improvements. Our ${painPoint} is really hurting our time-to-market.`,
  ];
  
  const qualifications = {
    qualified: `${sdrName}: Based on what you've shared, it sounds like SOLIDWORKS could address these challenges. We have several customers in your industry who saw 30% faster design cycles after implementation.
${contactName}: That would be significant for us. What would be the next steps?
${sdrName}: I'd recommend a technical assessment where our solutions engineer evaluates your specific workflow. Would that be valuable?
${contactName}: Yes, let's do that. I can also loop in our CAD manager and IT director.
${sdrName}: Perfect. I'll send over some preliminary information and set up a call with our technical team.`,
    "meeting-booked": `${sdrName}: Given your timeline and the challenges you've outlined, I think a personalized demo would be really valuable. Our solution engineer can show exactly how SOLIDWORKS handles ${painPoint}.
${contactName}: That sounds good. When can we schedule that?
${sdrName}: How does next Tuesday at 2 PM work for you? We can do a 45-minute session.
${contactName}: Let me check... yes, that works. Send me a calendar invite.
${sdrName}: Excellent! I'll include a brief agenda. Who else should I invite from your team?
${contactName}: Add our engineering manager, Mike Stevens, and Sarah from IT.`,
    connected: `${sdrName}: I really appreciate you taking the time today, ${contactName}. It sounds like there's definitely some alignment here.
${contactName}: Yes, thanks for the call. Send me some information and I'll review it with my team.
${sdrName}: Absolutely. I'll send over a case study from a similar company in your industry. Can I follow up next week to see if you have questions?
${contactName}: Sure, early next week would be fine.`,
    "not-interested": `${contactName}: Look, we just signed a 5-year agreement with PTC last quarter. There's really no point in continuing this conversation.
${sdrName}: I completely understand. Timing is everything. Would it be alright if I checked back in about 4 years as you approach renewal?
${contactName}: That's fine, but I can't promise we'll be interested.
${sdrName}: I appreciate your honesty. Things change, and we'll be here if you ever need alternatives.`,
    voicemail: `${sdrName}: Hi ${contactName}, this is calling from Hawk Ridge Systems. I work with engineering teams at companies like ${companyName} on SOLIDWORKS solutions. I'd love to discuss how we're helping companies address ${painPoint}. Please give me a call back at your convenience, or I'll try you again later this week.`,
  };
  
  const outcomeKey = outcome === "meeting-booked" ? "meeting-booked" : 
                     outcome === "qualified" ? "qualified" :
                     outcome === "not-interested" ? "not-interested" :
                     outcome === "voicemail" ? "voicemail" : "connected";
  
  if (outcomeKey === "voicemail") {
    return qualifications.voicemail;
  }
  
  return `${randomItem(intros)}\n\n${randomItem(discoveries)}\n\n${qualifications[outcomeKey]}`;
}

function generateCoachingAnalysis(score: number, disposition: string): string {
  const strengths = [
    "Strong opening with clear value proposition and company research",
    "Excellent rapport building through industry-specific knowledge",
    "Effective use of open-ended discovery questions",
    "Professional tone maintained throughout the call",
    "Demonstrated deep product knowledge and competitive positioning",
    "Handled objections with confidence and relevant examples",
    "Active listening skills evident through follow-up questions",
    "Clear next steps established with specific timeline",
    "Good use of customer success stories to build credibility",
    "Effectively uncovered budget and decision-making process",
  ];
  
  const improvements = [
    "Could ask more discovery questions before presenting solutions",
    "Consider slowing down the pace to allow prospect to elaborate",
    "More focus needed on identifying specific pain points",
    "Better qualification of decision-making authority recommended",
    "Stronger transition to closing could improve conversion",
    "More personalization based on pre-call research would help",
    "Value articulation could be more specific to prospect's industry",
    "Better handling of silence/pauses to encourage prospect sharing",
    "Consider deeper exploration of competitive landscape",
    "More emphasis on ROI and business impact would strengthen pitch",
  ];
  
  const actions = [
    "Practice discovery question techniques using SPIN methodology",
    "Review objection handling playbook for pricing concerns",
    "Study competitor differentiation points for PTC and Autodesk",
    "Work on call opening variations for different industries",
    "Improve closing statement delivery with specific CTAs",
    "Focus on BANT qualification in first 5 minutes",
    "Practice handling 'we're happy with current vendor' objection",
    "Develop industry-specific case study references",
  ];
  
  const bantAssessment = {
    budget: disposition === "meeting-booked" || disposition === "qualified" ? 
      { status: "identified", details: "Prospect confirmed budget allocation for Q2" } :
      { status: "unknown", details: "Budget not discussed in this call" },
    authority: disposition === "meeting-booked" ? 
      { status: "confirmed", details: "VP-level decision maker with final approval authority" } :
      { status: "partial", details: "Technical influencer, need to identify economic buyer" },
    need: { status: "confirmed", details: "Clear pain points around current CAD limitations" },
    timeline: disposition === "meeting-booked" ? 
      { status: "defined", details: "Looking to implement by end of Q2" } :
      { status: "exploratory", details: "No specific timeline established" },
  };
  
  const analysis = {
    overallScore: score,
    callSummary: `The SDR demonstrated ${score >= 8 ? "excellent" : score >= 6 ? "solid" : "developing"} sales skills during this ${disposition === "meeting-booked" ? "successful meeting-booking call" : disposition === "qualified" ? "qualifying call" : "prospecting call"}. ${score >= 7 ? "Strong discovery and value articulation led to positive outcome." : "Room for improvement on key qualifying metrics."}`,
    strengths: strengths.slice(0, randomInt(3, 5)),
    areasForImprovement: improvements.slice(0, randomInt(2, 4)),
    talkListenRatio: {
      sdrTalkTime: randomInt(35, 55),
      prospectTalkTime: randomInt(45, 65),
      notes: score >= 7 ? "Excellent balance with prospect doing most of the talking" : "Consider letting the prospect speak more to uncover needs"
    },
    questionQuality: {
      openEnded: randomInt(5, 10),
      closedEnded: randomInt(2, 5),
      score: Math.min(10, randomInt(score - 1, score + 1)),
      notes: "Good use of open-ended discovery questions. Consider adding more situation and implication questions."
    },
    objectionHandling: {
      objections: ["Pricing concern", "Happy with current vendor", "Need to check with team", "Budget timing"].slice(0, randomInt(1, 3)),
      score: Math.min(10, randomInt(score - 1, score + 2)),
      notes: score >= 7 ? "Objections handled professionally with relevant examples" : "Practice turning objections into opportunities for deeper discovery"
    },
    bantAssessment,
    recommendedActions: actions.slice(0, randomInt(2, 4)),
    nextSteps: disposition === "meeting-booked" ? ["Demo scheduled with solutions engineer", "Send calendar invite with agenda", "Prepare industry-specific presentation"] :
               disposition === "qualified" ? ["Send ROI case study", "Schedule technical assessment call", "Research additional stakeholders"] :
               disposition === "callback-scheduled" ? ["Follow up as scheduled", "Prepare new value proposition angle", "Research recent company news"] :
               ["Send introduction email", "Research company further", "Plan follow-up approach"]
  };
  
  return JSON.stringify(analysis);
}

async function seedDemoData() {
  console.log("🌱 Starting comprehensive demo data seed...\n");
  
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);
  
  console.log("📝 Creating managers...");
  const createdManagers: { id: string; email: string }[] = [];
  for (const manager of MANAGER_DATA) {
    const [created] = await db.insert(managers).values({
      name: manager.name,
      email: manager.email,
      phone: manager.phone,
      title: manager.title,
      bio: manager.bio,
      coachingStyle: manager.coachingStyle,
      specialties: manager.specialties,
      yearsExperience: manager.yearsExperience,
      certifications: manager.certifications,
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
      bio: sdr.bio,
      strengths: sdr.strengths,
      developmentAreas: sdr.developmentAreas,
      goals: sdr.goals,
      yearsExperience: sdr.yearsExperience,
      previousCompany: sdr.previousCompany,
      specialties: sdr.specialties,
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
      phone: ae.phone,
      title: ae.title,
      bio: ae.bio,
      dealFocus: ae.dealFocus,
      yearsExperience: ae.yearsExperience,
      quotaAttainment: ae.quotaAttainment,
      avgDealSize: ae.avgDealSize,
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
  
  console.log("🎯 Creating leads with detailed research...");
  const createdLeads: { id: string; companyName: string; contactName: string; sdrId: string; painPoints: string[] }[] = [];
  
  const companiesPerStatus: Record<string, number> = {
    new: 40,
    contacted: 50,
    qualified: 45,
    "meeting-booked": 30,
    "handed-off": 20,
  };
  
  let companyIndex = 0;
  for (const [status, count] of Object.entries(companiesPerStatus)) {
    for (let i = 0; i < count && companyIndex < REAL_COMPANIES.length; i++) {
      const company = REAL_COMPANIES[companyIndex];
      const firstName = randomItem(FIRST_NAMES);
      const lastName = randomItem(LAST_NAMES);
      const contactName = `${firstName} ${lastName}`;
      const sdr = createdSdrs[companyIndex % createdSdrs.length];
      const ae = status === "handed-off" ? randomItem(createdAEs) : null;
      const fitScore = status === "handed-off" ? randomInt(75, 95) :
                       status === "meeting-booked" ? randomInt(70, 90) :
                       status === "qualified" ? randomInt(60, 85) :
                       randomInt(30, 80);
      const priority = fitScore >= 80 ? "hot" : fitScore >= 60 ? "warm" : fitScore >= 40 ? "cool" : "cold";
      
      const emailDomain = company.website.replace("https://", "").replace("http://", "");
      
      const [lead] = await db.insert(leads).values({
        companyName: company.name,
        companyWebsite: company.website,
        companyIndustry: company.industry,
        companySize: company.size,
        contactName: contactName,
        contactTitle: randomItem(CONTACT_TITLES),
        contactEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailDomain}`,
        contactPhone: `+1${randomInt(200, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`,
        source: randomItem(["manual", "google_sheets", "salesforce", "referral", "website", "linkedin"]),
        status: status,
        fitScore: fitScore,
        priority: priority,
        assignedSdrId: sdr.id,
        assignedAeId: ae?.id || null,
        qualificationNotes: status !== "new" ? `${company.painPoints[0]}. ${status === "qualified" ? "Strong buying signals, technical evaluation planned." : status === "meeting-booked" ? "Demo scheduled, multiple stakeholders involved." : status === "handed-off" ? "Qualified opportunity, ready for AE engagement." : "Initial contact made, follow-up required."}` : null,
        budget: status === "qualified" || status === "meeting-booked" || status === "handed-off" ? randomItem(["$50k-100k", "$100k-250k", "$250k-500k", "$500k+", "$1M+"]) : null,
        timeline: status !== "new" ? randomItem(["Q1 2026", "Q2 2026", "H2 2026", "Next 6 months", "Evaluating", "FY27 Budget"]) : null,
        handedOffAt: status === "handed-off" ? randomDate(30) : null,
        lastContactedAt: status !== "new" ? (status === "contacted" ? dateInLastWeek() : randomDate(14)) : null,
      }).returning();
      
      if (lead) {
        createdLeads.push({ 
          id: lead.id, 
          companyName: company.name, 
          contactName: contactName,
          sdrId: sdr.id,
          painPoints: company.painPoints,
        });
        
        await db.insert(researchPackets).values({
          leadId: lead.id,
          companyIntel: `${company.name} is a ${company.size} employee ${company.industry} company. ${company.products}. They are a market leader with strong growth trajectory and significant investment in engineering and product development. Recent news includes expansion initiatives and digital transformation projects.`,
          contactIntel: `${contactName} has been with ${company.name} for ${randomInt(3, 15)} years in increasingly senior engineering leadership roles. Background includes experience with major CAD platforms and PLM systems. Active on LinkedIn with ${randomInt(800, 8000)} connections. Known for driving technology adoption and process improvement initiatives.`,
          painSignals: company.painPoints.map(p => `- ${p}`).join("\n"),
          competitorPresence: `Currently using ${randomItem(["AutoCAD", "Inventor", "Fusion 360", "PTC Creo", "Siemens NX", "CATIA"])}. ${randomItem(["Some concerns about support quality and upgrade costs.", "Looking to consolidate multi-CAD environment.", "Evaluating alternatives for upcoming contract renewal.", "Frustrated with lack of simulation capabilities."])}`,
          fitAnalysis: `Strong fit for SOLIDWORKS ${company.industry.includes("Aerospace") || company.industry.includes("Defense") ? "Premium with Simulation Professional" : company.industry.includes("Medical") ? "Professional with PDM" : "Professional with CAM"} solutions. ${company.size.includes("10000") ? "Enterprise-level deployment" : company.size.includes("5000") ? "Large deployment" : "Mid-market opportunity"} with budget alignment for ${priority === "hot" ? "immediate purchase" : priority === "warm" ? "Q1-Q2 decision" : "long-term nurturing"}.`,
          fitScore: fitScore,
          priority: priority,
          talkTrack: `Opening: "Hi ${contactName}, I noticed ${company.name} has been ${randomItem(["expanding operations", "investing in new product development", "modernizing your engineering workflows"])}. Many ${company.industry} companies are finding that ${company.painPoints[0]}..."\n\nValue Prop: Focus on ${company.industry}-specific ROI and productivity gains. Reference similar customers like ${randomItem(["Boeing", "Lockheed", "Caterpillar", "John Deere", "Medtronic"])} success stories.\n\nCall to Action: Offer a ${randomItem(["technical assessment", "personalized demo", "engineering workflow review"])}.`,
          discoveryQuestions: `1. What CAD/CAM software are you currently using across your engineering teams?\n2. How many engineers work with design files on a daily basis?\n3. What's your biggest challenge with ${company.painPoints[0]}?\n4. When does your current software licensing agreement expire?\n5. Who else would be involved in evaluating a new design platform?\n6. What's your timeline for making improvements to your engineering workflow?`,
          objectionHandles: `Price: "I understand budget is a consideration. Let me show you our ROI calculator that demonstrates typical 3-year TCO savings of 25-40%..."\nTiming: "I completely understand. Many of our customers started with a pilot program on one team before broader rollout..."\nCompetitor: "That's a solid platform too. The key differentiator for ${company.industry} companies is our ${randomItem(["simulation depth", "PDM integration", "manufacturing connectivity"])}..."`,
          verificationStatus: "verified",
        }).onConflictDoNothing();
      }
      
      companyIndex++;
    }
  }
  console.log(`   ✅ Created ${createdLeads.length} leads with research packets\n`);
  
  console.log("📞 Creating call sessions (20+ per SDR with recent focus)...");
  let callCount = 0;
  let recentCallCount = 0;
  
  const userRecords = await db.select().from(users).where(sql`role = 'sdr'`);
  
  for (const sdr of createdSdrs) {
    const sdrUser = userRecords.find(u => u.sdrId === sdr.id);
    if (!sdrUser) continue;
    
    const sdrLeads = createdLeads.filter(l => l.sdrId === sdr.id);
    const callsPerSdr = randomInt(22, 28);
    
    for (let i = 0; i < callsPerSdr; i++) {
      const lead = sdrLeads[i % sdrLeads.length] || randomItem(createdLeads);
      
      let callDate: Date;
      if (i < 3) {
        callDate = recentDate(24);
        recentCallCount++;
      } else if (i < 8) {
        callDate = dateInLastWeek();
        recentCallCount++;
      } else {
        callDate = randomDate(45);
      }
      
      const disposition = i < 5 ? randomItem(["connected", "qualified", "meeting-booked", "callback-scheduled"]) : randomItem(DISPOSITIONS);
      const duration = disposition === "voicemail" ? randomInt(20, 45) : 
                       disposition === "no-answer" ? 0 :
                       disposition === "meeting-booked" ? randomInt(480, 900) :
                       disposition === "qualified" ? randomInt(360, 720) :
                       disposition === "connected" ? randomInt(180, 480) :
                       randomInt(60, 300);
      const score = disposition === "meeting-booked" ? randomInt(8, 10) :
                    disposition === "qualified" ? randomInt(7, 9) :
                    disposition === "connected" ? randomInt(5, 8) :
                    randomInt(4, 7);
      
      // Generate transcript for all answered calls including voicemails, but not for no-answer
      const transcript = disposition !== "no-answer" ? generateTranscript(lead.contactName, lead.companyName, disposition, lead.painPoints) : null;
      const coachingNotes = duration > 120 ? generateCoachingAnalysis(score, disposition) : null;
      
      const [session] = await db.insert(callSessions).values({
        callSid: `demo_call_${sdr.id}_${i}_${Date.now()}_${randomInt(1000, 9999)}`,
        userId: sdrUser.id,
        leadId: lead.id,
        direction: "outbound",
        fromNumber: "+18885551234",
        toNumber: `+1${randomInt(200, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`,
        status: "completed",
        duration: duration,
        transcriptText: transcript,
        coachingNotes: coachingNotes,
        managerSummary: duration > 180 && Math.random() > 0.4 ? `${disposition === "meeting-booked" ? "Excellent call - demo successfully scheduled with multiple stakeholders." : disposition === "qualified" ? "Good qualification call - prospect shows strong buying signals." : "Productive conversation - follow-up required."} ${sdr.name} ${score >= 8 ? "demonstrated excellent skills" : score >= 6 ? "showed solid performance" : "has room for improvement"}.` : null,
        startedAt: callDate,
        endedAt: new Date(callDate.getTime() + duration * 1000),
        disposition: disposition,
        sentimentScore: score,
        keyTakeaways: duration > 120 ? `Key interest in ${randomItem(["SOLIDWORKS Professional", "PDM", "Simulation", "CAM", "Technical Services"])}. ${lead.painPoints[0]}` : null,
        nextSteps: disposition === "meeting-booked" ? "Demo scheduled with solutions engineer" : 
                   disposition === "qualified" ? "Send proposal and case studies" :
                   disposition === "callback-scheduled" ? "Follow up call scheduled" : 
                   disposition === "connected" ? "Send introduction materials" : null,
      }).returning();
      
      if (session && duration > 120) {
        await db.insert(managerCallAnalyses).values({
          callSessionId: session.id,
          sdrId: sdr.id,
          sdrName: sdr.name,
          callDate: callDate,
          callType: "outbound_prospecting",
          durationSeconds: duration,
          overallScore: score,
          openingScore: Math.min(10, randomInt(score - 1, score + 2)),
          discoveryScore: Math.min(10, randomInt(score - 1, score + 1)),
          listeningScore: Math.min(10, randomInt(score, score + 2)),
          objectionScore: Math.min(10, randomInt(score - 2, score + 1)),
          valuePropositionScore: Math.min(10, randomInt(score - 1, score + 1)),
          closingScore: Math.min(10, randomInt(score - 2, score + 2)),
          complianceScore: randomInt(8, 10),
          keyObservations: `${sdr.name} ${score >= 8 ? "demonstrated excellent sales execution with strong discovery and closing" : score >= 6 ? "showed solid fundamental skills with room for growth" : "needs additional coaching on key selling techniques"}. ${disposition === "meeting-booked" ? "Successfully converted to meeting." : disposition === "qualified" ? "Good qualification achieved." : "Productive prospecting activity."}`,
          recommendations: `Focus on ${randomItem(["deeper discovery questioning", "stronger value articulation", "more confident closing", "better objection handling", "improved active listening"])}. ${score >= 7 ? "Consider for advanced coaching track." : "Schedule additional role-play sessions."}`,
          summary: `${duration >= 300 ? "Extended" : "Standard"} prospecting call with ${lead.companyName}. ${disposition === "meeting-booked" ? "High-value outcome with demo scheduled." : disposition === "qualified" ? "Qualified opportunity identified." : "Productive conversation establishing rapport."}`,
        }).onConflictDoNothing();
      }
      
      callCount++;
    }
  }
  console.log(`   ✅ Created ${callCount} call sessions (${recentCallCount} in last week)\n`);
  
  console.log("🎉 Demo data seeding complete!\n");
  console.log("📊 Summary:");
  console.log(`   - ${createdManagers.length} Managers`);
  console.log(`   - ${createdSdrs.length} SDRs`);
  console.log(`   - ${createdAEs.length} Account Executives`);
  console.log(`   - ${createdLeads.length} Leads with detailed research`);
  console.log(`   - ${callCount} Call sessions with analysis`);
  console.log(`   - ${recentCallCount} Recent calls (last 7 days)`);
  console.log(`\n🔑 All demo accounts use password: ${DEMO_PASSWORD}`);
  console.log(`\n📧 Example logins:`);
  console.log(`   - SDR: carlos.martinez@hawkridge.com`);
  console.log(`   - Manager: roberto.hernandez@hawkridge.com`);
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
