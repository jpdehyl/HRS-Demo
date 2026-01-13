/**
 * Baseline Metrics API Routes
 *
 * Endpoints for capturing, viewing, and comparing baseline metrics
 * aligned with Hawk Ridge proposal success criteria.
 */

import { Router, Request, Response } from 'express';
import {
  calculateBaselineMetrics,
  captureBaselineSnapshot,
  compareSnapshots,
  getAllSnapshots
} from './ai/baselineMetrics.js';
import { requireAuth, requireRole } from './routes.js';

const router = Router();

/**
 * GET /api/baseline/calculate
 * Calculate current metrics without saving (preview)
 *
 * Query params:
 * - periodStart: ISO date string (required)
 * - periodEnd: ISO date string (required)
 */
router.get('/calculate', requireAuth, requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { periodStart, periodEnd } = req.query;

    if (!periodStart || !periodEnd) {
      return res.status(400).json({
        message: 'Missing required parameters: periodStart and periodEnd'
      });
    }

    const start = new Date(periodStart as string);
    const end = new Date(periodEnd as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const metrics = await calculateBaselineMetrics(start, end);
    res.json(metrics);
  } catch (error) {
    console.error('Error calculating baseline metrics:', error);
    res.status(500).json({ message: 'Failed to calculate baseline metrics' });
  }
});

/**
 * POST /api/baseline/capture
 * Capture and save a baseline snapshot
 *
 * Body:
 * - snapshotType: 'baseline' | 'phase1_launch' | 'phase1_30day' | 'phase2_launch' | custom
 * - snapshotLabel: Human-readable description
 * - periodStart: ISO date string
 * - periodEnd: ISO date string
 * - notes: Optional notes
 */
router.post('/capture', requireAuth, requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { snapshotType, snapshotLabel, periodStart, periodEnd, notes } = req.body;

    if (!snapshotType || !snapshotLabel || !periodStart || !periodEnd) {
      return res.status(400).json({
        message: 'Missing required fields: snapshotType, snapshotLabel, periodStart, periodEnd'
      });
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const userId = (req as any).session?.userId;

    const metrics = await captureBaselineSnapshot(
      snapshotType,
      snapshotLabel,
      start,
      end,
      userId,
      notes
    );

    res.json({
      message: 'Baseline snapshot captured successfully',
      metrics
    });
  } catch (error) {
    console.error('Error capturing baseline snapshot:', error);
    res.status(500).json({ message: 'Failed to capture baseline snapshot' });
  }
});

/**
 * GET /api/baseline/snapshots
 * Get all saved baseline snapshots
 */
router.get('/snapshots', requireAuth, requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const snapshots = await getAllSnapshots();
    res.json(snapshots);
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    res.status(500).json({ message: 'Failed to fetch snapshots' });
  }
});

/**
 * GET /api/baseline/compare
 * Compare two snapshots and calculate improvements
 *
 * Query params:
 * - baseline: Snapshot type to use as baseline (e.g., 'baseline')
 * - comparison: Snapshot type to compare (e.g., 'phase1_30day')
 */
