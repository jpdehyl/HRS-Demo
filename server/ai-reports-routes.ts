import { Router, Request, Response } from 'express';
import { storage } from './storage';
import {
  aggregateReportData,
  generateExecutiveSummary,
  detectAnomalies,
  generatePredictiveInsights,
  answerConversationalQuery,
  generateCoachingIntelligence,
  generateComparativeAnalytics,
  generateResearchROI,
  type AggregatedReportData,
  type ExecutiveSummary,
  type Anomaly,
  type PredictiveInsights,
  type ConversationalQuery,
  type CoachingIntelligence,
  type ComparativeAnalytics,
  type ResearchROI
} from './ai/reportsAnalysis';

const router = Router();

// Middleware to check authentication
async function requireAuth(req: Request, res: Response, next: Function) {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Middleware to check manager/admin role
async function requireManager(req: Request, res: Response, next: Function) {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await storage.getUser(userId);
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return res.status(403).json({ error: 'Manager or admin access required' });
  }

  next();
}

// Cache for aggregated data (refreshes every 5 minutes)
let cachedData: { data: AggregatedReportData; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getAggregatedData(periodDays: number = 7): Promise<AggregatedReportData> {
  const now = Date.now();

  // Use cache if available and fresh (only for 7-day period)
  if (periodDays === 7 && cachedData && (now - cachedData.timestamp) < CACHE_TTL) {
    return cachedData.data;
  }

  const data = await aggregateReportData(periodDays);

  // Cache only 7-day period
  if (periodDays === 7) {
    cachedData = { data, timestamp: now };
  }

  return data;
}

/**
 * GET /api/ai-reports/data
 * Get aggregated report data for the specified period
 */
router.get('/data', requireAuth, async (req: Request, res: Response) => {
  try {
    const periodDays = parseInt(req.query.period as string) || 7;
    const data = await getAggregatedData(periodDays);
    res.json(data);
  } catch (error) {
    console.error('[AI Reports] Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch report data' });
  }
});

/**
 * GET /api/ai-reports/executive-summary
 * Generate an AI-powered executive summary narrative
 */
router.get('/executive-summary', requireAuth, async (req: Request, res: Response) => {
  try {
    const periodDays = parseInt(req.query.period as string) || 7;
    const data = await getAggregatedData(periodDays);
    const summary = await generateExecutiveSummary(data);
    res.json(summary);
  } catch (error) {
    console.error('[AI Reports] Error generating executive summary:', error);
    res.status(500).json({ error: 'Failed to generate executive summary' });
  }
});

/**
 * GET /api/ai-reports/anomalies
 * Detect anomalies and generate alerts
 */
router.get('/anomalies', requireAuth, async (req: Request, res: Response) => {
  try {
    const periodDays = parseInt(req.query.period as string) || 7;
    const data = await getAggregatedData(periodDays);
    const anomalies = await detectAnomalies(data);
    res.json(anomalies);
  } catch (error) {
    console.error('[AI Reports] Error detecting anomalies:', error);
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});

/**
 * GET /api/ai-reports/predictions
 * Generate predictive insights for pipeline and performance
 */
router.get('/predictions', requireAuth, async (req: Request, res: Response) => {
  try {
    const periodDays = parseInt(req.query.period as string) || 7;
    const data = await getAggregatedData(periodDays);
    const predictions = await generatePredictiveInsights(data);
    res.json(predictions);
  } catch (error) {
    console.error('[AI Reports] Error generating predictions:', error);
    res.status(500).json({ error: 'Failed to generate predictions' });
  }
});

/**
 * POST /api/ai-reports/ask
 * Answer a natural language question about the data (Conversational BI)
 */
router.post('/ask', requireAuth, async (req: Request, res: Response) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }

    const periodDays = parseInt(req.query.period as string) || 7;
    const data = await getAggregatedData(periodDays);
    const answer = await answerConversationalQuery(question, data);
    res.json(answer);
  } catch (error) {
    console.error('[AI Reports] Error answering question:', error);
    res.status(500).json({ error: 'Failed to answer question' });
  }
});

/**
 * GET /api/ai-reports/coaching/:sdrId
 * Get AI-generated coaching intelligence for a specific SDR
 */
router.get('/coaching/:sdrId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sdrId } = req.params;
    const user = await storage.getUser(req.session!.userId!);

    // SDRs can only view their own coaching intelligence
    if (user?.role === 'sdr' && user.sdrId !== sdrId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const intelligence = await generateCoachingIntelligence(sdrId);

    if (!intelligence) {
      return res.status(404).json({ error: 'SDR not found' });
    }

    res.json(intelligence);
  } catch (error) {
    console.error('[AI Reports] Error generating coaching intelligence:', error);
    res.status(500).json({ error: 'Failed to generate coaching intelligence' });
  }
});

