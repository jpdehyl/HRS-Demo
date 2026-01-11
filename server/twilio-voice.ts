import type { Express, Request, Response } from "express";
import twilio from "twilio";
import { z } from "zod";
import { storage } from "./storage";
import { uploadFileToDrive } from "./google/driveClient";
import { GOOGLE_CONFIG } from "./google/config";
import { processPostCallCoaching } from "./ai/coachingAnalysis";
import { notifyCallCompleted } from "./notificationService";

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
  // Skip validation in development mode
  if (process.env.NODE_ENV === "development") {
    return next();
  }

  const twilioSignature = req.headers['x-twilio-signature'] as string;
  if (!twilioSignature) {
    console.error("Missing Twilio signature");
    res.status(403).send("Forbidden");
    return;
  }

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const url = `${protocol}://${host}${req.originalUrl}`;
  
  const isValid = twilio.validateRequest(
    TWILIO_AUTH_TOKEN,
    twilioSignature,
    url,
    req.body
  );

  if (!isValid) {
    console.error("Invalid Twilio signature for URL:", url);
    res.status(403).send("Forbidden");
    return;
  }

  next();
}

// Validation schema for call session updates
const updateCallSessionSchema = z.object({
  status: z.enum(["in-progress", "completed", "failed", "no-answer", "busy", "canceled"]).optional(),
  duration: z.number().optional(),
  recordingUrl: z.string().url().optional().or(z.literal("")),
  disposition: z.enum(["connected", "voicemail", "no_answer", "busy", "invalid_number", "do_not_call"]).optional(),
  keyTakeaways: z.string().optional(),
  nextSteps: z.string().optional(),
  sdrNotes: z.string().optional(),
}).strict();

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
    console.log("Outbound webhook received:", req.body.CallSid, "To:", req.body.To);
    
    const twiml = new VoiceResponse();
    const { To, From, CallSid } = req.body;

    if (!To) {
      twiml.say("No phone number provided.");
      res.type("text/xml");
      return res.send(twiml.toString());
    }

    // Link the CallSid to the most recent initiated call session for this phone number
    try {
      console.log(`[OutboundWebhook] Looking for recent session to phone: ${To}`);
      const recentSession = await storage.getRecentInitiatedCallSession(To);
      if (recentSession) {
        await storage.updateCallSession(recentSession.id, { 
          callSid: CallSid,
          status: "ringing"
        });
        console.log(`[OutboundWebhook] SUCCESS: Linked CallSid ${CallSid} to session ${recentSession.id}`);
      } else {
        console.log(`[OutboundWebhook] WARNING: No recent session found for ${To}, coaching tips may not work!`);
      }
    } catch (error) {
      console.error("[OutboundWebhook] Error linking CallSid to session:", error);
    }

    const baseUrl = process.env.NODE_ENV === "production" 
      ? "https://hawridgesales.replit.app" 
      : `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers['x-forwarded-host'] || req.get('host')}`;

    const start = twiml.start();
    (start as any).transcription({
      name: `transcription-${CallSid}`,
      track: "both_tracks",
      partialResults: "true",
      languageCode: "en-US",
      statusCallbackUrl: `${baseUrl}/twilio/transcription`,
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
        
        if (CallStatus === "completed") {
          // Re-fetch session to get the latest transcript (may have been updated via WebSocket)
          const updatedSession = await storage.getCallSessionByCallSid(CallSid);
          
          if (updatedSession?.userId) {
            const lead = updatedSession.leadId ? await storage.getLead(updatedSession.leadId) : null;
            const leadName = lead?.contactName || lead?.companyName || "Unknown";
            const duration = updatedSession.duration || parseInt(CallDuration, 10) || 0;
            
            notifyCallCompleted(updatedSession.userId, updatedSession.id, leadName, duration).catch(err => {
              console.error("[Notification] Failed to send call completion notification:", err);
            });
          }
          
          if (updatedSession?.transcriptText && updatedSession.transcriptText.trim().length >= 50) {
            console.log(`[Coaching] Call completed with transcript, triggering coaching email for call ${CallSid}`);
            processPostCallCoaching(updatedSession).catch(err => {
              console.error("[Coaching] Failed to process post-call coaching:", err);
            });
          } else {
            console.log(`[Coaching] Call completed but transcript too short or missing for call ${CallSid}`);
          }
        }
      }
    } catch (error) {
      console.error("Error updating call session:", error);
    }

    res.sendStatus(200);
  });

  app.post("/twilio/voice/recording", validateTwilioWebhook, async (req: Request, res: Response) => {
    console.log("Recording event:", req.body);
    
    const { CallSid, RecordingUrl, RecordingStatus, RecordingSid } = req.body;

    if (RecordingStatus === "completed" && RecordingUrl) {
      try {
        await storage.updateCallSessionByCallSid(CallSid, {
          recordingUrl: RecordingUrl,
        });

        const callSession = await storage.getCallSessionByCallSid(CallSid);
        if (callSession) {
          const user = callSession.userId ? await storage.getUser(callSession.userId) : null;
          const sdr = user?.sdrId ? await storage.getSdr(user.sdrId) : null;
          const sdrName = sdr?.name || user?.name || "Unknown";
          
          const callDate = callSession.startedAt ? new Date(callSession.startedAt) : new Date();
          const year = callDate.getFullYear().toString().slice(-2);
          const month = String(callDate.getMonth() + 1).padStart(2, "0");
          const day = String(callDate.getDate()).padStart(2, "0");
          const hour = String(callDate.getHours()).padStart(2, "0");
          const minute = String(callDate.getMinutes()).padStart(2, "0");
          const dateTimeStr = `${year}${month}${day}${hour}${minute}`;
          
          const sdrPrefix = sdrName.split(" ")[0]?.toUpperCase().slice(0, 6) || "SDR";
          const filename = `${sdrPrefix}${dateTimeStr}Call.wav`;

          console.log(`[Recording] Downloading recording from Twilio: ${RecordingUrl}`);
          
          (async () => {
            try {
              const audioUrl = `${RecordingUrl}.wav`;
              const response = await fetch(audioUrl, {
                headers: {
                  "Authorization": `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`
                }
              });

              if (response.ok) {
                const audioBuffer = Buffer.from(await response.arrayBuffer());
                console.log(`[Recording] Downloaded ${audioBuffer.length} bytes, uploading to Google Drive as ${filename}`);
                
                const driveFile = await uploadFileToDrive(
                  filename,
                  audioBuffer,
                  "audio/wav",
                  GOOGLE_CONFIG.PROCESSED_FOLDER_ID
                );
                
                console.log(`[Recording] Uploaded to Google Drive: ${driveFile.id}`);
                
                await storage.updateCallSessionByCallSid(CallSid, {
                  driveFileId: driveFile.id,
                });
              } else if (response.status === 404) {
                console.log("[Recording] WAV not found, trying MP3 format...");
                const mp3Response = await fetch(`${RecordingUrl}.mp3`, {
                  headers: {
                    "Authorization": `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`
                  }
                });
                
                if (mp3Response.ok) {
                  const mp3Buffer = Buffer.from(await mp3Response.arrayBuffer());
                  const mp3Filename = filename.replace(".wav", ".mp3");
                  console.log(`[Recording] Downloaded MP3 ${mp3Buffer.length} bytes, uploading as ${mp3Filename}`);
                  
                  const driveFile = await uploadFileToDrive(
                    mp3Filename,
                    mp3Buffer,
                    "audio/mpeg",
                    GOOGLE_CONFIG.PROCESSED_FOLDER_ID
                  );
                  
                  console.log(`[Recording] Uploaded MP3 to Google Drive: ${driveFile.id}`);
                  
                  await storage.updateCallSessionByCallSid(CallSid, {
                    driveFileId: driveFile.id,
                  });
                } else {
                  console.error(`[Recording] MP3 also failed: ${mp3Response.status}`);
                }
              } else {
                console.error(`[Recording] Failed to download: ${response.status} ${response.statusText}`);
              }
            } catch (downloadError) {
              console.error("[Recording] Error downloading/uploading recording:", downloadError);
            }
          })();
        }
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

      // Validate request body
      const updates = updateCallSessionSchema.parse(req.body);

      const session = await storage.updateCallSessionByCallSid(callSid, updates);

      if (!session) {
        return res.status(404).json({ message: "Call session not found" });
      }

      res.json({ callSession: session });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors,
        });
      }
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

  app.get("/api/voice/recording/:recordingSid", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { recordingSid } = req.params;
      
      const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Recordings/${recordingSid}.mp3`;
      
      const authHeader = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
      
      const response = await fetch(recordingUrl, {
        headers: {
          'Authorization': `Basic ${authHeader}`
        }
      });

      if (!response.ok) {
        console.error("Failed to fetch recording:", response.status, response.statusText);
        return res.status(response.status).json({ message: "Failed to fetch recording" });
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', `inline; filename="${recordingSid}.mp3"`);
      
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      console.error("Error fetching recording:", error);
      res.status(500).json({ message: "Failed to fetch recording" });
    }
  });
}
