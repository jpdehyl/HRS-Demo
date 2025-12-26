import type { Express, Request, Response } from "express";
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage";
import { getKnowledgebaseContent } from "./google/driveClient";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
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

async function getKnowledgeBase(): Promise<string> {
  try {
    return await getKnowledgebaseContent();
  } catch (error) {
    console.error("Failed to fetch knowledge base:", error);
    return "";
  }
}

async function generateCoachingTip(transcript: string, sessionId: string): Promise<string | null> {
  try {
    const knowledgeBase = await getKnowledgeBase();
    
    const prompt = `You are an expert sales coach for Hawk Ridge Systems analyzing a live sales call. Based on the transcript and company guidelines, provide ONE brief, actionable coaching tip. Keep it under 50 words and make it immediately actionable.

${knowledgeBase ? `## Company Sales Guidelines:\n${knowledgeBase.slice(0, 2000)}\n\n` : ""}## Live Call Transcript:
${transcript}

## Instructions:
- Focus on what the SDR should do RIGHT NOW or in the next few seconds
- Be specific and actionable (e.g., "Ask about their current CAD workflow" not "Ask more questions")
- Reference Hawk Ridge products (SOLIDWORKS, CAMWorks, 3D printing, PDM) when relevant
- Keep it encouraging but direct

Provide only the coaching tip, no preamble.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const candidate = response.candidates?.[0];
    const textPart = candidate?.content?.parts?.find(
      (part: { text?: string }) => part.text
    );
    const tip = textPart?.text?.trim();
    
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
      TranscriptionEvent,
      CallSid,
      TranscriptionData,
      Track,
    } = req.body;

    // Only process transcription-content events
    if (TranscriptionEvent !== "transcription-content") {
      console.log("Non-content transcription event:", TranscriptionEvent);
      return res.sendStatus(200);
    }

    // Parse TranscriptionData if it's a string
    let transcriptionData = TranscriptionData;
    if (typeof TranscriptionData === "string") {
      try {
        transcriptionData = JSON.parse(TranscriptionData);
      } catch (e) {
        console.error("Failed to parse TranscriptionData:", e);
        return res.sendStatus(200);
      }
    }

    const transcript = transcriptionData?.transcript;
    if (!CallSid || !transcript) {
      console.log("Missing CallSid or transcript");
      return res.sendStatus(200);
    }

    // Track can be "inbound_track" (caller) or "outbound_track" (agent)
    const speaker = Track === "inbound_track" ? "Customer" : "Agent";
    const confidence = transcriptionData?.confidence || 0;
    // Check Final field from the webhook body, not transcriptionData
    const isFinal = req.body.Final === "true";
    
    const callSession = await storage.getCallSessionByCallSid(CallSid);
    
    if (callSession) {
      // Always broadcast to show real-time updates in UI
      broadcastToUser(callSession.userId, {
        type: "transcript",
        callSid: CallSid,
        speaker,
        text: transcript,
        timestamp: new Date().toISOString(),
        isFinal,
        confidence,
      });
    }

    // Only store final transcripts to avoid duplicates
    if (!isFinal) {
      return res.sendStatus(200);
    }

    const transcriptEntry = {
      speaker,
      text: transcript,
      timestamp: new Date(),
    };

    if (!callTranscripts.has(CallSid)) {
      callTranscripts.set(CallSid, []);
    }
    callTranscripts.get(CallSid)!.push(transcriptEntry);

    if (callSession) {

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
        ? `${existingTranscript}\n${speaker}: ${transcript}`
        : `${speaker}: ${transcript}`;
      
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
