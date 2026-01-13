/**
 * Baseline Metrics Service
 *
 * Calculates and captures metrics aligned with the Hawk Ridge proposal success criteria:
 *
 * Phase 1 Metrics:
 * - Time Efficiency: 60-70% reduction in lead processing time (intake → AE handoff)
 * - Lead Quality: 85%+ qualified lead accuracy through AI research and scoring
 * - Volume Capacity: Enable team to handle 150% of current lead volume without additional headcount
 * - AE Readiness: 50% reduction in AE prep time per lead (external measurement required)
 * - Adoption: 80%+ daily active usage within 30 days of launch
 *
 * Phase 2 Metrics:
 * - Conversion: 15-25% improvement in lead-to-opportunity conversion
 * - Deal Velocity: 20% reduction in average sales cycle length
 * - Coaching Impact: 30% improvement in call effectiveness metrics
 * - Revenue Impact: Attributable incremental pipeline generation
 * - User Satisfaction: NPS score of 50+ (external survey required)
 */

import { db } from '../db.js';
import {
  leads,
  users,
  sdrs,
  callSessions,
  managerCallAnalyses,
  researchPackets,
  baselineSnapshots,
  leadStatusHistory,
  type InsertBaselineSnapshot
} from '../../shared/schema.js';
import { eq, sql, and, gte, lte, isNotNull, count, avg } from 'drizzle-orm';

export interface BaselineMetricsResult {
  // Lead Processing Time (hours)
  leadProcessingTime: {
    avgTimeToFirstContact: number | null;
    avgTimeToQualification: number | null;
    avgTimeToHandoff: number | null;
    avgTimeQualToHandoff: number | null;
    sampleSize: number;
  };

  // Volume & Capacity
  volumeCapacity: {
    totalLeadsProcessed: number;
    leadsPerSdrPerDay: number;
    callsPerSdrPerDay: number;
    maxCallsPerSdrPerDay: number;
    activeSdrCount: number;
    workingDaysInPeriod: number;
  };

  // Lead Quality
  leadQuality: {
    avgFitScore: number | null;
    qualifiedLeadAccuracy: number | null; // % of qualified leads that converted
    qualifiedLeadsCount: number;
    convertedLeadsCount: number;
    lostLeadsCount: number;
  };

  // Conversion Rates
  conversionRates: {
    leadToQualifiedRate: number; // % of leads that reach qualified status
    qualifiedToConvertedRate: number; // % of qualified that convert
    overallConversionRate: number; // % intake to converted
  };

  // Call Effectiveness (7-dimension scoring)
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

  // Sales Cycle (days)
  salesCycle: {
    avgDays: number | null;
    medianDays: number | null;
    sampleSize: number;
  };

  // User Adoption
  adoption: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    avgLoginsPerUserPerWeek: number;
    totalUsers: number;
  };

  // Research Utilization
  researchUtilization: {
    leadsWithResearch: number;
    totalLeads: number;
    utilizationRate: number; // %
    avgGenerationTimeMinutes: number | null;
  };

  // Pipeline
  pipeline: {
    totalValue: number;
    avgDealValue: number;
    qualifiedLeadCount: number;
  };

  // Metadata
  periodStart: Date;
  periodEnd: Date;
  calculatedAt: Date;
}

/**
 * Calculate all baseline metrics for a given time period
 */
export async function calculateBaselineMetrics(
  periodStart: Date,
  periodEnd: Date
): Promise<BaselineMetricsResult> {
  const [
    leadProcessingTime,
    volumeCapacity,
    leadQuality,
    conversionRates,
    callEffectiveness,
    salesCycle,
    adoption,
    researchUtilization,
    pipeline
  ] = await Promise.all([
    calculateLeadProcessingTime(periodStart, periodEnd),
    calculateVolumeCapacity(periodStart, periodEnd),
    calculateLeadQuality(periodStart, periodEnd),
    calculateConversionRates(periodStart, periodEnd),
    calculateCallEffectiveness(periodStart, periodEnd),
    calculateSalesCycle(periodStart, periodEnd),
    calculateAdoption(periodStart, periodEnd),
    calculateResearchUtilization(periodStart, periodEnd),
    calculatePipeline(periodStart, periodEnd)
  ]);

  return {
    leadProcessingTime,
    volumeCapacity,
    leadQuality,
    conversionRates,
    callEffectiveness,
    salesCycle,
    adoption,
    researchUtilization,
    pipeline,
    periodStart,
    periodEnd,
    calculatedAt: new Date()
  };
}

