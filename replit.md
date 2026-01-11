# Lead Intel - AI-Powered Sales Intelligence Platform

## Overview

Lead Intel is an AI-powered sales coaching and lead intelligence platform built for Hawk Ridge Systems. The application provides browser-based softphone capabilities via Twilio Voice, real-time AI coaching during live calls, lead research with Gemini AI, Google Sheets integration for lead imports, and comprehensive role-based access control for sales teams (Admin, Manager, SDR, Account Specialist).

The platform features a React frontend with Three.js 3D particle effects on the landing page, an Express backend with PostgreSQL database, and integrates with multiple external services including Twilio for voice calls, Google APIs for Drive/Sheets/Gmail, and Gemini AI for transcription and coaching.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built with Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state
- **UI Components**: Shadcn UI (New York style) with Radix primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (light/dark mode support)
- **3D Graphics**: Three.js via @react-three/fiber and @react-three/drei for landing page effects
- **Path Aliases**: `@/` for client source, `@shared/` for shared code, `@assets/` for attached assets

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Session Management**: express-session with MemoryStore (development) or connect-pg-simple (production)
- **Authentication**: Custom session-based auth with bcrypt password hashing
- **WebSocket**: Native ws library with `noServer: true` mode to avoid Vite HMR conflicts

### Authentication Flow
- Session-based authentication with role-based access control
- User roles: admin, manager, sdr, account_specialist
- Auth middleware protects routes, but Twilio webhooks must remain unprotected
- Critical: Build Twilio integration before auth to prevent webhook interference

### Database Schema (Key Tables)
- `session` - PostgreSQL session storage for connect-pg-simple (sid, sess, expire)
- `users` - Authentication and role management
- `managers` - Sales manager directory
- `sdrs` - Sales development representatives
- `accountExecutives` - Account executive directory for lead handoffs
- `leads` - Lead information and status
- `liveCoachingSessions` - Active coaching call sessions
- `liveTranscripts` - Real-time call transcriptions
- `liveCoachingTips` - AI-generated coaching suggestions
- `researchPackets` - AI-researched lead intelligence
- `conversations/messages` - Gemini chat integration
- `managerCallAnalyses` - Manager performance scorecards for calls
- `navigation_settings` - Admin-configurable menu visibility and ordering (navKey, label, isEnabled, sortOrder)

### Session Configuration (Production)
- **Trust Proxy**: `app.set("trust proxy", 1)` in server/index.ts - Required for secure cookies behind Replit's reverse proxy
- **Session Store**: connect-pg-simple with PostgreSQL `session` table
- **Cookie Settings**: secure: true, httpOnly: true, sameSite: "lax", maxAge: 30 days

### Build System
- Development: `tsx` for TypeScript execution
- Production: esbuild bundles server, Vite builds client
- Output: `dist/` directory with `index.cjs` (server) and `public/` (client assets)

## External Dependencies

### Zoom Phone Integration (Primary)
- Browser-based softphone via Zoom Phone Smart Embed (iframe-based)
- Component: `client/src/components/zoom-phone-embed.tsx`
- Click-to-dial via postMessage API (`zp-make-call` event)
- Events: `zp-call-ringing-event`, `zp-call-connected-event`, `zp-call-ended-event`, `zp-call-recording-completed-event`, `zp-ai-call-summary-event`
- Admin setup required: Enable Smart Embed in Zoom Marketplace, add approved domains, enable "Automatically Call From Third Party Apps"
- Approved domains: dev domain and production domain must be whitelisted in Zoom Marketplace

### Zoom Phone API (Optional - for recording/transcript access)
- Server-to-Server OAuth app required for API access to recordings and transcripts
- Required secrets: `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`
- Client: `server/ai/zoomClient.ts` - handles token caching, recording listing, transcript download
- Scopes needed: `phone:read:admin`, `phone:read:recording:admin`, `phone_recording:read:admin`

