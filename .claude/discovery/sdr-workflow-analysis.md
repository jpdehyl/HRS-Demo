# SDR Workflow Analysis: Robin Interview Findings

> **Date:** February 4, 2026
> **Source:** Meeting with Mark, Juan, and Robin (SDR at Hawk Ridge Systems)
> **Purpose:** Map Robin's actual daily workflow to Lead Intel capabilities, identify gaps, and prioritize development

---

## Robin's Workflow (As-Is) vs. Lead Intel (Current State)

### Stage 1: Start of Day - Lead Discovery

**Robin's Process:**
- Opens Salesforce, goes through intent list or "book"
- Leads come from an Excel sheet created by Lori in Marketing
- Leads are organized by territory (Hawaii, Colorado, N. California, Vancouver, Montana, Nevada, Alaska)
- Territory assignment is no longer enforced -- "whoever gets to it first"
- Lead info includes: company name, phone, email, lead status, last task date, assignee

**Lead Intel Current State:**
- Leads page (`client/src/pages/leads.tsx`) shows a list/kanban of leads with filters
- Salesforce import exists (`server/integrations/salesforceLeads.ts`) for pulling leads in
- No concept of "daily intent list" or prioritized call queue for the day
- No territory assignment or management
- No CSV/Excel import for Marketing-sourced lead lists

**Gaps Identified:**
| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| Daily Call Queue | **HIGH** | Medium | Dedicated "Today's Calls" view showing prioritized leads for the day, replacing Robin's manual intent list review |
| Excel/CSV Import | **HIGH** | Low | Marketing uploads Excel sheets -- need a way to import these directly (not just Salesforce) |
| Territory Management | LOW | Medium | Territories exist but aren't enforced. Could be useful for filtering but Robin says it's "first come first served" now |
| "Claim" a Lead | MEDIUM | Low | Since territories aren't enforced, add a "claim" mechanism so SDRs can grab unclaimed leads |

---

### Stage 2: Lead Qualification (Pre-Call Triage)

**Robin's Process:**
- Opens a lead and uses **experience/gut feel** to determine if it's worth calling
- Key qualifier: "Does this company make or design something tangible?"
- If a company deals with real estate, for example, it's marked as "no opportunity"
- This is a fast triage step -- Robin decides in seconds whether to work a lead

**Lead Intel Current State:**
- AI research generates fit scores (0-100) with industry alignment, company size, pain signals
- Product catalog matching (`server/ai/productCatalog.ts`) scores leads against Hawk Ridge's offerings
- Research packets include company intel, pain points, and product matches
- The call-prep page (`client/src/pages/call-prep.tsx`) shows a full dossier

**Gaps Identified:**
| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| Quick Qualification Signal | **HIGH** | Low | Robin decides in seconds. Need a prominent "worth calling?" indicator (green/yellow/red) visible in the lead list without opening the full dossier |
| Industry Auto-Filter | **HIGH** | Low | Auto-flag leads in non-target industries (real estate, finance, etc.) as "no opportunity" based on AI research |
| Qualification Reason | MEDIUM | Low | Show a one-line reason why a lead is/isn't a fit: "Manufactures industrial pumps -- likely SolidWorks user" vs "Real estate company -- no CAD need" |
| Bulk Triage | MEDIUM | Medium | Let SDRs quickly scan and dismiss multiple unqualified leads at once, rather than opening each one |

---

### Stage 3: Making Calls (80-100/day)

**Robin's Process:**
- Uses Salesforce connected to Zoom as a dialer
- Makes 80-100 calls per day including follow-ups
- Calls directly from within Salesforce
- High volume, fast pace -- efficiency matters

**Lead Intel Current State:**
- Twilio browser softphone (`client/src/components/softphone.tsx`) for in-app calling
- Per Hawk Ridge requirements, moving to Zoom Phone integration
- Zoom integration exists (`server/zoom-routes.ts`, `server/ai/zoomClient.ts`) for recordings
- Real-time transcription via WebSocket (`server/transcription.ts`)
- Live coaching tips generated every 2nd utterance

**Gaps Identified:**
| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| Call Volume Dashboard | MEDIUM | Low | Show daily call count, connect rate, and progress toward daily goal (Robin targets 80-100) |
| Click-to-Call from Lead List | **HIGH** | Low | One-click calling directly from the lead list/queue without navigating to a detail page |
| Call Timer/Pacing | LOW | Low | Show estimated time remaining to hit daily call target based on current pace |
| Zoom Phone Deep Integration | **HIGH** | High | Robin's existing workflow is Salesforce+Zoom. Need the dialer to feel native, not require switching tools |

---

### Stage 4: Recording & Transcription

**Robin's Process:**
- Calls can be manually recorded within Zoom
- System transcribes automatically
- Provides a summary of the call but "it is not a feedback mechanism"
- Recording used to push an announcement but no longer does

**Lead Intel Current State:**
- Real-time transcription with Twilio speech-to-text
- Post-call analysis generates coaching feedback (both Gemini and Claude)
- Call recordings uploaded to Google Drive
- Manager summary and coaching message generated automatically
- Post-call coaching email sent to SDR

