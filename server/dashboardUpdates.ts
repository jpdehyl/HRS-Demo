import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

interface DashboardUpdate {
  type: "call_completed" | "lead_qualified" | "meeting_booked" | "research_complete" | "metrics_refresh";
  payload?: {
    callId?: string;
    leadId?: string;
    sdrId?: string;
    disposition?: string;
    timestamp?: string;
  };
}

// Store active connections by user ID
const activeConnections = new Map<string, Set<WebSocket>>();

export function setupDashboardWebSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade requests for /ws/dashboard path
  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);

    if (url.pathname === "/ws/dashboard") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws, request) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      ws.close(1008, "User ID required");
      return;
    }

    console.log(`[Dashboard WS] User ${userId} connected`);

    // Add to active connections
    if (!activeConnections.has(userId)) {
      activeConnections.set(userId, new Set());
    }
    activeConnections.get(userId)!.add(ws);

    // Send welcome message
    ws.send(JSON.stringify({
      type: "connected",
      message: "Dashboard updates connected",
    }));

    // Handle ping/pong for keepalive
    ws.on("pong", () => {
      // Connection is alive
    });

    ws.on("close", () => {
      console.log(`[Dashboard WS] User ${userId} disconnected`);
      const connections = activeConnections.get(userId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          activeConnections.delete(userId);
        }
      }
    });

    ws.on("error", (error) => {
      console.error(`[Dashboard WS] Error for user ${userId}:`, error);
    });
  });

  // Ping all connections every 30 seconds to keep them alive
  setInterval(() => {
    activeConnections.forEach((connections) => {
      connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      });
    });
  }, 30000);

  console.log("[Dashboard WS] WebSocket server initialized");
}

// Broadcast update to specific user
export function broadcastToUser(userId: string, update: DashboardUpdate): void {
  const connections = activeConnections.get(userId);
  if (!connections) return;

  const message = JSON.stringify(update);
  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Broadcast update to all connected users (for admin/manager broadcasts)
export function broadcastToAll(update: DashboardUpdate): void {
  const message = JSON.stringify(update);
  activeConnections.forEach((connections) => {
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  });
}

// Notify when a call is completed
export function notifyCallCompleted(callId: string, sdrUserId: string, disposition: string): void {
  broadcastToUser(sdrUserId, {
    type: disposition === "meeting-booked" ? "meeting_booked" :
          (disposition === "qualified" ? "lead_qualified" : "call_completed"),
    payload: {
      callId,
      disposition,
      timestamp: new Date().toISOString(),
    },
  });

  // Also broadcast to all (for managers to see updates)
  broadcastToAll({
    type: "metrics_refresh",
    payload: {
      callId,
      sdrId: sdrUserId,
      disposition,
      timestamp: new Date().toISOString(),
    },
  });
}

// Notify when research is complete
export function notifyResearchComplete(leadId: string, sdrUserId: string): void {
  broadcastToUser(sdrUserId, {
    type: "research_complete",
    payload: {
      leadId,
      timestamp: new Date().toISOString(),
    },
  });
}

// Get connection count (for debugging)
export function getConnectionCount(): number {
  let count = 0;
  activeConnections.forEach((connections) => {
    count += connections.size;
  });
  return count;
}
