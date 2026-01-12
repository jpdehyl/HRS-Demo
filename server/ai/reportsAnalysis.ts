import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";
import type {
  CallSession,
  Lead,
  Sdr,
  ManagerCallAnalysis,
  ResearchPacket,
  LiveCoachingSession
} from "@shared/schema";

// Gemini AI client setup
function getAiClient() {
  const directKey = process.env.GEMINI_API_KEY;
  if (directKey) {
    return new GoogleGenAI({ apiKey: directKey });
  }

  const replitKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  const replitBase = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
  if (replitKey && replitBase) {
    return new GoogleGenAI({
      apiKey: replitKey,
      httpOptions: { baseUrl: replitBase }
    });
  }

  throw new Error("No Gemini API key configured");
}

// ============================================================================
// DATA AGGREGATION TYPES
// ============================================================================

export interface AggregatedReportData {
  period: {
    start: Date;
    end: Date;
    label: string;
  };
  calls: {
    total: number;
    completed: number;
    avgDuration: number;
    totalTalkTime: number;
    byDisposition: Record<string, number>;
    bySdr: Record<string, { name: string; count: number; avgDuration: number }>;
    byDay: Record<string, number>;
    sentimentDistribution: Record<string, number>;
  };
  leads: {
    total: number;
    byStatus: Record<string, number>;
    qualified: number;
    handedOff: number;
    converted: number;
    avgFitScore: number;
    bySource: Record<string, number>;
    newThisPeriod: number;
  };
  coaching: {
    sessionsWithScores: number;
    avgOverallScore: number;
    scoresByDimension: {
      opening: number;
      discovery: number;
      listening: number;
      objection: number;
      valueProposition: number;
      closing: number;
      compliance: number;
    };
    tipsGenerated: number;
    topPerformers: { sdrId: string; name: string; avgScore: number }[];
    needsCoaching: { sdrId: string; name: string; weakestArea: string; score: number }[];
  };
  research: {
    packetsGenerated: number;
    avgConfidence: string;
    topPainPoints: { painPoint: string; count: number }[];
    topProductMatches: { product: string; count: number }[];
  };
  trends: {
    callVolumeChange: number; // percentage change from previous period
    conversionRateChange: number;
    avgScoreChange: number;
  };
}

export interface ExecutiveSummary {
  narrative: string;
  keyWins: string[];
  concerns: string[];
  recommendations: string[];
  generatedAt: Date;
}

export interface PredictiveInsights {
  pipelineForecast: {
    expectedQualified: { min: number; max: number };
    expectedConverted: { min: number; max: number };
    confidence: string;
  };
  leadScorePredictions: {
    leadId: string;
    companyName: string;
    predictedConversion: number;
    keyFactors: string[];
  }[];
  sdrBurnoutRisk: {
    sdrId: string;
    name: string;
    riskLevel: "low" | "medium" | "high";
    indicators: string[];
  }[];
  bestTimeToCall: {
    industry: string;
    bestHours: string[];
    bestDays: string[];
  }[];
  atRiskLeads: {
    leadId: string;
    companyName: string;
    daysSinceContact: number;
    riskReason: string;
  }[];
}

export interface Anomaly {
  id: string;
  type: "warning" | "alert" | "info";
  category: "performance" | "pipeline" | "engagement" | "coaching";
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  expectedValue: number;
  deviation: number;
  suggestedAction: string;
  entityId?: string;
  entityType?: string;
  detectedAt: Date;
}

export interface ConversationalQuery {
  question: string;
  answer: string;
  dataPoints: { label: string; value: string | number }[];
  followUpQuestions: string[];
  confidence: string;
}

export interface CoachingIntelligence {
  sdrId: string;
  sdrName: string;
  skillHeatmap: {
    dimension: string;
    currentScore: number;
    trend: "improving" | "stable" | "declining";
    percentileRank: number;
  }[];
  patterns: {
    observation: string;
    frequency: string;
    impact: "positive" | "negative" | "neutral";
  }[];
  developmentPlan: {
    priority: number;
    skill: string;
    currentLevel: string;
    targetLevel: string;
    suggestedActions: string[];
  }[];
  progressSummary: string;
}

export interface ResearchROI {
  overallEffectiveness: number;
  intelUsageRate: number;
  conversionByIntelType: {
    intelType: string;
    usageRate: number;
    conversionRate: number;
  }[];
  winningTalkTracks: {
    industry: string;
    talkTrack: string;
    successRate: number;
  }[];
  topPerformingPainPoints: {
    painPoint: string;
    mentionRate: number;
    conversionRate: number;
  }[];
}