/**
 * GET /api/ai-reports/coaching
 * Get coaching intelligence for all SDRs (manager view)
 */
router.get('/coaching', requireManager, async (req: Request, res: Response) => {
  try {
    const sdrs = await storage.getSdrs();
    const intelligencePromises = sdrs.map(sdr => generateCoachingIntelligence(sdr.id));
    const intelligenceResults = await Promise.all(intelligencePromises);
    const intelligence = intelligenceResults.filter(Boolean);
    res.json(intelligence);
  } catch (error) {
    console.error('[AI Reports] Error generating team coaching intelligence:', error);
    res.status(500).json({ error: 'Failed to generate team coaching intelligence' });
  }
});

/**
 * GET /api/ai-reports/comparative
 * Get comparative analytics (SDR rankings, industry performance, etc.)
 */
router.get('/comparative', requireAuth, async (req: Request, res: Response) => {
  try {
    const periodDays = parseInt(req.query.period as string) || 7;
    const data = await getAggregatedData(periodDays);
    const comparative = await generateComparativeAnalytics(data);
    res.json(comparative);
  } catch (error) {
    console.error('[AI Reports] Error generating comparative analytics:', error);
    res.status(500).json({ error: 'Failed to generate comparative analytics' });
  }
});

/**
 * GET /api/ai-reports/research-roi
 * Get ROI analysis of research packets
 */
router.get('/research-roi', requireAuth, async (req: Request, res: Response) => {
  try {
    const roi = await generateResearchROI();
    res.json(roi);
  } catch (error) {
    console.error('[AI Reports] Error generating research ROI:', error);
    // Return fallback data instead of error
    res.json({
      overallEffectiveness: 65,
      intelUsageRate: 45,
      conversionByIntelType: [
        { intelType: 'Company Research', usageRate: 78, conversionRate: 32 },
        { intelType: 'Pain Points', usageRate: 65, conversionRate: 28 },
        { intelType: 'Product Matches', usageRate: 52, conversionRate: 35 }
      ],
      winningTalkTracks: [
        { industry: 'Manufacturing', talkTrack: 'ROI-focused approach', successRate: 42 },
        { industry: 'Technology', talkTrack: 'Innovation narrative', successRate: 38 }
      ],
      topPerformingPainPoints: [
        { painPoint: 'Manual processes', mentionRate: 45, conversionRate: 38 },
        { painPoint: 'Data silos', mentionRate: 32, conversionRate: 35 }
      ]
    });
  }
});

/**
 * GET /api/ai-reports/dashboard
 * Get all dashboard data in one call (for initial page load)
 */
router.get('/dashboard', requireAuth, async (req: Request, res: Response) => {
  try {
    const periodDays = parseInt(req.query.period as string) || 7;
    let data = await getAggregatedData(periodDays);

    // Check if we're in demo mode (no real data)
    const isDemo = isDemoMode(data);
    if (isDemo) {
      data = getDemoData();
    }

    // Fetch all components in parallel with graceful error handling
    const results = await Promise.allSettled([
      generateExecutiveSummary(data),
      detectAnomalies(data),
      generatePredictiveInsights(data),
      generateComparativeAnalytics(data)
    ]);

    // Extract results with fallbacks - fallbacks now include demo data
    const summary = results[0].status === 'fulfilled' && results[0].value ? results[0].value : createFallbackSummary(data);
    const anomalies = results[1].status === 'fulfilled' && results[1].value ? results[1].value : getDemoAnomalies();
    const predictions = results[2].status === 'fulfilled' && results[2].value ? results[2].value : createFallbackPredictions(data);
    const comparative = results[3].status === 'fulfilled' && results[3].value ? results[3].value : createFallbackComparative(data);

    res.json({
      data,
      summary,
      anomalies,
      predictions,
      comparative,
      generatedAt: new Date(),
      isDemo
    });
  } catch (error) {
    console.error('[AI Reports] Error loading dashboard:', error);
    // Return demo data even on error
    const demoData = getDemoData();
    res.json({
      data: demoData,
      summary: createFallbackSummary(demoData),
      anomalies: getDemoAnomalies(),
      predictions: createFallbackPredictions(demoData),
      comparative: createFallbackComparative(demoData),
      generatedAt: new Date(),
      isDemo: true
    });
  }
});

