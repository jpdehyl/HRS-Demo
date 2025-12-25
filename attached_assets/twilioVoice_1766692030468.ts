import twilio from "twilio";
import type { Express, Request, Response } from "express";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import type { Duplex } from "stream";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "../storage";
import { broadcastToSession, processTranscriptChunk } from "../zoom/liveCoaching";
import { getCoachingExamples, uploadFileToDrive, DRIVE_CONFIG } from "../google/driveClient";

const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;
const VoiceResponse = twilio.twiml.VoiceResponse;

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  apiKeySid: string;
  apiKeySecret: string;
  twimlAppSid: string;
  phoneNumber: string;
}

function getTwilioConfig(): TwilioConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !apiKeySid || !apiKeySecret || !twimlAppSid || !phoneNumber) {
    return null;
  }

  return { accountSid, authToken, apiKeySid, apiKeySecret, twimlAppSid, phoneNumber };
}

export function checkTwilioConfig(): { configured: boolean; missing: string[] } {
  const required = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_API_KEY_SID",
    "TWILIO_API_KEY_SECRET",
    "TWILIO_TWIML_APP_SID",
    "TWILIO_PHONE_NUMBER",
  ];

  const missing = required.filter((key) => !process.env[key]);
  return { configured: missing.length === 0, missing };
}

const activeCallSessions = new Map<string, {
  sessionId: string;
  callSid: string;
  leadId?: string;
  sdrId?: string;
  transcriptBuffer: string[];
  lastAnalysisTime: number;
}>();

let mediaStreamWss: WebSocketServer | null = null;

export function initializeTwilioWebSocket(server: Server): void {
  mediaStreamWss = new WebSocketServer({ noServer: true });

  mediaStreamWss.on("connection", (ws, req) => {
    console.log("[Twilio Media] WebSocket connected");
    
    let callSid: string | null = null;
    let streamSid: string | null = null;

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        switch (msg.event) {
          case "start":
            callSid = msg.start.callSid;
            streamSid = msg.start.streamSid;
            console.log(`[Twilio Media] Stream started for call ${callSid}`);
            break;

          case "media":
            break;

          case "stop":
            console.log(`[Twilio Media] Stream stopped for call ${callSid}`);
            if (callSid) {
              const session = activeCallSessions.get(callSid);
              if (session) {
                await storage.updateLiveCoachingSession(session.sessionId, {
                  status: "ended",
                });
                activeCallSessions.delete(callSid);
              }
            }
            break;
        }
      } catch (error) {
        console.error("[Twilio Media] Message parse error:", error);
      }
    });

    ws.on("close", () => {
      console.log("[Twilio Media] WebSocket closed");
    });

    ws.on("error", (error) => {
      console.error("[Twilio Media] WebSocket error:", error);
    });
  });
  
  server.on("upgrade", (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
    
    if (pathname === "/ws/twilio-media") {
      mediaStreamWss!.handleUpgrade(request, socket, head, (ws) => {
        mediaStreamWss!.emit("connection", ws, request);
      });
    }
  });

  console.log("[Twilio] Media Streams WebSocket initialized on /ws/twilio-media");
}

