import { Router, Request, Response } from 'express';
import { format } from 'date-fns';
import { storage } from './storage';
import type { CallSession, Lead } from '@shared/schema';
import { 
  generateTeamSummaryPdf, 
  generateCallAnalysisPdf, 
  generateSdrPerformancePdf,
  TeamSummaryData,
  CallAnalysisData,
  SdrPerformanceData,
  ReportMetadata
} from './pdf-service';

const router = Router();

async function getCurrentUser(req: Request) {
  const userId = req.session?.userId;
  if (!userId) return null;
  return await storage.getUser(userId);
}

router.get('/team-summary', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (user.role !== 'admin' && user.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied. Manager or admin role required.' });
    }

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfWeek);

    const allSdrs = await storage.getAllSdrs();
    const allUsers = await storage.getAllUsers();
    const sdrUsers = allUsers.filter(u => u.role === 'sdr' && u.sdrId);
    const sdrUserIds = sdrUsers.map(u => u.id);
    const allCalls = await storage.getCallSessionsByUserIds(sdrUserIds);
    
    const weekCalls = allCalls.filter((c: CallSession) => new Date(c.startedAt) >= startOfWeek);
    const lastWeekCalls = allCalls.filter((c: CallSession) => {
      const callDate = new Date(c.startedAt);
      return callDate >= startOfLastWeek && callDate < endOfLastWeek;
    });

    const sdrsWithPerformance: SdrPerformanceData[] = allSdrs.map(sdr => {
      const sdrUser = sdrUsers.find(u => u.sdrId === sdr.id);
      const sdrCalls = sdrUser ? weekCalls.filter((c: CallSession) => c.userId === sdrUser.id) : [];
      const sdrLastWeekCalls = sdrUser ? lastWeekCalls.filter((c: CallSession) => c.userId === sdrUser.id) : [];
      
      const connected = sdrCalls.filter((c: CallSession) =>
        c.disposition === 'connected' || c.disposition === 'qualified' ||
        c.disposition === 'meeting-booked' || c.disposition === 'callback-scheduled'
      );

      const qualifiedThisWeek = sdrCalls.filter((c: CallSession) => 
        c.disposition === 'qualified' || c.disposition === 'meeting-booked'
      ).length;
      const qualifiedLastWeek = sdrLastWeekCalls.filter((c: CallSession) => 
        c.disposition === 'qualified' || c.disposition === 'meeting-booked'
      ).length;

      const callsChange = sdrLastWeekCalls.length > 0 
        ? Math.round(((sdrCalls.length - sdrLastWeekCalls.length) / sdrLastWeekCalls.length) * 100)
        : 0;
      const qualifiedChange = qualifiedLastWeek > 0 
        ? Math.round(((qualifiedThisWeek - qualifiedLastWeek) / qualifiedLastWeek) * 100)
        : 0;
      
      return {
        name: sdr.name,
        calls: sdrCalls.length,
        qualified: qualifiedThisWeek,
        meetings: sdrCalls.filter((c: CallSession) => c.disposition === 'meeting-booked').length,
        connectRate: sdrCalls.length > 0 ? Math.round((connected.length / sdrCalls.length) * 100) : 0,
        callsChange,
        qualifiedChange,
      };
    }).sort((a, b) => b.qualified - a.qualified || b.meetings - a.meetings);

    const sdrsWithHistory = sdrsWithPerformance.filter(s => s.callsChange !== 0 || s.qualifiedChange !== 0);
    const mostImproved = sdrsWithHistory.length > 0
      ? [...sdrsWithHistory].sort((a, b) => (b.qualifiedChange || 0) - (a.qualifiedChange || 0))[0]?.name
      : undefined;

    const totalCalls = sdrsWithPerformance.reduce((sum, s) => sum + s.calls, 0);
    const totalQualified = sdrsWithPerformance.reduce((sum, s) => sum + s.qualified, 0);
    const totalMeetings = sdrsWithPerformance.reduce((sum, s) => sum + s.meetings, 0);
    const avgConnectRate = sdrsWithPerformance.length > 0 
      ? Math.round(sdrsWithPerformance.reduce((sum, s) => sum + s.connectRate, 0) / sdrsWithPerformance.length)
      : 0;

    const data: TeamSummaryData = {
      totalCalls,
      totalQualified,
      totalMeetings,
      avgConnectRate,
      topPerformer: sdrsWithPerformance[0]?.name || 'N/A',
      mostImproved,
      sdrs: sdrsWithPerformance,
    };

    const metadata: ReportMetadata = {
      title: 'Team Performance Summary',
      subtitle: `Week of ${format(startOfWeek, 'MMMM d, yyyy')}`,
      generatedBy: user.email,
      generatedAt: now,
      reportType: 'Weekly Team Summary',
    };

    const pdfBuffer = await generateTeamSummaryPdf(data, metadata);

    const filename = `Team_Summary_${format(now, 'yyyy-MM-dd')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating team summary PDF:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

router.get('/sdr/:sdrId', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sdrId } = req.params;
    const sdr = await storage.getSdr(sdrId);
    if (!sdr) {
      return res.status(404).json({ error: 'SDR not found' });
    }

    if (user.role === 'sdr' && user.sdrId !== sdrId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfWeek);

    const allUsers = await storage.getAllUsers();
    const sdrUser = allUsers.find(u => u.sdrId === sdrId);
    
    const sdrCalls = sdrUser ? await storage.getCallSessionsByUser(sdrUser.id) : [];
    const weekCalls = sdrCalls.filter((c: CallSession) => new Date(c.startedAt) >= startOfWeek);
    const lastWeekCalls = sdrCalls.filter((c: CallSession) => {
      const callDate = new Date(c.startedAt);
      return callDate >= startOfLastWeek && callDate < endOfLastWeek;
    });

    const connected = weekCalls.filter((c: CallSession) =>
      c.disposition === 'connected' || c.disposition === 'qualified' ||
      c.disposition === 'meeting-booked' || c.disposition === 'callback-scheduled'
    );

    const qualifiedThisWeek = weekCalls.filter((c: CallSession) => 
      c.disposition === 'qualified' || c.disposition === 'meeting-booked'
    ).length;
    const qualifiedLastWeek = lastWeekCalls.filter((c: CallSession) => 
      c.disposition === 'qualified' || c.disposition === 'meeting-booked'
    ).length;

    const callsChange = lastWeekCalls.length > 0 
      ? Math.round(((weekCalls.length - lastWeekCalls.length) / lastWeekCalls.length) * 100)
      : 0;
    const qualifiedChange = qualifiedLastWeek > 0 
      ? Math.round(((qualifiedThisWeek - qualifiedLastWeek) / qualifiedLastWeek) * 100)
      : 0;

    const sdrData: SdrPerformanceData = {
      name: sdr.name,
      calls: weekCalls.length,
      qualified: qualifiedThisWeek,
      meetings: weekCalls.filter((c: CallSession) => c.disposition === 'meeting-booked').length,
      connectRate: weekCalls.length > 0 ? Math.round((connected.length / weekCalls.length) * 100) : 0,
      callsChange,
      qualifiedChange,
    };

    const allLeads = await storage.getAllLeads();
    const recentCalls = weekCalls.slice(0, 10).map((call: CallSession) => {
      const lead = allLeads.find((l: Lead) => l.id === call.leadId);
      
      let coachingScore = null;
      if (call.coachingNotes) {
        try {
          const notes = JSON.parse(call.coachingNotes);
          coachingScore = notes.overallScore || notes.callScore || null;
        } catch {
          coachingScore = null;
        }
      }
      
      return {
        leadName: lead?.contactName || 'Unknown',
        company: lead?.companyName || '-',
        duration: call.duration ? `${Math.round(call.duration / 60)}m` : '-',
        disposition: call.disposition || 'unknown',
        score: coachingScore,
      };
    });

    const metadata: ReportMetadata = {
      title: 'SDR Performance Report',
      subtitle: sdr.name,
      generatedBy: user.email,
      generatedAt: now,
      reportType: 'Individual SDR Report',
    };

    const pdfBuffer = await generateSdrPerformancePdf(sdrData, recentCalls, metadata);

    const filename = `SDR_Report_${sdr.name.replace(/\s+/g, '_')}_${format(now, 'yyyy-MM-dd')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating SDR performance PDF:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

router.get('/call/:sessionId', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId } = req.params;
    const session = await storage.getCallSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Call session not found' });
    }

    if (user.role === 'sdr' && session.userId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const now = new Date();
    const lead = session.leadId ? await storage.getLead(session.leadId) : null;
    const allUsers = await storage.getAllUsers();
    const callUser = allUsers.find(u => u.id === session.userId);
    const allSdrs = await storage.getAllSdrs();
    const sdr = callUser?.sdrId ? allSdrs.find(s => s.id === callUser.sdrId) : null;

    let coachingData: any = {
      overallScore: 0,
      strengths: [],
      areasForImprovement: [],
      objections: [],
      summary: 'No analysis available for this call.',
    };
    
    if (session.coachingNotes) {
      try {
        const parsed = JSON.parse(session.coachingNotes);
        coachingData = {
          overallScore: parsed.overallScore || parsed.callScore || 0,
          strengths: parsed.strengths || [],
          areasForImprovement: parsed.areasForImprovement || parsed.improvements || [],
          objections: parsed.objections || [],
          summary: parsed.summary || parsed.callSummary || 'Analysis completed.',
        };
      } catch {
        coachingData.summary = session.coachingNotes.substring(0, 500) + (session.coachingNotes.length > 500 ? '...' : '');
      }
    }

    const data: CallAnalysisData = {
      sdrName: sdr?.name || callUser?.email || 'Unknown',
      leadName: lead?.contactName || 'Unknown',
      company: lead?.companyName || 'Unknown',
      duration: session.duration ? `${Math.round(session.duration / 60)} minutes` : 'N/A',
      disposition: session.disposition || 'unknown',
      overallScore: coachingData.overallScore,
      strengths: coachingData.strengths,
      improvements: coachingData.areasForImprovement,
      objections: coachingData.objections,
      summary: coachingData.summary,
    };

    const metadata: ReportMetadata = {
      title: 'Call Analysis Report',
      subtitle: `${data.leadName} at ${data.company}`,
      generatedBy: user.email,
      generatedAt: now,
      reportType: 'Individual Call Analysis',
    };

    const pdfBuffer = await generateCallAnalysisPdf(data, metadata);

    const filename = `Call_Analysis_${data.leadName.replace(/\s+/g, '_')}_${format(now, 'yyyy-MM-dd')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating call analysis PDF:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

router.post('/email', async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { reportType, reportId, recipientEmail } = req.body;
    
    if (!reportType || !recipientEmail) {
      return res.status(400).json({ error: 'Missing required fields: reportType and recipientEmail' });
    }

    res.json({ 
      success: true, 
      message: `Report will be sent to ${recipientEmail}`,
      note: 'Email functionality requires Gmail API configuration'
    });

  } catch (error) {
    console.error('Error emailing report:', error);
    res.status(500).json({ error: 'Failed to send report email' });
  }
});

export default router;
