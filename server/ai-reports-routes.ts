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
    res.status(500).json({ error: 'Failed to generate research ROI' });
  }
});

/**
 * GET /api/ai-reports/dashboard
 * Get all dashboard data in one call (for initial page load)
 */
router.get('/dashboard', requireAuth, async (req: Request, res: Response) => {
  try {
    const periodDays = parseInt(req.query.period as string) || 7;
    const data = await getAggregatedData(periodDays);

    // Fetch all components in parallel for faster loading
    const [summary, anomalies, predictions, comparative] = await Promise.all([
      generateExecutiveSummary(data),
      detectAnomalies(data),
      generatePredictiveInsights(data),
      generateComparativeAnalytics(data)
    ]);

    res.json({
      data,
      summary,
      anomalies,
      predictions,
      comparative,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('[AI Reports] Error loading dashboard:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

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
