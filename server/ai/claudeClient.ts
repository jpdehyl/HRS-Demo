import Anthropic from "@anthropic-ai/sdk";
import pRetry from "p-retry";

let clientInstance: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!clientInstance) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    clientInstance = new Anthropic({ apiKey });
  }
  return clientInstance;
}

export interface ClaudeCompletionOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function callClaudeWithRetry(
  options: ClaudeCompletionOptions
): Promise<string> {
  const { prompt, systemPrompt, maxTokens = 8000, temperature = 0.7 } = options;
  
  const client = getClaudeClient();
  
  const makeRequest = async () => {
    console.log(`[ClaudeClient] Making API request (model: claude-opus-4-20250514, tokens: ${maxTokens})`);
    const startTime = Date.now();
    
    const response = await client.messages.create({
      model: "claude-opus-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt || "You are an expert B2B sales intelligence analyst.",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`[ClaudeClient] API call completed in ${elapsed}ms`);
    
    const textContent = response.content.find(block => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in Claude response");
    }
    
    return textContent.text;
  };
  
  return pRetry(makeRequest, {
    retries: 3,
    minTimeout: 2000,
    maxTimeout: 30000,
    factor: 2,
    randomize: true,
    onFailedAttempt: (error) => {
      console.log(`[ClaudeClient] Attempt ${error.attemptNumber} failed. Retries left: ${error.retriesLeft}. Error: ${String(error)}`);
    }
  });
}

export function extractJsonFromResponse(text: string): Record<string, unknown> {
  let cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    console.error("[ClaudeClient] No JSON found in response. First 500 chars:", cleanedText.substring(0, 500));
    throw new Error("No valid JSON found in AI response");
  }
  
  return JSON.parse(jsonMatch[0]);
}