/**
 * Lead Processing Time - Key metric for "60-70% reduction" target
 */
async function calculateLeadProcessingTime(periodStart: Date, periodEnd: Date) {
  // Get leads with lifecycle timestamps in the period
  const leadsWithTimestamps = await db.select({
    id: leads.id,
    createdAt: leads.createdAt,
    firstContactedAt: leads.firstContactedAt,
    qualifiedAt: leads.qualifiedAt,
    handedOffAt: leads.handedOffAt,
  })
  .from(leads)
  .where(
    and(
      gte(leads.createdAt, periodStart),
      lte(leads.createdAt, periodEnd)
    )
  );

  let totalTimeToFirstContact = 0;
  let timeToFirstContactCount = 0;
  let totalTimeToQualification = 0;
  let timeToQualificationCount = 0;
  let totalTimeToHandoff = 0;
  let timeToHandoffCount = 0;
  let totalTimeQualToHandoff = 0;
  let timeQualToHandoffCount = 0;

  for (const lead of leadsWithTimestamps) {
    const createdAt = new Date(lead.createdAt);

    if (lead.firstContactedAt) {
      const firstContactedAt = new Date(lead.firstContactedAt);
      const hours = (firstContactedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      if (hours >= 0 && hours < 720) { // Cap at 30 days to exclude outliers
        totalTimeToFirstContact += hours;
        timeToFirstContactCount++;
      }
    }

    if (lead.qualifiedAt) {
      const qualifiedAt = new Date(lead.qualifiedAt);
      const hours = (qualifiedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      if (hours >= 0 && hours < 720) {
        totalTimeToQualification += hours;
        timeToQualificationCount++;
      }
    }

    if (lead.handedOffAt) {
      const handedOffAt = new Date(lead.handedOffAt);
      const hours = (handedOffAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      if (hours >= 0 && hours < 720) {
        totalTimeToHandoff += hours;
        timeToHandoffCount++;
      }

      // Time from qualification to handoff
      if (lead.qualifiedAt) {
        const qualifiedAt = new Date(lead.qualifiedAt);
        const qualToHandoffHours = (handedOffAt.getTime() - qualifiedAt.getTime()) / (1000 * 60 * 60);
        if (qualToHandoffHours >= 0 && qualToHandoffHours < 720) {
          totalTimeQualToHandoff += qualToHandoffHours;
          timeQualToHandoffCount++;
        }
      }
    }
  }

  return {
    avgTimeToFirstContact: timeToFirstContactCount > 0
      ? Math.round(totalTimeToFirstContact / timeToFirstContactCount)
      : null,
    avgTimeToQualification: timeToQualificationCount > 0
      ? Math.round(totalTimeToQualification / timeToQualificationCount)
      : null,
    avgTimeToHandoff: timeToHandoffCount > 0
      ? Math.round(totalTimeToHandoff / timeToHandoffCount)
      : null,
    avgTimeQualToHandoff: timeQualToHandoffCount > 0
      ? Math.round(totalTimeQualToHandoff / timeQualToHandoffCount)
      : null,
    sampleSize: leadsWithTimestamps.length
  };
}

/**
 * Volume & Capacity - Key metric for "150% volume capacity" target
 */
async function calculateVolumeCapacity(periodStart: Date, periodEnd: Date) {
  // Get all leads in period
  const leadsInPeriod = await db.select({ count: count() })
    .from(leads)
    .where(
      and(
        gte(leads.createdAt, periodStart),
        lte(leads.createdAt, periodEnd)
      )
    );

  // Get active SDRs
  const activeSdrs = await db.select({ count: count() })
    .from(sdrs)
    .where(eq(sdrs.isActive, true));

  // Get calls per day by SDR
  const callsByDay = await db.select({
    date: sql<string>`DATE(${callSessions.startedAt})`,
    userId: callSessions.userId,
    callCount: count()
  })
  .from(callSessions)
  .where(
    and(
      gte(callSessions.startedAt, periodStart),
      lte(callSessions.startedAt, periodEnd)
    )
  )
  .groupBy(sql`DATE(${callSessions.startedAt})`, callSessions.userId);

  // Calculate working days in period (excluding weekends)
  const workingDays = calculateWorkingDays(periodStart, periodEnd);

  // Calculate calls per SDR per day
  const totalCalls = callsByDay.reduce((sum, row) => sum + Number(row.callCount), 0);
  const uniqueDays = new Set(callsByDay.map(r => r.date)).size;
  const uniqueUsers = new Set(callsByDay.map(r => r.userId)).size;

  // Find max calls per SDR per day
  const callsByDayMap = new Map<string, number>();
  for (const row of callsByDay) {
    const key = `${row.date}_${row.userId}`;
    callsByDayMap.set(key, Number(row.callCount));
  }
  const maxCalls = Math.max(...Array.from(callsByDayMap.values()), 0);

  const activeSdrCount = activeSdrs[0]?.count ?? 0;
  const avgCallsPerSdrPerDay = uniqueDays > 0 && uniqueUsers > 0
    ? Math.round(totalCalls / (uniqueDays * uniqueUsers))
    : 0;

  return {
    totalLeadsProcessed: leadsInPeriod[0]?.count ?? 0,
    leadsPerSdrPerDay: activeSdrCount > 0 && workingDays > 0
      ? Math.round((leadsInPeriod[0]?.count ?? 0) / (activeSdrCount * workingDays))
      : 0,
    callsPerSdrPerDay: avgCallsPerSdrPerDay,
    maxCallsPerSdrPerDay: maxCalls,
    activeSdrCount,
    workingDaysInPeriod: workingDays
  };
}

/**
 * Lead Quality - Key metric for "85%+ qualified lead accuracy" target
 */
async function calculateLeadQuality(periodStart: Date, periodEnd: Date) {
  // Get leads by status in period
  const leadsByStatus = await db.select({
    status: leads.status,
    count: count(),
    avgFitScore: avg(leads.fitScore)
  })
  .from(leads)
  .where(
    and(
      gte(leads.createdAt, periodStart),
      lte(leads.createdAt, periodEnd)
    )
  )
  .groupBy(leads.status);

  let qualifiedCount = 0;
  let convertedCount = 0;
  let lostCount = 0;
  let totalFitScoreSum = 0;
  let fitScoreCount = 0;

  for (const row of leadsByStatus) {
    if (row.status === 'qualified' || row.status === 'handed_off') {
      qualifiedCount += Number(row.count);
    }
    if (row.status === 'converted') {
      convertedCount += Number(row.count);
    }
    if (row.status === 'lost') {
      lostCount += Number(row.count);
    }
    if (row.avgFitScore) {
      totalFitScoreSum += Number(row.avgFitScore) * Number(row.count);
      fitScoreCount += Number(row.count);
    }
  }

  // Qualified lead accuracy = % of leads that reached qualified/handed_off/converted that actually converted
  // This measures whether our "qualified" designation was accurate
  const totalQualifiedOutcomes = convertedCount + lostCount; // Leads that reached a final outcome after qualification
  const qualifiedLeadAccuracy = totalQualifiedOutcomes > 0
    ? Math.round((convertedCount / totalQualifiedOutcomes) * 100)
    : null;

  return {
    avgFitScore: fitScoreCount > 0 ? Math.round(totalFitScoreSum / fitScoreCount) : null,
    qualifiedLeadAccuracy,
    qualifiedLeadsCount: qualifiedCount + convertedCount, // Include converted as they were qualified
    convertedLeadsCount: convertedCount,
    lostLeadsCount: lostCount
  };
}

/**
 * Conversion Rates - Key metric for "15-25% improvement" target
 */
async function calculateConversionRates(periodStart: Date, periodEnd: Date) {
  const totalLeads = await db.select({ count: count() })
    .from(leads)
    .where(
      and(
        gte(leads.createdAt, periodStart),
        lte(leads.createdAt, periodEnd)
      )
    );

  const qualifiedLeads = await db.select({ count: count() })
    .from(leads)
    .where(
      and(
        gte(leads.createdAt, periodStart),
        lte(leads.createdAt, periodEnd),
        sql`${leads.status} IN ('qualified', 'handed_off', 'converted')`
      )
    );

  const convertedLeads = await db.select({ count: count() })
    .from(leads)
    .where(
      and(
        gte(leads.createdAt, periodStart),
        lte(leads.createdAt, periodEnd),
        eq(leads.status, 'converted')
      )
    );

  const total = totalLeads[0]?.count ?? 0;
  const qualified = qualifiedLeads[0]?.count ?? 0;
  const converted = convertedLeads[0]?.count ?? 0;

  return {
    leadToQualifiedRate: total > 0 ? Math.round((qualified / total) * 100) : 0,
    qualifiedToConvertedRate: qualified > 0 ? Math.round((converted / qualified) * 100) : 0,
    overallConversionRate: total > 0 ? Math.round((converted / total) * 100) : 0
  };
}

/**
 * Call Effectiveness - Key metric for "30% improvement in call effectiveness" target
 */
async function calculateCallEffectiveness(periodStart: Date, periodEnd: Date) {
  const scores = await db.select({
    avgOverall: avg(managerCallAnalyses.overallScore),
    avgOpening: avg(managerCallAnalyses.openingScore),
    avgDiscovery: avg(managerCallAnalyses.discoveryScore),
    avgListening: avg(managerCallAnalyses.listeningScore),
    avgObjection: avg(managerCallAnalyses.objectionScore),
    avgValueProp: avg(managerCallAnalyses.valuePropositionScore),
    avgClosing: avg(managerCallAnalyses.closingScore),
    totalAnalyzed: count()
  })
  .from(managerCallAnalyses)
  .where(
    and(
      gte(managerCallAnalyses.analyzedAt, periodStart),
      lte(managerCallAnalyses.analyzedAt, periodEnd)
    )
  );

  const result = scores[0];

  return {
    avgOverallScore: result?.avgOverall ? Math.round(Number(result.avgOverall)) : null,
    avgOpeningScore: result?.avgOpening ? Math.round(Number(result.avgOpening)) : null,
    avgDiscoveryScore: result?.avgDiscovery ? Math.round(Number(result.avgDiscovery)) : null,
    avgListeningScore: result?.avgListening ? Math.round(Number(result.avgListening)) : null,
    avgObjectionScore: result?.avgObjection ? Math.round(Number(result.avgObjection)) : null,
    avgValuePropScore: result?.avgValueProp ? Math.round(Number(result.avgValueProp)) : null,
    avgClosingScore: result?.avgClosing ? Math.round(Number(result.avgClosing)) : null,
    totalCallsAnalyzed: result?.totalAnalyzed ?? 0
  };
}

/**
 * Sales Cycle - Key metric for "20% reduction in sales cycle" target
 */
async function calculateSalesCycle(periodStart: Date, periodEnd: Date) {
  // Get converted leads with full lifecycle data
  const convertedLeads = await db.select({
    createdAt: leads.createdAt,
    convertedAt: leads.convertedAt
  })
  .from(leads)
  .where(
    and(
      gte(leads.createdAt, periodStart),
      lte(leads.createdAt, periodEnd),
      eq(leads.status, 'converted'),
      isNotNull(leads.convertedAt)
    )
  );

  const cycleDays: number[] = [];

  for (const lead of convertedLeads) {
    if (lead.convertedAt) {
      const days = Math.round(
        (new Date(lead.convertedAt).getTime() - new Date(lead.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
      );
      if (days >= 0 && days < 365) { // Cap at 1 year
        cycleDays.push(days);
      }
    }
  }

  // Calculate median
  let medianDays: number | null = null;
  if (cycleDays.length > 0) {
    cycleDays.sort((a, b) => a - b);
    const mid = Math.floor(cycleDays.length / 2);
    medianDays = cycleDays.length % 2 !== 0
      ? cycleDays[mid]
      : Math.round((cycleDays[mid - 1] + cycleDays[mid]) / 2);
  }

  const avgDays = cycleDays.length > 0
    ? Math.round(cycleDays.reduce((sum, d) => sum + d, 0) / cycleDays.length)
    : null;

  return {
    avgDays,
    medianDays,
    sampleSize: cycleDays.length
  };
}

/**
 * User Adoption - Key metric for "80%+ daily active usage" target
 */
async function calculateAdoption(periodStart: Date, periodEnd: Date) {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Daily active users (logged in within last 24 hours)
  const dailyActive = await db.select({ count: count() })
    .from(users)
    .where(
      and(
        eq(users.isActive, true),
        gte(users.lastLoginAt, oneDayAgo)
      )
    );

  // Weekly active users
  const weeklyActive = await db.select({ count: count() })
    .from(users)
    .where(
      and(
        eq(users.isActive, true),
        gte(users.lastLoginAt, oneWeekAgo)
      )
    );

  // Monthly active users
  const monthlyActive = await db.select({ count: count() })
    .from(users)
    .where(
      and(
        eq(users.isActive, true),
        gte(users.lastLoginAt, oneMonthAgo)
      )
    );

  // Total active users
  const totalUsers = await db.select({ count: count() })
    .from(users)
    .where(eq(users.isActive, true));

  // Calculate average logins per user per week
  // This requires session tracking which we don't have granularly
  // For now, estimate based on lastLoginAt frequency
  const avgLoginsPerWeek = 5; // Placeholder - would need session history for accurate calculation

  return {
    dailyActiveUsers: dailyActive[0]?.count ?? 0,
    weeklyActiveUsers: weeklyActive[0]?.count ?? 0,
    monthlyActiveUsers: monthlyActive[0]?.count ?? 0,
    avgLoginsPerUserPerWeek: avgLoginsPerWeek,
    totalUsers: totalUsers[0]?.count ?? 0
  };
}

/**
 * Research Utilization - Measures how much AI research is being used
 */
async function calculateResearchUtilization(periodStart: Date, periodEnd: Date) {
  // Total leads in period
  const totalLeads = await db.select({ count: count() })
    .from(leads)
    .where(
      and(
        gte(leads.createdAt, periodStart),
        lte(leads.createdAt, periodEnd)
      )
    );

  // Leads with research packets
  const leadsWithResearch = await db.select({ count: sql<number>`COUNT(DISTINCT ${researchPackets.leadId})` })
    .from(researchPackets)
    .innerJoin(leads, eq(researchPackets.leadId, leads.id))
    .where(
      and(
        gte(leads.createdAt, periodStart),
        lte(leads.createdAt, periodEnd)
      )
    );

  const total = totalLeads[0]?.count ?? 0;
  const withResearch = leadsWithResearch[0]?.count ?? 0;

  return {
    leadsWithResearch: withResearch,
    totalLeads: total,
    utilizationRate: total > 0 ? Math.round((withResearch / total) * 100) : 0,
    avgGenerationTimeMinutes: null // Would need to track research generation times
  };
}

/**
 * Pipeline Metrics - Key metric for "revenue impact" target
 */
async function calculatePipeline(periodStart: Date, periodEnd: Date) {
  // Use default deal value from dashboard (can be configured)
  const DEFAULT_DEAL_VALUE = 15000;

  const qualifiedLeads = await db.select({ count: count() })
    .from(leads)
    .where(
      and(
        gte(leads.createdAt, periodStart),
        lte(leads.createdAt, periodEnd),
        sql`${leads.status} IN ('qualified', 'handed_off', 'converted')`
      )
    );

  const qualifiedCount = qualifiedLeads[0]?.count ?? 0;

  return {
    totalValue: qualifiedCount * DEFAULT_DEAL_VALUE,
    avgDealValue: DEFAULT_DEAL_VALUE,
    qualifiedLeadCount: qualifiedCount
  };
}

/**
 * Save a baseline snapshot to the database
 */
export async function captureBaselineSnapshot(
  snapshotType: string,
  snapshotLabel: string,
  periodStart: Date,
  periodEnd: Date,
  capturedBy?: string,
  notes?: string
): Promise<BaselineMetricsResult> {
  const metrics = await calculateBaselineMetrics(periodStart, periodEnd);

  const snapshotData: InsertBaselineSnapshot = {
    snapshotType,
    snapshotLabel,

    // Lead Processing Time
    avgTimeToFirstContact: metrics.leadProcessingTime.avgTimeToFirstContact,
    avgTimeToQualification: metrics.leadProcessingTime.avgTimeToQualification,
    avgTimeToHandoff: metrics.leadProcessingTime.avgTimeToHandoff,
    avgTimeQualToHandoff: metrics.leadProcessingTime.avgTimeQualToHandoff,

    // Volume & Capacity
    totalLeadsProcessed: metrics.volumeCapacity.totalLeadsProcessed,
    leadsPerSdrPerDay: metrics.volumeCapacity.leadsPerSdrPerDay,
    callsPerSdrPerDay: metrics.volumeCapacity.callsPerSdrPerDay,
    maxCallsPerSdrPerDay: metrics.volumeCapacity.maxCallsPerSdrPerDay,
    activeSdrCount: metrics.volumeCapacity.activeSdrCount,

    // Lead Quality
    avgFitScore: metrics.leadQuality.avgFitScore,
    qualifiedLeadAccuracy: metrics.leadQuality.qualifiedLeadAccuracy,
    qualifiedLeadsCount: metrics.leadQuality.qualifiedLeadsCount,
    convertedLeadsCount: metrics.leadQuality.convertedLeadsCount,
    lostLeadsCount: metrics.leadQuality.lostLeadsCount,

    // Conversion Rates
    leadToQualifiedRate: metrics.conversionRates.leadToQualifiedRate,
    qualifiedToConvertedRate: metrics.conversionRates.qualifiedToConvertedRate,
    overallConversionRate: metrics.conversionRates.overallConversionRate,

    // Call Effectiveness
    avgCallScore: metrics.callEffectiveness.avgOverallScore,
    avgOpeningScore: metrics.callEffectiveness.avgOpeningScore,
    avgDiscoveryScore: metrics.callEffectiveness.avgDiscoveryScore,
    avgListeningScore: metrics.callEffectiveness.avgListeningScore,
    avgObjectionScore: metrics.callEffectiveness.avgObjectionScore,
    avgValuePropScore: metrics.callEffectiveness.avgValuePropScore,
    avgClosingScore: metrics.callEffectiveness.avgClosingScore,
    totalCallsAnalyzed: metrics.callEffectiveness.totalCallsAnalyzed,

    // Sales Cycle
    avgSalesCycleDays: metrics.salesCycle.avgDays,
    medianSalesCycleDays: metrics.salesCycle.medianDays,

    // Adoption
    dailyActiveUsers: metrics.adoption.dailyActiveUsers,
    weeklyActiveUsers: metrics.adoption.weeklyActiveUsers,
    monthlyActiveUsers: metrics.adoption.monthlyActiveUsers,
    avgLoginsPerUserPerWeek: metrics.adoption.avgLoginsPerUserPerWeek,

    // Research Utilization
    leadsWithResearch: metrics.researchUtilization.leadsWithResearch,
    avgResearchGenerationTime: metrics.researchUtilization.avgGenerationTimeMinutes,
    researchUtilizationRate: metrics.researchUtilization.utilizationRate,

    // Pipeline
    totalPipelineValue: metrics.pipeline.totalValue,
    avgDealValue: metrics.pipeline.avgDealValue,

    // Raw data
    rawMetricsJson: metrics,

    // Metadata
    periodStartDate: periodStart,
    periodEndDate: periodEnd,
    capturedBy,
    notes
  };

  await db.insert(baselineSnapshots).values(snapshotData);

  return metrics;
}

/**
 * Compare two snapshots and calculate improvement percentages
 */
export async function compareSnapshots(
  baselineType: string,
  comparisonType: string
): Promise<{
  baseline: typeof baselineSnapshots.$inferSelect | null;
  comparison: typeof baselineSnapshots.$inferSelect | null;
  improvements: {
    timeEfficiency: number | null; // % improvement in lead processing time
    leadQualityAccuracy: number | null; // Percentage point change
    volumeCapacity: number | null; // % increase in capacity
    conversionRate: number | null; // Percentage point change
    callEffectiveness: number | null; // % improvement
    salesCycle: number | null; // % reduction in days
    adoption: number | null; // DAU as % of total users
  };
} | null> {
  const baselineResult = await db.select()
    .from(baselineSnapshots)
    .where(eq(baselineSnapshots.snapshotType, baselineType))
    .orderBy(sql`${baselineSnapshots.createdAt} DESC`)
    .limit(1);

  const comparisonResult = await db.select()
    .from(baselineSnapshots)
    .where(eq(baselineSnapshots.snapshotType, comparisonType))
    .orderBy(sql`${baselineSnapshots.createdAt} DESC`)
    .limit(1);

  const baseline = baselineResult[0] || null;
  const comparison = comparisonResult[0] || null;

  if (!baseline || !comparison) {
    return { baseline, comparison, improvements: {
      timeEfficiency: null,
      leadQualityAccuracy: null,
      volumeCapacity: null,
      conversionRate: null,
      callEffectiveness: null,
      salesCycle: null,
      adoption: null
    }};
  }

  // Calculate improvements
  const improvements = {
    // Time Efficiency: % reduction in lead processing time
    timeEfficiency: baseline.avgTimeToHandoff && comparison.avgTimeToHandoff
      ? Math.round(((baseline.avgTimeToHandoff - comparison.avgTimeToHandoff) / baseline.avgTimeToHandoff) * 100)
      : null,

    // Lead Quality Accuracy: Percentage point change
    leadQualityAccuracy: baseline.qualifiedLeadAccuracy !== null && comparison.qualifiedLeadAccuracy !== null
      ? comparison.qualifiedLeadAccuracy - baseline.qualifiedLeadAccuracy
      : null,

    // Volume Capacity: % increase (compare leads per SDR per day)
    volumeCapacity: baseline.leadsPerSdrPerDay && comparison.leadsPerSdrPerDay
      ? Math.round(((comparison.leadsPerSdrPerDay - baseline.leadsPerSdrPerDay) / baseline.leadsPerSdrPerDay) * 100)
      : null,

    // Conversion Rate: Percentage point change
    conversionRate: baseline.overallConversionRate !== null && comparison.overallConversionRate !== null
      ? comparison.overallConversionRate - baseline.overallConversionRate
      : null,

    // Call Effectiveness: % improvement in overall score
    callEffectiveness: baseline.avgCallScore && comparison.avgCallScore
      ? Math.round(((comparison.avgCallScore - baseline.avgCallScore) / baseline.avgCallScore) * 100)
      : null,

    // Sales Cycle: % reduction in days
    salesCycle: baseline.avgSalesCycleDays && comparison.avgSalesCycleDays
      ? Math.round(((baseline.avgSalesCycleDays - comparison.avgSalesCycleDays) / baseline.avgSalesCycleDays) * 100)
      : null,

    // Adoption: DAU as percentage of total active users
    adoption: comparison.dailyActiveUsers !== null
      ? comparison.dailyActiveUsers // Just return the DAU count, compare to target manually
      : null
  };

  return { baseline, comparison, improvements };
}

/**
 * Get all baseline snapshots for reporting
 */
export async function getAllSnapshots() {
  return await db.select()
    .from(baselineSnapshots)
    .orderBy(sql`${baselineSnapshots.createdAt} DESC`);
}

// Helper function to calculate working days between two dates
function calculateWorkingDays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}