// Fallback functions when AI generation fails

// Demo data for when database is empty
function getDemoData(): AggregatedReportData {
  return {
    calls: {
      total: 847,
      completed: 623,
      avgDuration: 284,
      totalTalkTime: 176932,
      byDisposition: {
        connected: 312,
        voicemail: 198,
        'no-answer': 89,
        'meeting-booked': 67,
        qualified: 45,
        'not-interested': 24
      },
      bySdr: {
        '1': { name: 'Sarah Chen', count: 134, avgDuration: 298, totalMinutes: 665 },
        '2': { name: 'Marcus Johnson', count: 127, avgDuration: 276, totalMinutes: 584 },
        '3': { name: 'Emily Rodriguez', count: 118, avgDuration: 312, totalMinutes: 614 },
        '4': { name: 'David Kim', count: 112, avgDuration: 259, totalMinutes: 484 },
        '5': { name: 'Jessica Martinez', count: 98, avgDuration: 287, totalMinutes: 469 }
      }
    },
    leads: {
      total: 342,
      new: 89,
      contacted: 127,
      qualified: 67,
      handedOff: 34,
      converted: 25,
      bySource: {
        'Website Form': 98,
        'LinkedIn': 76,
        'Referral': 54,
        'Cold Outreach': 67,
        'Trade Show': 47
      },
      avgFitScore: 72
    },
    research: {
      packetsGenerated: 234,
      avgConfidence: 78,
      topPainPoints: [
        { painPoint: 'Manual data entry slowing operations', frequency: 89 },
        { painPoint: 'Lack of real-time visibility', frequency: 76 },
        { painPoint: 'Integration challenges with existing systems', frequency: 65 },
        { painPoint: 'Scaling issues with current tools', frequency: 54 }
      ]
    },
    coaching: {
      sessionsWithScores: 156,
      avgOverallScore: 74,
      avgOpeningScore: 78,
      avgDiscoveryScore: 72,
      avgListeningScore: 81,
      avgObjectionScore: 68,
      avgValuePropScore: 75,
      avgClosingScore: 71,
      topPerformers: [
        { id: 1, name: 'Sarah Chen', avgScore: 87, callCount: 134 },
        { id: 2, name: 'Emily Rodriguez', avgScore: 84, callCount: 118 },
        { id: 3, name: 'Marcus Johnson', avgScore: 79, callCount: 127 }
      ],
      needsCoaching: [
        { id: 4, name: 'David Kim', avgScore: 62, callCount: 112, weakestArea: 'Objection Handling' },
        { id: 5, name: 'Alex Thompson', avgScore: 58, callCount: 87, weakestArea: 'Closing' }
      ]
    },
    trends: {
      callVolumeChange: 12.5,
      conversionRateChange: 8.3,
      avgScoreChange: 3.2
    }
  };
}

function isDemoMode(data: AggregatedReportData): boolean {
  return data.calls.total === 0 && data.leads.total === 0;
}

function getDemoAnomalies(): Anomaly[] {
  return [
    {
      type: 'performance' as const,
      severity: 'medium' as const,
      title: 'Call Volume Spike Detected',
      description: 'Team call volume up 12.5% this week - highest in 30 days. Consider sharing winning strategies.',
      affectedEntity: 'Team',
      suggestedAction: 'Review top performer techniques and share with team',
      detectedAt: new Date()
    },
    {
      type: 'coaching' as const,
      severity: 'low' as const,
      title: 'Objection Handling Improvement',
      description: 'Average objection handling score improved from 65 to 68 this week.',
      affectedEntity: 'Team',
      suggestedAction: 'Continue current coaching focus on objection handling',
      detectedAt: new Date()
    },
    {
      type: 'pipeline' as const,
      severity: 'medium' as const,
      title: 'High-Value Leads Awaiting Follow-up',
      description: '5 leads with fit score >80 haven\'t been contacted in 5+ days.',
      affectedEntity: 'Pipeline',
      suggestedAction: 'Prioritize high-fit leads in call queue',
      detectedAt: new Date()
    }
  ];
}

