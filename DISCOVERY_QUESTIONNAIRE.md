# AI Sales Intelligence Platform
## Discovery Questionnaire & Technical Specifications
### Hawk Ridge Systems Implementation

---

| Field | Value |
|-------|-------|
| **Client** | Hawk Ridge Systems |
| **Prepared By** | Ground Game / DeHyl Co. |
| **Date** | January 2026 |
| **Version** | 1.0 - Discovery Phase |

---

## 1. Purpose of This Document

This discovery document captures the technical specifications and integration requirements needed to adapt the Lead Intel AI Sales Platform to Hawk Ridge Systems' environment. The existing platform was built with Twilio, PostgreSQL, and custom integrations. This questionnaire will help us map those capabilities to your Salesforce, Zoom, and Azure infrastructure.

---

## 2. Architecture Mapping

### 2.1 Current Platform Architecture

| Component | Current Implementation | Target (Hawk Ridge) |
|-----------|----------------------|---------------------|
| **CRM / Lead Source** | Google Sheets import, manual entry | Salesforce (TBD: Sales Cloud? Pardot?) |
| **Voice/Calls** | Twilio Voice SDK (browser softphone) | Zoom (TBD: Phone? Meetings? Both?) |
| **Database** | PostgreSQL (Replit managed) | Azure (TBD: SQL? Cosmos DB?) |
| **AI/ML** | Google Gemini (research, coaching, analysis) | TBD: Azure OpenAI? Keep Gemini? |
| **Authentication** | Session-based (Passport.js) | TBD: Azure AD? SSO? |
| **File Storage** | Google Drive (recordings, docs) | TBD: Azure Blob? SharePoint? |
| **Email** | Gmail API (notifications, coaching) | TBD: Outlook? SendGrid? |

### 2.2 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  React 18 + Vite + TanStack Query + Tailwind CSS               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                             │
│              Express.js + Session Auth + RBAC                   │
└─────────────────────────────────────────────────────────────────┘
           │              │              │              │
           ▼              ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ Twilio   │   │ Google   │   │ Gemini   │   │PostgreSQL│
    │ Voice    │   │ APIs     │   │ AI       │   │ Database │
    │    ↓     │   │    ↓     │   │          │   │    ↓     │
    │  ZOOM    │   │Salesforce│   │          │   │  AZURE   │
    └──────────┘   └──────────┘   └──────────┘   └──────────┘