export function registerTwilioRoutes(app: Express): void {
  app.get("/api/twilio/token", async (req, res) => {
    const config = getTwilioConfig();
    if (!config) {
      return res.status(500).json({ error: "Twilio not configured" });
    }

    try {
      const identity = req.query.identity as string || `sdr_${Date.now()}`;
      
      const token = new AccessToken(
        config.accountSid,
        config.apiKeySid,
        config.apiKeySecret,
        { identity, ttl: 3600 }
      );

      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: config.twimlAppSid,
        incomingAllow: true,
      });

      token.addGrant(voiceGrant);

      res.json({
        token: token.toJwt(),
        identity,
        phoneNumber: config.phoneNumber,
      });
    } catch (error) {
      console.error("[Twilio] Token generation error:", error);
      res.status(500).json({ error: "Failed to generate token" });
    }
  });

  app.post("/api/twilio/voice", async (req, res) => {
    console.log("[Twilio Voice] Webhook received:", JSON.stringify(req.body, null, 2));
    
    const config = getTwilioConfig();
    if (!config) {
      console.error("[Twilio Voice] Twilio not configured");
      const errorTwiml = new VoiceResponse();
      errorTwiml.say("System configuration error. Please try again later.");
      res.type("text/xml");
      return res.send(errorTwiml.toString());
    }

    const twiml = new VoiceResponse();
    const to = req.body.To;
    const from = req.body.From;
    const callSid = req.body.CallSid;
    const leadId = req.body.leadId;
    const sdrId = req.body.sdrId;

    console.log(`[Twilio Voice] Outbound call to ${to} from ${from}, CallSid: ${callSid}`);

    if (to) {
      const baseUrl = `https://${req.get('host')}`;
      
      // Create dial with recording AND real-time transcription
      const dial = twiml.dial({
        callerId: config.phoneNumber,
        answerOnBridge: true,
        record: "record-from-answer-dual",
        recordingStatusCallback: `${baseUrl}/api/twilio/recording-status`,
        recordingStatusCallbackMethod: "POST",
        recordingStatusCallbackEvent: ["completed"],
      });

      // Add real-time transcription (paid Twilio feature - we have it!)
      dial.transcription({
        name: "realtime",
        track: "both_tracks",
        transcriptionEventCallback: `${baseUrl}/api/twilio/transcription-events`,
        transcriptionEventCallbackMethod: "POST",
      });

      if (to.match(/^[\d\+\-\(\) ]+$/)) {
        dial.number(to);
      } else {
        dial.client(to);
      }

      try {
        const session = await storage.createLiveCoachingSession({
          zoomMeetingId: `twilio_${callSid}`,
          zoomMeetingUuid: callSid,
          sdrId: sdrId || null,
          leadId: leadId || null,
          hostEmail: from,
          topic: `Call to ${to}`,
          status: "active",
          streamId: null,
          leadContext: null,
          joinUrl: null,
        });

        activeCallSessions.set(callSid, {
          sessionId: session.id,
          callSid,
          leadId,
          sdrId,
          transcriptBuffer: [],
          lastAnalysisTime: Date.now(),
        });

        console.log(`[Twilio] Created coaching session ${session.id} for call ${callSid}`);
      } catch (error) {
        console.error("[Twilio] Failed to create session:", error);
      }
    } else {
      twiml.say("Welcome to Hawk Ridge Systems. Please wait while we connect you.");
    }

    const twimlStr = twiml.toString();
    console.log("[Twilio Voice] Responding with TwiML:", twimlStr);
    res.type("text/xml");
    res.send(twimlStr);
  });

  app.post("/api/twilio/create-session", async (req, res) => {
    const { callSid, phoneNumber, leadId, sdrId, identity } = req.body;
    
    if (!callSid) {
      return res.status(400).json({ error: "callSid is required" });
    }

    const existingSession = activeCallSessions.get(callSid);
    if (existingSession) {
      console.log(`[Twilio] Session already exists for call ${callSid}: ${existingSession.sessionId}`);
      return res.json({ sessionId: existingSession.sessionId, existing: true });
    }

    try {
      const session = await storage.createLiveCoachingSession({
        zoomMeetingId: `twilio_${callSid}`,
        zoomMeetingUuid: callSid,
        sdrId: sdrId || null,
        leadId: leadId || null,
        hostEmail: identity || "client:sdr",
        topic: phoneNumber ? `Call to ${phoneNumber}` : "Twilio Call",
        status: "active",
        streamId: null,
        leadContext: null,
        joinUrl: null,
      });

      activeCallSessions.set(callSid, {
        sessionId: session.id,
        callSid,
        leadId,
        sdrId,
        transcriptBuffer: [],
        lastAnalysisTime: Date.now(),
      });

      console.log(`[Twilio] Created coaching session ${session.id} for call ${callSid} (from client)`);
      res.json({ sessionId: session.id, existing: false });
    } catch (error) {
      console.error("[Twilio] Failed to create session from client:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.post("/api/twilio/transcription", async (req, res) => {
    const callSid = req.body.CallSid;
    const transcriptionText = req.body.TranscriptionText || req.body.transcript;
    const track = req.body.Track || "unknown";
    const isFinal = req.body.isFinal !== false;

    if (!transcriptionText || !callSid) {
      return res.sendStatus(200);
    }

    console.log(`[Twilio Transcription] ${track}: ${transcriptionText}`);

    const session = activeCallSessions.get(callSid);
    if (session) {
      const speaker = track === "inbound" ? "Customer" : "SDR";

      await storage.createLiveTranscript({
        sessionId: session.sessionId,
        speaker,
        content: transcriptionText,
        timestamp: new Date(),
      });

      broadcastToSession(session.sessionId, {
        type: "transcript",
        transcript: {
          speaker,
          content: transcriptionText,
          timestamp: new Date().toISOString(),
        },
      });

      if (isFinal) {
        try {
          const examples = await getCoachingExamples();
          const knowledgeBase = examples.map(e => `## ${e.filename}\n${e.content}`).join("\n\n");
          await processTranscriptChunk(
            session.sessionId,
            speaker,
            transcriptionText,
            knowledgeBase
          );
        } catch (error) {
          console.error("[Twilio] Coaching tip generation error:", error);
        }
      }
    }

    res.sendStatus(200);
  });

  // Real-time transcription events from Twilio's <Transcription> service
  // Docs: https://www.twilio.com/docs/voice/twiml/transcription
  app.post("/api/twilio/transcription-events", async (req, res) => {
    const event = req.body.TranscriptionEvent;
    const callSid = req.body.CallSid;
    const track = req.body.Track; // inbound_track or outbound_track
    const isFinal = req.body.Final === "true" || req.body.Final === true;
    
    // TranscriptionData is a JSON string: {"Transcript": "...", "Confidence": 0.96}
    let transcript = "";
    let confidence = 0;
    
    if (req.body.TranscriptionData) {
      try {
        const data = typeof req.body.TranscriptionData === "string" 
          ? JSON.parse(req.body.TranscriptionData) 
          : req.body.TranscriptionData;
        // Handle both lowercase and uppercase field names
        transcript = data.transcript || data.Transcript || "";
        confidence = data.confidence || data.Confidence || 0;
      } catch (e) {
        console.error("[Twilio RT] Failed to parse TranscriptionData:", e);
      }
    }

    console.log(`[Twilio RT] Event: ${event}, CallSid: ${callSid}, Track: ${track}, Final: ${isFinal}`);
    console.log(`[Twilio RT] Raw TranscriptionData:`, req.body.TranscriptionData);

    if (event === "transcription-started") {
      console.log(`[Twilio RT] Transcription session started for call ${callSid}`);
    } else if (event === "transcription-stopped") {
      console.log(`[Twilio RT] Transcription session stopped for call ${callSid}`);
    } else if (event === "transcription-error") {
      console.error(`[Twilio RT] Transcription error for call ${callSid}:`, req.body);
    } else if (event === "transcription-content" && transcript) {
      console.log(`[Twilio RT] ${track} (${isFinal ? "final" : "partial"}): "${transcript}" [confidence: ${confidence}]`);
      
      const session = activeCallSessions.get(callSid);
      if (session) {
        // inbound_track = caller (customer), outbound_track = callee (SDR's voice going out)
        const speaker = track === "inbound_track" ? "Customer" : "SDR";

        // Store transcript
        await storage.createLiveTranscript({
          sessionId: session.sessionId,
          speaker,
          content: transcript,
          timestamp: new Date(),
        });

        // Broadcast to connected clients
        broadcastToSession(session.sessionId, {
          type: "transcript",
          transcript: {
            speaker,
            content: transcript,
            timestamp: new Date().toISOString(),
            isFinal,
            confidence,
          },
        });

        // Generate coaching tip on final transcripts only (avoid duplicates from partials)
        if (isFinal) {
          try {
            const examples = await getCoachingExamples();
            const knowledgeBase = examples.map(e => `## ${e.filename}\n${e.content}`).join("\n\n");
            await processTranscriptChunk(
              session.sessionId,
              speaker,
              transcript,
              knowledgeBase
            );
          } catch (error) {
            console.error("[Twilio RT] Coaching tip error:", error);
          }
        }
      } else {
        console.log(`[Twilio RT] No active session found for call ${callSid}`);
      }
    }

    res.sendStatus(200);
  });

  app.post("/api/twilio/status", async (req, res) => {
    const callSid = req.body.CallSid;
    const callStatus = req.body.CallStatus;

    console.log(`[Twilio Status] Call ${callSid}: ${callStatus}`);

    if (callStatus === "completed" || callStatus === "failed" || callStatus === "busy" || callStatus === "no-answer") {
      const session = activeCallSessions.get(callSid);
      if (session) {
        await storage.updateLiveCoachingSession(session.sessionId, {
          status: "ended",
        });
        
        broadcastToSession(session.sessionId, {
          type: "session_ended",
          callSid,
          status: callStatus,
        });

        activeCallSessions.delete(callSid);
        console.log(`[Twilio] Session ${session.sessionId} ended with status: ${callStatus}`);
      }
    }

    res.sendStatus(200);
  });

  app.get("/api/twilio/config-status", (req, res) => {
    const status = checkTwilioConfig();
    res.json(status);
  });

  app.get("/api/twilio/sessions", async (req, res) => {
    try {
      const sessions = await storage.getActiveLiveCoachingSessions();
      const twilioSessions = sessions.filter(s => 
        s.zoomMeetingId?.startsWith("twilio_")
      );
      res.json(twilioSessions);
    } catch (error) {
      console.error("[Twilio] Failed to fetch sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.get("/api/twilio/sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getLiveCoachingSession(id);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const tips = await storage.getLiveCoachingTips(id);
      const transcripts = await storage.getLiveTranscripts(id);

      res.json({
        session,
        tips,
        transcripts,
      });
    } catch (error) {
      console.error("[Twilio] Failed to fetch session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  app.post("/api/twilio/recording-status", async (req, res) => {
    const config = getTwilioConfig();
    
    const {
      RecordingSid,
      RecordingUrl,
      RecordingStatus,
      RecordingDuration,
      CallSid,
    } = req.body;

    console.log(`[Twilio Recording] Status: ${RecordingStatus}, CallSid: ${CallSid}, RecordingSid: ${RecordingSid}`);

    if (RecordingStatus !== "completed") {
      return res.sendStatus(200);
    }

    if (!config) {
      console.error("[Twilio Recording] Config not available for download");
      return res.sendStatus(500);
    }

    try {
      let sdrId = "TWILIO";
      let sessionId: string | null = null;

      const inMemorySession = activeCallSessions.get(CallSid);
      if (inMemorySession) {
        sdrId = inMemorySession.sdrId || "TWILIO";
        sessionId = inMemorySession.sessionId;
      } else {
        const dbSession = await storage.findLiveCoachingSessionByCallSid(CallSid);
        if (dbSession) {
          sdrId = dbSession.sdrId || "TWILIO";
          sessionId = dbSession.id;
        }
      }

      const now = new Date();
      const timestamp = now.toISOString()
        .replace(/[-:T]/g, "")
        .slice(0, 12);

      const filename = `${sdrId}${timestamp}Coaching.mp3`;

      console.log(`[Twilio Recording] Downloading recording ${RecordingSid}...`);

      const recordingUrlWithAuth = `${RecordingUrl}.mp3`;
      const response = await fetch(recordingUrlWithAuth, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download recording: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      console.log(`[Twilio Recording] Downloaded ${audioBuffer.length} bytes, uploading to Drive...`);

      const driveFile = await uploadFileToDrive(
        filename,
        audioBuffer,
        "audio/mpeg",
        DRIVE_CONFIG.INBOX_FOLDER_ID
      );

      console.log(`[Twilio Recording] Uploaded to Google Drive: ${driveFile.name} (${driveFile.id})`);

      if (sessionId) {
        broadcastToSession(sessionId, {
          type: "recording_saved",
          filename: driveFile.name,
          driveFileId: driveFile.id,
          duration: RecordingDuration,
        });
      }

      // Automatically process the inbox to transcribe and analyze the recording
      console.log(`[Twilio Recording] Triggering automatic inbox processing...`);
      const { processInbox } = await import("../workflow/processInbox");
      const processingResult = await processInbox();
      console.log(`[Twilio Recording] Processing complete:`, processingResult);

      if (sessionId) {
        broadcastToSession(sessionId, {
          type: "processing_complete",
          result: processingResult,
        });
      }

      res.sendStatus(200);
    } catch (error) {
      console.error("[Twilio Recording] Error processing recording:", error);
      res.status(500).json({ error: "Failed to process recording" });
    }
  });

  console.log("[Twilio] Routes registered");
}
