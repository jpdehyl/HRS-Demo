import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { analyzeTranscript, analyzeForDailySummary } from "./ai/analyze";
import { getKnowledgebaseContent, getPersonaContent, getDailySummaryCriteria, checkDriveConfig } from "./google/driveClient";

export function registerCoachRoutes(app: Express, requireAuth: (req: Request, res: Response, next: () => void) => void) {
  
  app.post("/api/coach/analyze/:sessionId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { sdrFirstName, sdrGender } = req.body;
      
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
      
      res.json({
        managerSummary: analysis.managerSummary,
        coachingMessage: analysis.coachingMessage,
        sessionId,
      });
    } catch (error) {
      console.error("Coach analysis error:", error);
      res.status(500).json({ message: "Failed to analyze call" });
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
}