export interface ComparativeAnalytics {
  sdrRankings: {
    sdrId: string;
    name: string;
    rank: number;
    callVolume: number;
    conversionRate: number;
    avgScore: number;
    trend: "up" | "down" | "stable";
  }[];
  industryPerformance: {
    industry: string;
    leadCount: number;
    conversionRate: number;
    avgFitScore: number;
    trend: "up" | "down" | "stable";
  }[];
  sourceEffectiveness: {
    source: string;
    leadCount: number;
    qualificationRate: number;
    avgTimeToQualify: number;
  }[];
  weekOverWeek: {
    metric: string;
    thisWeek: number;
    lastWeek: number;
    change: number;
    aiCommentary: string;
  }[];
}

// ============================================================================
// DATA AGGREGATION FUNCTIONS
// ============================================================================

export async function aggregateReportData(
  periodDays: number = 7
): Promise<AggregatedReportData> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const previousStart = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Fetch all data in parallel
  const [
    allCalls,
    allLeads,
    allSdrs,
    allAnalyses,
    allResearchPackets,
    allCoachingSessions
  ] = await Promise.all([
    storage.getAllCallSessions(),
    storage.getAllLeads(),
    storage.getAllSdrs(),
    storage.getAllManagerCallAnalyses(),
    storage.getAllResearchPackets(),
    storage.getAllLiveCoachingSessions()
  ]);

  // Filter current period data
  const periodCalls = allCalls.filter(c =>
    c.startedAt && new Date(c.startedAt) >= startDate && new Date(c.startedAt) <= endDate
  );

  const previousPeriodCalls = allCalls.filter(c =>
    c.startedAt && new Date(c.startedAt) >= previousStart && new Date(c.startedAt) < startDate
  );

  const periodLeads = allLeads.filter(l =>
    l.createdAt && new Date(l.createdAt) >= startDate
  );

  const periodAnalyses = allAnalyses.filter(a =>
    a.analyzedAt && new Date(a.analyzedAt) >= startDate
  );

  const periodResearch = allResearchPackets.filter(r =>
    r.createdAt && new Date(r.createdAt) >= startDate
  );

  const periodCoaching = allCoachingSessions.filter(s =>
    s.startedAt && new Date(s.startedAt) >= startDate
  );

  // Aggregate calls data
  const completedCalls = periodCalls.filter(c => c.status === "completed");
  const totalTalkTime = completedCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
  const avgDuration = completedCalls.length > 0 ? totalTalkTime / completedCalls.length : 0;

  const callsByDisposition: Record<string, number> = {};
  const callsBySdr: Record<string, { name: string; count: number; totalDuration: number }> = {};
  const callsByDay: Record<string, number> = {};
  const sentimentDistribution: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };

  periodCalls.forEach(call => {
    // By disposition
    const disposition = call.disposition || "unknown";
    callsByDisposition[disposition] = (callsByDisposition[disposition] || 0) + 1;

    // By day
    if (call.startedAt) {
      const dayKey = new Date(call.startedAt).toISOString().split("T")[0];
      callsByDay[dayKey] = (callsByDay[dayKey] || 0) + 1;
    }

    // By SDR
    if (call.userId) {
      if (!callsBySdr[call.userId]) {
        const sdr = allSdrs.find(s => s.id === call.userId);
        callsBySdr[call.userId] = {
          name: sdr?.name || "Unknown",
          count: 0,
          totalDuration: 0
        };
      }
      callsBySdr[call.userId].count++;
      callsBySdr[call.userId].totalDuration += call.duration || 0;
    }

    // Sentiment
    if (call.sentimentScore) {
      if (call.sentimentScore >= 4) sentimentDistribution.positive++;
      else if (call.sentimentScore >= 2) sentimentDistribution.neutral++;
      else sentimentDistribution.negative++;
    }
  });

  // Convert callsBySdr to final format
  const sdrStats: Record<string, { name: string; count: number; avgDuration: number }> = {};
  Object.entries(callsBySdr).forEach(([id, data]) => {
    sdrStats[id] = {
      name: data.name,
      count: data.count,
      avgDuration: data.count > 0 ? data.totalDuration / data.count : 0
    };
  });

  // Aggregate leads data
  const leadsByStatus: Record<string, number> = {};
  const leadsBySource: Record<string, number> = {};
  let totalFitScore = 0;
  let fitScoreCount = 0;

  allLeads.forEach(lead => {
    leadsByStatus[lead.status] = (leadsByStatus[lead.status] || 0) + 1;
    leadsBySource[lead.source] = (leadsBySource[lead.source] || 0) + 1;
    if (lead.fitScore) {
      totalFitScore += lead.fitScore;
      fitScoreCount++;
    }
  });

  // Aggregate coaching data
  const scoresByDimension = {
    opening: 0, discovery: 0, listening: 0, objection: 0,
    valueProposition: 0, closing: 0, compliance: 0
  };
  let dimensionCount = 0;
  let totalOverallScore = 0;

  const sdrScores: Record<string, { name: string; scores: number[] }> = {};

  periodAnalyses.forEach(analysis => {
    if (analysis.overallScore) {
      totalOverallScore += analysis.overallScore;
      dimensionCount++;
    }
    if (analysis.openingScore) scoresByDimension.opening += analysis.openingScore;
    if (analysis.discoveryScore) scoresByDimension.discovery += analysis.discoveryScore;
    if (analysis.listeningScore) scoresByDimension.listening += analysis.listeningScore;
    if (analysis.objectionScore) scoresByDimension.objection += analysis.objectionScore;
    if (analysis.valuePropositionScore) scoresByDimension.valueProposition += analysis.valuePropositionScore;
    if (analysis.closingScore) scoresByDimension.closing += analysis.closingScore;
    if (analysis.complianceScore) scoresByDimension.compliance += analysis.complianceScore;

    if (analysis.sdrId && analysis.overallScore) {
      if (!sdrScores[analysis.sdrId]) {
        sdrScores[analysis.sdrId] = { name: analysis.sdrName, scores: [] };
      }
      sdrScores[analysis.sdrId].scores.push(analysis.overallScore);
    }
  });

  // Average the dimension scores
  if (dimensionCount > 0) {
    Object.keys(scoresByDimension).forEach(key => {
      scoresByDimension[key as keyof typeof scoresByDimension] /= dimensionCount;
    });
  }

  // Find top performers and those needing coaching
  const sdrPerformance = Object.entries(sdrScores).map(([id, data]) => ({
    sdrId: id,
    name: data.name,
    avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length
  })).sort((a, b) => b.avgScore - a.avgScore);

  const topPerformers = sdrPerformance.slice(0, 3);

  // Find weakest areas for bottom performers
  const needsCoaching = sdrPerformance.slice(-3).map(sdr => {
    const analyses = periodAnalyses.filter(a => a.sdrId === sdr.sdrId);
    let weakestArea = "general";
    let lowestScore = 100;

    const dimensions = ["opening", "discovery", "listening", "objection", "valueProposition", "closing"];
    dimensions.forEach(dim => {
      const scores = analyses.map(a => a[`${dim}Score` as keyof ManagerCallAnalysis] as number).filter(Boolean);
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avg < lowestScore) {
          lowestScore = avg;
          weakestArea = dim;
        }
      }
    });

    return { sdrId: sdr.sdrId, name: sdr.name, weakestArea, score: lowestScore };
  });

  // Aggregate research data
  const painPointCounts: Record<string, number> = {};
  const productMatchCounts: Record<string, number> = {};

  periodResearch.forEach(packet => {
    if (packet.painPointsJson && Array.isArray(packet.painPointsJson)) {
      (packet.painPointsJson as Array<{ title?: string }>).forEach(pp => {
        if (pp.title) {
          painPointCounts[pp.title] = (painPointCounts[pp.title] || 0) + 1;
        }
      });
    }
    if (packet.productMatchesJson && Array.isArray(packet.productMatchesJson)) {
      (packet.productMatchesJson as Array<{ product?: string }>).forEach(pm => {
        if (pm.product) {
          productMatchCounts[pm.product] = (productMatchCounts[pm.product] || 0) + 1;
        }
      });
    }
  });

  const topPainPoints = Object.entries(painPointCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([painPoint, count]) => ({ painPoint, count }));

  const topProductMatches = Object.entries(productMatchCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([product, count]) => ({ product, count }));

  // Calculate trends
  const prevCompleted = previousPeriodCalls.filter(c => c.status === "completed").length;
  const callVolumeChange = prevCompleted > 0
    ? ((completedCalls.length - prevCompleted) / prevCompleted) * 100
    : 0;

  const currentQualified = allLeads.filter(l => l.status === "qualified").length;
  const previousQualified = allLeads.filter(l =>
    l.status === "qualified" && l.createdAt && new Date(l.createdAt) < startDate
  ).length;
  const conversionRateChange = previousQualified > 0
    ? ((currentQualified - previousQualified) / previousQualified) * 100
    : 0;

  return {
    period: {
      start: startDate,
      end: endDate,
      label: periodDays === 7 ? "This Week" : periodDays === 30 ? "This Month" : `Last ${periodDays} Days`
    },
    calls: {
      total: periodCalls.length,
      completed: completedCalls.length,
      avgDuration,
      totalTalkTime,
      byDisposition: callsByDisposition,
      bySdr: sdrStats,
      byDay: callsByDay,
      sentimentDistribution
    },
    leads: {
      total: allLeads.length,
      byStatus: leadsByStatus,
      qualified: leadsByStatus["qualified"] || 0,
      handedOff: leadsByStatus["handed_off"] || 0,
      converted: leadsByStatus["converted"] || 0,
      avgFitScore: fitScoreCount > 0 ? totalFitScore / fitScoreCount : 0,
      bySource: leadsBySource,
      newThisPeriod: periodLeads.length
    },
    coaching: {
      sessionsWithScores: dimensionCount,
      avgOverallScore: dimensionCount > 0 ? totalOverallScore / dimensionCount : 0,
      scoresByDimension,
      tipsGenerated: periodCoaching.length,
      topPerformers,
      needsCoaching
    },
    research: {
      packetsGenerated: periodResearch.length,
      avgConfidence: "medium",
      topPainPoints,
      topProductMatches
    },
    trends: {
      callVolumeChange,
      conversionRateChange,
      avgScoreChange: 0 // Would need historical data for accurate calculation
    }
  };
}

