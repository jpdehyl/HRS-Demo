import type { Express, Request, Response, NextFunction } from "express";
import { zoomService, type ZoomPhoneCallLog } from "./zoom-service";
import { storage } from "./storage";
import type { InsertCallSession } from "@shared/schema";

export function registerZoomRoutes(app: Express) {
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

        next();
      } catch (error) {
        console.error("Role check error:", error);
        res.status(500).json({ message: "Authorization check failed" });
      }
    };
  };

  // Expose non-sensitive Zoom config for the embed widget
  app.get("/api/zoom/embed-config", requireAuth, async (req: Request, res: Response) => {
    const clientId = process.env.ZOOM_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({
        configured: false,
        message: "Zoom integration is not configured. ZOOM_CLIENT_ID is missing.",
      });
    }
    res.json({
      configured: true,
      clientId,
    });
  });

  app.get("/api/zoom/test-connection", requireAuth, async (req: Request, res: Response) => {
    try {
      const result = await zoomService.testConnection();
      res.json(result);
    } catch (error) {
      console.error("[Zoom] Test connection error:", error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to test connection",
      });
    }
  });

  app.get("/api/zoom/call-logs", requireAuth, async (req: Request, res: Response) => {
    try {
      const { from, to } = req.query;
      const fromDate = typeof from === "string" ? from : undefined;
      const toDate = typeof to === "string" ? to : undefined;

      const callLogs = await zoomService.getPhoneCallLogs(fromDate, toDate);
      res.json({
        total: callLogs.length,
        callLogs,
      });
    } catch (error) {
      console.error("[Zoom] Get call logs error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch call logs",
      });
    }
  });

  app.get("/api/zoom/recordings", requireAuth, async (req: Request, res: Response) => {
    try {
      const { from, to } = req.query;
      const fromDate = typeof from === "string" ? from : undefined;
      const toDate = typeof to === "string" ? to : undefined;

      const recordings = await zoomService.getCallRecordings(fromDate, toDate);
      res.json({
        total: recordings.length,
        recordings,
      });
    } catch (error) {
      console.error("[Zoom] Get recordings error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch recordings",
      });
    }
  });

  app.post("/api/zoom/sync-calls", requireRole("admin", "manager"), async (req: Request, res: Response) => {
    try {
      const { from, to } = req.body;
      const fromDate = typeof from === "string" ? from : undefined;
      const toDate = typeof to === "string" ? to : undefined;

      console.log(`[Zoom] Syncing call logs from ${fromDate || "7 days ago"} to ${toDate || "today"}`);

      const callLogs = await zoomService.getPhoneCallLogs(fromDate, toDate);
      
      let synced = 0;
      let skipped = 0;
      let errors = 0;

      for (const log of callLogs) {
        try {
          const existing = await storage.getCallSessionByZoomId(log.call_id);
          if (existing) {
            skipped++;
            continue;
          }

          const user = await storage.getUserByEmail(log.user_email || "");
          if (!user) {
            console.log(`[Zoom] Skipping call - no matching user for email: ${log.user_email}`);
            skipped++;
            continue;
          }

          const callSession: InsertCallSession = {
            callSid: `zoom_${log.call_id}`,
            userId: user.id,
            direction: log.direction,
            fromNumber: log.caller_number || "",
            toNumber: log.callee_number || "",
            status: log.result === "connected" ? "completed" : log.result || "completed",
            duration: log.duration,
          };

          await storage.createCallSession(callSession);
          synced++;
        } catch (err) {
          console.error(`[Zoom] Error syncing call ${log.call_id}:`, err);
          errors++;
        }
      }

      console.log(`[Zoom] Sync complete: ${synced} synced, ${skipped} skipped, ${errors} errors`);

      res.json({
        success: true,
        message: `Synced ${synced} calls from Zoom`,
        stats: {
          total: callLogs.length,
          synced,
          skipped,
          errors,
        },
      });
    } catch (error) {
      console.error("[Zoom] Sync calls error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to sync calls",
      });
    }
  });

  app.get("/api/zoom/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const { from, to } = req.query;
      const fromDate = typeof from === "string" ? from : undefined;
      const toDate = typeof to === "string" ? to : undefined;

      const callLogs = await zoomService.getPhoneCallLogs(fromDate, toDate);

      const stats = {
        totalCalls: callLogs.length,
        inboundCalls: callLogs.filter(c => c.direction === "inbound").length,
        outboundCalls: callLogs.filter(c => c.direction === "outbound").length,
        totalDurationMinutes: Math.round(callLogs.reduce((sum, c) => sum + (c.duration || 0), 0) / 60),
        averageDurationSeconds: callLogs.length > 0
          ? Math.round(callLogs.reduce((sum, c) => sum + (c.duration || 0), 0) / callLogs.length)
          : 0,
        connectedCalls: callLogs.filter(c => c.result === "connected" || c.duration > 0).length,
        missedCalls: callLogs.filter(c => c.result === "missed" || c.result === "no_answer").length,
        callsByDay: calculateCallsByDay(callLogs),
      };

      res.json(stats);
    } catch (error) {
      console.error("[Zoom] Get stats error:", error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to get stats",
      });
    }
  });
}

function calculateCallsByDay(logs: ZoomPhoneCallLog[]): { date: string; calls: number; duration: number }[] {
  const byDay: Record<string, { calls: number; duration: number }> = {};

  for (const log of logs) {
    const date = log.date_time.split("T")[0];
    if (!byDay[date]) {
      byDay[date] = { calls: 0, duration: 0 };
    }
    byDay[date].calls++;
    byDay[date].duration += log.duration || 0;
  }

  return Object.entries(byDay)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