**Gaps Identified:**
| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| Zoom Recording Ingest | **HIGH** | Medium | Robin already records in Zoom. Need seamless pull of Zoom recordings into Lead Intel for analysis (vs. requiring Twilio recording) |
| Actionable Post-Call Feedback | **HIGH** | Medium | Robin says current transcription "is not a feedback mechanism." Lead Intel's coaching analysis IS this -- but it needs to be surfaced at the right moment and be genuinely useful, not just a summary |
| Auto-Record Toggle | LOW | Low | Option to auto-record all calls vs. manual toggle (compliance consideration) |

---

### Stage 5: Follow-Up & Cadence Management

**Robin's Process:**
- Manages follow-up tasks in Salesforce
- Tracks touch count: "Ron Robin 4" means this is the 4th touch (R4)
- Uses a **playbook** with different talk tracks and email templates for each touch
- Playbook content already integrated into Salesforce (no copy-paste needed)
- Touch cadence: different message/approach for touch 1 vs touch 2 vs touch 3 vs touch 4

**Lead Intel Current State:**
- Research packets include talk tracks, discovery questions, and objection handles
- Post-call summary form captures disposition and next steps
- No concept of multi-touch cadence or sequencing
- No playbook system with per-touch scripts
- No follow-up task queue

**Gaps Identified:**
| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| Touch/Cadence Tracking | **CRITICAL** | Medium | Track which touch number each lead is on (R1, R2, R3, R4). This is core to Robin's workflow |
| Playbook System | **CRITICAL** | High | Different talk tracks and email templates per touch number. Robin's existing playbook is in Salesforce -- need to either sync it or rebuild it |
| Follow-Up Task Queue | **HIGH** | Medium | Dedicated view showing "leads due for follow-up today" sorted by priority and overdue status |
| Email Templates | **HIGH** | Medium | Pre-written email templates per touch stage, integrated so Robin doesn't need to copy/paste |
| Task Auto-Creation | MEDIUM | Low | When an SDR logs a call with disposition "callback scheduled," auto-create a follow-up task for that date |

---

### Stage 6: Converting a Good Lead

**Robin's Process:**
- If a call goes well and the person is interested, Robin qualifies them with a few questions
- Most interested prospects are already familiar with SolidWorks or CAD systems
- Qualification is relatively quick -- a few targeted questions

**Lead Intel Current State:**
- BANT extraction from transcripts (`server/ai/qualificationExtractor.ts`, `server/ai/bantExtraction.ts`)
- Post-call summary form captures key takeaways, next steps, notes
- AI disposition suggestion predicts call outcome
- Fit scoring with confidence levels

**Gaps Identified:**
| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| Qualification Checklist | MEDIUM | Low | Show the SDR a quick checklist during/after the call: "Did you confirm budget? Timeline? Decision maker?" to ensure BANT is covered |
| Existing Product Detection | MEDIUM | Low | Since most interested prospects already use SolidWorks/CAD, highlight this signal prominently in the research dossier: "Already uses SolidWorks 2023" |
| Quick Qualify Button | LOW | Low | One-click "Qualify & Hand Off" that auto-fills qualification data from the research + call transcript |

---

### Stage 7: Handing Off to AE

**Robin's Process:**
- Converts the lead in Salesforce
- Leaves notes in Salesforce
- Emails the AE with information including a hyperlink to the Salesforce lead
- Notifies the AE via Microsoft Teams
- AE provides a quote, updates the task, converts lead to "opportunity"
- Robin gets credit for the lead's eventual revenue

**Lead Intel Current State:**
- AE Pipeline view (`client/src/pages/ae-pipeline.tsx`) shows qualified/handed-off leads with full dossier
- Salesforce handoff endpoint creates/updates SF lead and optionally converts to Opportunity
- Post-call summary captures qualification notes for AE
- Handoff includes research packet, talk track, pain signals, BANT data
- Notification system exists but is in-app only

**Gaps Identified:**
| Gap | Priority | Effort | Description |
|-----|----------|--------|-------------|
| Teams Notification | **HIGH** | Medium | Robin notifies AEs via Microsoft Teams. Need Teams webhook or bot integration for handoff alerts |
| Handoff Email with SF Link | **HIGH** | Low | Robin emails AE a hyperlink to the SF lead. Auto-generate this email with Lead Intel dossier + Salesforce URL |
| Revenue Attribution | MEDIUM | Medium | Robin gets credit for revenue from leads he handed off. Track and display this in SDR profile/dashboard |
| One-Click Handoff | MEDIUM | Low | Streamline the handoff: one button that does SF conversion + email + Teams notification simultaneously |
| Handoff Quality Brief (PDF) | MEDIUM | Medium | Generate a polished PDF "quality brief" for the AE, as mentioned in the meeting ("help package up a quality brief to feed to the AE") |

---

## Summary: Priority Matrix

