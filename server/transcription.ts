import type { Express, Request, Response } from "express";
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const activeConnections = new Map<string, Set<WebSocket>>();
const callTranscripts = new Map<string, { speaker: string; text: string; timestamp: Date }[]>();

export function setupTranscriptionWebSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    
    if (url.pathname === "/ws/transcription") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws, request) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    const callSid = url.searchParams.get("callSid");
    const userId = url.searchParams.get("userId");

    if (!userId) {
      ws.close(1008, "User ID required");
      return;
    }

    const connectionKey = userId;
    if (!activeConnections.has(connectionKey)) {
      activeConnections.set(connectionKey, new Set());
    }
    activeConnections.get(connectionKey)!.add(ws);

    console.log(`WebSocket connected for user: ${userId}`);

    ws.on("close", () => {
      activeConnections.get(connectionKey)?.delete(ws);
      if (activeConnections.get(connectionKey)?.size === 0) {
        activeConnections.delete(connectionKey);
      }
      console.log(`WebSocket disconnected for user: ${userId}`);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });
}

export function broadcastToUser(userId: string, message: object): void {
  const connections = activeConnections.get(userId);
  if (connections) {
    const data = JSON.stringify(message);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }
}

async function generateCoachingTip(transcript: string, sessionId: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an expert sales coach analyzing a live sales call. Based on the following transcript, provide ONE brief, actionable coaching tip for the sales representative. Keep it under 50 words and make it immediately actionable.

Transcript:
${transcript}

Provide only the coaching tip, no preamble.`,
            },
          ],
        },
      ],
    });

    const tip = response.text?.trim();
    
    if (tip && sessionId) {
      await storage.createLiveCoachingTip({
        sessionId,
        tipType: "real-time",
        content: tip,
        context: transcript.slice(-200),
      });
    }

    return tip || null;
  } catch (error) {
    console.error("Error generating coaching tip:", error);
    return null;
  }
}

export function registerTranscriptionRoutes(app: Express): void {
  app.post("/twilio/transcription/status", async (req: Request, res: Response) => {
    console.log("Transcription status event:", req.body);
    res.sendStatus(200);
  });

  app.post("/twilio/transcription", async (req: Request, res: Response) => {
    console.log("Transcription event received:", req.body);

    const {
      CallSid,
      TranscriptionText,
      TranscriptionSid,
      Track,
      SequenceId,
      Final,
    } = req.body;

    if (!CallSid || !TranscriptionText) {
      return res.sendStatus(200);
    }

    const speaker = Track === "inbound" ? "Customer" : "Agent";
    const transcriptEntry = {
      speaker,
      text: TranscriptionText,
      timestamp: new Date(),
    };

    if (!callTranscripts.has(CallSid)) {
      callTranscripts.set(CallSid, []);
    }
    callTranscripts.get(CallSid)!.push(transcriptEntry);

    const callSession = await storage.getCallSessionByCallSid(CallSid);
    
    if (callSession) {
      broadcastToUser(callSession.userId, {
        type: "transcript",
        callSid: CallSid,
        speaker,
        text: TranscriptionText,
        timestamp: transcriptEntry.timestamp.toISOString(),
        isFinal: Final === "true",
      });

      const transcripts = callTranscripts.get(CallSid) || [];
      const fullTranscript = transcripts
        .map((t) => `${t.speaker}: ${t.text}`)
        .join("\n");

      if (transcripts.length % 3 === 0 && transcripts.length > 0) {
        const tip = await generateCoachingTip(fullTranscript, callSession.id);
        if (tip) {
          broadcastToUser(callSession.userId, {
            type: "coaching_tip",
            callSid: CallSid,
            tip,
            timestamp: new Date().toISOString(),
          });
        }
      }

      const existingTranscript = callSession.transcriptText || "";
      const updatedTranscript = existingTranscript
        ? `${existingTranscript}\n${speaker}: ${TranscriptionText}`
        : `${speaker}: ${TranscriptionText}`;
      
      await storage.updateCallSessionByCallSid(CallSid, {
        transcriptText: updatedTranscript,
      });
    }

    res.sendStatus(200);
  });

  app.get("/api/call/:callSid/transcript", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { callSid } = req.params;
    const callSession = await storage.getCallSessionByCallSid(callSid);

    if (!callSession) {
      return res.status(404).json({ message: "Call not found" });
    }

    if (callSession.userId !== req.session.userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const transcripts = callTranscripts.get(callSid) || [];
    
    res.json({
      transcripts,
      fullText: callSession.transcriptText,
    });
  });

  app.post("/api/coaching/analyze", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { transcript, callSid } = req.body;

    if (!transcript) {
      return res.status(400).json({ message: "Transcript is required" });
    }

    try {
      const callSession = callSid 
        ? await storage.getCallSessionByCallSid(callSid)
        : null;

      const tip = await generateCoachingTip(transcript, callSession?.id || "");
      
      res.json({ tip });
    } catch (error) {
      console.error("Error analyzing transcript:", error);
      res.status(500).json({ message: "Failed to analyze transcript" });
    }
  });
}

export function clearCallTranscripts(callSid: string): void {
  callTranscripts.delete(callSid);
}

export function registerTranscriptionStatusRoute(app: Express): void {
  app.post("/twilio/transcription/status", async (req: Request, res: Response) => {
    console.log("Transcription status event:", req.body);
    res.sendStatus(200);
  });
}
