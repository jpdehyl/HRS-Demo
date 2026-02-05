import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Maximize2, Minimize2, Volume2, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export interface ZoomCallEvent {
  id: string;
  type: string;
  data: {
    callId: string;
    direction: "inbound" | "outbound";
    caller: {
      name?: string;
      phoneNumber?: string;
      extensionNumber?: string;
    };
    callee: {
      name?: string;
      phoneNumber?: string;
      extensionNumber?: string;
    };
    dateTime?: string;
    duration?: number;
    recordingId?: string;
    recordingUrl?: string;
  };
}

export interface ZoomRecordingEvent {
  id: string;
  type: "zp-call-recording-completed-event";
  data: {
    callId: string;
    recordingId: string;
    downloadUrl?: string;
    duration?: number;
  };
}

export interface ZoomAISummaryEvent {
  id: string;
  type: "zp-ai-call-summary-event";
  data: {
    callId: string;
    summary: string;
    action?: "created" | "updated" | "deleted";
  };
}

interface ZoomPhoneEmbedProps {
  onCallStart?: (event: ZoomCallEvent) => void;
  onCallConnected?: (event: ZoomCallEvent) => void;
  onCallEnd?: (event: ZoomCallEvent) => void;
  onRecordingComplete?: (event: ZoomRecordingEvent) => void;
  onAISummary?: (event: ZoomAISummaryEvent) => void;
  initialPhoneNumber?: string;
  leadId?: string;
  className?: string;
  minimized?: boolean;
}

type CallState = "idle" | "ringing" | "connected" | "ended";