```

---

## 3. Salesforce Integration Questions

The platform currently manages leads internally. We need to understand how to integrate with your Salesforce instance for bi-directional sync.

| Category | Question | Client Response |
|----------|----------|-----------------|
| **Products** | Which Salesforce products do you use? (Sales Cloud, Service Cloud, Marketing Cloud, Pardot, etc.) | |
| **Edition** | What Salesforce edition? (Professional, Enterprise, Unlimited) | |
| **Lead Objects** | Do you use standard Lead object, or custom objects for prospects? | |
| **Lead Lifecycle** | What are your lead statuses/stages? (New, Contacted, Qualified, etc.) | |
| **Custom Fields** | What custom fields exist on Lead/Contact/Account that we need to sync? | |
| **Assignment Rules** | How are leads assigned to SDRs? (Round robin, territory, manual?) | |
| **Handoff Process** | How do qualified leads get handed to AEs? (Opportunity creation? Lead conversion?) | |
| **Activity Tracking** | Where should call activities be logged? (Task? Activity? Custom object?) | |
| **Sync Direction** | Should lead updates flow: Platform → SF only? SF → Platform? Bidirectional? | |
| **API Access** | Do you have API access enabled? Any API call limits we should know about? | |
| **Connected Apps** | Any existing connected apps or integrations we need to coordinate with? | |
| **Sandbox** | Do you have a sandbox environment for development/testing? | |

---

## 4. Zoom Integration Questions

The current platform uses Twilio Voice SDK for browser-based calling with real-time transcription and AI coaching. We need to understand your Zoom setup to replicate these capabilities.

### 4.1 Zoom Products & Licensing

| Category | Question | Client Response |
|----------|----------|-----------------|
| **Zoom Products** | Which Zoom products do you have? (Meetings, Phone, Contact Center, Webinars?) | |
| **Zoom Phone** | If Zoom Phone: BYOC or Zoom native? What calling plans? | |
| **Phone Numbers** | How are phone numbers assigned to SDRs? DID per rep? | |
| **Licensing** | What Zoom license tier? (Pro, Business, Enterprise?) | |
| **API Access** | Do you have Zoom API/SDK access? (Server-to-Server OAuth? JWT?) | |

### 4.2 Call Workflow Requirements

| Category | Question | Client Response |
|----------|----------|-----------------|
| **Call Initiation** | How should SDRs make calls? (Click-to-call from app? Zoom client? Browser?) | |
| **Recording** | Is call recording enabled? Where are recordings stored? | |
| **Transcription** | Do you use Zoom's native transcription? Or need custom? | |
| **Real-Time Access** | Do we need real-time audio stream for live coaching? (This may require Zoom Contact Center) | |
| **Webhooks** | Can we receive webhooks for call start/end/recording ready? | |
| **Softphone** | Is browser-based calling required, or is Zoom desktop app acceptable? | |

### 4.3 Feature Mapping (Twilio → Zoom)

Current Twilio features that need Zoom equivalents:

| Current Feature | Twilio Implementation | Zoom Equivalent (TBD) |
|----------------|----------------------|----------------------|
| **Browser Softphone** | Twilio Voice SDK (WebRTC) | Zoom Phone WebSDK? Or Zoom client? |
| **Real-Time Transcription** | Twilio Media Streams → Custom ASR | Zoom transcription API? Real-time SDK? |
| **Live Coaching Tips** | WebSocket push during call | Same (if we get transcript stream) |
| **Call Recording** | Twilio dual-channel recording | Zoom cloud recording |
| **Post-Call Analysis** | Recording + transcript → Gemini AI | Same (fetch recording via API) |

### 4.4 Critical Zoom Questions

> ⚠️ **Important**: Real-time coaching requires access to the live audio/transcript stream during the call. This capability varies significantly by Zoom product:

| Zoom Product | Real-Time Access | Notes |
|--------------|------------------|-------|
| Zoom Meetings | Limited | Can use Meeting SDK for some access |
| Zoom Phone | Limited | Recording available post-call; real-time may require Contact Center |
| Zoom Contact Center | Yes | Full real-time streaming and agent assist capabilities |

**Key Question**: Is real-time coaching during calls a must-have, or can coaching be post-call only?

---

## 5. Azure Database & Infrastructure

The platform currently uses PostgreSQL with Drizzle ORM. We need to understand your Azure data infrastructure.

### 5.1 Database Configuration

| Category | Question | Client Response |
|----------|----------|-----------------|
| **Database Type** | Which Azure database? (Azure SQL, Azure Database for PostgreSQL, Cosmos DB?) | |
| **Existing vs New** | Use existing database or create new for this application? | |
| **Schema Control** | Can we create/modify tables? Or must we work with existing schema? | |
| **Connection Method** | How to connect? (Connection string? Managed Identity? Private endpoint?) | |
| **Data Residency** | Any data residency requirements? (Region, compliance) | |

### 5.2 Azure Services

| Category | Question | Client Response |
|----------|----------|-----------------|
| **Hosting** | Where should the app be hosted? (Azure App Service, AKS, Container Apps?) | |
| **Authentication** | Use Azure AD for user authentication? SSO requirements? | |
| **File Storage** | Use Azure Blob Storage for recordings/files? | |
| **AI Services** | Use Azure OpenAI? Or external AI (Gemini, OpenAI direct)? | |
| **Key Vault** | Store secrets in Azure Key Vault? | |
| **Networking** | Any VNet requirements? Private endpoints needed? | |

### 5.3 Current Data Model (Reference)

The platform uses these core tables. We can adapt to your schema if needed:

| Table | Purpose & Key Fields |
|-------|---------------------|
| **users** | Authentication & roles (email, password hash, role: admin/manager/sdr/ae) |
| **leads** | Prospect data (company, contact, status, fitScore, assignedSdrId, assignedAeId) |
| **research_packets** | AI research dossiers (companyIntel, painPoints, productMatches, talkTrack, confidence) |
| **call_sessions** | Call metadata (callSid, duration, recordingUrl, transcriptText, disposition) |
| **manager_call_analyses** | 7-dimension scoring (opening, discovery, listening, objection, value prop, closing, compliance) |
| **sdrs / managers** | Sales rep profiles with team assignments and reporting structure |

### 5.4 Database Migration Considerations

| Consideration | Question | Client Response |
|---------------|----------|-----------------|
| **ORM Compatibility** | Current: Drizzle ORM. Azure SQL compatible? Or switch to Prisma/TypeORM? | |
| **Migrations** | How should schema migrations be managed? (Drizzle Kit, manual, CI/CD?) | |
| **Existing Data** | Any existing data to migrate or integrate? | |

---

## 6. AI & Lead Research Configuration

### 6.1 AI Service Preferences

| Category | Question | Client Response |
|----------|----------|-----------------|
| **AI Provider** | Preferred AI: Azure OpenAI? Google Gemini? Anthropic Claude? Other? | |
| **Data Privacy** | Any restrictions on sending lead data to external AI services? | |
| **Existing AI** | Do you have existing Azure OpenAI deployments we should use? | |
| **Model Preferences** | Any specific model requirements? (GPT-4, Claude, Gemini Pro?) | |

### 6.2 Research Sources

Current platform gathers intelligence from multiple sources. Confirm which are relevant:

| Source | Data Gathered | Include? (Y/N/Notes) |
|--------|--------------|---------------------|
| **Company Website** | About page, products, news, team info | |
| **LinkedIn (Company)** | Company size, industry, recent posts, job openings | |
| **LinkedIn (Contact)** | Title, background, career history, posts | |
| **X/Twitter** | Recent activity, interests, engagement | |
| **Google News** | Recent press, announcements, industry mentions | |
| **Job Postings** | Pain signals from hiring patterns | |
| **Salesforce Data** | Existing account history, past interactions | |
| **ZoomInfo / Apollo** | Contact enrichment (if you have subscriptions) | |

### 6.3 Product Catalog

| Category | Question | Client Response |
|----------|----------|-----------------|
| **Products** | What products/services should the AI recommend? (Need product catalog) | |
| **Pain-Product Map** | Are there documented pain points that map to specific products? | |
| **Talk Tracks** | Do you have existing talk tracks/scripts we should incorporate? | |
| **Objection Handling** | Common objections and approved responses? | |
| **Competitive Intel** | Key competitors and differentiation points? | |

### 6.4 AI Features Configuration

| Feature | Current Behavior | Customize? |
|---------|-----------------|------------|
| **Research Dossier** | Auto-generates company intel, contact intel, pain points, product matches, talk tracks | |
| **Confidence Scoring** | High/Medium/Low based on data quality | |
| **Live Coaching** | Real-time tips during calls based on transcript | |
| **Post-Call Analysis** | 7-dimension scoring with recommendations | |
| **Qualification Extraction** | BANT extraction from transcripts | |

---

## 7. Users, Roles & Permissions

### 7.1 User Types

| Role | Question | Client Response |
|------|----------|-----------------|
| **SDRs** | How many SDRs will use the platform? | |
| **Managers** | How many sales managers? What oversight do they need? | |
| **AEs** | How many Account Executives receive handoffs? | |
| **Admins** | Who manages users and system configuration? | |
| **Executives** | Do executives need read-only dashboards? | |

### 7.2 Team Structure

| Category | Question | Client Response |
|----------|----------|-----------------|
| **Hierarchy** | What is your sales team structure? (SDR → Manager → Director?) | |
| **Territories** | Do SDRs have territories or industry focus? | |
| **SDR-AE Pairing** | Are SDRs paired with specific AEs, or pool handoffs? | |
| **Visibility** | Can managers see all team leads, or just their direct reports? | |

### 7.3 Current Role Permissions (Reference)

| Role | Capabilities |
|------|-------------|
| **Admin** | Full system access, user management, configuration |
| **Manager** | Team oversight, call analysis, all team leads, coaching |
| **SDR** | Own leads, calls, research, pipeline management |
| **Account Executive** | Qualified leads, handoff receipt, pipeline view |

**Question**: Does this permission model work, or do you need customizations?

---

## 8. Sales Workflow & Process

### 8.1 Lead Lifecycle

| Stage | Question | Client Response |
|-------|----------|-----------------|
| **Lead Source** | Where do leads originate? (Salesforce? Marketing? Events? Inbound?) | |
| **Qualification Criteria** | What defines a 'qualified' lead? (BANT? MEDDIC? Custom?) | |
| **Handoff Trigger** | What triggers handoff to AE? (Score threshold? Manual?) | |
| **SLAs** | Any SLAs for lead follow-up timing? | |

### 8.2 Call Workflow

| Stage | Question | Client Response |
|-------|----------|-----------------|
| **Pre-Call** | What info do SDRs need before calling? How much prep time? | |
| **During Call** | Are real-time coaching tips valuable? What kind of prompts help? | |
| **Post-Call** | What must be logged after each call? Notes? Disposition? Next steps? | |
| **Manager Review** | How are calls reviewed? All calls? Random sample? Flagged only? | |

### 8.3 Current Lead Statuses (Reference)

```
new → researching → contacted → engaged → qualified → handed_off → converted
                                    │                      │
                                    └──────────────────────┴──→ lost