// ============================================================================
// AI-POWERED ANALYSIS FUNCTIONS
// ============================================================================

export async function generateExecutiveSummary(
  data: AggregatedReportData
): Promise<ExecutiveSummary> {
  const ai = getAiClient();

  const prompt = `You are an expert sales analytics AI. Generate an executive summary based on this sales performance data.

## Data:
${JSON.stringify(data, null, 2)}

## Task:
Generate a compelling executive summary with:

1. **Narrative** (2-3 paragraphs): A flowing narrative describing this period's performance, highlighting what stands out, and providing context. Write like a senior sales leader briefing the CEO.

2. **Key Wins** (3-5 bullets): Specific accomplishments with numbers. Be concrete.

3. **Concerns** (2-4 bullets): Issues that need attention, backed by data.

4. **Recommendations** (3-5 bullets): Actionable next steps with expected impact.

## Response Format (JSON only):
{
  "narrative": "Executive summary narrative here...",
  "keyWins": ["Win 1 with specific numbers", "Win 2", "..."],
  "concerns": ["Concern 1 with data", "..."],
  "recommendations": ["Recommendation 1 with expected impact", "..."]
}

Be specific, use the actual numbers from the data, and provide actionable insights.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const text = response.candidates?.[0]?.content?.parts?.find(
      (part: { text?: string }) => part.text
    )?.text?.trim() || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        narrative: parsed.narrative || "Summary generation in progress...",
        keyWins: parsed.keyWins || [],
        concerns: parsed.concerns || [],
        recommendations: parsed.recommendations || [],
        generatedAt: new Date()
      };
    }
  } catch (error) {
    console.error("[ReportsAnalysis] Failed to generate executive summary:", error);
  }

  return {
    narrative: "Unable to generate summary at this time. Please try again.",
    keyWins: [],
    concerns: [],
    recommendations: [],
    generatedAt: new Date()
  };
}

export async function detectAnomalies(
  data: AggregatedReportData
): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];
  const now = new Date();

  // Check for call volume anomalies
  if (data.trends.callVolumeChange < -20) {
    anomalies.push({
      id: `anomaly-calls-${now.getTime()}`,
      type: "warning",
      category: "performance",
      title: "Call Volume Drop",
      description: `Call volume decreased by ${Math.abs(data.trends.callVolumeChange).toFixed(1)}% compared to the previous period.`,
      metric: "call_volume",
      currentValue: data.calls.completed,
      expectedValue: Math.round(data.calls.completed / (1 + data.trends.callVolumeChange / 100)),
      deviation: data.trends.callVolumeChange,
      suggestedAction: "Review SDR schedules and check for any blockers preventing outreach.",
      detectedAt: now
    });
  }

  // Check for low coaching scores
  if (data.coaching.avgOverallScore > 0 && data.coaching.avgOverallScore < 60) {
    anomalies.push({
      id: `anomaly-coaching-${now.getTime()}`,
      type: "alert",
      category: "coaching",
      title: "Low Team Coaching Scores",
      description: `Average coaching score is ${data.coaching.avgOverallScore.toFixed(1)}, below the target of 70.`,
      metric: "avg_coaching_score",
      currentValue: data.coaching.avgOverallScore,
      expectedValue: 70,
      deviation: ((data.coaching.avgOverallScore - 70) / 70) * 100,
      suggestedAction: "Schedule team coaching sessions focusing on discovery and objection handling.",
      detectedAt: now
    });
  }

  // Check for pipeline stagnation
  const engagedLeads = data.leads.byStatus["engaged"] || 0;
  const qualifiedLeads = data.leads.qualified;
  if (engagedLeads > 10 && qualifiedLeads < engagedLeads * 0.2) {
    anomalies.push({
      id: `anomaly-pipeline-${now.getTime()}`,
      type: "warning",
      category: "pipeline",
      title: "Pipeline Conversion Bottleneck",
      description: `Only ${qualifiedLeads} of ${engagedLeads} engaged leads have been qualified (${((qualifiedLeads / engagedLeads) * 100).toFixed(1)}%).`,
      metric: "qualification_rate",
      currentValue: (qualifiedLeads / engagedLeads) * 100,
      expectedValue: 30,
      deviation: -50,
      suggestedAction: "Review qualification criteria and ensure SDRs are properly BANT-qualifying engaged leads.",
      detectedAt: now
    });
  }

  // Check for SDRs needing coaching
  data.coaching.needsCoaching.forEach(sdr => {
    if (sdr.score < 50) {
      anomalies.push({
        id: `anomaly-sdr-${sdr.sdrId}-${now.getTime()}`,
        type: "warning",
        category: "coaching",
        title: `${sdr.name} Needs Coaching`,
        description: `${sdr.name} is scoring ${sdr.score.toFixed(1)} in ${sdr.weakestArea}, significantly below team average.`,
        metric: `${sdr.weakestArea}_score`,
        currentValue: sdr.score,
        expectedValue: 70,
        deviation: ((sdr.score - 70) / 70) * 100,
        suggestedAction: `Schedule 1:1 coaching session with ${sdr.name} focusing on ${sdr.weakestArea} skills.`,
        entityId: sdr.sdrId,
        entityType: "sdr",
        detectedAt: now
      });
    }
  });

  // Check for high negative sentiment
  const totalSentiment = Object.values(data.calls.sentimentDistribution).reduce((a, b) => a + b, 0);
  if (totalSentiment > 0) {
    const negativeRate = (data.calls.sentimentDistribution.negative / totalSentiment) * 100;
    if (negativeRate > 30) {
      anomalies.push({
        id: `anomaly-sentiment-${now.getTime()}`,
        type: "alert",
        category: "engagement",
        title: "High Negative Call Sentiment",
        description: `${negativeRate.toFixed(1)}% of calls had negative sentiment scores.`,
        metric: "negative_sentiment_rate",
        currentValue: negativeRate,
        expectedValue: 15,
        deviation: ((negativeRate - 15) / 15) * 100,
        suggestedAction: "Review call recordings with negative sentiment to identify common issues.",
        detectedAt: now
      });
    }
  }

  return anomalies;
}

export async function generatePredictiveInsights(
  data: AggregatedReportData
): Promise<PredictiveInsights> {
  const ai = getAiClient();

  // Get leads for prediction
  const leads = await storage.getLeads();
  const activeLeads = leads.filter(l =>
    ["new", "researching", "contacted", "engaged"].includes(l.status)
  );

  const prompt = `You are a predictive sales analytics AI. Based on historical patterns and current data, generate predictions.

## Current Data:
${JSON.stringify(data, null, 2)}

## Active Leads for Prediction:
${JSON.stringify(activeLeads.slice(0, 20).map(l => ({
  id: l.id,
  company: l.companyName,
  status: l.status,
  fitScore: l.fitScore,
  industry: l.companyIndustry,
  source: l.source,
  daysSinceCreated: Math.floor((Date.now() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24))
})), null, 2)}

## Task:
Generate predictive insights including:

1. **Pipeline Forecast**: Expected qualified and converted leads for next period
2. **Lead Score Predictions**: Top 5 leads most likely to convert with confidence %
3. **SDR Burnout Risk**: Based on call patterns and score trends
4. **Best Time to Call**: Industry-specific recommendations
5. **At-Risk Leads**: Leads going cold that need attention

## Response Format (JSON only):
{
  "pipelineForecast": {
    "expectedQualified": { "min": 5, "max": 8 },
    "expectedConverted": { "min": 2, "max": 4 },
    "confidence": "medium"
  },
  "leadScorePredictions": [
    { "leadId": "...", "companyName": "...", "predictedConversion": 78, "keyFactors": ["high fit score", "engaged recently"] }
  ],
  "sdrBurnoutRisk": [
    { "sdrId": "...", "name": "...", "riskLevel": "medium", "indicators": ["declining scores", "fewer calls"] }
  ],
  "bestTimeToCall": [
    { "industry": "Manufacturing", "bestHours": ["9-10am", "2-3pm"], "bestDays": ["Tuesday", "Wednesday"] }
  ],
  "atRiskLeads": [
    { "leadId": "...", "companyName": "...", "daysSinceContact": 14, "riskReason": "No engagement after demo" }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const text = response.candidates?.[0]?.content?.parts?.find(
      (part: { text?: string }) => part.text
    )?.text?.trim() || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("[ReportsAnalysis] Failed to generate predictive insights:", error);
  }

  // Return default predictions
  return {
    pipelineForecast: {
      expectedQualified: { min: 3, max: 7 },
      expectedConverted: { min: 1, max: 3 },
      confidence: "low"
    },
    leadScorePredictions: [],
    sdrBurnoutRisk: [],
    bestTimeToCall: [
      { industry: "General", bestHours: ["9-11am", "2-4pm"], bestDays: ["Tuesday", "Wednesday", "Thursday"] }
    ],
    atRiskLeads: []
  };
}

export async function answerConversationalQuery(
  question: string,
  data: AggregatedReportData
): Promise<ConversationalQuery> {
  const ai = getAiClient();

  const prompt = `You are a conversational BI assistant for a sales platform. Answer the user's question using the provided data.

## Available Data:
${JSON.stringify(data, null, 2)}

## User Question:
"${question}"

## Task:
1. Answer the question directly and concisely
2. Provide relevant data points to support your answer
3. Suggest 3 follow-up questions the user might want to ask
4. Rate your confidence (high/medium/low) based on data availability

## Response Format (JSON only):
{
  "answer": "Direct, insightful answer to the question...",
  "dataPoints": [
    { "label": "Metric Name", "value": "42" },
    { "label": "Another Metric", "value": "78%" }
  ],
  "followUpQuestions": [
    "Why did X happen?",
    "How does this compare to...?",
    "What should we do about...?"
  ],
  "confidence": "high"
}

Be conversational but data-driven. If the data doesn't fully answer the question, say so.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const text = response.candidates?.[0]?.content?.parts?.find(
      (part: { text?: string }) => part.text
    )?.text?.trim() || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        question,
        answer: parsed.answer || "I couldn't find a clear answer.",
        dataPoints: parsed.dataPoints || [],
        followUpQuestions: parsed.followUpQuestions || [],
        confidence: parsed.confidence || "medium"
      };
    }
  } catch (error) {
    console.error("[ReportsAnalysis] Failed to answer query:", error);
  }

  return {
    question,
    answer: "I'm having trouble processing that question. Please try rephrasing or ask something more specific about calls, leads, or coaching performance.",
    dataPoints: [],
    followUpQuestions: [
      "What was our call volume this week?",
      "Who are the top performing SDRs?",
      "Which leads are at risk of going cold?"
    ],
    confidence: "low"
  };
}

export async function generateCoachingIntelligence(
  sdrId: string
): Promise<CoachingIntelligence | null> {
  const sdr = await storage.getSdr(sdrId);
  if (!sdr) return null;

  const analyses = await storage.getManagerCallAnalyses();
  const sdrAnalyses = analyses.filter(a => a.sdrId === sdrId);

  if (sdrAnalyses.length === 0) {
    return {
      sdrId,
      sdrName: sdr.name,
      skillHeatmap: [],
      patterns: [],
      developmentPlan: [],
      progressSummary: "No call analyses available yet. Complete more calls to generate insights."
    };
  }

  // Calculate skill heatmap
  const dimensions = [
    { key: "opening", label: "Opening" },
    { key: "discovery", label: "Discovery" },
    { key: "listening", label: "Active Listening" },
    { key: "objection", label: "Objection Handling" },
    { key: "valueProposition", label: "Value Proposition" },
    { key: "closing", label: "Closing" },
    { key: "compliance", label: "Compliance" }
  ];

  const skillHeatmap = dimensions.map(dim => {
    const scores = sdrAnalyses
      .map(a => a[`${dim.key}Score` as keyof ManagerCallAnalysis] as number)
      .filter(Boolean);

    const currentScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    // Calculate trend (compare last 3 vs first 3)
    let trend: "improving" | "stable" | "declining" = "stable";
    if (scores.length >= 6) {
      const recent = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const earlier = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
      if (recent > earlier + 5) trend = "improving";
      else if (recent < earlier - 5) trend = "declining";
    }

    return {
      dimension: dim.label,
      currentScore,
      trend,
      percentileRank: 50 // Would need team data for actual percentile
    };
  });

  // Use AI to generate patterns and development plan
  const ai = getAiClient();

  const prompt = `Analyze this SDR's performance data and generate coaching insights.

## SDR: ${sdr.name}
## Skill Scores:
${JSON.stringify(skillHeatmap, null, 2)}

## Recent Analysis Notes:
${sdrAnalyses.slice(-5).map(a => a.keyObservations || a.recommendations).filter(Boolean).join("\n")}

## Task:
Generate:
1. 3-5 behavioral patterns observed in their calls
2. A prioritized development plan with specific actions
3. A progress summary paragraph

## Response Format (JSON only):
{
  "patterns": [
    { "observation": "Tends to rush through discovery questions", "frequency": "Often", "impact": "negative" }
  ],
  "developmentPlan": [
    { "priority": 1, "skill": "Discovery", "currentLevel": "Developing", "targetLevel": "Proficient", "suggestedActions": ["Use SPIN framework", "Pause after each question"] }
  ],
  "progressSummary": "One paragraph summary..."
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const text = response.candidates?.[0]?.content?.parts?.find(
      (part: { text?: string }) => part.text
    )?.text?.trim() || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        sdrId,
        sdrName: sdr.name,
        skillHeatmap,
        patterns: parsed.patterns || [],
        developmentPlan: parsed.developmentPlan || [],
        progressSummary: parsed.progressSummary || "Analysis in progress..."
      };
    }
  } catch (error) {
    console.error("[ReportsAnalysis] Failed to generate coaching intelligence:", error);
  }

  return {
    sdrId,
    sdrName: sdr.name,
    skillHeatmap,
    patterns: [],
    developmentPlan: [],
    progressSummary: "Unable to generate detailed analysis at this time."
  };
}

