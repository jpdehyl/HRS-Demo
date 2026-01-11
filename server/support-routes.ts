import { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./prompts/supportAgent.js";
import { storage } from "./storage.js";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface LeadSummary {
  id: string;
  companyName: string;
  contactName: string;
  status: string;
  fitScore: number | null;
  lastContact: string | null;
  nextFollowUp: string | null;
}

interface CallSummary {
  id: string;
  leadName: string | null;
  duration: number | null;
  disposition: string | null;
  date: string;
}

interface UserContextData {
  leads: LeadSummary[];
  recentCalls: CallSummary[];
  stats: {
    totalLeads: number;
    leadsThisWeek: number;
    callsToday: number;
    callsThisWeek: number;
  };
}

interface SupportChatRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  userContext?: {
    userId?: number;
    currentPage?: string;
    userRole?: string;
  };
  includeUserData?: boolean;
}

interface SupportChatResponse {
  response: string;
  timestamp: string;
  userData?: UserContextData;
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

// Keywords that indicate user wants to see their data
const DATA_INTENT_KEYWORDS = {
  leads: ["my leads", "show leads", "list leads", "see leads", "view leads", "leads i have", "assigned leads", "current leads"],
  calls: ["my calls", "recent calls", "call history", "calls today", "show calls", "view calls"],
  stats: ["my stats", "my metrics", "how am i doing", "my performance", "my numbers"],
};

function detectDataIntent(message: string): "leads" | "calls" | "stats" | null {
  const lowerMessage = message.toLowerCase();

  for (const [intent, keywords] of Object.entries(DATA_INTENT_KEYWORDS)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      return intent as "leads" | "calls" | "stats";
    }
  }
  return null;
}

async function fetchUserContextData(userId: string): Promise<UserContextData | null> {
  try {
    const user = await storage.getUser(userId);
    if (!user) return null;

    // Get user's SDR ID if they are an SDR
    const sdrId = user.sdrId;

    // Fetch leads (for SDRs, get their assigned leads)
    let userLeads: any[] = [];
    if (sdrId) {
      userLeads = await storage.getLeadsBySdr(sdrId);
    }

    // Fetch recent calls
    const userCalls = await storage.getCallSessionsByUser(userId);
    const recentCalls = userCalls.slice(0, 10);

    // Calculate stats
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const leadsThisWeek = userLeads.filter(lead => {
      const createdAt = new Date(lead.createdAt);
      return createdAt >= startOfWeek;
    }).length;

    const callsToday = userCalls.filter(call => {
      const callDate = new Date(call.startedAt);
      return callDate >= startOfDay;
    }).length;

    const callsThisWeek = userCalls.filter(call => {
      const callDate = new Date(call.startedAt);
      return callDate >= startOfWeek;
    }).length;

    // Format leads for response
    const leadSummaries: LeadSummary[] = userLeads.slice(0, 20).map(lead => ({
      id: lead.id,
      companyName: lead.companyName || "Unknown Company",
      contactName: lead.contactName || "Unknown Contact",
      status: lead.status || "new",
      fitScore: lead.fitScore,
      lastContact: lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleDateString() : null,
      nextFollowUp: lead.nextFollowUp ? new Date(lead.nextFollowUp).toLocaleDateString() : null,
    }));

    // Format calls for response
    const callSummaries: CallSummary[] = recentCalls.map(call => ({
      id: call.id,
      leadName: null, // Would need to join with leads table
      duration: call.duration,
      disposition: call.disposition,
      date: new Date(call.startedAt).toLocaleDateString(),
    }));

    return {
      leads: leadSummaries,
      recentCalls: callSummaries,
      stats: {
        totalLeads: userLeads.length,
        leadsThisWeek,
        callsToday,
        callsThisWeek,
      },
    };
  } catch (error) {
    console.error("[SupportChat] Error fetching user context:", error);
    return null;
  }
}

function formatUserDataForPrompt(data: UserContextData, intent: string): string {
  let formatted = "\n\n---\n**User's Current Data:**\n";

  if (intent === "leads" || intent === "stats") {
    formatted += `\n**Leads Summary:**\n`;
    formatted += `- Total leads: ${data.stats.totalLeads}\n`;
    formatted += `- New leads this week: ${data.stats.leadsThisWeek}\n\n`;

    if (data.leads.length > 0) {
      formatted += `**Your Leads (${Math.min(data.leads.length, 10)} most recent):**\n`;
      data.leads.slice(0, 10).forEach((lead, i) => {
        formatted += `${i + 1}. **${lead.companyName}** - ${lead.contactName}\n`;
        formatted += `   Status: ${lead.status}${lead.fitScore ? ` | Fit Score: ${lead.fitScore}` : ""}\n`;
        if (lead.nextFollowUp) {
          formatted += `   Next Follow-up: ${lead.nextFollowUp}\n`;
        }
      });
    } else {
      formatted += `_No leads currently assigned._\n`;
    }
  }

  if (intent === "calls" || intent === "stats") {
    formatted += `\n**Calls Summary:**\n`;
    formatted += `- Calls today: ${data.stats.callsToday}\n`;
    formatted += `- Calls this week: ${data.stats.callsThisWeek}\n\n`;

    if (data.recentCalls.length > 0) {
      formatted += `**Recent Calls:**\n`;
      data.recentCalls.slice(0, 5).forEach((call, i) => {
        const duration = call.duration ? `${Math.round(call.duration / 60)} min` : "N/A";
        formatted += `${i + 1}. ${call.date} - Duration: ${duration}`;
        if (call.disposition) {
          formatted += ` | ${call.disposition}`;
        }
        formatted += `\n`;
      });
    } else {
      formatted += `_No recent calls._\n`;
    }
  }

  formatted += "---\n";
  return formatted;
}

export function registerSupportRoutes(app: Express): void {
  // Get user context data endpoint
  app.get("/api/support/context", async (req: Request, res: Response) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userData = await fetchUserContextData(userId);
      if (!userData) {
        return res.status(404).json({ error: "User data not found" });
      }

      res.json(userData);
    } catch (error) {
      console.error("[SupportChat] Error fetching context:", error);
      res.status(500).json({ error: "Failed to fetch user context" });
    }
  });

  // Support chat endpoint with data injection
  app.post("/api/support/chat", async (req: Request, res: Response) => {
    try {
      const { message, conversationHistory = [], userContext, includeUserData } = req.body as SupportChatRequest;

      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Detect if user is asking for their data
      const dataIntent = detectDataIntent(message);
      let userData: UserContextData | null = null;
      let enhancedMessage = message;

      // Fetch user data if they're asking for it or if explicitly requested
      if ((dataIntent || includeUserData) && req.session?.userId) {
        userData = await fetchUserContextData(req.session.userId);

        if (userData && dataIntent) {
          // Append user data to the message for AI context
          enhancedMessage = message + formatUserDataForPrompt(userData, dataIntent);
        }
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

      // Add the current message (possibly enhanced with user data)
      messages.push({
        role: "user",
        content: enhancedMessage,
      });

      console.log(`[SupportChat] Processing message from user ${userContext?.userId || req.session?.userId || "anonymous"}${dataIntent ? ` (data intent: ${dataIntent})` : ""}`);

      const client = getAnthropicClient();

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500, // Increased for data responses
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
        userData: dataIntent ? userData || undefined : undefined,
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
