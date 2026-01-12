import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

interface DashboardUpdate {
  type: "call_completed" | "lead_qualified" | "meeting_booked" | "research_complete" | "metrics_refresh" | "connected";
  message?: string;
  payload?: {
    callId?: string;
    leadId?: string;
    sdrId?: string;
    disposition?: string;
    timestamp?: string;
  };
}

interface UseDashboardUpdatesOptions {
  enabled?: boolean;
  onUpdate?: (update: DashboardUpdate) => void;
}

export function useDashboardUpdates(options: UseDashboardUpdatesOptions = {}) {
  const { enabled = true, onUpdate } = options;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<DashboardUpdate | null>(null);

  const connect = useCallback(() => {
    if (!user?.id || !enabled) return;

    // Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/dashboard?userId=${user.id}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[Dashboard WS] Connected");
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const update: DashboardUpdate = JSON.parse(event.data);
          setLastUpdate(update);

          // Handle different update types
          switch (update.type) {
            case "connected":
              // Just a welcome message, no action needed
              break;

            case "call_completed":
            case "lead_qualified":
            case "meeting_booked":
            case "metrics_refresh":
              // Invalidate dashboard metrics to trigger refetch
              queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
              queryClient.invalidateQueries({ queryKey: ["/api/dashboard/insights"] });
              break;

            case "research_complete":
              // Invalidate leads data
              queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
              break;
          }

          // Call custom handler if provided
          onUpdate?.(update);
        } catch (err) {
          console.error("[Dashboard WS] Error parsing message:", err);
        }
      };

      ws.onclose = (event) => {
        console.log("[Dashboard WS] Disconnected:", event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (enabled && reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[Dashboard WS] Reconnecting (attempt ${reconnectAttemptsRef.current})...`);
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error("[Dashboard WS] Error:", error);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("[Dashboard WS] Failed to connect:", err);
    }
  }, [user?.id, enabled, queryClient, onUpdate]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastUpdate,
    reconnect: connect,
  };
}
