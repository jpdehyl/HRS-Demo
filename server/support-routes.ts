import { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./prompts/supportAgent.js";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SupportChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  userContext?: {
    userId?: number;
    currentPage?: string;
    userRole?: string;
  };
}

interface SupportChatResponse {
  response: string;
  timestamp: string;
}

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

export function registerSupportRoutes(app: Express): void {
  // Support chat endpoint
  app.post("/api/support/chat", async (req: Request, res: Response) => {
    try {
      const { message, conversationHistory = [], userContext } = req.body as SupportChatRequest;

      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Build the system prompt with user context
      const systemPrompt = buildSystemPrompt(userContext);

      // Build messages array for the API call
      const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

      // Add conversation history (limit to last 10 messages for context)
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }

      // Add the current message
      messages.push({
        role: "user",
        content: message,
      });

      console.log(`[SupportChat] Processing message from user ${userContext?.userId || "anonymous"}`);

      const client = getAnthropicClient();

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
        temperature: 0.7,
      });

      // Extract text from response
      const textContent = response.content.find((block) => block.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text content in response");
      }

      const result: SupportChatResponse = {
        response: textContent.text,
        timestamp: new Date().toISOString(),
      };

      console.log(`[SupportChat] Response generated successfully`);
      res.json(result);
    } catch (error) {
      console.error("[SupportChat] Error:", error);

      // Check if it's an API key error
      if (error instanceof Error && error.message.includes("ANTHROPIC_API_KEY")) {
        return res.status(503).json({
          error: "Support chat is temporarily unavailable. Please try again later or contact support@hawkridge.com",
        });
      }

      res.status(500).json({
        error: "Failed to process your message. Please try again or contact support@hawkridge.com",
      });
    }
  });

  // Health check for support service
  app.get("/api/support/status", (_req: Request, res: Response) => {
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
    res.json({
      available: hasApiKey,
      timestamp: new Date().toISOString(),
    });
  });
}
