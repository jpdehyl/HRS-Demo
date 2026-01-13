# Baseline Success Metrics - Technical Implementation Guide

> **Purpose:** Map Hawk Ridge proposal success metrics to technical measurement implementation
> **Last Updated:** January 2026
> **Related Files:**
> - `shared/schema.ts` - Database schema with lifecycle timestamps
> - `server/ai/baselineMetrics.ts` - Metrics calculation service
> - `server/baseline-routes.ts` - API endpoints

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1 Metrics](#phase-1-metrics)
3. [Phase 2 Metrics](#phase-2-metrics)
4. [Baseline Capture Process](#baseline-capture-process)
5. [API Reference](#api-reference)
6. [Data Quality Requirements](#data-quality-requirements)
7. [Measurement Gaps & Mitigations](#measurement-gaps--mitigations)

---

## Overview

### Measurement Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BASELINE SNAPSHOTS                        │
│  Point-in-time captures of all metrics                      │
│  Types: 'baseline', 'phase1_launch', 'phase1_30day', etc.   │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│                 BASELINE METRICS SERVICE                     │
│  server/ai/baselineMetrics.ts                               │
│  Calculates all metrics from raw data                       │
└─────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────┐
│                      RAW DATA SOURCES                        │
│  leads, call_sessions, manager_call_analyses,               │
│  research_packets, users, sdrs                              │
└─────────────────────────────────────────────────────────────┘
```

### Snapshot Types

| Type | When to Capture | Purpose |
|------|-----------------|---------|
| `baseline` | Before Phase 1 launch | Establish pre-implementation state |
| `phase1_launch` | Day of Phase 1 deployment | Document starting point |
| `phase1_30day` | 30 days post-launch | Measure initial adoption impact |
| `phase1_90day` | 90 days post-launch | Measure sustained impact |
| `phase2_launch` | Day of Phase 2 deployment | Baseline for advanced features |
| `phase2_30day` | 30 days post Phase 2 | Measure coaching/analytics impact |

---

## Phase 1 Metrics

### 1. Time Efficiency (Target: 60-70% Reduction)

**Proposal Claim:** "60–70% reduction in lead processing time (intake → AE handoff)"

**Technical Measurement:**

| Metric | Database Field | Calculation |
|--------|---------------|-------------|
| Time to First Contact | `leads.firstContactedAt - leads.createdAt` | Average hours |
| Time to Qualification | `leads.qualifiedAt - leads.createdAt` | Average hours |
| Time to Handoff | `leads.handedOffAt - leads.createdAt` | Average hours |
| Qual → Handoff Time | `leads.handedOffAt - leads.qualifiedAt` | Average hours |

**API Response Field:** `avgTimeToHandoff`

**Calculation Logic:**
```typescript
// From server/ai/baselineMetrics.ts
const hours = (handedOffAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
// Outliers capped at 720 hours (30 days)
```

**Baseline vs Target Calculation:**
```
Improvement % = ((baseline.avgTimeToHandoff - current.avgTimeToHandoff) / baseline.avgTimeToHandoff) × 100

Example:
  Baseline: 48 hours
  Current: 16 hours
  Improvement: ((48-16)/48) × 100 = 66.7% ✓ (within 60-70% target)
```

**Data Requirements:**
- ✅ `leads.createdAt` - Always populated
- ⚠️ `leads.firstContactedAt` - Needs to be set on first call/email
- ⚠️ `leads.qualifiedAt` - Needs to be set on status change to 'qualified'
- ✅ `leads.handedOffAt` - Already tracked

**Implementation Note:** Need to add logic to automatically set `firstContactedAt` and `qualifiedAt` timestamps when status changes or first call is made.

---

### 2. Lead Quality (Target: 85%+ Accuracy)

**Proposal Claim:** "85%+ qualified lead accuracy through AI research and scoring"

**Technical Measurement:**

| Metric | Database Fields | Calculation |
|--------|----------------|-------------|
| Qualified Lead Accuracy | `leads.status`, `leads.fitScore` | % of qualified leads that converted |

**Definition:** Of leads marked as "qualified" (by AI + SDR), what percentage actually converted to opportunities?

**Calculation Logic:**
```typescript
// From server/ai/baselineMetrics.ts
const totalQualifiedOutcomes = convertedCount + lostCount;
const qualifiedLeadAccuracy = (convertedCount / totalQualifiedOutcomes) * 100;
```

**API Response Field:** `qualifiedLeadAccuracy`

**Data Requirements:**
- ✅ `leads.status` - Track 'qualified', 'converted', 'lost' statuses
- ✅ `leads.fitScore` - AI-generated fit score (0-100)
- ⚠️ Need sufficient converted/lost outcomes to measure accuracy

**Measurement Challenge:**
- This is a **lagging indicator** - requires full sales cycle completion
- Early measurements may have small sample sizes
- Consider using proxy metrics initially (e.g., AE acceptance rate of handoffs)

---

### 3. Volume Capacity (Target: 150% of Current)

**Proposal Claim:** "Enable team to handle 150% of current lead volume without additional headcount"

**Technical Measurement:**

| Metric | Database Fields | Calculation |
|--------|----------------|-------------|
| Leads per SDR per Day | `leads.createdAt`, `sdrs.id` | Total leads / (SDR count × working days) |
| Calls per SDR per Day | `call_sessions.startedAt` | Total calls / (SDR count × working days) |
| Max Calls per SDR per Day | `call_sessions` | Peak daily volume |

**API Response Fields:** `leadsPerSdrPerDay`, `callsPerSdrPerDay`, `maxCallsPerSdrPerDay`

**Calculation Logic:**
```typescript
// From server/ai/baselineMetrics.ts
leadsPerSdrPerDay = totalLeads / (activeSdrCount * workingDays);
```

**Baseline vs Target Calculation:**
```
Capacity Increase % = (current.leadsPerSdrPerDay / baseline.leadsPerSdrPerDay) × 100

Example:
  Baseline: 10 leads/SDR/day
  Current: 15 leads/SDR/day
  Capacity: (15/10) × 100 = 150% ✓ (meets target)
```

**Data Requirements:**
- ✅ `leads.createdAt` - Timestamp for lead intake
- ✅ `sdrs.isActive` - Active SDR count
- ✅ `call_sessions.startedAt` - Call activity tracking

---

### 4. AE Readiness (Target: 50% Reduction in Prep Time)

**Proposal Claim:** "50% reduction in AE prep time per lead"

**⚠️ EXTERNAL MEASUREMENT REQUIRED**

**Why It Cannot Be Measured Automatically:**
- AE prep time happens outside the system (reviewing notes, researching, etc.)
- No technical way to track when an AE starts/stops reviewing a lead
- Requires self-reporting or manual time tracking

**Recommended Measurement Approaches:**

| Method | Pros | Cons |
|--------|------|------|
| **AE Survey** | Direct measurement, captures actual experience | Subjective, recall bias |
| **Time Diary Study** | Detailed data, establishes baseline accurately | Labor-intensive, Hawthorne effect |
| **Proxy: Time to First AE Action** | Automatic, objective | Doesn't measure prep, just response |
| **Self-Reported Field** | In-workflow capture | Adds friction, may be skipped |

**Recommended Approach:** Pre/post AE survey with specific questions:
1. "On average, how many minutes do you spend preparing for each new lead before taking action?"
2. "Rate the quality of handoff information: 1 (insufficient) - 5 (comprehensive)"
3. "What percentage of leads require additional research beyond what's provided?"

**API Response Field:** `EXTERNAL_SURVEY_REQUIRED`

---

### 5. Adoption (Target: 80%+ Daily Active Usage)

**Proposal Claim:** "80%+ daily active usage within 30 days of launch"

**Technical Measurement:**

| Metric | Database Fields | Calculation |
|--------|----------------|-------------|
| Daily Active Users (DAU) | `users.lastLoginAt` | Users with login in last 24 hours |
| Weekly Active Users (WAU) | `users.lastLoginAt` | Users with login in last 7 days |
| Monthly Active Users (MAU) | `users.lastLoginAt` | Users with login in last 30 days |
| Adoption Rate | DAU / Total Active Users | Percentage |

**API Response Fields:** `dailyActiveUsers`, `weeklyActiveUsers`, `monthlyActiveUsers`, `totalUsers`

**Calculation Logic:**
```typescript
// From server/ai/baselineMetrics.ts
const dailyActive = users.filter(u => u.lastLoginAt >= oneDayAgo);
const adoptionRate = (dailyActive.length / totalActiveUsers.length) * 100;
```

**Target Calculation:**
```
Adoption % = (dailyActiveUsers / totalActiveUsers) × 100

Example:
  Total Active Users: 25
  Daily Active Users: 22
  Adoption: (22/25) × 100 = 88% ✓ (exceeds 80% target)
```

**Data Requirements:**
- ✅ `users.lastLoginAt` - Updated on each login
- ✅ `users.isActive` - Filter for active accounts

---

## Phase 2 Metrics

### 6. Conversion Rate (Target: 15-25% Improvement)

**Proposal Claim:** "15–25% improvement in lead-to-opportunity conversion"

**Technical Measurement:**

| Metric | Calculation | Notes |
|--------|-------------|-------|
| Lead → Qualified Rate | qualified / total × 100 | First stage conversion |
| Qualified → Converted Rate | converted / qualified × 100 | Close rate |
| Overall Conversion Rate | converted / total × 100 | Full funnel |

**API Response Fields:** `leadToQualifiedRate`, `qualifiedToConvertedRate`, `overallConversionRate`

**Baseline vs Target Calculation:**
```
Improvement = current.overallConversionRate - baseline.overallConversionRate

Example:
  Baseline: 8% conversion
  Current: 10% conversion
  Improvement: 10 - 8 = 2 percentage points (25% relative improvement) ✓
```

---

### 7. Deal Velocity (Target: 20% Reduction)

**Proposal Claim:** "20% reduction in average sales cycle length"

**Technical Measurement:**

| Metric | Database Fields | Calculation |
|--------|----------------|-------------|
| Avg Sales Cycle Days | `leads.createdAt`, `leads.convertedAt` | Mean days to conversion |
| Median Sales Cycle Days | Same | Median (more robust to outliers) |

**API Response Fields:** `avgSalesCycleDays`, `medianSalesCycleDays`

**Calculation Logic:**
```typescript
const cycleDays = (convertedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
// Outliers capped at 365 days
```

**Baseline vs Target Calculation:**
```
Reduction % = ((baseline.avgSalesCycleDays - current.avgSalesCycleDays) / baseline.avgSalesCycleDays) × 100

Example:
  Baseline: 45 days
  Current: 36 days
  Reduction: ((45-36)/45) × 100 = 20% ✓ (meets target)
```

**Data Requirements:**
- ⚠️ `leads.convertedAt` - Must be set when lead converts
- ✅ `leads.createdAt` - Always populated

---

### 8. Coaching Impact (Target: 30% Improvement)

**Proposal Claim:** "30% improvement in call effectiveness metrics"

**Technical Measurement:**

| Metric | Database Field | Score Range |
|--------|---------------|-------------|
| Overall Score | `manager_call_analyses.overallScore` | 0-100 |
| Opening Score | `manager_call_analyses.openingScore` | 0-100 |
| Discovery Score | `manager_call_analyses.discoveryScore` | 0-100 |
| Listening Score | `manager_call_analyses.listeningScore` | 0-100 |
| Objection Score | `manager_call_analyses.objectionScore` | 0-100 |
| Value Prop Score | `manager_call_analyses.valuePropositionScore` | 0-100 |
| Closing Score | `manager_call_analyses.closingScore` | 0-100 |

**API Response Fields:** `avgOverallScore`, `avgOpeningScore`, etc.

**Baseline vs Target Calculation:**
```
Improvement % = ((current.avgOverallScore - baseline.avgOverallScore) / baseline.avgOverallScore) × 100

Example:
  Baseline: 62 overall score
  Current: 81 overall score
  Improvement: ((81-62)/62) × 100 = 30.6% ✓ (meets target)
```

**Data Requirements:**
- ⚠️ Sufficient `manager_call_analyses` records for statistical significance
- Recommend minimum 50+ analyzed calls per measurement period

---

### 9. Revenue Impact (Target: Attributable Pipeline Generation)

**Proposal Claim:** "Attributable incremental pipeline generation"

**Technical Measurement:**

| Metric | Calculation | Notes |
|--------|-------------|-------|
| Total Pipeline Value | qualified_leads × avg_deal_value | Using $15K default |
| Pipeline Growth | current - baseline | Absolute $ increase |
| Pipeline Growth % | (current - baseline) / baseline × 100 | Relative increase |

**API Response Fields:** `totalPipelineValue`, `avgDealValue`, `qualifiedLeadCount`

**Attribution Challenge:**
- Difficult to prove causation vs correlation
- Recommend tracking pipeline by:
  - Leads with AI research vs without
  - Calls with coaching vs without
  - SDRs using platform heavily vs lightly

**Data Requirements:**
- Ideally sync with Salesforce for actual deal values
- Current implementation uses estimated deal value ($15K default)

---

### 10. User Satisfaction (Target: NPS 50+)

**Proposal Claim:** "NPS score of 50+"

**⚠️ EXTERNAL SURVEY REQUIRED**

**NPS Formula:**
```
NPS = % Promoters (9-10) - % Detractors (0-6)
```

**Recommended Implementation Options:**

| Option | Effort | Integration |
|--------|--------|-------------|
| **Delighted/Typeform** | Low | External, webhook to DB |
| **In-App Survey Widget** | Medium | Build into settings page |
| **Google Forms** | Low | Manual tracking |

**Survey Questions:**
1. "On a scale of 0-10, how likely are you to recommend Lead Intel to a colleague?" (NPS)
2. "What is the primary reason for your score?" (Open text)
3. "What one thing would improve your experience?" (Open text)

**API Response Field:** `EXTERNAL_SURVEY_REQUIRED`

---

## Baseline Capture Process

### Pre-Launch Baseline (Recommended)

```bash
# 1. Check current data quality
GET /api/baseline/status

# 2. Calculate metrics for last 30-90 days (preview)
GET /api/baseline/calculate?periodStart=2025-10-15&periodEnd=2026-01-13

# 3. Capture official baseline
POST /api/baseline/capture
{
  "snapshotType": "baseline",
  "snapshotLabel": "Pre-Phase 1 Baseline - Q4 2025 Performance",
  "periodStart": "2025-10-15",
  "periodEnd": "2026-01-13",
  "notes": "90-day baseline before AI platform deployment"
}
```

### Post-Launch Measurement

```bash
# 30 days after launch
POST /api/baseline/capture
{
  "snapshotType": "phase1_30day",
  "snapshotLabel": "Phase 1 - 30 Day Measurement",
  "periodStart": "2026-01-14",
  "periodEnd": "2026-02-13",
  "notes": "First month post-launch"
}

# Compare to baseline
GET /api/baseline/compare?baseline=baseline&comparison=phase1_30day
```

---

## API Reference

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/baseline/calculate` | Preview metrics without saving |
| POST | `/api/baseline/capture` | Capture and save a snapshot |
| GET | `/api/baseline/snapshots` | List all saved snapshots |
| GET | `/api/baseline/compare` | Compare two snapshots |
| GET | `/api/baseline/proposal-targets` | Get proposal target definitions |
| GET | `/api/baseline/status` | Check data quality and readiness |

### Response Structure

```typescript
interface BaselineMetricsResult {
  leadProcessingTime: {
    avgTimeToFirstContact: number | null;  // hours
    avgTimeToQualification: number | null; // hours
    avgTimeToHandoff: number | null;       // hours
    avgTimeQualToHandoff: number | null;   // hours
    sampleSize: number;
  };
  volumeCapacity: {
    totalLeadsProcessed: number;
    leadsPerSdrPerDay: number;
    callsPerSdrPerDay: number;
    maxCallsPerSdrPerDay: number;
    activeSdrCount: number;
    workingDaysInPeriod: number;
  };
  leadQuality: {
    avgFitScore: number | null;
    qualifiedLeadAccuracy: number | null;  // percentage
    qualifiedLeadsCount: number;
    convertedLeadsCount: number;
    lostLeadsCount: number;
  };
  conversionRates: {
    leadToQualifiedRate: number;      // percentage
    qualifiedToConvertedRate: number; // percentage
    overallConversionRate: number;    // percentage
  };
  callEffectiveness: {
    avgOverallScore: number | null;
    avgOpeningScore: number | null;
    avgDiscoveryScore: number | null;
    avgListeningScore: number | null;
    avgObjectionScore: number | null;
    avgValuePropScore: number | null;
    avgClosingScore: number | null;
    totalCallsAnalyzed: number;
  };
  salesCycle: {
    avgDays: number | null;
    medianDays: number | null;
    sampleSize: number;
  };
  adoption: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    avgLoginsPerUserPerWeek: number;
    totalUsers: number;
  };
  researchUtilization: {
    leadsWithResearch: number;
    totalLeads: number;
    utilizationRate: number;  // percentage
    avgGenerationTimeMinutes: number | null;
  };
  pipeline: {
    totalValue: number;  // dollars
    avgDealValue: number;
    qualifiedLeadCount: number;
  };
  periodStart: Date;
  periodEnd: Date;
  calculatedAt: Date;
}
```

---

## Data Quality Requirements

### Required Data Before Baseline Capture

| Data Point | Minimum Records | Status |
|------------|-----------------|--------|
| Leads with lifecycle timestamps | 50+ | ⚠️ Needs backfill or wait |
| Converted leads | 10+ | Required for accuracy metrics |
| Call analyses | 50+ | Required for effectiveness metrics |
| Active SDRs | 3+ | Required for capacity metrics |
| Active users with logins | All | Required for adoption metrics |

### Automatic Timestamp Triggers (Need Implementation)

```typescript
// These should be automatically set:

// 1. On first call to lead
if (!lead.firstContactedAt && callSession.leadId === lead.id) {
  await updateLead(lead.id, { firstContactedAt: new Date() });
}

// 2. On status change to 'qualified'
if (newStatus === 'qualified' && !lead.qualifiedAt) {
  await updateLead(lead.id, { qualifiedAt: new Date() });
}

// 3. On status change to 'converted'
if (newStatus === 'converted' && !lead.convertedAt) {
  await updateLead(lead.id, { convertedAt: new Date() });
}

// 4. On status change to 'lost'
if (newStatus === 'lost' && !lead.lostAt) {
  await updateLead(lead.id, { lostAt: new Date() });
}
```

---

## Measurement Gaps & Mitigations

### Gap 1: AE Prep Time
- **Problem:** Cannot measure automatically
- **Mitigation:** Pre/post AE survey, establish baseline through interviews

### Gap 2: NPS Score
- **Problem:** Requires external survey tool
- **Mitigation:** Implement in-app survey widget or use Delighted/Typeform

### Gap 3: Historical Lifecycle Timestamps
- **Problem:** Existing leads don't have `firstContactedAt`, `qualifiedAt`, `convertedAt`
- **Mitigation:** Backfill from call_sessions and lead_status_history tables

### Gap 4: Revenue Attribution
- **Problem:** Hard to prove AI caused pipeline increase
- **Mitigation:** A/B comparison (leads with research vs without)

### Gap 5: Sample Size for Accuracy Metrics
- **Problem:** Need complete sales cycles for accuracy measurement
- **Mitigation:** Use proxy metrics initially, expand as data accumulates

---

## Summary: Measurement Confidence

| Metric | Confidence | Data Ready | Notes |
|--------|------------|------------|-------|
| Time Efficiency | High | ⚠️ Partial | Need timestamp triggers |
| Lead Quality | Medium | ⚠️ Partial | Need converted outcomes |
| Volume Capacity | High | ✅ Yes | Data available |
| AE Readiness | Low | ❌ No | Survey required |
| Adoption | High | ✅ Yes | Data available |
| Conversion | High | ✅ Yes | Data available |
| Deal Velocity | Medium | ⚠️ Partial | Need convertedAt |
| Coaching Impact | High | ✅ Yes | Data available |
| Revenue Impact | Medium | ✅ Yes | Estimates only |
| User Satisfaction | Low | ❌ No | Survey required |

---

## Next Steps

1. **Immediate:** Run `/api/baseline/status` to check data quality
2. **Before Launch:** Implement automatic timestamp triggers
3. **Before Launch:** Capture official baseline snapshot
4. **At Launch:** Capture phase1_launch snapshot
5. **30 Days Post-Launch:** Capture phase1_30day snapshot and compare
6. **External:** Set up AE prep time survey
7. **External:** Set up NPS survey mechanism