### CRITICAL (Must Build)
1. **Touch/Cadence Tracking** -- Core to Robin's daily workflow. Tracks R1-R4+ touches per lead
2. **Playbook System** -- Different scripts per touch. Robin already has this in Salesforce

### HIGH Priority
3. **Daily Call Queue** -- "Today's Calls" view replacing manual intent list review
4. **Quick Qualification Signal** -- Green/yellow/red indicator visible in lead list
5. **Excel/CSV Import** -- Marketing creates Excel sheets that need to come into the system
6. **Follow-Up Task Queue** -- "Due today" view for follow-up calls
7. **Click-to-Call from Lead List** -- One-click dialing for high-volume calling (80-100/day)
8. **Industry Auto-Filter** -- Auto-flag non-target industries
9. **Email Templates per Touch** -- Pre-written emails integrated per cadence stage
10. **Teams Notification on Handoff** -- Robin notifies AEs via Teams
11. **Handoff Email with SF Link** -- Auto-generated email with dossier + SF URL
12. **Zoom Recording Ingest** -- Pull Zoom recordings for post-call analysis
13. **Actionable Post-Call Feedback** -- Make coaching genuinely useful, not just summaries
14. **Zoom Phone Deep Integration** -- Native-feeling Zoom dialer

### MEDIUM Priority
15. Revenue attribution tracking
16. Qualification checklist during calls
17. Existing product detection (SolidWorks signal)
18. Call volume dashboard
19. Bulk lead triage
20. One-click handoff (SF + email + Teams)
21. Handoff quality brief PDF
22. "Claim" a lead mechanism
23. Qualification reason one-liner
24. Task auto-creation on callback

### LOW Priority
25. Territory management
26. Call timer/pacing
27. Auto-record toggle
28. Quick qualify button

---

## Recommended Implementation Order

### Phase 1: Foundation (Align with Robin's Day-to-Day)
Focus: Make the tool match how Robin actually works today.

1. **Touch/Cadence Tracking** -- Add `touchCount` field to leads, track in call sessions
2. **Follow-Up Task Queue** -- New "My Tasks" or "Today's Calls" page
3. **Daily Call Queue** -- Prioritized list of leads to call today
4. **Quick Qualification Signal** -- Add fit indicator to lead list cards
5. **Industry Auto-Filter** -- Flag non-target industries during research

### Phase 2: Workflow Integration
Focus: Reduce tool-switching between Lead Intel, Salesforce, and Zoom.

6. **Excel/CSV Import** -- Upload Marketing's Excel sheets
7. **Click-to-Call** -- One-click dialing from lead list
8. **Email Templates per Touch** -- Playbook templates per cadence stage
9. **Zoom Recording Ingest** -- Auto-pull recordings for analysis
10. **Handoff Email with SF Link** -- Auto-generate AE notification email

### Phase 3: Communication & Coaching
Focus: Close the loop on handoffs and coaching.

11. **Teams Notification** -- Webhook for AE handoff alerts
12. **Actionable Post-Call Feedback** -- Redesign coaching to be immediately useful
13. **Playbook System** -- Full multi-touch playbook with per-stage content
14. **Handoff Quality Brief (PDF)** -- Polished dossier for AEs

### Phase 4: Analytics & Attribution
Focus: Show value and track outcomes.

15. **Revenue Attribution** -- SDR credit for converted leads
16. **Call Volume Dashboard** -- Daily metrics and goals
17. **Qualification Checklist** -- BANT coverage during calls

---

## Key Quotes from the Meeting

> "Whoever gets to it first" -- Robin on territory assignment (no longer enforced)

> "Does this company make or design something tangible?" -- Robin's primary qualification filter

> "80 to 100 calls a day, which includes follow-up tasks" -- Robin's daily volume

> "Ron Robin 4" (R4) -- How Robin tracks touch count per lead

> "It is not a feedback mechanism" -- Robin on current Zoom transcription/summary

> "He also notifies the AE via Teams" -- Critical notification channel for handoffs

---

## Architecture Notes for Implementation

### Touch/Cadence Tracking
- Add `touchCount` integer field to `leads` table in `shared/schema.ts`
- Add `touchNumber` field to `callSessions` table
- Auto-increment touch count when a call is logged against a lead
- Display touch badge (R1, R2, R3, R4) on lead cards

### Playbook System
- New `playbooks` table: id, name, touchNumber, talkTrack, emailTemplate, notes
- New `cadence_steps` table: id, playbookId, stepNumber, channel (call/email), content, waitDays
- API: `GET /api/playbooks/:touchNumber` returns the right script for the current touch
- UI: Show playbook content alongside the research dossier on call-prep page

### Daily Call Queue
- Query: leads assigned to SDR where `nextFollowUp <= today` OR `status = 'new'`
- Sort by: overdue follow-ups first, then priority, then fit score
- Display: compact cards with one-click call, touch count, and fit indicator

### Excel/CSV Import
- New route: `POST /api/leads/import-csv`
- Parse CSV/Excel, map columns to lead fields
- Show preview before import
- Deduplicate against existing leads by company name + contact email