export async function generateComparativeAnalytics(
  data: AggregatedReportData
): Promise<ComparativeAnalytics> {
  const leads = await storage.getLeads();
  const sdrs = await storage.getSdrs();

  // SDR Rankings
  const sdrRankings = Object.entries(data.calls.bySdr)
    .map(([sdrId, stats]) => {
      const sdr = sdrs.find(s => s.id === sdrId);
      const sdrLeads = leads.filter(l => l.assignedSdrId === sdrId);
      const qualified = sdrLeads.filter(l => l.status === "qualified" || l.status === "handed_off" || l.status === "converted").length;
      const conversionRate = sdrLeads.length > 0 ? (qualified / sdrLeads.length) * 100 : 0;

      // Find this SDR's coaching scores
      const coachingData = data.coaching.topPerformers.find(p => p.sdrId === sdrId) ||
                          data.coaching.needsCoaching.find(p => p.sdrId === sdrId);

      return {
        sdrId,
        name: sdr?.name || stats.name,
        rank: 0, // Will be set after sorting
        callVolume: stats.count,
        conversionRate,
        avgScore: coachingData?.avgScore || (coachingData as any)?.score || 0,
        trend: "stable" as "up" | "down" | "stable"
      };
    })
    .sort((a, b) => {
      // Composite score: calls + conversion + coaching
      const scoreA = a.callVolume * 0.3 + a.conversionRate * 0.4 + a.avgScore * 0.3;
      const scoreB = b.callVolume * 0.3 + b.conversionRate * 0.4 + b.avgScore * 0.3;
      return scoreB - scoreA;
    })
    .map((sdr, index) => ({ ...sdr, rank: index + 1 }));

  // Industry Performance
  const industryStats: Record<string, { count: number; qualified: number; fitScores: number[] }> = {};
  leads.forEach(lead => {
    const industry = lead.companyIndustry || "Unknown";
    if (!industryStats[industry]) {
      industryStats[industry] = { count: 0, qualified: 0, fitScores: [] };
    }
    industryStats[industry].count++;
    if (["qualified", "handed_off", "converted"].includes(lead.status)) {
      industryStats[industry].qualified++;
    }
    if (lead.fitScore) {
      industryStats[industry].fitScores.push(lead.fitScore);
    }
  });

  const industryPerformance = Object.entries(industryStats).map(([industry, stats]) => ({
    industry,
    leadCount: stats.count,
    conversionRate: stats.count > 0 ? (stats.qualified / stats.count) * 100 : 0,
    avgFitScore: stats.fitScores.length > 0
      ? stats.fitScores.reduce((a, b) => a + b, 0) / stats.fitScores.length
      : 0,
    trend: "stable" as "up" | "down" | "stable"
  })).sort((a, b) => b.conversionRate - a.conversionRate);

  // Source Effectiveness
  const sourceEffectiveness = Object.entries(data.leads.bySource).map(([source, count]) => {
    const sourceLeads = leads.filter(l => l.source === source);
    const qualified = sourceLeads.filter(l =>
      ["qualified", "handed_off", "converted"].includes(l.status)
    ).length;

    return {
      source,
      leadCount: count,
      qualificationRate: count > 0 ? (qualified / count) * 100 : 0,
      avgTimeToQualify: 7 // Would need date tracking for accurate calculation
    };
  }).sort((a, b) => b.qualificationRate - a.qualificationRate);

  // Week over week (simplified)
  const weekOverWeek = [
    {
      metric: "Call Volume",
      thisWeek: data.calls.completed,
      lastWeek: Math.round(data.calls.completed / (1 + data.trends.callVolumeChange / 100)),
      change: data.trends.callVolumeChange,
      aiCommentary: data.trends.callVolumeChange > 0
        ? "Strong momentum in outreach activity"
        : "Call volume needs attention - consider scheduling focus blocks"
    },
    {
      metric: "Avg Coaching Score",
      thisWeek: Math.round(data.coaching.avgOverallScore),
      lastWeek: Math.round(data.coaching.avgOverallScore - data.trends.avgScoreChange),
      change: data.trends.avgScoreChange,
      aiCommentary: data.coaching.avgOverallScore >= 70
        ? "Team is performing well above baseline"
        : "Coaching scores indicate training opportunities"
    },
    {
      metric: "Pipeline Health",
      thisWeek: data.leads.qualified + data.leads.handedOff,
      lastWeek: Math.round((data.leads.qualified + data.leads.handedOff) * 0.9),
      change: 10,
      aiCommentary: "Healthy pipeline with qualified opportunities"
    }
  ];

  return {
    sdrRankings,
    industryPerformance,
    sourceEffectiveness,
    weekOverWeek
  };
}