export function ZoomPhoneEmbed({
  onCallStart,
  onCallConnected,
  onCallEnd,
  onRecordingComplete,
  onAISummary,
  initialPhoneNumber,
  leadId,
  className = "",
  minimized: initialMinimized = false,
}: ZoomPhoneEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [callState, setCallState] = useState<CallState>("idle");
  const [currentCall, setCurrentCall] = useState<ZoomCallEvent | null>(null);
  const [isMinimized, setIsMinimized] = useState(initialMinimized);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const processedEventsRef = useRef<Set<string>>(new Set());
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ZOOM_ORIGIN = "https://applications.zoom.us";

  // Fetch Zoom embed config (client_id) from the backend
  const { data: zoomConfig, isLoading: configLoading } = useQuery<{ configured: boolean; clientId?: string; message?: string }>({
    queryKey: ["/api/zoom/embed-config"],
    retry: 1,
  });

  // Build embed URL with client_id if available
  const EMBED_URL = zoomConfig?.clientId
    ? `https://applications.zoom.us/integration/phone/embeddablephone/home?client_id=${zoomConfig.clientId}`
    : "https://applications.zoom.us/integration/phone/embeddablephone/home";

  // Set a timeout to detect connection failures
  useEffect(() => {
    if (!zoomConfig?.configured || configLoading) return;

    readyTimeoutRef.current = setTimeout(() => {
      if (!isReady) {
        setConnectionError(
          "Zoom Phone widget did not connect. Please ensure you are logged into your Zoom account and have Zoom Phone enabled."
        );
      }
    }, 15000); // 15 second timeout

    return () => {
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
      }
    };
  }, [zoomConfig, configLoading, isReady]);

  const reloadWidget = useCallback(() => {
    setConnectionError(null);
    setIsReady(false);
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
    }
    if (iframeRef.current) {
      iframeRef.current.src = EMBED_URL;
    }
    readyTimeoutRef.current = setTimeout(() => {
      if (!isReady) {
        setConnectionError(
          "Zoom Phone widget did not connect. Please ensure you are logged into your Zoom account and have Zoom Phone enabled."
        );
      }
    }, 15000);
  }, [EMBED_URL, isReady]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== ZOOM_ORIGIN) return;

      const data = event.data;
      if (!data || !data.type) return;

      if (data.id && processedEventsRef.current.has(data.id)) {
        return;
      }
      if (data.id) {
        processedEventsRef.current.add(data.id);
      }

      console.log("[ZoomPhone] Event received:", data.type, data);

      switch (data.type) {
        case "onZoomPhoneIframeApiReady":
          console.log("[ZoomPhone] iframe API ready");
          setIsReady(true);
          setConnectionError(null);
          if (readyTimeoutRef.current) {
            clearTimeout(readyTimeoutRef.current);
          }
          initializeWidget();
          break;

        case "zp-call-ringing-event":
          setCallState("ringing");
          setCurrentCall(data);
          onCallStart?.(data);
          break;

        case "zp-call-connected-event":
          setCallState("connected");
          setCurrentCall(data);
          onCallConnected?.(data);
          break;

        case "zp-call-ended-event":
          setCallState("ended");
          onCallEnd?.(data);
          setTimeout(() => {
            setCallState("idle");
            setCurrentCall(null);
          }, 2000);
          break;

        case "zp-call-recording-completed-event":
          console.log("[ZoomPhone] Recording completed:", data);
          onRecordingComplete?.(data as ZoomRecordingEvent);
          break;

        case "zp-ai-call-summary-event":
          console.log("[ZoomPhone] AI Summary received:", data);
          onAISummary?.(data as ZoomAISummaryEvent);
          break;

        case "zp-call-log-completed-event":
          console.log("[ZoomPhone] Call log completed:", data);
          break;

        case "zp-call-voicemail-received-event":
          console.log("[ZoomPhone] Voicemail received:", data);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onCallStart, onCallConnected, onCallEnd, onRecordingComplete, onAISummary]);

  const initializeWidget = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;

    iframeRef.current.contentWindow.postMessage(
      {
        type: "zp-init-config",
        data: {
          enableSavingLog: true,
          enableAutoLog: true,
          enableContactSearching: false,
          enableContactMatching: false,
          enableAISummary: true,
          disableInactiveTabCallEvent: true,
        },
      },
      ZOOM_ORIGIN
    );
    console.log("[ZoomPhone] Widget initialized");
  }, []);

  const makeCall = useCallback(
    (phoneNumber: string, callerId?: string) => {
      if (!iframeRef.current?.contentWindow || !isReady) {
        console.warn("[ZoomPhone] Cannot make call - iframe not ready");
        return;
      }

      console.log("[ZoomPhone] Initiating call to:", phoneNumber);
      iframeRef.current.contentWindow.postMessage(
        {
          type: "zp-make-call",
          data: {
            number: phoneNumber,
            callerId: callerId,
            autoDial: true,
          },
        },
        ZOOM_ORIGIN
      );
    },
    [isReady]
  );

  const sendSMS = useCallback(
    (phoneNumber: string) => {
      if (!iframeRef.current?.contentWindow || !isReady) {
        console.warn("[ZoomPhone] Cannot send SMS - iframe not ready");
        return;
      }

      console.log("[ZoomPhone] Opening SMS to:", phoneNumber);
      iframeRef.current.contentWindow.postMessage(
        {
          type: "zp-input-sms",
          data: {
            number: phoneNumber,
          },
        },
        ZOOM_ORIGIN
      );
    },
    [isReady]
  );

  useEffect(() => {
    if (isReady && initialPhoneNumber) {
      setTimeout(() => {
        makeCall(initialPhoneNumber);
      }, 500);
    }
  }, [isReady, initialPhoneNumber, makeCall]);

  const getStatusBadge = () => {
    switch (callState) {
      case "ringing":
        return <Badge variant="outline" className="animate-pulse">Ringing...</Badge>;
      case "connected":
        return <Badge className="bg-green-600">On Call</Badge>;
      case "ended":
        return <Badge variant="secondary">Call Ended</Badge>;
      default:
        return <Badge variant="secondary">Ready</Badge>;
    }
  };

  if (isMinimized) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Zoom Phone
            </CardTitle>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setIsMinimized(false)}
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        {currentCall && callState === "connected" && (
          <CardContent className="pt-0 pb-2">
            <div className="text-xs text-muted-foreground">
              {currentCall.data.direction === "outbound" ? "Calling" : "From"}:{" "}
              {currentCall.data.direction === "outbound"
                ? currentCall.data.callee.phoneNumber
                : currentCall.data.caller.phoneNumber}
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Zoom Phone
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {configLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p className="text-sm">Loading Zoom Phone configuration...</p>
          </div>
        ) : zoomConfig && !zoomConfig.configured ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground px-4">
            <AlertTriangle className="h-10 w-10 mb-3 text-yellow-500" />
            <p className="text-sm font-medium text-foreground mb-1">Zoom Phone Not Configured</p>
            <p className="text-xs text-center">
              {zoomConfig.message || "ZOOM_CLIENT_ID environment variable is not set. Please configure Zoom integration in your environment settings."}
            </p>
          </div>
        ) : (
          <div className="relative w-full" style={{ minHeight: "580px" }}>
            {connectionError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/90 px-6">
                <AlertTriangle className="h-10 w-10 mb-3 text-yellow-500" />
                <p className="text-sm font-medium text-foreground mb-2 text-center">Connection Issue</p>
                <p className="text-xs text-muted-foreground text-center mb-4">{connectionError}</p>
                <div className="space-y-2 text-xs text-muted-foreground mb-4">
                  <p>Checklist:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Log into your Zoom account in this browser</li>
                    <li>Ensure Zoom Phone is enabled on your account</li>
                    <li>Authorize the Zoom Phone Smart Embed app when prompted</li>
                    <li>Check that your domain is in the Zoom app's allowed domains</li>
                  </ul>
                </div>
                <Button size="sm" variant="outline" onClick={reloadWidget}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Connection
                </Button>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={EMBED_URL}
              width="100%"
              height="580"
              allow="microphone; camera; clipboard-read; clipboard-write https://applications.zoom.us"
              style={{
                border: "none",
                borderRadius: "0 0 0.5rem 0.5rem",
              }}
              title="Zoom Phone"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function useZoomPhone() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const ZOOM_ORIGIN = "https://applications.zoom.us";

  const setIframeRef = useCallback((iframe: HTMLIFrameElement | null) => {
    iframeRef.current = iframe;
  }, []);

  const makeCall = useCallback((phoneNumber: string, callerId?: string) => {
    const iframe = document.getElementById("zoom-embeddable-phone-iframe") as HTMLIFrameElement;
    if (!iframe?.contentWindow) {
      console.warn("[ZoomPhone] Cannot make call - iframe not found");
      return;
    }

    iframe.contentWindow.postMessage(
      {
        type: "zp-make-call",
        data: {
          number: phoneNumber,
          callerId: callerId,
          autoDial: true,
        },
      },
      ZOOM_ORIGIN
    );
  }, []);

  const sendSMS = useCallback((phoneNumber: string) => {
    const iframe = document.getElementById("zoom-embeddable-phone-iframe") as HTMLIFrameElement;
    if (!iframe?.contentWindow) {
      console.warn("[ZoomPhone] Cannot send SMS - iframe not found");
      return;
    }

    iframe.contentWindow.postMessage(
      {
        type: "zp-input-sms",
        data: {
          number: phoneNumber,
        },
      },
      ZOOM_ORIGIN
    );
  }, []);

  return {
    setIframeRef,
    makeCall,
    sendSMS,
  };
}
