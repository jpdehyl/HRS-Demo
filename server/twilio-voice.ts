import type { Express, Request, Response } from "express";
import twilio from "twilio";
import { storage } from "./storage";

const { AccessToken } = twilio.jwt;
const { VoiceGrant } = AccessToken;
const VoiceResponse = twilio.twiml.VoiceResponse;

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_API_KEY_SID = process.env.TWILIO_API_KEY_SID!;
const TWILIO_API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET!;
const TWILIO_TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID!;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER!;

function validateTwilioWebhook(req: Request, res: Response, next: Function): void {
  // Temporarily skip validation for debugging
  console.log("Twilio webhook received:", req.originalUrl, req.body);
  return next();
}

export function registerTwilioVoiceRoutes(app: Express): void {
  app.post("/api/voice/token", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const identity = `user_${user.id}`;

      const accessToken = new AccessToken(
        TWILIO_ACCOUNT_SID,
        TWILIO_API_KEY_SID,
        TWILIO_API_KEY_SECRET,
        { identity, ttl: 3600 }
      );

      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: TWILIO_TWIML_APP_SID,
        incomingAllow: true,
      });

      accessToken.addGrant(voiceGrant);

      res.json({
        token: accessToken.toJwt(),
        identity,
        phoneNumber: TWILIO_PHONE_NUMBER,
      });
    } catch (error) {
      console.error("Token generation error:", error);
      res.status(500).json({ message: "Failed to generate token" });
    }
  });

  app.post("/twilio/voice/outbound", validateTwilioWebhook, async (req: Request, res: Response) => {
    console.log("=== OUTBOUND WEBHOOK ===");
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("To:", req.body.To);
    console.log("From:", req.body.From);
    console.log("CallSid:", req.body.CallSid);
    console.log("TWILIO_PHONE_NUMBER:", TWILIO_PHONE_NUMBER);
    
    const twiml = new VoiceResponse();
    const { To, From, CallSid } = req.body;

    if (!To) {
      twiml.say("No phone number provided.");
      res.type("text/xml");
      return res.send(twiml.toString());
    }

    const baseUrl = process.env.NODE_ENV === "production" 
      ? "https://hawridgesales.replit.app" 
      : `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`;

    const start = twiml.start();
    (start as any).transcription({
      name: `transcription-${CallSid}`,
      track: "both_tracks",
      partialResults: true,
      languageCode: "en-US",
      transcriptionCallback: `${baseUrl}/twilio/transcription`,
      statusCallback: `${baseUrl}/twilio/transcription/status`,
    } as any);

    const dial = twiml.dial({
      callerId: TWILIO_PHONE_NUMBER,
      record: "record-from-answer-dual",
      recordingStatusCallback: "/twilio/voice/recording",
      recordingStatusCallbackMethod: "POST",
    });

    if (To.startsWith("client:")) {
      dial.client(To.replace("client:", ""));
    } else {
      dial.number(To);
    }

    console.log("TwiML response:", twiml.toString());
    res.type("text/xml");
    res.send(twiml.toString());
  });

  app.post("/twilio/voice/inbound", validateTwilioWebhook, async (req: Request, res: Response) => {
    console.log("Inbound webhook received:", req.body);
    
    const twiml = new VoiceResponse();
    const { From, To, CallSid } = req.body;

    twiml.say("Welcome to Lead Intel. Connecting your call.");
    
    const dial = twiml.dial({
      callerId: From,
      record: "record-from-answer-dual",
      recordingStatusCallback: "/twilio/voice/recording",
      recordingStatusCallbackMethod: "POST",
    });

    dial.client("user_default");

    console.log("Inbound TwiML response:", twiml.toString());
    res.type("text/xml");
    res.send(twiml.toString());
  });

  app.post("/twilio/voice/events", validateTwilioWebhook, async (req: Request, res: Response) => {
    console.log("Call status event:", req.body);
    
    const { CallSid, CallStatus, CallDuration, RecordingUrl, From, To } = req.body;

    try {
      const existingSession = await storage.getCallSessionByCallSid(CallSid);
      
      if (existingSession) {
        const updates: any = { status: CallStatus };
        
        if (CallDuration) {
          updates.duration = parseInt(CallDuration, 10);
        }
        
        if (CallStatus === "completed" || CallStatus === "failed" || CallStatus === "busy" || CallStatus === "no-answer") {
          updates.endedAt = new Date();
        }
        
        await storage.updateCallSessionByCallSid(CallSid, updates);
      }
    } catch (error) {
      console.error("Error updating call session:", error);
    }

    res.sendStatus(200);
  });

  app.post("/twilio/voice/recording", validateTwilioWebhook, async (req: Request, res: Response) => {
    console.log("Recording event:", req.body);
    
    const { CallSid, RecordingUrl, RecordingStatus } = req.body;

    if (RecordingStatus === "completed" && RecordingUrl) {
      try {
        await storage.updateCallSessionByCallSid(CallSid, {
          recordingUrl: RecordingUrl,
        });
      } catch (error) {
        console.error("Error saving recording URL:", error);
      }
    }

    res.sendStatus(200);
  });

  app.post("/api/voice/call", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { toNumber, leadId } = req.body;

      if (!toNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      const callSession = await storage.createCallSession({
        userId: req.session.userId,
        leadId: leadId || null,
        direction: "outbound",
        fromNumber: TWILIO_PHONE_NUMBER,
        toNumber,
        status: "initiated",
      });

      res.json({ callSession });
    } catch (error) {
      console.error("Error initiating call:", error);
      res.status(500).json({ message: "Failed to initiate call" });
    }
  });

  app.patch("/api/voice/call/:callSid", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { callSid } = req.params;
      const updates = req.body;

      const session = await storage.updateCallSessionByCallSid(callSid, updates);
      
      if (!session) {
        return res.status(404).json({ message: "Call session not found" });
      }

      res.json({ callSession: session });
    } catch (error) {
      console.error("Error updating call:", error);
      res.status(500).json({ message: "Failed to update call" });
    }
  });

  app.get("/api/voice/calls", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const calls = await storage.getCallSessionsByUser(req.session.userId);
      res.json({ calls });
    } catch (error) {
      console.error("Error fetching calls:", error);
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });
}