router.get('/compare', requireAuth, requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { baseline, comparison } = req.query;

    if (!baseline || !comparison) {
      return res.status(400).json({
        message: 'Missing required parameters: baseline and comparison'
      });
    }

    const result = await compareSnapshots(
      baseline as string,
      comparison as string
    );

    if (!result) {
      return res.status(404).json({
        message: 'One or both snapshots not found'
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error comparing snapshots:', error);
    res.status(500).json({ message: 'Failed to compare snapshots' });
  }
});

/**
 * GET /api/baseline/proposal-targets
 * Get the proposal success metrics targets for reference
 */
router.get('/proposal-targets', requireAuth, async (req: Request, res: Response) => {
  // These are the success metrics from the Hawk Ridge proposal
  const targets = {
    phase1: {
      timeEfficiency: {
        target: '60-70% reduction',
        metric: 'Lead processing time (intake → AE handoff)',
        measurement: 'avgTimeToHandoff comparison',
        unit: 'percentage_reduction'
      },
      leadQuality: {
        target: '85%+',
        metric: 'Qualified lead accuracy through AI research and scoring',
        measurement: 'qualifiedLeadAccuracy',
        unit: 'percentage'
      },
      volumeCapacity: {
        target: '150%',
        metric: 'Enable team to handle 150% of current lead volume without additional headcount',
        measurement: 'leadsPerSdrPerDay comparison',
        unit: 'percentage_of_baseline'
      },
      aeReadiness: {
        target: '50% reduction',
        metric: 'AE prep time per lead',
        measurement: 'EXTERNAL_SURVEY_REQUIRED',
        unit: 'percentage_reduction',
        note: 'Requires manual time tracking or AE survey'
      },
      adoption: {
        target: '80%+',
        metric: 'Daily active usage within 30 days of launch',
        measurement: 'dailyActiveUsers / totalUsers',
        unit: 'percentage'
      }
    },
    phase2: {
      conversion: {
        target: '15-25% improvement',
        metric: 'Lead-to-opportunity conversion',
        measurement: 'overallConversionRate comparison',
        unit: 'percentage_point_increase'
      },
      dealVelocity: {
        target: '20% reduction',
        metric: 'Average sales cycle length',
        measurement: 'avgSalesCycleDays comparison',
        unit: 'percentage_reduction'
      },
      coachingImpact: {
        target: '30% improvement',
        metric: 'Call effectiveness metrics',
        measurement: 'avgCallScore comparison',
        unit: 'percentage_improvement'
      },
      revenueImpact: {
        target: 'Attributable incremental pipeline generation',
        metric: 'Pipeline value',
        measurement: 'totalPipelineValue comparison',
        unit: 'dollar_increase'
      },
      userSatisfaction: {
        target: 'NPS score of 50+',
        metric: 'Net Promoter Score',
        measurement: 'EXTERNAL_SURVEY_REQUIRED',
        unit: 'nps_score',
        note: 'Requires NPS survey implementation'
      }
    }
  };

  res.json(targets);
});

/**
 * GET /api/baseline/status
 * Get current baseline measurement status and recommendations
 */
router.get('/status', requireAuth, requireRole('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const snapshots = await getAllSnapshots();

    const hasBaseline = snapshots.some(s => s.snapshotType === 'baseline');
    const hasPhase1Launch = snapshots.some(s => s.snapshotType === 'phase1_launch');
    const hasPhase130Day = snapshots.some(s => s.snapshotType === 'phase1_30day');

    // Calculate current metrics for last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const currentMetrics = await calculateBaselineMetrics(thirtyDaysAgo, now);

    // Data quality checks
    const dataQuality = {
      hasLifecycleTimestamps: currentMetrics.leadProcessingTime.sampleSize > 0,
      hasCallAnalyses: currentMetrics.callEffectiveness.totalCallsAnalyzed > 0,
      hasSalesCycleData: currentMetrics.salesCycle.sampleSize > 0,
      hasResearchData: currentMetrics.researchUtilization.leadsWithResearch > 0,
      hasAdoptionData: currentMetrics.adoption.totalUsers > 0
    };

    const recommendations: string[] = [];

    if (!hasBaseline) {
      recommendations.push('Capture initial baseline snapshot before Phase 1 launch');
    }
    if (!dataQuality.hasLifecycleTimestamps) {
      recommendations.push('Lead lifecycle timestamps need to be populated for processing time metrics');
    }
    if (!dataQuality.hasCallAnalyses) {
      recommendations.push('Need call analyses for effectiveness metrics - ensure calls are being scored');
    }
    if (!dataQuality.hasSalesCycleData) {
      recommendations.push('Need converted leads with timestamps for sales cycle metrics');
    }

    res.json({
      snapshotStatus: {
        hasBaseline,
        hasPhase1Launch,
        hasPhase130Day,
        totalSnapshots: snapshots.length
      },
      dataQuality,
      currentMetricsSample: {
        totalLeads: currentMetrics.volumeCapacity.totalLeadsProcessed,
        activeSdrs: currentMetrics.volumeCapacity.activeSdrCount,
        callsAnalyzed: currentMetrics.callEffectiveness.totalCallsAnalyzed,
        leadsWithResearch: currentMetrics.researchUtilization.leadsWithResearch,
        totalUsers: currentMetrics.adoption.totalUsers
      },
      recommendations
    });
  } catch (error) {
    console.error('Error getting baseline status:', error);
    res.status(500).json({ message: 'Failed to get baseline status' });
  }
});

export default router;
