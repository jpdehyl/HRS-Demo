import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { analyzeTranscript, analyzeForDailySummary } from "./ai/analyze";
import { getKnowledgebaseContent, getPersonaContent, getDailySummaryCriteria, checkDriveConfig } from "./google/driveClient";
import { sendFeedbackEmail, formatFeedbackEmail, formatCallDate } from "./google/gmailClient";

export function registerCoachRoutes(app: Express, requireAuth: (req: Request, res: Response, next: () => void) => void) {
  
  app.post("/api/coach/analyze/:sessionId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { sdrFirstName, sdrGender, sendEmail } = req.body;
      
      const callSession = await storage.getCallSession(sessionId);
      if (!callSession) {
        return res.status(404).json({ message: "Call session not found" });
      }
      
      if (!callSession.transcriptText) {
        return res.status(400).json({ message: "No transcript available for this call" });
      }
      
      const analysis = await analyzeTranscript(
        callSession.transcriptText,
        sdrFirstName,
        sdrGender
      );
      
      await storage.updateCallSession(sessionId, {
        coachingNotes: analysis.coachingMessage,
        managerSummary: JSON.stringify(analysis.managerSummary),
      });

      let emailSent = false;
      let emailError: string | undefined;
      if (sendEmail !== false) {
        try {
          const user = callSession.userId ? await storage.getUser(callSession.userId) : null;
          const sdr = user?.sdrId ? await storage.getSdr(user.sdrId) : null;
          
          if (sdr?.email) {
            const recipientEmail = sdr.email;
            const sdrName = sdr.name || sdrFirstName || "Team Member";
            const callDate = callSession.startedAt 
              ? new Date(callSession.startedAt) 
              : new Date();
            
            const emailBody = formatFeedbackEmail(
              sdrName,
              callDate,
              "Call",
              analysis.managerSummary,
              analysis.coachingMessage
            );
            
            const dateStr = formatCallDate(callDate, "short");
            
            await sendFeedbackEmail({
              to: recipientEmail,
              cc: sdr.managerEmail,
              subject: `Call Coaching Feedback - ${dateStr}`,
              body: emailBody,
            });
            
            console.log(`[Coach] Sent coaching email to ${recipientEmail}`);
            emailSent = true;
          } else if (user?.email) {
            console.log(`[Coach] SDR email not found, using user email: ${user.email}`);
            const callDate = callSession.startedAt 
              ? new Date(callSession.startedAt) 
              : new Date();
            
            const emailBody = formatFeedbackEmail(
              user.name || sdrFirstName || "Team Member",
              callDate,
              "Call",
              analysis.managerSummary,
              analysis.coachingMessage
            );
            
            const dateStr = formatCallDate(callDate, "short");
            
            await sendFeedbackEmail({
              to: user.email,
              subject: `Call Coaching Feedback - ${dateStr}`,
              body: emailBody,
            });
            
            console.log(`[Coach] Sent coaching email to user: ${user.email}`);
            emailSent = true;
          } else {
            console.log("[Coach] No email address found for SDR or user, skipping email");
            emailError = "No email address found";
          }
        } catch (err) {
          console.error("[Coach] Failed to send coaching email:", err);
          emailError = err instanceof Error ? err.message : "Email send failed";
        }
      }
      
      res.json({
        managerSummary: analysis.managerSummary,
        coachingMessage: analysis.coachingMessage,
        sessionId,
        emailSent,
        emailError,
      });
    } catch (error) {
      console.error("Coach analysis error:", error);
      res.status(500).json({ message: "Failed to analyze call" });
    }
  });

  app.post("/api/coach/resend-email/:sessionId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const currentUser = (req as any).user;
      
      const callSession = await storage.getCallSession(sessionId);
      if (!callSession) {
        return res.status(404).json({ message: "Call session not found" });
      }
      
      const isOwner = callSession.userId === currentUser?.id;
      const isPrivileged = currentUser?.role === "admin" || currentUser?.role === "manager";
      
      if (!isOwner && !isPrivileged) {
        return res.status(403).json({ message: "Not authorized to send email for this call" });
      }
      
      if (!callSession.coachingNotes) {
        return res.status(400).json({ message: "No coaching analysis available. Please analyze the call first." });
      }
      
      const user = callSession.userId ? await storage.getUser(callSession.userId) : null;
      const sdr = user?.sdrId ? await storage.getSdr(user.sdrId) : null;
      
      const recipientEmail = sdr?.email || user?.email;
      if (!recipientEmail) {
        return res.status(400).json({ message: "No email address found for SDR or user" });
      }
      
      const sdrName = sdr?.name || user?.name || "Team Member";
      const callDate = callSession.startedAt 
        ? new Date(callSession.startedAt) 
        : new Date();
      
      let managerSummary: string[] = [];
      try {
        if (callSession.managerSummary) {
          managerSummary = JSON.parse(callSession.managerSummary);
        }
      } catch (e) {
        console.log("[Coach] Could not parse manager summary, continuing without it");
      }
      
      const emailBody = formatFeedbackEmail(
        sdrName,
        callDate,
        "Call",
        managerSummary,
        callSession.coachingNotes
      );
      
      const dateStr = formatCallDate(callDate, "short");
      
      await sendFeedbackEmail({
        to: recipientEmail,
        cc: sdr?.managerEmail,
        subject: `Call Coaching Feedback - ${dateStr}`,
        body: emailBody,
      });
      
      console.log(`[Coach] Resent coaching email to ${recipientEmail}`);
      
      res.json({
        success: true,
        sentTo: recipientEmail,
        message: `Coaching email sent to ${recipientEmail}`
      });
    } catch (error) {
      console.error("Resend email error:", error);
      res.status(500).json({ message: "Failed to send coaching email" });
    }
  });

  app.post("/api/coach/daily-summary/:sessionId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { sdrName, callAction } = req.body;
      
      const callSession = await storage.getCallSession(sessionId);
      if (!callSession) {
        return res.status(404).json({ message: "Call session not found" });
      }
      
      if (!callSession.transcriptText) {
        return res.status(400).json({ message: "No transcript available for this call" });
      }
      
      const analysis = await analyzeForDailySummary(
        callSession.transcriptText,
        sdrName || "Unknown SDR",
        callAction || "Sales Call"
      );
      
      res.json({
        keyMoments: analysis.keyMoments,
        keyInsights: analysis.keyInsights,
        overallPerformance: analysis.overallPerformance,
        sessionId,
      });
    } catch (error) {
      console.error("Daily summary error:", error);
      res.status(500).json({ message: "Failed to generate daily summary" });
    }
  });

  app.get("/api/coach/tips/:sessionId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      
      const tips = await storage.getLiveCoachingTipsBySession(sessionId);
      res.json(tips);
    } catch (error) {
      console.error("Tips fetch error:", error);
      res.status(500).json({ message: "Failed to fetch coaching tips" });
    }
  });

  app.get("/api/coach/config", requireAuth, async (req: Request, res: Response) => {
    try {
      const driveConfig = checkDriveConfig();
      
      let knowledgeBasePreview = "";
      let personaPreview = "";
      let criteriaPreview = "";
      
      if (driveConfig.configured) {
        try {
          const kb = await getKnowledgebaseContent();
          knowledgeBasePreview = kb.slice(0, 200) + (kb.length > 200 ? "..." : "");
        } catch (e) {
          knowledgeBasePreview = "Error loading";
        }
        
        try {
          const persona = await getPersonaContent();
          personaPreview = persona.slice(0, 200) + (persona.length > 200 ? "..." : "");
        } catch (e) {
          personaPreview = "Error loading";
        }
        
        try {
          const criteria = await getDailySummaryCriteria();
          criteriaPreview = criteria.slice(0, 200) + (criteria.length > 200 ? "..." : "");
        } catch (e) {
          criteriaPreview = "Error loading";
        }
      }
      
      res.json({
        googleDriveConfigured: driveConfig.configured,
        missingCredentials: driveConfig.missing,
        documents: {
          knowledgeBase: knowledgeBasePreview,
          sdrPersona: personaPreview,
          dailySummaryCriteria: criteriaPreview,
        },
      });
    } catch (error) {
      console.error("Config fetch error:", error);
      res.status(500).json({ message: "Failed to fetch coach config" });
    }
  });

  app.get("/api/coach/sessions", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const sessions = await storage.getCallSessionsByUser(userId);
      
      const sessionsWithAnalysis = sessions.map((session: any) => ({
        ...session,
        hasAnalysis: !!session.coachingNotes,
        hasTranscript: !!session.transcriptText,
      }));
      
      res.json(sessionsWithAnalysis);
    } catch (error) {
      console.error("Sessions fetch error:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.post("/api/coach/reports/weekly", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sdrId } = req.body;
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const user = await storage.getUser(req.session.userId!);
      let allSessions;
      if (user?.role === "admin" || user?.role === "manager") {
        allSessions = await storage.getAllCallSessions();
      } else {
        allSessions = await storage.getCallSessionsByUser(req.session.userId!);
      }
      
      let weekSessions = allSessions.filter(s => {
        const sessionDate = s.startedAt ? new Date(s.startedAt) : null;
        return sessionDate && sessionDate >= weekAgo;
      });
      
      if (sdrId && sdrId !== "all") {
        weekSessions = weekSessions.filter(s => s.userId === sdrId);
      }
      
      const completedCalls = weekSessions.filter(s => s.status === "completed");
      const totalTalkTime = completedCalls.reduce((sum, s) => sum + (s.duration || 0), 0);
      const avgDuration = completedCalls.length > 0 ? totalTalkTime / completedCalls.length : 0;
      
      const callsByDay: Record<string, number> = {};
      weekSessions.forEach(s => {
        const day = s.startedAt ? new Date(s.startedAt).toLocaleDateString("en-US", { weekday: "short" }) : "Unknown";
        callsByDay[day] = (callsByDay[day] || 0) + 1;
      });
      
      const criteria = await getDailySummaryCriteria();
      
      res.json({
        period: "weekly",
        startDate: weekAgo.toISOString(),
        endDate: new Date().toISOString(),
        summary: {
          totalCalls: weekSessions.length,
          completedCalls: completedCalls.length,
          totalTalkTimeMinutes: Math.round(totalTalkTime / 60),
          avgCallDurationMinutes: Math.round(avgDuration / 60),
          callsByDay,
        },
        evaluationCriteria: criteria.slice(0, 500),
      });
    } catch (error) {
      console.error("Weekly report error:", error);
      res.status(500).json({ message: "Failed to generate weekly report" });
    }
  });

  app.post("/api/coach/reports/monthly", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sdrId } = req.body;
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const user = await storage.getUser(req.session.userId!);
      let allSessions;
      if (user?.role === "admin" || user?.role === "manager") {
        allSessions = await storage.getAllCallSessions();
      } else {
        allSessions = await storage.getCallSessionsByUser(req.session.userId!);
      }
      
      let monthSessions = allSessions.filter(s => {
        const sessionDate = s.startedAt ? new Date(s.startedAt) : null;
        return sessionDate && sessionDate >= monthAgo;
      });
      
      if (sdrId && sdrId !== "all") {
        monthSessions = monthSessions.filter(s => s.userId === sdrId);
      }
      
      const completedCalls = monthSessions.filter(s => s.status === "completed");
      const totalTalkTime = completedCalls.reduce((sum, s) => sum + (s.duration || 0), 0);
      const avgDuration = completedCalls.length > 0 ? totalTalkTime / completedCalls.length : 0;
      
      const callsByWeek: Record<string, number> = {};
      monthSessions.forEach(s => {
        if (s.startedAt) {
          const sessionDate = new Date(s.startedAt);
          const dayOfMonth = sessionDate.getDate();
          const weekNum = Math.ceil(dayOfMonth / 7);
          const weekLabel = `Week ${Math.min(weekNum, 4)}`;
          callsByWeek[weekLabel] = (callsByWeek[weekLabel] || 0) + 1;
        }
      });
      
      const callsWithAnalysis = monthSessions.filter(s => s.coachingNotes).length;
      
      const criteria = await getDailySummaryCriteria();
      
      const weeks = Object.keys(callsByWeek).sort();
      let weekOverWeekGrowth = 0;
      if (weeks.length >= 2) {
        const firstWeek = callsByWeek[weeks[0]] || 0;
        const lastWeek = callsByWeek[weeks[weeks.length - 1]] || 0;
        if (firstWeek > 0) {
          weekOverWeekGrowth = Math.round(((lastWeek - firstWeek) / firstWeek) * 100);
        }
      }
      
      res.json({
        period: "monthly",
        startDate: monthAgo.toISOString(),
        endDate: new Date().toISOString(),
        summary: {
          totalCalls: monthSessions.length,
          completedCalls: completedCalls.length,
          callsWithCoaching: callsWithAnalysis,
          totalTalkTimeMinutes: Math.round(totalTalkTime / 60),
          avgCallDurationMinutes: Math.round(avgDuration / 60),
          callsByWeek,
        },
        trends: {
          weekOverWeekGrowth,
        },
        evaluationCriteria: criteria.slice(0, 500),
      });
    } catch (error) {
      console.error("Monthly report error:", error);
      res.status(500).json({ message: "Failed to generate monthly report" });
    }
  });

  app.get("/api/coach/performance-summary", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const allSessions = await storage.getCallSessionsByUser(userId);
      
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const last7DaysSessions = allSessions.filter(s => {
        const sessionDate = s.startedAt ? new Date(s.startedAt) : null;
        return sessionDate && sessionDate >= sevenDaysAgo;
      });
      
      const completedLast7Days = last7DaysSessions.filter(s => s.status === "completed");
      const totalTalkTimeSeconds = completedLast7Days.reduce((sum, s) => sum + (s.duration || 0), 0);
      
      const analyzedCalls = allSessions
        .filter(s => s.coachingNotes && s.coachingNotes.length > 0)
        .sort((a, b) => {
          const dateA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
          const dateB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
          return dateB - dateA;
        });
      
      const latestAnalyzedCall = analyzedCalls[0] || null;
      
      let winHighlight: { text: string; callDate: string } | null = null;
      let focusArea: { skill: string; suggestion: string } | null = null;
      
      if (latestAnalyzedCall?.coachingNotes) {
        const notes = latestAnalyzedCall.coachingNotes;
        
        const positivePatterns = [
          /great job[^.!]*[.!]/gi,
          /well done[^.!]*[.!]/gi,
          /excellent[^.!]*[.!]/gi,
          /good work[^.!]*[.!]/gi,
          /nicely[^.!]*[.!]/gi,
          /strong[^.!]*[.!]/gi,
        ];
        
        for (const pattern of positivePatterns) {
          const match = notes.match(pattern);
          if (match) {
            winHighlight = {
              text: match[0].trim(),
              callDate: latestAnalyzedCall.startedAt?.toISOString() || new Date().toISOString(),
            };
            break;
          }
        }
        
        const improvementPatterns = [
          /try[^.!]*[.!]/gi,
          /consider[^.!]*[.!]/gi,
          /work on[^.!]*[.!]/gi,
          /focus on[^.!]*[.!]/gi,
          /next time[^.!]*[.!]/gi,
          /could[^.!]*[.!]/gi,
        ];
        
        for (const pattern of improvementPatterns) {
          const match = notes.match(pattern);
          if (match) {
            focusArea = {
              skill: "Coaching Tip",
              suggestion: match[0].trim(),
            };
            break;
          }
        }
      }
      
      const last30DaysSessions = allSessions.filter(s => {
        const sessionDate = s.startedAt ? new Date(s.startedAt) : null;
        return sessionDate && sessionDate >= thirtyDaysAgo;
      });
      
      const weeklyTrend: { week: string; calls: number; talkTime: number }[] = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        
        const weekSessions = last30DaysSessions.filter(s => {
          const sessionDate = s.startedAt ? new Date(s.startedAt) : null;
          return sessionDate && sessionDate >= weekStart && sessionDate < weekEnd;
        });
        
        const weekCompleted = weekSessions.filter(s => s.status === "completed");
        const weekTalkTime = weekCompleted.reduce((sum, s) => sum + (s.duration || 0), 0);
        
        weeklyTrend.push({
          week: `Week ${4 - i}`,
          calls: weekSessions.length,
          talkTime: Math.round(weekTalkTime / 60),
        });
      }
      
      res.json({
        stats: {
          callsLast7Days: last7DaysSessions.length,
          completedCallsLast7Days: completedLast7Days.length,
          talkTimeMinutes: Math.round(totalTalkTimeSeconds / 60),
          analyzedCalls: analyzedCalls.length,
        },
        latestCoaching: latestAnalyzedCall ? {
          id: latestAnalyzedCall.id,
          callDate: latestAnalyzedCall.startedAt?.toISOString(),
          toNumber: latestAnalyzedCall.toNumber,
          duration: latestAnalyzedCall.duration,
          coachingNotes: latestAnalyzedCall.coachingNotes,
          disposition: latestAnalyzedCall.disposition,
        } : null,
        winHighlight,
        focusArea,
        weeklyTrend,
        recentCalls: analyzedCalls.slice(0, 5).map(c => ({
          id: c.id,
          callDate: c.startedAt?.toISOString(),
          toNumber: c.toNumber,
          duration: c.duration,
          coachingNotes: c.coachingNotes,
          disposition: c.disposition,
        })),
      });
    } catch (error) {
      console.error("Performance summary error:", error);
      res.status(500).json({ message: "Failed to generate performance summary" });
    }
  });
}