```

**Question**: Does this flow match your process, or do you need different statuses?

---

## 9. Non-Functional Requirements

| Category | Question | Client Response |
|----------|----------|-----------------|
| **Availability** | Uptime requirements? (99.9%? Business hours only?) | |
| **Performance** | Acceptable response times? Any latency concerns for real-time features? | |
| **Scalability** | Expected growth? Peak concurrent users? | |
| **Security** | Security certifications required? (SOC2, ISO27001, HIPAA?) | |
| **Compliance** | Call recording consent requirements? Data retention policies? | |
| **Audit** | Audit logging requirements? What actions must be tracked? | |
| **Backup/DR** | Backup and disaster recovery requirements? | |
| **Browser Support** | Which browsers must be supported? Mobile access needed? | |

---

## 10. Timeline & Priorities

| Category | Question | Client Response |
|----------|----------|-----------------|
| **Go-Live Date** | Target launch date? Any hard deadlines? | |
| **Pilot Group** | Start with pilot group? How many users? | |
| **MVP Features** | Must-have features for initial launch? | |
| **Phase 2** | Features that can wait for Phase 2? | |
| **Training** | Training needs? Who will be trained? | |

### 10.1 Feature Prioritization

Please rank these features (1 = Must Have, 2 = Should Have, 3 = Nice to Have, 4 = Not Needed):

| Feature | Priority (1-4) | Notes |
|---------|---------------|-------|
| Lead management & pipeline | | |
| AI research dossiers | | |
| Click-to-call from app | | |
| Real-time coaching during calls | | |
| Post-call AI analysis | | |
| Manager call scoring | | |
| Salesforce bi-directional sync | | |
| Team performance dashboards | | |
| AE handoff workflow | | |
| Email notifications | | |
| Mobile access | | |

---

## 11. Access & Key Contacts

### 11.1 Technical Access Needed

To begin development, we will need access to:

| Access Item | Priority | Status | Owner |
|-------------|----------|--------|-------|
| Salesforce sandbox credentials | High | | |
| Zoom API credentials (OAuth app) | High | | |
| Azure subscription access | High | | |
| Azure AD tenant (for auth) | Medium | | |
| Product catalog / documentation | Medium | | |
| Sample talk tracks / scripts | Medium | | |
| Test phone numbers | Medium | | |
| Logo and brand assets | Low | | |

### 11.2 Key Contacts

| Role | Name | Email | Phone |
|------|------|-------|-------|
| Project Sponsor | | | |
| Business Owner | | | |
| IT Lead | | | |
| Salesforce Admin | | | |
| Zoom Admin | | | |
| Azure Admin | | | |
| Sales Operations | | | |
| End User Champion (SDR) | | | |

### 11.3 Communication Preferences

| Item | Response |
|------|----------|
| Preferred communication channel (Slack, Teams, Email?) | |
| Meeting cadence during discovery | |
| Decision-making process for technical choices | |
| Escalation path for blockers | |

---

## 12. Technical Deep Dive (For IT Team)

### 12.1 Integration Authentication

| Integration | Question | Client Response |
|-------------|----------|-----------------|
| **Salesforce** | OAuth 2.0 flow preference? (Web Server, JWT Bearer?) | |
| **Zoom** | Server-to-Server OAuth or User-level OAuth? | |
| **Azure** | Managed Identity available? Or service principal? | |
| **SSO** | SAML or OIDC for user authentication? | |

### 12.2 Network & Security

| Category | Question | Client Response |
|----------|----------|-----------------|
| **IP Allowlisting** | Do any services require IP allowlisting? | |
| **VPN** | Is VPN required for any integrations? | |
| **WAF** | Web Application Firewall requirements? | |
| **DLP** | Data Loss Prevention policies to consider? | |

### 12.3 DevOps & Deployment

| Category | Question | Client Response |
|----------|----------|-----------------|
| **CI/CD** | Preferred CI/CD platform? (Azure DevOps, GitHub Actions?) | |
| **Environments** | How many environments? (Dev, Staging, Prod?) | |
| **Deployment** | Deployment approval process? | |
| **Monitoring** | Preferred monitoring tools? (App Insights, Datadog?) | |

---

## 13. Sign-Off

By completing this questionnaire, Hawk Ridge Systems confirms the accuracy of the information provided and authorizes Ground Game / DeHyl Co. to proceed with technical planning based on these responses.

| Field | Value |
|-------|-------|
| **Client Representative** | |
| **Title** | |
| **Signature** | |
| **Date** | |

---

## Appendix A: Current Platform Capabilities

For reference, here are the full capabilities of the existing Lead Intel platform:

### A.1 Lead Management
- Lead creation (manual + Google Sheets import)
- Lead assignment to SDRs
- Status tracking through pipeline
- Fit scoring (0-100)
- Priority classification (Hot/Warm/Cool/Cold)
- AE handoff workflow with email notifications

### A.2 AI Research
- One-click research dossier generation
- Multi-source intelligence (website, LinkedIn, X/Twitter, news)
- Pain point identification with confidence scoring
- Product matching to Hawk Ridge catalog
- Personalized talk track generation
- Discovery questions and objection handles

### A.3 Voice/Calling
- Browser-based softphone (Twilio Voice SDK)
- Click-to-call from lead record
- Call recording (dual-channel)
- Real-time transcription
- Live AI coaching tips during call
- Call disposition logging

### A.4 Post-Call Analysis
- Automatic transcript analysis
- 7-dimension call scoring
- Manager call reviews
- Coaching recommendations
- Performance trending

### A.5 Analytics & Reporting
- SDR performance dashboards
- Team leaderboards
- Conversion metrics
- Activity tracking
- Manager oversight views

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **SDR** | Sales Development Representative - makes outbound calls to qualify leads |
| **AE** | Account Executive - handles qualified opportunities through close |
| **BANT** | Budget, Authority, Need, Timeline - qualification framework |
| **Fit Score** | 0-100 score indicating how well a lead matches ideal customer profile |
| **Research Packet** | AI-generated intelligence dossier for a lead |
| **Talk Track** | Suggested conversation flow for a sales call |
| **Disposition** | Call outcome (Connected, Voicemail, No Answer, etc.) |

---

**Questions?**

Contact: Juan Pablo Dominguez, Director  
Email: jp@dehyl.ca  
Phone: 604.600.9654