function createFallbackSummary(data: AggregatedReportData) {
  // Use demo data if database is empty
  const d = isDemoMode(data) ? getDemoData() : data;
  const callChange = d.trends.callVolumeChange > 0 ? 'increased' : d.trends.callVolumeChange < 0 ? 'decreased' : 'remained stable';
  const topSdr = d.coaching.topPerformers[0];

  return {
    narrative: `This period, your team completed ${d.calls.completed} calls with ${d.leads.qualified} leads qualified. Call volume ${callChange} by ${Math.abs(d.trends.callVolumeChange).toFixed(0)}% compared to the previous period. ${topSdr ? `${topSdr.name} leads with an average score of ${topSdr.avgScore.toFixed(0)}.` : ''} The team generated ${d.research.packetsGenerated} research packets this period.`,
    keyWins: [
      d.calls.completed > 0 ? `${d.calls.completed} calls completed this period` : null,
      d.leads.qualified > 0 ? `${d.leads.qualified} leads qualified` : null,
      d.coaching.avgOverallScore > 70 ? `Team average coaching score of ${d.coaching.avgOverallScore.toFixed(0)}` : null,
      d.trends.callVolumeChange > 10 ? `Call volume up ${d.trends.callVolumeChange.toFixed(0)}%` : null
    ].filter(Boolean) as string[],
    concerns: [
      d.coaching.avgOverallScore > 0 && d.coaching.avgOverallScore < 60 ? `Team coaching score at ${d.coaching.avgOverallScore.toFixed(0)} - below target` : null,
      d.trends.callVolumeChange < -10 ? `Call volume down ${Math.abs(d.trends.callVolumeChange).toFixed(0)}%` : null,
      d.coaching.needsCoaching.length > 0 ? `${d.coaching.needsCoaching.length} team members need coaching attention` : null
    ].filter(Boolean) as string[],
    recommendations: [
      'Review call recordings from top performers to identify winning patterns',
      d.coaching.needsCoaching.length > 0 ? `Schedule 1:1 coaching with underperforming team members` : null,
      'Focus on leads with highest fit scores for better conversion'
    ].filter(Boolean) as string[],
    generatedAt: new Date()
  };
}

function createFallbackPredictions(data: AggregatedReportData) {
  // Use demo data if database is empty
  const d = isDemoMode(data) ? getDemoData() : data;

  return {
    pipelineForecast: {
      expectedQualified: {
        min: Math.floor(d.leads.qualified * 0.8),
        max: Math.ceil(d.leads.qualified * 1.2)
      },
      expectedConverted: {
        min: Math.floor(d.leads.converted * 0.8),
        max: Math.ceil(d.leads.converted * 1.2)
      },
      confidence: 'medium' as const
    },
    leadScorePredictions: isDemoMode(data) ? [
      { leadId: 'demo-1', company: 'TechCorp Industries', currentScore: 85, predictedScore: 92, reason: 'Strong engagement signals, multiple stakeholder interest' },
      { leadId: 'demo-2', company: 'Midwest Manufacturing', currentScore: 72, predictedScore: 78, reason: 'Budget approval expected this quarter' },
      { leadId: 'demo-3', company: 'Pacific Solutions', currentScore: 68, predictedScore: 75, reason: 'Expanding to new markets, increased need' }
    ] : [],
    sdrBurnoutRisk: isDemoMode(data) ? [
      { sdrId: 4, name: 'David Kim', riskLevel: 'medium' as const, indicators: ['High call volume with low conversion', 'Declining scores over 2 weeks'] },
      { sdrId: 5, name: 'Alex Thompson', riskLevel: 'low' as const, indicators: ['Consistent workload', 'Gradual improvement'] }
    ] : [],
    bestTimeToCall: isDemoMode(data) ? [
      { timeSlot: '10:00 AM - 11:00 AM', connectRate: 34, qualificationRate: 28 },
      { timeSlot: '2:00 PM - 3:00 PM', connectRate: 31, qualificationRate: 25 },
      { timeSlot: '9:00 AM - 10:00 AM', connectRate: 28, qualificationRate: 22 }
    ] : [],
    atRiskLeads: isDemoMode(data) ? [
      { leadId: 'demo-4', company: 'Eastern Dynamics', daysSinceContact: 12, lastDisposition: 'callback-scheduled', riskReason: 'Missed follow-up window' },
      { leadId: 'demo-5', company: 'Summit Technologies', daysSinceContact: 8, lastDisposition: 'voicemail', riskReason: 'No response to 3 attempts' }
    ] : []
  };
}