### Claude Opus 4.5 (Call Coaching Analysis)
- Model: `claude-opus-4-20250514` via Anthropic API
- Used for deep coaching analysis of call transcripts
- Client: `server/ai/claudeClient.ts` and `server/ai/callCoachingAnalysis.ts`
- Required secret: `ANTHROPIC_API_KEY`
- Provides: overall score, strengths, areas for improvement, question quality, objection handling analysis

### Salesforce CRM Integration
- OAuth 2.0 Web Server Flow for authentication
- Client: `server/integrations/salesforceClient.ts` (OAuth token management, refresh, API requests)
- Lead operations: `server/integrations/salesforceLeads.ts` (import, push, handover)
- Routes: `server/salesforce-routes.ts`
- Required secrets: `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`
- Features:
  - **Import Leads**: Pull leads from Salesforce into Lead Intel with field mapping
  - **Push to Salesforce**: Sync lead updates, research, and qualification notes back to Salesforce
  - **Handover to AE**: Update Salesforce lead status and optionally convert to Opportunity
- Admin UI: Settings > Integrations tab for connection management and sync controls
- Database tables: `integration_settings` (OAuth tokens), `salesforce_sync_log` (sync history)
- Lead field: `salesforceId` links local leads to Salesforce Lead records

### Twilio Voice Integration (Legacy/Archived)
- Browser-based softphone with real-time transcription via `<Transcription>` element
- Recording with `record: "record-from-answer-dual"`
- Required secrets: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_TWIML_APP_SID`, `TWILIO_PHONE_NUMBER`

### Google APIs
- **Google Drive**: Monitor inbox folder for audio files, upload recordings
- **Google Sheets**: Import leads from spreadsheets
- **Gmail**: Send coaching emails and reports
- Required secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`

### Gemini AI (via Replit AI Integrations)
- Audio transcription, lead research with web grounding, coaching analysis
- Available models: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-image`
- Uses `AI_INTEGRATIONS_GEMINI_API_KEY` and `AI_INTEGRATIONS_GEMINI_BASE_URL` for Replit integration
- Fallback: Direct Gemini API via `GEMINI_API_KEY`

### Database
- PostgreSQL via Drizzle ORM
- Connection string in `DATABASE_URL` environment variable
- Schema migrations in `./migrations` directory
- Push schema with `npm run db:push`

### Demo Data
- Run `npm run seed:demo` to populate database with realistic sales demo data
- Script: `scripts/seedDemoData.ts`
- Creates: 3 managers, 20 SDRs, 5 AEs, 50 leads with research, 125 call sessions with coaching analysis
- All demo accounts use password: `demo2024`
- Demo emails follow pattern: `firstname.lastname@hawkridge.com`
- Example logins: `carlos.martinez@hawkridge.com`, `roberto.hernandez@hawkridge.com` (manager)

### Additional Services
- **SerpAPI**: LinkedIn profile searches for lead research (optional, via `SERP_API`)
- **MediaPipe**: Hand gesture detection for landing page interactions (CDN-loaded)

### Google Drive/Docs/Sheets IDs
- **INBOX Folder** (audio files): `1NsEMlqn_TUeVenFSWgLU3jEsUCa6LWus`
- **PROCESSED Folder**: `1AUTWsUq2AS-LC2sgKkSqk1bhEYhI_D-2`
- **Coaching Examples Folder**: `10J6xKMbdDlZrKS6el0qWlnZeurtkLStS`
- **Knowledge Base Doc**: `1NxcQYGHXaVfEGK7Vs5AiOjse8bsRbHBEiwdLsMr0LME`
- **SDR Persona Doc**: `1clt69Puie5CB96ukgjMAVCKDyuSPS5BU-C_JrI-tq3I`
- **Daily Summary Criteria Doc**: `1fuaUZ6kLtWtdF39meAxfoktSPvRRzVWcGg5oEq8ygL8`
- **Lead Scoring Parameters Doc**: `1xERqop5Y9iBNjghbwPF4jNpPKVMW8SlPkJEUnczXL5E`
- **Leads Spreadsheet**: `1dEbs4B7oucHJmA8U0-VehfzQN3Yt54RRs6VQlWNxX2I` (also set in `LEADS_SPREADSHEET_ID` env var)