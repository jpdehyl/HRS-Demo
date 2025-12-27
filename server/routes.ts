import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { pool } from "./db";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import { registerTwilioVoiceRoutes } from "./twilio-voice";
import { registerTranscriptionRoutes, setupTranscriptionWebSocket } from "./transcription";
import { registerLeadsRoutes } from "./leads-routes";
import { registerCoachRoutes } from "./coach-routes";
import { listFilesInProcessed } from "./google/driveClient";

declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole?: string;
  }
}

const MemoryStoreSession = MemoryStore(session);
const PgSession = connectPgSimple(session);

const SALT_ROUNDS = 12;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(express.urlencoded({ extended: true }));

  // Always use PostgreSQL for persistent sessions across restarts
  console.log("Using PostgreSQL session store for persistent sessions");
  const sessionStore = new PgSession({
    pool: pool,
    tableName: "session",
    createTableIfMissing: true,
    errorLog: (error: Error) => {
      console.error("PgSession error:", error);
    },
  });

  app.use(
    session({
      store: sessionStore,
      secret: process.env.SESSION_SECRET || "lead-intel-secret-key-change-in-prod",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: "lax",
      },
    })
  );

  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  const requireRole = (...allowedRoles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      try {
        const user = await storage.getUser(req.session.userId);
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        if (!allowedRoles.includes(user.role)) {
          return res.status(403).json({ message: "Access denied. Insufficient permissions." });
        }

        req.session.userRole = user.role;
        next();
      } catch (error) {
        console.error("Role check error:", error);
        res.status(500).json({ message: "Authorization check failed" });
      }
    };
  };

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(validatedData.password, SALT_ROUNDS);
      
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });

      req.session.userId = user.id;
      req.session.userRole = user.role;

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      await storage.updateUserLastLogin(user.id);

      req.session.userId = user.id;
      req.session.userRole = user.role;
      
      console.log("Login successful - Session ID:", req.sessionID);
      console.log("Login successful - User ID set:", user.id);

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.json({ user: null });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.json({ user: null });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Authentication check failed" });
    }
  });

  app.get("/api/user", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.get("/api/managers", requireAuth, async (req: Request, res: Response) => {
    try {
      const allManagers = await storage.getAllManagers();
      res.json(allManagers);
    } catch (error) {
      console.error("Get managers error:", error);
      res.status(500).json({ message: "Failed to fetch managers" });
    }
  });

  app.get("/api/sdrs", requireAuth, async (req: Request, res: Response) => {
    try {
      const allSdrs = await storage.getAllSdrs();
      res.json(allSdrs);
    } catch (error) {
      console.error("Get SDRs error:", error);
      res.status(500).json({ message: "Failed to fetch SDRs" });
    }
  });

  app.get("/api/sdrs/by-manager/:managerId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { managerId } = req.params;
      const managerSdrs = await storage.getSdrsByManager(managerId);
      res.json(managerSdrs);
    } catch (error) {
      console.error("Get SDRs by manager error:", error);
      res.status(500).json({ message: "Failed to fetch SDRs" });
    }
  });

  app.get("/api/team", requireAuth, async (req: Request, res: Response) => {
    try {
      const allManagers = await storage.getAllManagers();
      const allSdrs = await storage.getAllSdrs();
      
      const teamByManager = allManagers.map(manager => ({
        manager,
        sdrs: allSdrs.filter(sdr => sdr.managerId === manager.id)
      }));

      const unassignedSdrs = allSdrs.filter(sdr => !sdr.managerId);

      res.json({ teamByManager, unassignedSdrs, totalManagers: allManagers.length, totalSdrs: allSdrs.length });
    } catch (error) {
      console.error("Team fetch error:", error);
      res.status(500).json({ message: "Failed to fetch team data" });
    }
  });

  app.get("/api/reports", requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      res.json({ message: "Reports data - admin/manager only", authorized: true });
    } catch (error) {
      console.error("Reports fetch error:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.get("/api/manager/oversight", requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const allSdrs = await storage.getAllSdrs();
      const sdrIds = allSdrs.map(sdr => sdr.id);
      const sdrUsers = await storage.getUsersBySdrIds(sdrIds);
      const sdrUserIds = sdrUsers.map(u => u.id);
      
      const callSessions = await storage.getCallSessionsByUserIds(sdrUserIds);
      
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const weekSessions = callSessions.filter(s => s.startedAt && new Date(s.startedAt) >= weekAgo);
      const monthSessions = callSessions.filter(s => s.startedAt && new Date(s.startedAt) >= monthAgo);

      const sdrPerformance = allSdrs.map(sdr => {
        const sdrUser = sdrUsers.find(u => u.sdrId === sdr.id);
        const sdrSessions = sdrUser ? weekSessions.filter(s => s.userId === sdrUser.id) : [];
        const completedCalls = sdrSessions.filter(s => s.status === "completed");
        const totalTalkTime = completedCalls.reduce((sum, s) => sum + (s.duration || 0), 0);
        
        const qualifiedCalls = sdrSessions.filter(s => s.disposition === "qualified" || s.disposition === "meeting-booked");
        const connectedCalls = sdrSessions.filter(s => s.disposition === "connected" || s.disposition === "qualified" || s.disposition === "meeting-booked");

        return {
          sdrId: sdr.id,
          sdrName: sdr.name,
          userId: sdrUser?.id || null,
          totalCalls: sdrSessions.length,
          completedCalls: completedCalls.length,
          totalTalkTimeMinutes: Math.round(totalTalkTime / 60),
          avgCallDuration: completedCalls.length > 0 ? Math.round(totalTalkTime / completedCalls.length / 60) : 0,
          qualifiedLeads: qualifiedCalls.length,
          connectRate: sdrSessions.length > 0 ? Math.round((connectedCalls.length / sdrSessions.length) * 100) : 0,
          meetingsBooked: sdrSessions.filter(s => s.disposition === "meeting-booked").length,
        };
      });

      const dispositionBreakdown = weekSessions.reduce((acc, s) => {
        const disp = s.disposition || "unknown";
        acc[disp] = (acc[disp] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        weeklyStats: {
          totalCalls: weekSessions.length,
          completedCalls: weekSessions.filter(s => s.status === "completed").length,
          totalTalkTimeMinutes: Math.round(weekSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60),
          meetingsBooked: weekSessions.filter(s => s.disposition === "meeting-booked").length,
          qualifiedLeads: weekSessions.filter(s => s.disposition === "qualified" || s.disposition === "meeting-booked").length,
        },
        monthlyStats: {
          totalCalls: monthSessions.length,
          completedCalls: monthSessions.filter(s => s.status === "completed").length,
          totalTalkTimeMinutes: Math.round(monthSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60),
          meetingsBooked: monthSessions.filter(s => s.disposition === "meeting-booked").length,
          qualifiedLeads: monthSessions.filter(s => s.disposition === "qualified" || s.disposition === "meeting-booked").length,
        },
        sdrPerformance,
        dispositionBreakdown,
        recentCalls: callSessions.slice(0, 50),
      });
    } catch (error) {
      console.error("Manager oversight fetch error:", error);
      res.status(500).json({ message: "Failed to fetch oversight data" });
    }
  });

  app.get("/api/manager/call-review/:callId", requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const { callId } = req.params;
      const callSession = await storage.getCallSession(callId);
      
      if (!callSession) {
        return res.status(404).json({ message: "Call session not found" });
      }

      const lead = callSession.leadId ? await storage.getLead(callSession.leadId) : null;
      const caller = await storage.getUser(callSession.userId);

      res.json({
        callSession,
        lead,
        caller: caller ? { id: caller.id, name: caller.name, email: caller.email, role: caller.role } : null,
      });
    } catch (error) {
      console.error("Call review fetch error:", error);
      res.status(500).json({ message: "Failed to fetch call review data" });
    }
  });

  app.patch("/api/manager/call-review/:callId/notes", requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const { callId } = req.params;
      const { managerSummary, coachingNotes, sentimentScore } = req.body;

      const callSession = await storage.getCallSession(callId);
      if (!callSession) {
        return res.status(404).json({ message: "Call session not found" });
      }

      const updated = await storage.updateCallSession(callId, {
        managerSummary: managerSummary || callSession.managerSummary,
        coachingNotes: coachingNotes || callSession.coachingNotes,
        sentimentScore: sentimentScore || callSession.sentimentScore,
      });

      res.json(updated);
    } catch (error) {
      console.error("Manager notes update error:", error);
      res.status(500).json({ message: "Failed to update manager notes" });
    }
  });

  app.get("/api/manager/coaching-effectiveness", requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const tipsByType = await storage.getAllCoachingTips();
      const recentTips = await storage.getRecentCoachingTips(100);
      
      const callSessions = await storage.getAllCallSessions();
      const callsWithReview = callSessions.filter(s => s.managerSummary || s.sentimentScore);
      const avgSentiment = callsWithReview.length > 0 
        ? callsWithReview.reduce((sum, s) => sum + (s.sentimentScore || 0), 0) / callsWithReview.length 
        : 0;

      const qualityTrend = callSessions
        .filter(s => s.sentimentScore && s.startedAt)
        .sort((a, b) => new Date(b.startedAt!).getTime() - new Date(a.startedAt!).getTime())
        .slice(0, 20)
        .map(s => ({
          date: s.startedAt,
          score: s.sentimentScore,
        }));

      res.json({
        tipsByType,
        totalTipsGenerated: tipsByType.reduce((sum, t) => sum + t.count, 0),
        recentTips: recentTips.slice(0, 20),
        callsReviewed: callsWithReview.length,
        averageSentiment: Math.round(avgSentiment * 10) / 10,
        qualityTrend,
      });
    } catch (error) {
      console.error("Coaching effectiveness fetch error:", error);
      res.status(500).json({ message: "Failed to fetch coaching effectiveness data" });
    }
  });

  // Debug endpoint to test Drive connection (temporary)
  app.get("/api/debug/scan-drive", async (req: Request, res: Response) => {
    try {
      console.log("[Debug] Testing Google Drive connection...");
      const files = await listFilesInProcessed();
      console.log(`[Debug] Found ${files.length} files`);
      
      const sdrIdSet = new Set<string>();
      for (const file of files) {
        // Pattern: SDR_ID + 10 digits (YYMMDDHHMM) + "Call" or "call"
        const match = file.name.match(/^([A-Z]{2,10})\d{10}[Cc]all/i);
        if (match) {
          sdrIdSet.add(match[1].toUpperCase());
        }
      }
      
      res.json({
        success: true,
        totalFiles: files.length,
        uniqueSdrIds: Array.from(sdrIdSet),
        sampleFiles: files.slice(0, 10).map(f => f.name),
      });
    } catch (error: any) {
      console.error("[Debug] Drive error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/admin/scan-processed-folder", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const files = await listFilesInProcessed();
      
      const sdrIdSet = new Set<string>();
      const sdrIdNameMap: Record<string, string> = {};
      
      for (const file of files) {
        // Pattern: SDR_ID + 10 digits (YYMMDDHHMM) + "Call" or "call"
        const match = file.name.match(/^([A-Z]{2,10})\d{10}[Cc]all/i);
        if (match) {
          const sdrId = match[1].toUpperCase();
          sdrIdSet.add(sdrId);
          sdrIdNameMap[sdrId] = sdrId;
        }
      }
      
      res.json({
        totalFiles: files.length,
        uniqueSdrIds: Array.from(sdrIdSet),
        sdrIdNameMap,
        sampleFiles: files.slice(0, 20).map(f => f.name),
      });
    } catch (error) {
      console.error("Scan processed folder error:", error);
      res.status(500).json({ message: "Failed to scan processed folder" });
    }
  });

  app.post("/api/admin/populate-sdrs", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      console.log("[Populate SDRs] Starting SDR population...");
      
      const existingManagers = await storage.getAllManagers();
      const existingSdrs = await storage.getAllSdrs();
      console.log(`[Populate SDRs] Found ${existingManagers.length} existing managers, ${existingSdrs.length} existing SDRs`);
      
      const managersCreated: string[] = [];
      const sdrsCreated: string[] = [];
      
      const managerData = [
        { name: "Juan Roldan", email: "juan@groundgamesales.com" },
        { name: "Roland Valles", email: "main@dehyl.ca" },
      ];
      
      const managerMap: Record<string, string> = {};
      
      for (const mgr of managerData) {
        const existing = existingManagers.find(m => m.email === mgr.email);
        if (existing) {
          managerMap[mgr.email] = existing.id;
          console.log(`[Populate SDRs] Manager ${mgr.name} already exists with ID: ${existing.id}`);
        } else {
          const created = await storage.createManager({
            name: mgr.name,
            email: mgr.email,
            isActive: true,
          });
          managerMap[mgr.email] = created.id;
          managersCreated.push(mgr.name);
          console.log(`[Populate SDRs] Created manager ${mgr.name} with ID: ${created.id}`);
        }
      }
      
      console.log("[Populate SDRs] Fetching files from Google Drive Processed folder...");
      const files = await listFilesInProcessed();
      console.log(`[Populate SDRs] Found ${files.length} files in Processed folder`);
      
      if (files.length > 0) {
        console.log(`[Populate SDRs] Sample files: ${files.slice(0, 5).map(f => f.name).join(", ")}`);
      }
      
      const sdrIdSet = new Set<string>();
      
      for (const file of files) {
        // Pattern: SDR_ID + 10 digits (YYMMDDHHMM) + "Call" or "call"
        const match = file.name.match(/^([A-Z]{2,10})\d{10}[Cc]all/i);
        if (match) {
          sdrIdSet.add(match[1].toUpperCase());
        }
      }
      
      console.log(`[Populate SDRs] Extracted ${sdrIdSet.size} unique SDR IDs: ${Array.from(sdrIdSet).join(", ")}`);
      
      // Map known SDR IDs to their full names
      const sdrInfoMap: Record<string, { name: string; managerEmail: string; email: string; gender: string }> = {};
      
      const managerEmails = managerData.map(m => m.email);
      const sdrIds = Array.from(sdrIdSet);
      let managerIndex = 0;
      
      for (const sdrId of sdrIds) {
        const existing = existingSdrs.find(s => s.id === sdrId);
        if (existing) {
          console.log(`[Populate SDRs] SDR ${sdrId} already exists, skipping`);
          continue;
        }
        
        const info = sdrInfoMap[sdrId];
        const managerEmail = info?.managerEmail || managerEmails[managerIndex % managerEmails.length];
        const managerId = managerMap[managerEmail];
        
        if (!managerId) {
          console.log(`[Populate SDRs] No manager ID for ${managerEmail}, skipping SDR ${sdrId}`);
          continue;
        }
        
        await storage.createSdr({
          id: sdrId,
          name: info?.name || sdrId,
          email: info?.email || `${sdrId.toLowerCase()}@company.com`,
          managerEmail: managerEmail,
          managerId: managerId,
          gender: info?.gender || "neutral",
          timezone: "America/Chicago",
          isActive: true,
        });
        
        console.log(`[Populate SDRs] Created SDR ${sdrId} -> ${info?.name || sdrId} under manager ${managerEmail}`);
        sdrsCreated.push(sdrId);
        managerIndex++;
      }
      
      console.log(`[Populate SDRs] Complete. Created ${managersCreated.length} managers and ${sdrsCreated.length} SDRs`);
      
      res.json({
        managersCreated,
        sdrsCreated,
        totalManagers: Object.keys(managerMap).length,
        totalSdrs: sdrsCreated.length,
      });
    } catch (error) {
      console.error("Populate SDRs error:", error);
      res.status(500).json({ message: "Failed to populate SDRs" });
    }
  });

  app.get("/api/call-sessions", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      let sessions;
      if (user.role === "admin" || user.role === "manager") {
        sessions = await storage.getAllCallSessions();
      } else {
        sessions = await storage.getCallSessionsByUser(req.session.userId!);
      }
      res.json(sessions);
    } catch (error) {
      console.error("Call sessions fetch error:", error);
      res.status(500).json({ message: "Failed to fetch call sessions" });
    }
  });

  app.patch("/api/call-sessions/:id/outcome", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { disposition, keyTakeaways, nextSteps, sdrNotes, callbackDate } = req.body;

      const session = await storage.getCallSession(id);
      if (!session) {
        return res.status(404).json({ message: "Call session not found" });
      }

      const updated = await storage.updateCallSession(id, {
        disposition,
        keyTakeaways: keyTakeaways || null,
        nextSteps: nextSteps || null,
        sdrNotes: sdrNotes || null,
        callbackDate: callbackDate ? new Date(callbackDate) : null,
      });

      res.json(updated);
    } catch (error) {
      console.error("Call outcome update error:", error);
      res.status(500).json({ message: "Failed to update call outcome" });
    }
  });

  registerLeadsRoutes(app, requireAuth);
  registerCoachRoutes(app, requireAuth);
  registerTwilioVoiceRoutes(app);
  registerTranscriptionRoutes(app);
  setupTranscriptionWebSocket(httpServer);

  return httpServer;
}
