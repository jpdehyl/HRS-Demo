# Lead Intel Platform - Complete Workflow Documentation

## Executive Summary

Lead Intel is an AI-powered sales intelligence platform built for Hawk Ridge Systems. This document details the complete end-to-end workflow from lead acquisition through qualified handover, including all technical components, API integrations, and data flows.

---

## Table of Contents

1. [Phase 1: Lead Import & Onboarding](#phase-1-lead-import--onboarding)
2. [Phase 2: AI-Powered Lead Research](#phase-2-ai-powered-lead-research)
3. [Phase 3: Zoom Phone Calling](#phase-3-zoom-phone-calling)
4. [Phase 4: Post-Call Recording Analysis](#phase-4-post-call-recording-analysis)
5. [Phase 5: Lead Handover to Account Executives](#phase-5-lead-handover-to-account-executives)
6. [Role-Based Access Control](#role-based-access-control)
7. [Technical Architecture](#technical-architecture)
8. [API Reference](#api-reference)

---

## Phase 1: Lead Import & Onboarding

### 1.1 Lead Data Sources

The platform supports multiple lead ingestion methods:

| Source | Method | Description |
|--------|--------|-------------|
| **Salesforce** | CRM Sync | Bi-directional sync with Salesforce CRM via OAuth 2.0 |
| **Google Sheets** | Automated Import | Pulls from configured spreadsheet (`LEADS_SPREADSHEET_ID`) |
| **Manual Entry** | UI Form | Users add leads directly through the dashboard |
| **API** | REST Endpoint | Programmatic lead creation via `POST /api/leads` |

### 1.1.1 Salesforce Integration

The platform integrates directly with Salesforce CRM for seamless lead management:

**Setup Requirements:**
1. Create a Salesforce Connected App with OAuth 2.0
2. Configure `SALESFORCE_CLIENT_ID` and `SALESFORCE_CLIENT_SECRET` secrets
3. Admin connects via Settings > Integrations > Connect Salesforce

**Import Flow:**
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Salesforce     │────▶│  Lead Intel  │────▶│  Assign to SDR  │
│  Lead Records   │     │  Import API  │     │  & Research     │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

**Field Mapping (Salesforce → Lead Intel):**
| Salesforce Field | Lead Intel Field |
|------------------|------------------|
| `Name` / `FirstName` + `LastName` | `contactName` |
| `Email` | `contactEmail` |
| `Phone` | `contactPhone` |
| `Company` | `companyName` |
| `Industry` | `companyIndustry` |
| `Title` | `contactTitle` |
| `Website` | `companyWebsite` |
| `Status` | `status` (mapped) |
| `Id` | `salesforceId` (for sync) |

**API Endpoints:**
- `GET /api/salesforce/status` - Check connection status
- `GET /api/salesforce/connect` - Initiate OAuth flow
- `POST /api/salesforce/import` - Import leads from Salesforce
- `POST /api/leads/:id/push-to-salesforce` - Push lead updates to Salesforce
- `POST /api/leads/:id/handover-salesforce` - Handover with Salesforce sync

### 1.2 Lead Data Structure

Each lead record contains comprehensive contact and company information:

```typescript
interface Lead {
  id: string;
  
  // Contact Information
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactTitle: string;
  
  // Company Details
  companyName: string;
  companyWebsite: string;
  companyIndustry: string;
  companySize: string;
  companyAddress: string;
  
  // Assignment & Tracking
  assignedSdrId: string;
  assignedManagerId: string;
  status: LeadStatus;
  priority: 'high' | 'medium' | 'low';
  
  // Metadata
  source: string;
  createdAt: Date;
  lastContactedAt: Date;
  notes: string;
}
```

### 1.3 Lead Status Lifecycle

```
┌─────────┐    ┌────────────┐    ┌───────────┐    ┌───────────┐
│   NEW   │───▶│ RESEARCHED │───▶│ CONTACTED │───▶│ QUALIFIED │
└─────────┘    └────────────┘    └───────────┘    └───────────┘
                                        │                │
                                        ▼                ▼
                                 ┌──────────────┐  ┌──────────┐
                                 │ NOT_INTERESTED│  │ HANDOVER │
                                 └──────────────┘  └──────────┘
```

### 1.4 Lead Assignment Rules

- **SDR Assignment**: Leads are assigned to Sales Development Representatives based on territory, industry, or round-robin
- **Manager Visibility**: Each SDR reports to a manager who has oversight of their lead pool
- **Admin Control**: Administrators can reassign leads across teams and territories

---

## Phase 2: AI-Powered Lead Research

### 2.1 Research Initiation

When an SDR needs intelligence on a lead, they initiate the research process:

1. SDR navigates to lead detail view
2. Clicks "Research" or "Generate Research Packet" button
3. System creates a new research packet record
4. AI research pipeline is triggered

**API Endpoint**: `POST /api/leads/:id/research`

### 2.2 Claude Opus 4.5 Research Engine

The research engine leverages Claude Opus 4.5 (`claude-opus-4-20250514`), Anthropic's most capable model, for comprehensive lead intelligence.

#### Data Collection Sources

| Source | Data Retrieved |
|--------|----------------|
| **Company Website** | Products, services, mission, team |
| **LinkedIn (via SerpAPI)** | Contact profiles, career history, connections |
| **Google Search** | Recent news, press releases, market activity |
| **Industry Databases** | Market size, competitors, trends |

#### Research Pipeline

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ Lead Data    │────▶│  Claude Opus    │────▶│ Research Packet  │
│ (Company,    │     │  4.5 Analysis   │     │ (Structured      │
│  Contact)    │     │  + Web Grounding│     │  Intelligence)   │
└──────────────┘     └─────────────────┘     └──────────────────┘
        │                    │
        │         ┌──────────┴──────────┐
        │         │                     │
        ▼         ▼                     ▼
   ┌─────────┐  ┌─────────┐      ┌───────────┐
   │ SerpAPI │  │ Website │      │  Google   │
   │LinkedIn │  │ Crawl   │      │  Search   │
   └─────────┘  └─────────┘      └───────────┘
```

### 2.3 Research Packet Output

The AI generates a comprehensive research packet containing:

```typescript
interface ResearchPacket {
  id: string;
  leadId: string;
  
  // Company Intelligence
  companyOverview: {
    description: string;
    products: string[];
    services: string[];
    marketPosition: string;
    recentNews: NewsItem[];
  };
  
  // Decision Maker Profiles
  keyContacts: {
    name: string;
    title: string;
    linkedInUrl: string;
    background: string;
    relevance: string;
  }[];
  
  // Sales Intelligence
  painPoints: string[];
  talkingPoints: string[];
  valueProposition: string;
  
  // Competitive Analysis
  competitors: {
    name: string;
    differentiation: string;
  }[];
  
  // Call Preparation
  suggestedQuestions: string[];
  objectionPredictions: string[];
  
  // Metadata
  generatedAt: Date;
  model: string;
  confidence: number;
}
```

### 2.4 Research Storage & Caching

- Research packets are stored in the `researchPackets` PostgreSQL table
- Packets are linked to lead IDs for instant retrieval
- Results are cached to avoid redundant API calls
- SDRs can regenerate research on demand for updated intelligence

---

## Phase 3: Zoom Phone Calling

### 3.1 Zoom Phone Smart Embed Integration

The platform integrates Zoom Phone directly into the browser using the Smart Embed technology:

| Component | Technology |
|-----------|------------|
| **Widget** | Zoom Phone Smart Embed (iframe) |
| **Communication** | postMessage API |
| **Authentication** | Zoom SSO (user's Zoom account) |
| **Dialer** | Click-to-dial from any phone number |

**Frontend Component**: `client/src/components/zoom-phone-embed.tsx`

### 3.2 Click-to-Dial Flow

```javascript
// Initiating a call from the application
const dialNumber = (phoneNumber: string) => {
  const zoomFrame = document.getElementById('zoom-phone-embed');
  zoomFrame.contentWindow.postMessage({
    type: 'zp-make-call',
    data: { phoneNumber }
  }, 'https://phone.zoom.us');
};
```

### 3.3 Call Session Creation

When a call is initiated, the system creates a tracking session:

**API Endpoint**: `POST /api/call-sessions`

```typescript
interface CallSession {
  id: string;
  leadId: string;
  userId: string;
  callSid: string;        // Format: "zoom_<call_id>"
  status: CallStatus;
  startTime: Date;
  endTime: Date;
  duration: number;
  recordingUrl: string;
  transcriptText: string;
  coachingNotes: string;  // JSON-serialized analysis
  outcome: string;
}
```

### 3.4 Call Lifecycle Event Handling

The platform listens for and processes these Zoom Phone events:

| Event | Trigger | System Action |
|-------|---------|---------------|
| `zp-call-ringing-event` | Call initiated | Update status to "ringing" |
| `zp-call-connected-event` | Call answered | Update status to "in-progress", start timer |
| `zp-call-ended-event` | Call terminated | Update status to "completed", record duration |
| `zp-call-recording-completed-event` | Recording ready | Store recording reference |
| `zp-ai-call-summary-event` | Zoom AI summary ready | Store native summary (optional) |

### 3.5 Real-Time Coaching Display

During active calls, the platform displays contextual coaching information:

- **Research Highlights**: Key talking points from the research packet
- **Objection Handlers**: Prepared responses for common objections
- **Discovery Questions**: Suggested questions based on lead profile
- **Live Tips**: Dynamic suggestions based on call context

---

## Phase 4: Post-Call Recording Analysis

### 4.1 Analysis Trigger

After a call ends, the SDR can request a full analysis:

1. SDR views completed call in history
2. Clicks "Get Transcript & Analyze" button
3. System retrieves recording and generates analysis
4. Results displayed in coaching panel

**API Endpoint**: `POST /api/call-sessions/:id/analyze-recording`

### 4.2 Recording Retrieval Pipeline

The system uses a multi-tier fallback strategy to ensure transcript availability:

```
┌─────────────────────────────────────────────────────────────────┐
│                  TIER 1: Zoom Transcript API                     │
│  • Authenticate via Server-to-Server OAuth                      │
│  • Query: GET /phone/call_logs/{userId}                         │
│  • Download transcript if available                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Transcript not available?
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│            TIER 2: Zoom Recording + Gemini Transcription        │
│  • Download audio file from Zoom                                │
│  • Send to Gemini 2.5 Flash for transcription                   │
│  • Uses Replit AI integration or direct API                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Zoom recording not available?
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              TIER 3: External Recording URL                      │
│  • Fetch audio from stored recording URL                        │
│  • Transcribe with Gemini 2.5 Flash                             │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Zoom API Authentication

**Authentication Method**: Server-to-Server OAuth

```typescript
// Token acquisition flow
const getZoomAccessToken = async (): Promise<string> => {
  const credentials = Buffer.from(
    `${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`
  ).toString('base64');
  
  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`
  });
  
  return response.json().access_token;
};
```

**Required OAuth Scopes**:
- `phone:read:admin`
- `phone:read:call_log:admin`
- `phone:read:recording:admin`
- `phone_recording:read:admin`

### 4.4 Claude Opus 4.5 Coaching Analysis

Once the transcript is available, it's analyzed by Claude Opus 4.5:

**Model**: `claude-opus-4-20250514`

**Analysis Prompt Structure**:
```
You are an expert sales coach analyzing a sales call transcript.

Context:
- Company: {companyName}
- Contact: {contactName}
- Industry: {industry}

Transcript:
{transcriptText}

Provide comprehensive coaching analysis including:
1. Overall performance score (0-100)
2. Executive summary
3. Key strengths demonstrated
4. Areas for improvement with specific recommendations
5. Question quality assessment
6. Objection handling analysis (if applicable)
```

### 4.5 Analysis Output Structure

```typescript
interface CallCoachingAnalysis {
  overallScore: number;           // 0-100 performance rating
  
  summary: string;                // Executive summary of the call
  
  strengths: string[];            // Top 3-5 things done well
  
  areasForImprovement: {
    area: string;                 // Category (e.g., "Discovery Questions")
    suggestion: string;           // Specific improvement advice
    priority: 'high' | 'medium' | 'low';
    example?: string;             // Quote from transcript if applicable
  }[];
  
  questionQuality: {
    score: number;                // 0-100 rating
    openEndedRatio: number;       // Percentage of open vs closed questions
    discoveryDepth: string;       // Assessment of discovery quality
    examples: string[];           // Good questions asked
    suggestions: string[];        // Better questions to try
  };
  
  objectionHandling?: {
    objectionsIdentified: string[];
    handlingAssessment: string;
    suggestions: string[];
  };
  
  nextSteps: string[];            // Recommended follow-up actions
}
```

### 4.6 Analysis Storage & Retrieval

- Transcript stored in `callSession.transcriptText`
- Analysis stored as JSON in `callSession.coachingNotes`
- Results cached for instant retrieval on subsequent views
- Historical analyses available for trend tracking

---

## Phase 5: Lead Handover to Account Executives

### 5.1 Qualification Criteria

An SDR qualifies a lead for handover based on:

| Criteria | Description |
|----------|-------------|
| **Budget** | Confirmed budget availability or timeline |
| **Authority** | Decision-maker identified and engaged |
| **Need** | Clear pain point or use case established |
| **Timeline** | Active buying timeframe confirmed |

### 5.2 Handover Initiation

1. SDR updates lead status to "Qualified"
2. SDR selects target Account Executive from directory
3. SDR adds handover notes and context
4. System compiles handover package

**API Endpoint**: `POST /api/leads/:id/handover`

### 5.3 Handover Package Contents

The Account Executive receives a complete package:

```typescript
interface HandoverPackage {
  lead: Lead;                         // Full lead record
  
  researchPacket: ResearchPacket;     // AI-generated intelligence
  
  callHistory: {
    session: CallSession;
    transcript: string;
    analysis: CallCoachingAnalysis;
  }[];
  
  sdrNotes: string;                   // SDR's handover notes
  
  qualificationDetails: {
    budget: string;
    authority: string;
    need: string;
    timeline: string;
  };
  
  recommendedNextSteps: string[];
}
```

### 5.4 Account Executive Notification

- AE receives in-app notification
- Lead appears in their pipeline view
- Full context immediately accessible
- Historical call recordings available for review

---

## Role-Based Access Control

### Permission Matrix

| Feature | Admin | Manager | SDR | Account Specialist |
|---------|-------|---------|-----|-------------------|
| View All Leads | ✅ | Team Only | Assigned Only | Qualified Only |
| Create Leads | ✅ | ✅ | ✅ | ❌ |
| Research Leads | ✅ | ✅ | ✅ | ✅ |
| Make Calls | ✅ | ✅ | ✅ | ✅ |
| View Analysis | ✅ | Team + Own | Own Only | Own Only |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ |
| View Team Analytics | ✅ | ✅ | ❌ | ❌ |
| Handover Leads | ✅ | ✅ | ✅ | ❌ |
| Receive Handovers | ✅ | ❌ | ❌ | ✅ |

### Authentication Flow

```
┌──────────────┐     ┌────────────────┐     ┌──────────────┐
│    Login     │────▶│ Session Cookie │────▶│  Auth Check  │
│   (bcrypt)   │     │  (PostgreSQL)  │     │  Middleware  │
└──────────────┘     └────────────────┘     └──────────────┘
                                                   │
                            ┌──────────────────────┴──────────────────────┐
                            │                                             │
                     ┌──────▼──────┐                              ┌───────▼───────┐
                     │  Authorized │                              │  Unauthorized │
                     │   (200 OK)  │                              │  (401/403)    │
                     └─────────────┘                              └───────────────┘
```

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER (Browser)                             │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   React App     │  │  Zoom Phone     │  │   Three.js Landing Page    │ │
│  │  (Vite + TS)    │  │  Smart Embed    │  │   (Particle Effects)       │ │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────────────────┘ │
└───────────┼─────────────────────┼───────────────────────────────────────────┘
            │                     │
            │    REST API         │  postMessage
            ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVER LAYER (Express.js)                           │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   API Routes    │  │  Session Auth   │  │      WebSocket Server       │ │
│  │   (REST)        │  │  (PostgreSQL)   │  │   (Real-time Updates)       │ │
│  └────────┬────────┘  └─────────────────┘  └─────────────────────────────┘ │
└───────────┼─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA & AI LAYER                                    │
│                                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │  PostgreSQL   │  │ Claude Opus   │  │  Gemini 2.5   │  │  Zoom API   │  │
│  │  (Drizzle)    │  │    4.5        │  │    Flash      │  │  (OAuth)    │  │
│  │               │  │               │  │               │  │             │  │
│  │ • Users       │  │ • Research    │  │ • Transcribe  │  │ • Calls     │  │
│  │ • Leads       │  │ • Analysis    │  │ • Research    │  │ • Recordings│  │
│  │ • Sessions    │  │ • Coaching    │  │   Support     │  │ • Transcripts│ │
│  │ • Research    │  │               │  │               │  │             │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 + TypeScript | Single-page application |
| **Build Tool** | Vite | Fast development & bundling |
| **Routing** | Wouter | Lightweight client-side routing |
| **State** | TanStack Query | Server state management |
| **UI Components** | Shadcn/UI + Radix | Accessible component library |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **3D Graphics** | Three.js + R3F | Landing page effects |
| **Backend** | Express.js + TypeScript | REST API server |
| **Database** | PostgreSQL | Persistent data storage |
| **ORM** | Drizzle | Type-safe database access |
| **Auth** | express-session + bcrypt | Session-based authentication |
| **AI (Research/Analysis)** | Claude Opus 4.5 | Primary AI engine |
| **AI (Transcription)** | Gemini 2.5 Flash | Audio transcription |
| **Calling** | Zoom Phone Smart Embed | Browser-based calling |
| **Recordings** | Zoom API (OAuth) | Call recordings & transcripts |

### Database Schema (Key Tables)

```sql
-- Core Tables
users              -- Authentication & role management
leads              -- Lead information and status
managers           -- Sales manager directory
sdrs               -- Sales development representatives
account_executives -- AE directory for handovers

-- Call & Coaching Tables
live_coaching_sessions  -- Active call sessions
live_transcripts        -- Real-time transcription segments
live_coaching_tips      -- AI coaching suggestions
manager_call_analyses   -- Manager performance scorecards

-- Research & Intelligence
research_packets   -- AI-generated lead intelligence
conversations      -- Gemini chat threads
messages           -- Chat message history

-- System Tables
session            -- PostgreSQL session storage
navigation_settings -- Admin-configurable UI
```

---

## API Reference

### Lead Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/leads` | GET | List all accessible leads |
| `/api/leads` | POST | Create new lead |
| `/api/leads/:id` | GET | Get lead details |
| `/api/leads/:id` | PATCH | Update lead |
| `/api/leads/:id/research` | POST | Generate research packet |
| `/api/leads/:id/handover` | POST | Initiate handover to AE |

### Call Sessions

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/call-sessions` | GET | List call history |
| `/api/call-sessions` | POST | Create call session |
| `/api/call-sessions/:id` | GET | Get session details |
| `/api/call-sessions/:id` | PATCH | Update session |
| `/api/call-sessions/:id/analyze-recording` | POST | Analyze recording with AI |

### Users & Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/session` | GET | Get current session |
| `/api/users` | GET | List users (admin) |
| `/api/users` | POST | Create user (admin) |

---

## Environment Variables

### Required Secrets

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | Claude API access |
| `ZOOM_ACCOUNT_ID` | Zoom Server-to-Server OAuth |
| `ZOOM_CLIENT_ID` | Zoom OAuth client ID |
| `ZOOM_CLIENT_SECRET` | Zoom OAuth client secret |

### Optional Secrets

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Direct Gemini API (fallback) |
| `SERP_API` | SerpAPI for LinkedIn searches |
| `GOOGLE_CLIENT_ID` | Google API OAuth |
| `GOOGLE_CLIENT_SECRET` | Google API OAuth |
| `GOOGLE_REFRESH_TOKEN` | Google API refresh token |

### Replit Integration Variables

| Variable | Description |
|----------|-------------|
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Replit-managed Gemini access |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Replit Gemini proxy URL |

---

## Appendix: Zoom Phone Setup Requirements

### Admin Configuration Checklist

1. **Enable Smart Embed** in Zoom Marketplace App settings
2. **Add Approved Domains**:
   - Development: `*.replit.dev`
   - Production: Your production domain
3. **Enable "Automatically Call From Third Party Apps"** in Smart Embed settings
4. **Configure Server-to-Server OAuth App** with required scopes
5. **Activate the OAuth App** after configuration

### Required OAuth Scopes

```
phone:read:admin
phone:read:call_log:admin
phone:read:call_log:master
phone:read:list_call_logs:master
phone:read:recording:admin
phone_recording:read:admin
cloud_recording:read:list_user_recordings:master
```

---

*Document Version: 1.0*  
*Last Updated: January 2026*  
*Platform: Lead Intel by Hawk Ridge Systems*
