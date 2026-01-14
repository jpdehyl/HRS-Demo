import { useState, useEffect, useCallback, useRef } from "react";

export interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp: string;
  isFinal?: boolean;
}

export interface CoachingTip {
  tip: string;
  timestamp: string;
}

interface TranscriptionMessage {
  type: "transcript" | "coaching_tip";
  callSid: string;
  speaker?: string;
  text?: string;
  timestamp: string;
  isFinal?: boolean;
  tip?: string;
}

export function useTranscription(userId: string | undefined, callSid: string | null) {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [coachingTips, setCoachingTips] = useState<CoachingTip[]>([]);
  const [livePartial, setLivePartial] = useState<{ speaker: string; text: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Prevent multiple connections
    if (!userId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/transcription?userId=${userId}${callSid ? `&callSid=${callSid}` : ""}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Transcription WebSocket connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message: TranscriptionMessage = JSON.parse(event.data);

        if (message.type === "transcript" && message.speaker && message.text) {
          if (message.isFinal) {
            // Add final transcripts to the permanent list
            setTranscripts((prev) => [
              ...prev,
              {
                speaker: message.speaker!,
                text: message.text!,
                timestamp: message.timestamp,
                isFinal: true,
              },
            ]);
            // Clear the live partial when we get a final
            setLivePartial(null);
          } else {
            // Update the live partial for real-time feedback
            setLivePartial({
              speaker: message.speaker!,
              text: message.text!,
            });
          }
        } else if (message.type === "coaching_tip" && message.tip) {
          setCoachingTips((prev) => [
            ...prev,
            {
              tip: message.tip!,
              timestamp: message.timestamp,
            },
          ]);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => {
      console.log("Transcription WebSocket disconnected");
      setIsConnected(false);
      wsRef.current = null;

      // Only auto-reconnect if we still have a userId and this wasn't intentional
      if (userId && reconnectTimeoutRef.current === null) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error("Transcription WebSocket error:", error);
    };

    wsRef.current = ws;
  }, [userId, callSid]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
    setCoachingTips([]);
    setLivePartial(null);
  }, []);

  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  return {
    transcripts,
    coachingTips,
    livePartial,
    isConnected,
    clearTranscripts,
    connect,
    disconnect,
  };
}