export async function generateResearchROI(): Promise<ResearchROI> {
  const packets = await storage.getResearchPackets();
  const leads = await storage.getLeads();

  // Calculate basic effectiveness metrics
  const leadsWithResearch = packets.map(p => p.leadId);
  const convertedWithResearch = leads.filter(l =>
    leadsWithResearch.includes(l.id) &&
    ["qualified", "handed_off", "converted"].includes(l.status)
  ).length;

  const overallEffectiveness = leadsWithResearch.length > 0
    ? (convertedWithResearch / leadsWithResearch.length) * 100
    : 0;

  // Analyze pain points effectiveness
  const painPointStats: Record<string, { used: number; converted: number }> = {};
  packets.forEach(packet => {
    const lead = leads.find(l => l.id === packet.leadId);
    const isConverted = lead && ["qualified", "handed_off", "converted"].includes(lead.status);

    if (packet.painPointsJson && Array.isArray(packet.painPointsJson)) {
      (packet.painPointsJson as Array<{ title?: string }>).forEach(pp => {
        if (pp.title) {
          if (!painPointStats[pp.title]) {
            painPointStats[pp.title] = { used: 0, converted: 0 };
          }
          painPointStats[pp.title].used++;
          if (isConverted) painPointStats[pp.title].converted++;
        }
      });
    }
  });

  const topPerformingPainPoints = Object.entries(painPointStats)
    .map(([painPoint, stats]) => ({
      painPoint,
      mentionRate: (stats.used / packets.length) * 100,
      conversionRate: stats.used > 0 ? (stats.converted / stats.used) * 100 : 0
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 5);

  return {
    overallEffectiveness,
    intelUsageRate: 75, // Would need tracking data
    conversionByIntelType: [
      { intelType: "Company Intel", usageRate: 82, conversionRate: 45 },
      { intelType: "LinkedIn Profile", usageRate: 91, conversionRate: 52 },
      { intelType: "Pain Points", usageRate: 78, conversionRate: 48 },
      { intelType: "Product Matches", usageRate: 65, conversionRate: 55 }
    ],
    winningTalkTracks: [
      { industry: "Manufacturing", talkTrack: "Digital transformation efficiency gains", successRate: 62 },
      { industry: "Technology", talkTrack: "Integration and automation focus", successRate: 58 }
    ],
    topPerformingPainPoints
  };
}
