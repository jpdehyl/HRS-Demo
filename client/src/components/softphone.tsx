import { useState, useEffect, useRef, useCallback } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Pause, 
  Play,
  Delete,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type CallState = "idle" | "ready" | "connecting" | "ringing" | "on-call" | "disconnected" | "error";

interface SoftphoneProps {
  onCallStart?: (phoneNumber: string) => void;
  onCallEnd?: (callSessionId?: string) => void;
  isAuthenticated?: boolean;
  initialPhoneNumber?: string;
}

export function Softphone({ onCallStart, onCallEnd, isAuthenticated = false, initialPhoneNumber }: SoftphoneProps) {
  const [device, setDevice] = useState<Device | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber || "");
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentCallSessionId, setCurrentCallSessionId] = useState<string | null>(null);
  
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializingRef = useRef(false);
  const deviceRef = useRef<Device | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (initialPhoneNumber && initialPhoneNumber !== phoneNumber) {
      setPhoneNumber(initialPhoneNumber);
    }
  }, [initialPhoneNumber]);

  const initializeDevice = useCallback(async () => {
    if (deviceRef.current || initializingRef.current || isInitializing) return;
    initializingRef.current = true;
    
    setIsInitializing(true);
    try {
      const response = await fetch("/api/voice/token", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to get voice token");
      }

      const { token, identity } = await response.json();

      const newDevice = new Device(token, {
        codecPreferences: [Call.Codec.PCMU, Call.Codec.Opus],
        enableImprovedSignalingErrorPrecision: true,
      });

      newDevice.on("registered", () => {
        console.log("Twilio Device registered");
        setCallState("ready");
      });

      newDevice.on("error", (error) => {
        console.error("Twilio Device error:", error);
        setCallState("error");
        toast({
          title: "Phone Error",
          description: error.message || "An error occurred with the phone system",
          variant: "destructive",
        });
      });

      newDevice.on("incoming", (call) => {
        console.log("Incoming call from:", call.parameters.From);
        setActiveCall(call);
        setCallState("ringing");
        
        call.on("accept", () => {
          setCallState("on-call");
          startDurationTimer();
        });

        call.on("disconnect", () => {
          handleCallEnd();
        });

        call.on("cancel", () => {
          handleCallEnd();
        });
      });

      await newDevice.register();
      deviceRef.current = newDevice;
      setDevice(newDevice);
    } catch (error) {
      console.error("Failed to initialize device:", error);
      setCallState("error");
      initializingRef.current = false;
      toast({
        title: "Initialization Failed",
        description: "Could not connect to the phone system. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing, toast]);

  useEffect(() => {
    if (isAuthenticated && !deviceRef.current && !initializingRef.current) {
      initializeDevice();
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isAuthenticated]);
  
  useEffect(() => {
    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
      initializingRef.current = false;
    };
  }, []);

  const startDurationTimer = () => {
    setCallDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const handleCallEnd = () => {
    stopDurationTimer();
    const sessionId = currentCallSessionId;
    setActiveCall(null);
    setCallState("ready");
    setIsMuted(false);
    setIsOnHold(false);
    setCallDuration(0);
    setCurrentCallSessionId(null);
    onCallEnd?.(sessionId || undefined);
  };

  const formatPhoneNumber = (number: string): string => {
    const digitsOnly = number.replace(/\D/g, '');
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      return `+${digitsOnly}`;
    } else if (number.startsWith('+')) {
      return number;
    }
    return `+${digitsOnly}`;
  };

  const makeCall = async () => {
    if (!device || !phoneNumber) return;

    try {
      setCallState("connecting");
      
      const formattedNumber = formatPhoneNumber(phoneNumber);
      console.log("Calling:", formattedNumber);

      const callResponse = await apiRequest("POST", "/api/voice/call", {
        toNumber: formattedNumber,
      });
      const callData = await callResponse.json();
      if (callData.callSession?.id) {
        setCurrentCallSessionId(callData.callSession.id);
      }

      const call = await device.connect({
        params: {
          To: formattedNumber,
        },
      });

      setActiveCall(call);
      onCallStart?.(phoneNumber);

      call.on("accept", () => {
        setCallState("on-call");
        startDurationTimer();
      });

      call.on("ringing", () => {
        setCallState("ringing");
      });

      call.on("disconnect", () => {
        handleCallEnd();
      });

      call.on("cancel", () => {
        handleCallEnd();
      });

      call.on("error", (error) => {
        console.error("Call error:", error);
        setCallState("error");
        toast({
          title: "Call Error",
          description: error.message || "An error occurred during the call",
          variant: "destructive",
        });
        handleCallEnd();
      });
    } catch (error) {
      console.error("Failed to make call:", error);
      setCallState("error");
      toast({
        title: "Call Failed",
        description: "Could not connect the call. Please try again.",
        variant: "destructive",
      });
    }
  };

  const hangUp = () => {
    if (activeCall) {
      activeCall.disconnect();
    }
  };

  const toggleMute = () => {
    if (activeCall) {
      if (isMuted) {
        activeCall.mute(false);
      } else {
        activeCall.mute(true);
      }
      setIsMuted(!isMuted);
    }
  };

  const acceptIncomingCall = () => {
    if (activeCall) {
      activeCall.accept();
    }
  };

  const rejectIncomingCall = () => {
    if (activeCall) {
      activeCall.reject();
      handleCallEnd();
    }
  };

  const handleDialPadPress = (digit: string) => {
    if (callState === "on-call" && activeCall) {
      activeCall.sendDigits(digit);
    } else {
      setPhoneNumber((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const clearPhoneNumber = () => {
    setPhoneNumber("");
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusColor = (): "default" | "secondary" | "destructive" | "outline" => {
    switch (callState) {
      case "ready":
        return "secondary";
      case "on-call":
        return "default";
      case "ringing":
      case "connecting":
        return "outline";
      case "error":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusText = (): string => {
    switch (callState) {
      case "idle":
        return "Initializing...";
      case "ready":
        return "Ready";
      case "connecting":
        return "Connecting...";
      case "ringing":
        return "Ringing...";
      case "on-call":
        return formatDuration(callDuration);
      case "disconnected":
        return "Call Ended";
      case "error":
        return "Error";
      default:
        return "Unknown";
    }
  };

  const dialPadButtons = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "#"],
  ];

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Softphone
          </CardTitle>
          <Badge variant={getStatusColor()} data-testid="status-call">
            {getStatusText()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Input
            type="tel"
            placeholder="Enter phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="pr-16 text-lg font-mono"
            disabled={callState === "on-call" || callState === "ringing"}
            data-testid="input-phone-number"
          />
          {phoneNumber && callState !== "on-call" && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleBackspace}
                data-testid="button-backspace"
              >
                <Delete className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={clearPhoneNumber}
                data-testid="button-clear"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {dialPadButtons.map((row, rowIndex) =>
            row.map((digit) => (
              <Button
                key={digit}
                variant="outline"
                className="h-12 text-lg font-semibold"
                onClick={() => handleDialPadPress(digit)}
                disabled={callState === "idle" || callState === "connecting"}
                data-testid={`button-dial-${digit}`}
              >
                {digit}
              </Button>
            ))
          )}
        </div>

        {callState === "ringing" && activeCall?.direction === "INCOMING" ? (
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={acceptIncomingCall}
              data-testid="button-accept-call"
            >
              <Phone className="h-4 w-4 mr-2" />
              Accept
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={rejectIncomingCall}
              data-testid="button-reject-call"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        ) : callState === "on-call" || callState === "connecting" || callState === "ringing" ? (
          <div className="flex gap-2">
            <Button
              variant={isMuted ? "secondary" : "outline"}
              className="flex-1"
              onClick={toggleMute}
              disabled={callState !== "on-call"}
              data-testid="button-mute"
            >
              {isMuted ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  Unmute
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Mute
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={hangUp}
              data-testid="button-hangup"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              End Call
            </Button>
          </div>
        ) : (
          <Button
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={makeCall}
            disabled={!phoneNumber || callState !== "ready" || isInitializing}
            data-testid="button-call"
          >
            <Phone className="h-4 w-4 mr-2" />
            {isInitializing ? "Connecting..." : "Call"}
          </Button>
        )}

        {callState === "error" && (
          <Button
            variant="outline"
            className="w-full"
            onClick={initializeDevice}
            data-testid="button-retry"
          >
            Retry Connection
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
