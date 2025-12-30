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

  app.patch("/api/user/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, email } = req.body;
      const updates: { name?: string; email?: string } = {};
      
      if (name && typeof name === "string" && name.trim()) {
        updates.name = name.trim();
      }
      if (email && typeof email === "string" && email.trim()) {
        const existingUser = await storage.getUserByEmail(email.trim());
        if (existingUser && existingUser.id !== req.session.userId) {
          return res.status(400).json({ message: "Email already in use" });
        }
        updates.email = email.trim();
      }
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid updates provided" });
      }
      
      const user = await storage.updateUserProfile(req.session.userId!, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.patch("/api/user/password", requireAuth, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(req.session.userId!, hashedPassword);
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Update password error:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.get("/api/users", requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const allUsers = await storage.getAllUsers();
      const usersWithoutPasswords = allUsers.map(({ password: _, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/role", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      const validRoles = ["admin", "manager", "sdr", "account_specialist", "account_executive"];
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      if (id === req.session.userId && role !== "admin") {
        return res.status(400).json({ message: "Cannot demote yourself" });
      }
      
      const user = await storage.updateUserRole(id, role);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update role error:", error);
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete("/api/users/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (id === req.session.userId) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }
      
      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get("/api/notifications", requireAuth, async (req: Request, res: Response) => {
    try {
      const notifications = await storage.getNotificationsByUser(req.session.userId!);
      const unreadCount = await storage.getUnreadNotificationCount(req.session.userId!);
      res.json({ notifications, unreadCount });
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/:id/read", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const notification = await storage.markNotificationRead(id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json(notification);
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/notifications/read-all", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.markAllNotificationsRead(req.session.userId!);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ message: "Failed to mark notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteNotification(id);
      if (!deleted) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Delete notification error:", error);
      res.status(500).json({ message: "Failed to delete notification" });
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

  app.patch("/api/sdrs/:id", requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const sdr = await storage.updateSdr(id, updates);
      if (!sdr) {
        return res.status(404).json({ message: "SDR not found" });
      }
      
      res.json(sdr);
    } catch (error) {
      console.error("Update SDR error:", error);
      res.status(500).json({ message: "Failed to update SDR" });
    }
  });

  app.delete("/api/sdrs/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteSdr(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete SDR error:", error);
      res.status(500).json({ message: "Failed to delete SDR" });
    }
  });

  app.post("/api/sdrs", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id, name, email, managerEmail, managerId, gender, timezone } = req.body;
      
      if (!id || !name || !email || !managerEmail) {
        return res.status(400).json({ message: "ID, name, email, and manager email are required" });
      }
      
      const sdr = await storage.createSdr({
        id,
        name,
        email,
        managerEmail,
        managerId: managerId || null,
        gender: gender || "neutral",
        timezone: timezone || null,
        isActive: true
      });
      
      res.json(sdr);
    } catch (error) {
      console.error("Create SDR error:", error);
      res.status(500).json({ message: "Failed to create SDR" });
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

  app.get("/api/dashboard/metrics", requireAuth, async (req: Request, res: Response) => {
    try {
      const currentUser = await storage.getUser(req.session.userId!);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }

      const isPrivileged = currentUser.role === "admin" || currentUser.role === "manager";
      const allLeads = await storage.getAllLeads();
      const allSdrs = await storage.getAllSdrs();
      const allAEs = await storage.getAllAccountExecutives();
      const sdrIds = allSdrs.map(sdr => sdr.id);
      const sdrUsers = await storage.getUsersBySdrIds(sdrIds);
      
      let callSessions;
      if (isPrivileged) {
        const sdrUserIds = sdrUsers.map(u => u.id);
        callSessions = await storage.getCallSessionsByUserIds(sdrUserIds);
      } else {
        callSessions = await storage.getCallSessionsByUser(req.session.userId!);
      }
      
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const todaySessions = callSessions.filter(s => s.startedAt && new Date(s.startedAt) >= today);
      const weekSessions = callSessions.filter(s => s.startedAt && new Date(s.startedAt) >= weekAgo);
      const lastWeekSessions = callSessions.filter(s => {
        const d = s.startedAt ? new Date(s.startedAt) : null;
        return d && d >= twoWeeksAgo && d < weekAgo;
      });
      const monthSessions = callSessions.filter(s => s.startedAt && new Date(s.startedAt) >= monthAgo);

      const qualifiedWeek = weekSessions.filter(s => s.disposition === "qualified" || s.disposition === "meeting-booked");
      const qualifiedLastWeek = lastWeekSessions.filter(s => s.disposition === "qualified" || s.disposition === "meeting-booked");
      const meetingsWeek = weekSessions.filter(s => s.disposition === "meeting-booked");
      const connectedWeek = weekSessions.filter(s => 
        s.disposition === "connected" || s.disposition === "qualified" || 
        s.disposition === "meeting-booked" || s.disposition === "callback-scheduled"
      );

      const conversionRate = weekSessions.length > 0 
        ? Math.round((qualifiedWeek.length / weekSessions.length) * 100) 
        : 0;
      const lastConversionRate = lastWeekSessions.length > 0 
        ? Math.round((qualifiedLastWeek.length / lastWeekSessions.length) * 100) 
        : 0;

      const qualifiedLeads = allLeads.filter(l => l.status === "qualified" || l.status === "sent_to_ae");
      const pipelineValue = qualifiedLeads.length * 15000;

      const dailyActivity: { date: string; calls: number; qualified: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        const daySessions = callSessions.filter(s => {
          const d = s.startedAt ? new Date(s.startedAt) : null;
          return d && d >= dayStart && d < dayEnd;
        });
        dailyActivity.push({
          date: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
          calls: daySessions.length,
          qualified: daySessions.filter(s => s.disposition === "qualified" || s.disposition === "meeting-booked").length,
        });
      }

      const dispositionBreakdown = weekSessions.reduce((acc, s) => {
        const disp = s.disposition || "no-answer";
        acc[disp] = (acc[disp] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const funnel = {
        totalCalls: weekSessions.length,
        connected: connectedWeek.length,
        qualified: qualifiedWeek.length,
        meetings: meetingsWeek.length,
      };

      let sdrLeaderboard: Array<{
        sdrId: string;
        sdrName: string;
        userId: string | null;
        calls: number;
        qualified: number;
        meetings: number;
        connectRate: number;
        talkTimeMinutes: number;
      }> = [];

      if (isPrivileged) {
        sdrLeaderboard = allSdrs.map(sdr => {
          const sdrUser = sdrUsers.find(u => u.sdrId === sdr.id);
          const sdrSessions = sdrUser ? weekSessions.filter(s => s.userId === sdrUser.id) : [];
          const completed = sdrSessions.filter(s => s.status === "completed");
          const connected = sdrSessions.filter(s => 
            s.disposition === "connected" || s.disposition === "qualified" || 
            s.disposition === "meeting-booked" || s.disposition === "callback-scheduled"
          );
          return {
            sdrId: sdr.id,
            sdrName: sdr.name,
            userId: sdrUser?.id || null,
            calls: sdrSessions.length,
            qualified: sdrSessions.filter(s => s.disposition === "qualified" || s.disposition === "meeting-booked").length,
            meetings: sdrSessions.filter(s => s.disposition === "meeting-booked").length,
            connectRate: sdrSessions.length > 0 ? Math.round((connected.length / sdrSessions.length) * 100) : 0,
            talkTimeMinutes: Math.round(completed.reduce((sum, s) => sum + (s.duration || 0), 0) / 60),
          };
        }).sort((a, b) => b.qualified - a.qualified || b.meetings - a.meetings);
      }

      const callsNeedingAnalysis = callSessions.filter(s => 
        s.status === "completed" && !s.coachingNotes && s.transcriptText
      ).slice(0, 10);

      const hotLeads = allLeads.filter(l => 
        l.status === "qualified" || l.status === "sent_to_ae"
      ).slice(0, 5);

      const leadsWithResearchStatus = await Promise.all(
        allLeads.slice(0, 50).map(async (lead) => {
          const researchPacket = await storage.getResearchPacketByLead(lead.id);
          return { ...lead, hasResearch: !!researchPacket };
        })
      );
      const leadsWithoutResearch = leadsWithResearchStatus.filter(l => !l.hasResearch).slice(0, 5);

      res.json({
        hero: {
          pipelineValue,
          pipelineLeads: qualifiedLeads.length,
          conversionRate,
          conversionTrend: conversionRate - lastConversionRate,
          callsToday: todaySessions.length,
          callsThisWeek: weekSessions.length,
          callsTrend: lastWeekSessions.length > 0 
            ? Math.round(((weekSessions.length - lastWeekSessions.length) / lastWeekSessions.length) * 100)
            : weekSessions.length > 0 ? 100 : 0,
          meetingsBooked: meetingsWeek.length,
          qualifiedLeads: qualifiedWeek.length,
        },
        funnel,
        dispositionBreakdown,
        dailyActivity,
        sdrLeaderboard: sdrLeaderboard.slice(0, 10),
        actionItems: {
          callsNeedingAnalysis: callsNeedingAnalysis.map(c => ({
            id: c.id,
            toNumber: c.toNumber,
            duration: c.duration,
            startedAt: c.startedAt,
          })),
          hotLeads: hotLeads.map(l => ({
            id: l.id,
            companyName: l.companyName,
            contactName: l.contactName,
            phone: l.contactPhone,
          })),
          leadsWithoutResearch: leadsWithoutResearch.map(l => ({
            id: l.id,
            companyName: l.companyName,
            contactName: l.contactName,
          })),
        },
        teamSize: {
          sdrs: allSdrs.length,
          aes: allAEs.length,
          leads: allLeads.length,
        },
        isPrivileged,
        currentUserId: req.session.userId,
      });
    } catch (error) {
      console.error("Dashboard metrics error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
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

  app.post("/api/call-sessions/:id/manager-analysis", requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const callSession = await storage.getCallSession(id);
      if (!callSession) {
        return res.status(404).json({ message: "Call session not found" });
      }

      if (!callSession.transcriptText) {
        return res.status(400).json({ message: "No transcript available for analysis" });
      }

      const user = await storage.getUser(callSession.userId);
      if (!user) {
        return res.status(400).json({ message: "User not found for this call" });
      }

      let sdr = null;
      if (user.sdrId) {
        sdr = await storage.getSdr(user.sdrId);
      }
      
      const sdrInfo = sdr || {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: null,
        managerId: null,
        region: "Unknown",
        createdAt: new Date(),
        managerEmail: "",
        gender: "neutral" as const,
        timezone: null,
        isActive: true,
      };

      const existingAnalysis = await storage.getManagerCallAnalysisByCallSession(id);
      if (existingAnalysis) {
        return res.json(existingAnalysis);
      }

      const { analyzeCallForManager, saveManagerAnalysis } = await import("./ai/managerAnalysis");
      const analysis = await analyzeCallForManager(callSession, sdrInfo);
      await saveManagerAnalysis(callSession, sdrInfo, analysis);

      const savedAnalysis = await storage.getManagerCallAnalysisByCallSession(id);
      res.json(savedAnalysis || analysis);
    } catch (error) {
      console.error("Manager analysis error:", error);
      res.status(500).json({ message: "Failed to analyze call for manager" });
    }
  });

  app.get("/api/manager-analyses", requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const analyses = await storage.getAllManagerCallAnalyses();
      res.json(analyses);
    } catch (error) {
      console.error("Manager analyses fetch error:", error);
      res.status(500).json({ message: "Failed to fetch manager analyses" });
    }
  });

  app.get("/api/manager-analyses/:id", requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const analysis = await storage.getManagerCallAnalysis(id);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      res.json(analysis);
    } catch (error) {
      console.error("Manager analysis fetch error:", error);
      res.status(500).json({ message: "Failed to fetch manager analysis" });
    }
  });

  app.get("/api/call-sessions/:id/manager-analysis", requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const analysis = await storage.getManagerCallAnalysisByCallSession(id);
      res.json(analysis || null);
    } catch (error) {
      console.error("Manager analysis fetch by call session error:", error);
      res.status(500).json({ message: "Failed to fetch manager analysis" });
    }
  });

  // Account Executive Routes
  app.get("/api/account-executives", requireAuth, async (req: Request, res: Response) => {
    try {
      const aes = await storage.getAllAccountExecutives();
      res.json(aes);
    } catch (error) {
      console.error("Account executives fetch error:", error);
      res.status(500).json({ message: "Failed to fetch account executives" });
    }
  });

  app.post("/api/account-executives", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { insertAccountExecutiveSchema } = await import("@shared/schema");
      const parsed = insertAccountExecutiveSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid account executive data", errors: parsed.error.flatten() });
      }
      const ae = await storage.createAccountExecutive(parsed.data);
      res.status(201).json(ae);
    } catch (error) {
      console.error("Account executive create error:", error);
      res.status(500).json({ message: "Failed to create account executive" });
    }
  });

  app.patch("/api/account-executives/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateSchema = z.object({
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional().nullable(),
        region: z.string().optional().nullable(),
        specialty: z.string().optional().nullable(),
        isActive: z.boolean().optional()
      });
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid update data", errors: parsed.error.flatten() });
      }
      const updated = await storage.updateAccountExecutive(id, parsed.data);
      if (!updated) {
        return res.status(404).json({ message: "Account executive not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Account executive update error:", error);
      res.status(500).json({ message: "Failed to update account executive" });
    }
  });

  app.delete("/api/account-executives/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAccountExecutive(id);
      if (!deleted) {
        return res.status(404).json({ message: "Account executive not found" });
      }
      res.json({ message: "Account executive deleted" });
    } catch (error) {
      console.error("Account executive delete error:", error);
      res.status(500).json({ message: "Failed to delete account executive" });
    }
  });

  app.post("/api/call-sessions/:id/send-to-ae", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sendToAeSchema = z.object({
        aeId: z.string().uuid("Invalid account executive ID"),
        leadId: z.string().uuid("Invalid lead ID").optional()
      });
      const parsed = sendToAeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request data", errors: parsed.error.flatten() });
      }
      const { aeId, leadId } = parsed.data;

      const callSession = await storage.getCallSession(id);
      if (!callSession) {
        return res.status(404).json({ message: "Call session not found" });
      }

      const ae = await storage.getAccountExecutive(aeId);
      if (!ae) {
        return res.status(404).json({ message: "Account executive not found" });
      }

      let lead = null;
      if (leadId) {
        lead = await storage.getLead(leadId);
      }

      const user = await storage.getUser(callSession.userId);
      const sdrName = user?.name || "SDR";

      const { sendFeedbackEmail } = await import("./google/gmailClient");

      const appUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : "https://lead-intel.replit.app";
      const transcriptLink = `${appUrl}/coaching?call=${id}`;

      const callDate = callSession.startedAt ? new Date(callSession.startedAt).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
      }) : "Recent call";

      const summaryHtml = `
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; background-color: #f9fafb; margin: 0; padding: 20px; }
              .container { max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              .header { background-color: #059669; color: #ffffff; padding: 24px 32px; }
              .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
              .header .meta { color: #d1fae5; font-size: 14px; margin-top: 8px; }
              .content { padding: 32px; }
              .section { margin-bottom: 24px; }
              .section h3 { font-size: 14px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin: 0 0 12px 0; }
              .section p, .section ul { color: #374151; font-size: 15px; margin: 0; }
              .section ul { padding-left: 20px; }
              .section li { margin-bottom: 8px; }
              .cta { display: inline-block; background-color: #059669; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; }
              .footer { padding: 20px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; }
              .footer p { margin: 0; font-size: 12px; color: #9ca3af; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Lead Handoff - ${lead?.companyName || "Qualified Lead"}</h1>
                <div class="meta">From ${sdrName} - ${callDate}</div>
              </div>
              
              <div class="content">
                ${lead ? `
                <div class="section">
                  <h3>Lead Information</h3>
                  <p><strong>Company:</strong> ${lead.companyName}</p>
                  <p><strong>Contact:</strong> ${lead.contactName}</p>
                  ${lead.contactTitle ? `<p><strong>Title:</strong> ${lead.contactTitle}</p>` : ""}
                  <p><strong>Email:</strong> ${lead.contactEmail}</p>
                  ${lead.contactPhone ? `<p><strong>Phone:</strong> ${lead.contactPhone}</p>` : ""}
                </div>
                ` : ""}

                <div class="section">
                  <h3>Call Summary</h3>
                  ${callSession.managerSummary ? (() => {
                    try {
                      const parsed = JSON.parse(callSession.managerSummary);
                      if (Array.isArray(parsed)) {
                        return `<ul>${parsed.map((item: string) => `<li>${item}</li>`).join("")}</ul>`;
                      }
                      return `<p>${callSession.managerSummary}</p>`;
                    } catch {
                      return `<p>${callSession.managerSummary}</p>`;
                    }
                  })() : "<p>No summary available</p>"}
                </div>

                ${callSession.coachingNotes ? `
                <div class="section">
                  <h3>Call Analysis</h3>
                  <p>${callSession.coachingNotes}</p>
                </div>
                ` : ""}

                ${callSession.keyTakeaways ? `
                <div class="section">
                  <h3>Key Takeaways</h3>
                  <p>${callSession.keyTakeaways}</p>
                </div>
                ` : ""}

                ${callSession.nextSteps ? `
                <div class="section">
                  <h3>Next Steps</h3>
                  <p>${callSession.nextSteps}</p>
                </div>
                ` : ""}

                <div class="section">
                  <a href="${transcriptLink}" class="cta">View Full Transcript</a>
                </div>
              </div>
              
              <div class="footer">
                <p>Sent via Lead Intel - Hawk Ridge Systems</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await sendFeedbackEmail({
        to: ae.email,
        subject: `Lead Handoff: ${lead?.companyName || "Qualified Lead"} - From ${sdrName}`,
        body: summaryHtml
      });

      if (lead) {
        await storage.updateLead(lead.id, {
          status: "handed_off",
          assignedAeId: aeId,
          handedOffAt: new Date(),
          handedOffBy: callSession.userId
        });
      }

      res.json({ message: "Handoff email sent successfully" });
    } catch (error) {
      console.error("Send to AE error:", error);
      res.status(500).json({ message: "Failed to send handoff email" });
    }
  });

  registerLeadsRoutes(app, requireAuth);
  registerCoachRoutes(app, requireAuth);
  registerTwilioVoiceRoutes(app);
  registerTranscriptionRoutes(app);
  setupTranscriptionWebSocket(httpServer);

  return httpServer;
}
