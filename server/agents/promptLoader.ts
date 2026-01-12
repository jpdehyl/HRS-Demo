/**
 * Agent Prompt Loader
 * Loads agent system prompts from .claude/agents/ directory
 */

import fs from 'fs';
import path from 'path';
import { AgentType, AgentPrompt } from './types.js';

const AGENTS_DIR = path.resolve(process.cwd(), '.claude/agents');

// Cache for loaded prompts
const promptCache: Map<AgentType, AgentPrompt> = new Map();

/**
 * Load an agent's system prompt from its markdown file
 */
export function loadAgentPrompt(agentType: AgentType): AgentPrompt {
  // Check cache first
  if (promptCache.has(agentType)) {
    return promptCache.get(agentType)!;
  }

  const filename = agentType === 'sage' ? 'director.md' : `${agentType}.md`;
  const filePath = path.join(AGENTS_DIR, filename);

  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    const prompt: AgentPrompt = {
      agentType,
      systemPrompt: content,
      capabilities: extractCapabilities(content),
      examples: extractExamples(content)
    };

    promptCache.set(agentType, prompt);
    return prompt;
  } catch (error) {
    console.error(`[PromptLoader] Failed to load prompt for ${agentType}:`, error);
    return getDefaultPrompt(agentType);
  }
}

/**
 * Extract capabilities from the prompt markdown
 */
function extractCapabilities(content: string): string[] {
  const capabilities: string[] = [];
  const capabilitiesMatch = content.match(/\*\*Capabilities:\*\*[\s\S]*?(?=\*\*|##|$)/i);

  if (capabilitiesMatch) {
    const lines = capabilitiesMatch[0].split('\n');
    for (const line of lines) {
      const match = line.match(/^[-•]\s*(.+)/);
      if (match) {
        capabilities.push(match[1].trim());
      }
    }
  }

  return capabilities;
}

/**
 * Extract example use cases from the prompt markdown
 */
function extractExamples(content: string): string[] {
  const examples: string[] = [];
  const examplesMatch = content.match(/\*\*Example (?:tasks|use cases):\*\*[\s\S]*?(?=###|##|$)/i);

  if (examplesMatch) {
    const lines = examplesMatch[0].split('\n');
    for (const line of lines) {
      const match = line.match(/^[-•]\s*["']?(.+?)["']?$/);
      if (match) {
        examples.push(match[1].trim());
      }
    }
  }

  return examples;
}

/**
 * Get default prompt if file not found
 */
function getDefaultPrompt(agentType: AgentType): AgentPrompt {
  const defaults: Record<AgentType, string> = {
    'sage': `You are Sage, an AI sales coach for Lead Intel. Help users with their sales activities, answer questions about leads, calls, and performance. Be supportive, data-driven, and actionable.`,

    'director': `You are the Director Agent, responsible for orchestrating complex tasks across multiple specialized agents. Analyze requests, break them into sub-tasks, route to appropriate agents, and aggregate results.`,

    'researcher': `You are the Researcher Agent, specialized in deep intelligence gathering for lead qualification. Gather actionable intelligence from public data sources to help SDRs have informed conversations with leads.`,

    'business-analyst': `You are the Business Analyst Agent, specialized in transforming sales data into strategic insights. Analyze performance, identify patterns, and provide actionable recommendations for leadership.`,

    'ux-agent': `You are the UX Agent, specialized in user experience optimization. Identify friction points, streamline workflows, and implement improvements to make the platform faster and more intuitive.`
  };

  return {
    agentType,
    systemPrompt: defaults[agentType],
    capabilities: [],
    examples: []
  };
}

/**
 * Build the full system prompt for an agent with context
 */
export function buildAgentSystemPrompt(
  agentType: AgentType,
  userContext?: { role?: string; name?: string }
): string {
  const agentPrompt = loadAgentPrompt(agentType);

  let systemPrompt = agentPrompt.systemPrompt;

  // Add user context if provided
  if (userContext) {
    systemPrompt += `\n\n## Current User Context\n`;
    if (userContext.role) {
      systemPrompt += `- User Role: ${userContext.role}\n`;
    }
    if (userContext.name) {
      systemPrompt += `- User Name: ${userContext.name}\n`;
    }
  }

  // Add platform context
  systemPrompt += `\n\n## Platform Context
You are operating within Lead Intel, an AI-powered Sales Intelligence & Coaching Platform for Hawk Ridge Systems.

Key features you can reference:
- Lead Research: Multi-source intelligence gathering
- Real-Time Call Coaching: Live tips during calls
- Performance Analytics: 7-dimensional call scoring
- Pipeline Management: Lead qualification and handoff tracking

When providing recommendations, be specific to this platform's capabilities.`;

  return systemPrompt;
}

/**
 * Get all available agents
 */
export function getAvailableAgents(): AgentType[] {
  return ['sage', 'director', 'researcher', 'business-analyst', 'ux-agent'];
}

/**
 * Clear the prompt cache (useful for development)
 */
export function clearPromptCache(): void {
  promptCache.clear();
}