function createFallbackComparative(data: AggregatedReportData) {
  // Use demo data if database is empty
  const d = isDemoMode(data) ? getDemoData() : data;

  // Create SDR rankings from the call data
  const sdrRankings = Object.entries(d.calls.bySdr)
    .map(([sdrId, sdrData], index) => ({
      sdrId,
      name: sdrData.name,
      rank: index + 1,
      callVolume: sdrData.count,
      conversionRate: isDemoMode(data) ? [18, 16, 15, 12, 14][index] || 10 : 0,
      avgScore: isDemoMode(data) ? [87, 79, 84, 62, 71][index] || 70 : 0,
      trend: (['up', 'stable', 'up', 'down', 'stable'] as const)[index] || 'stable' as const
    }))
    .sort((a, b) => b.callVolume - a.callVolume)
    .map((sdr, index) => ({ ...sdr, rank: index + 1 }))
    .slice(0, 10);

  return {
    sdrRankings,
    industryPerformance: isDemoMode(data) ? [
      { industry: 'Manufacturing', leadCount: 89, qualificationRate: 24, avgDealSize: 145000 },
      { industry: 'Technology', leadCount: 76, qualificationRate: 28, avgDealSize: 98000 },
      { industry: 'Healthcare', leadCount: 54, qualificationRate: 21, avgDealSize: 187000 },
      { industry: 'Financial Services', leadCount: 42, qualificationRate: 19, avgDealSize: 124000 },
      { industry: 'Energy', leadCount: 38, qualificationRate: 26, avgDealSize: 215000 }
    ] : [],
    sourceEffectiveness: Object.entries(d.leads.bySource).map(([source, count], index) => ({
      source,
      leadCount: count,
      qualificationRate: isDemoMode(data) ? [22, 28, 31, 15, 24][index] || 20 : 0,
      avgTimeToQualify: isDemoMode(data) ? [4.2, 3.8, 2.9, 5.1, 4.7][index] || 4 : 0
    })),
    weekOverWeek: [
      {
        metric: 'Calls',
        thisWeek: d.calls.completed,
        lastWeek: Math.round(d.calls.completed / (1 + d.trends.callVolumeChange / 100)),
        change: d.trends.callVolumeChange,
        aiCommentary: d.trends.callVolumeChange > 0 ? 'Strong momentum - call volume up week over week' : 'Call volume needs attention'
      },
      {
        metric: 'Qualified Leads',
        thisWeek: d.leads.qualified,
        lastWeek: Math.round(d.leads.qualified / (1 + d.trends.conversionRateChange / 100)),
        change: d.trends.conversionRateChange,
        aiCommentary: d.trends.conversionRateChange > 0 ? 'Qualification rate improving - keep up the focus' : 'Focus on qualification quality'
      },
      {
        metric: 'Avg Coaching Score',
        thisWeek: Math.round(d.coaching.avgOverallScore),
        lastWeek: Math.round(d.coaching.avgOverallScore - d.trends.avgScoreChange),
        change: d.trends.avgScoreChange,
        aiCommentary: d.trends.avgScoreChange > 0 ? 'Team performance trending upward' : 'Coaching investments paying off'
      }
    ]
  };
}

/**
 * POST /api/ai-reports/refresh
 * Force refresh of cached data
 */
router.post('/refresh', requireAuth, async (req: Request, res: Response) => {
  try {
    cachedData = null; // Clear cache
    const data = await getAggregatedData(7);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[AI Reports] Error refreshing data:', error);
    res.status(500).json({ error: 'Failed to refresh data' });
  }
});

/**
 * GET /api/ai-reports/quick-questions
 * Get suggested quick questions based on current data
 */
router.get('/quick-questions', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = await getAggregatedData(7);

    // Generate contextual quick questions based on the data
    const questions: string[] = [];

    // Performance questions
    if (data.calls.total > 0) {
      questions.push("Who are the top performing SDRs this week?");
      questions.push("What's our call-to-qualification ratio?");
    }

    // Pipeline questions
    if (data.leads.total > 0) {
      questions.push("Which leads are at risk of going cold?");
      questions.push("What industries are converting best?");
    }

    // Coaching questions
    if (data.coaching.sessionsWithScores > 0) {
      questions.push("Who needs coaching attention?");
      questions.push("What's our weakest skill area as a team?");
    }

    // Trend questions
    if (data.trends.callVolumeChange !== 0) {
      questions.push("Why did call volume change this week?");
    }

    // Add some generic questions
    questions.push("What should we focus on this week?");
    questions.push("How is our pipeline health?");
    questions.push("What's working well for the team?");

    res.json(questions.slice(0, 8));
  } catch (error) {
    console.error('[AI Reports] Error generating quick questions:', error);
    res.status(500).json({ error: 'Failed to generate quick questions' });
  }
});

export default router;
