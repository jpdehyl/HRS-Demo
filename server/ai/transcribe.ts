import { GoogleGenAI } from "@google/genai";
import pRetry from "p-retry";

function getGeminiClient(): GoogleGenAI {
  if (process.env.AI_INTEGRATIONS_GEMINI_API_KEY && process.env.AI_INTEGRATIONS_GEMINI_BASE_URL) {
    return new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });
  } else if (process.env.GEMINI_API_KEY) {
    return new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  throw new Error("No Gemini API key configured (AI_INTEGRATIONS_GEMINI_API_KEY or GEMINI_API_KEY)");
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const transcribe = async () => {
    const ai = getGeminiClient();
    const base64Audio = audioBuffer.toString("base64");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Audio
              }
            },
            {
              text: `Please transcribe this sales call audio recording. 
              
Provide a complete and accurate transcription of the conversation.
Include speaker labels where you can distinguish different speakers (e.g., "SDR:", "Prospect:").
Preserve the natural flow of conversation including pauses indicated by "..." where appropriate.
Focus on capturing the exact words spoken, including any sales techniques, objections, and responses.

Output only the transcription text, no additional commentary.`
            }
          ]
        }
      ]
    });

    let text = "";
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            text += part.text;
          }
        }
      }
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Empty transcription received from Gemini");
    }

    return text.trim();
  };

  return pRetry(transcribe, {
    retries: 3,
    minTimeout: 1000,
    maxTimeout: 10000,
    onFailedAttempt: (error) => {
      console.log(`Transcription attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
    }
  });
}
