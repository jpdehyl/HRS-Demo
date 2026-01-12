/**
 * Agent Executor
 * Core engine for executing individual agents using Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { getClaudeClient } from '../ai/claudeClient.js';
import { buildAgentSystemPrompt } from './promptLoader.js';
import {
  AgentType,
  AgentRequest,
  AgentResponse,
  AgentMessage,
  UserContext,
  UserData,
  AGENT_CONFIG
} from './types.js';
import { storage } from '../storage.js';

// Model selection based on agent type
const AGENT_MODELS: Record<AgentType, string> = {
  'sage': 'claude-sonnet-4-20250514',           // Fast for general chat
  'director': 'claude-sonnet-4-20250514',       // Smart for orchestration
  'researcher': 'claude-sonnet-4-20250514',     // Thorough for research
  'business-analyst': 'claude-sonnet-4-20250514', // Analytical
  'ux-agent': 'claude-sonnet-4-20250514'        // Creative
};

const MAX_TOKENS: Record<AgentType, number> = {
  'sage': 2000,
  'director': 4000,
  'researcher': 6000,
  'business-analyst': 4000,
  'ux-agent': 4000
};

/**
 * Execute a single agent with the given request
 */
export async function executeAgent(request: AgentRequest): Promise<AgentResponse> {
  const startTime = Date.now();
  const { message, agentType, conversationHistory, userContext, includeUserData } = request;

  console.log(`[AgentExecutor] Starting ${agentType} agent execution`);

  try {
    // Get Claude client
    const client = getClaudeClient();

    // Build system prompt with context
    const systemPrompt = buildAgentSystemPrompt(agentType, {
      role: userContext?.userRole,
      name: undefined // Could fetch user name if needed
    });

    // Fetch user data if requested
    let userData: UserData | undefined;
    if (includeUserData && userContext) {
      userData = await fetchUserData(userContext);
    }

    // Build messages array
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }
    }

    // Add current message with user data context if available
    let currentMessage = message;
    if (userData) {
      currentMessage = injectUserDataContext(message, userData);
    }

    messages.push({
      role: 'user',
      content: currentMessage
    });

    // Make API call
    const response = await client.messages.create({
      model: AGENT_MODELS[agentType],
      max_tokens: MAX_TOKENS[agentType],
      system: systemPrompt,
      messages,
      temperature: 0.7
    });

    // Extract response text
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in agent response');
    }

    const executionTime = Date.now() - startTime;
    console.log(`[AgentExecutor] ${agentType} completed in ${executionTime}ms`);

    return {
      response: textContent.text,
      agentType,
      timestamp: new Date().toISOString(),
      userData,
      metadata: {
        executionTime,
        tokensUsed: response.usage?.output_tokens
      }
    };
  } catch (error) {
    console.error(`[AgentExecutor] Error executing ${agentType}:`, error);
    throw error;
  }
}

/**
 * Fetch relevant user data based on context
 */
async function fetchUserData(context: UserContext): Promise<UserData> {
  const userData: UserData = {};

  try {
    // Fetch user's leads
    if (context.sdrId) {
      const leads = await storage.getLeadsBySdr(context.sdrId);
      userData.leads = leads.slice(0, 10).map(lead => ({
        id: lead.id,
        companyName: lead.companyName,
        contactName: lead.contactName || '',
        status: lead.status,
        fitScore: lead.fitScore || undefined,
        lastContactedAt: lead.lastContactedAt?.toISOString()
      }));
    }

    // Fetch user's recent calls
    const calls = await storage.getCallSessionsByUser(context.userId);
    userData.calls = calls.slice(0, 5).map(call => ({
      id: call.id,
      leadId: call.leadId || undefined,
      duration: call.duration || undefined,
      disposition: call.disposition || undefined,
      createdAt: call.createdAt?.toISOString() || new Date().toISOString()
    }));

    // Calculate stats
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const callsThisWeek = calls.filter(c => c.createdAt && new Date(c.createdAt) > weekAgo);

    userData.stats = {
      callsThisWeek: callsThisWeek.length,
      leadsContacted: userData.leads?.filter(l => l.status !== 'new').length || 0,
      qualifiedLeads: userData.leads?.filter(l => l.status === 'qualified').length || 0,
      connectionRate: callsThisWeek.length > 0
        ? (callsThisWeek.filter(c => c.disposition === 'connected').length / callsThisWeek.length) * 100
        : 0
    };

    // Fetch team data for managers
    if (context.userRole === 'manager' || context.userRole === 'admin') {
      const sdrs = await storage.getSDRs();
      const allLeads = await storage.getLeads();

      userData.team = {
        totalSdrs: sdrs.length,
        totalLeads: allLeads.length,
        totalCallsToday: 0, // Would need to calculate
        topPerformer: sdrs[0]?.name // Simplified
      };
    }
  } catch (error) {
    console.error('[AgentExecutor] Error fetching user data:', error);
  }

  return userData;
}

/**
 * Inject user data context into the message
 */
function injectUserDataContext(message: string, userData: UserData): string {
  let context = message;

  context += '\n\n---\n**User\'s Current Data:**\n';

  if (userData.stats) {
    context += `\n**Performance Stats:**
- Calls this week: ${userData.stats.callsThisWeek}
- Leads contacted: ${userData.stats.leadsContacted}
- Qualified leads: ${userData.stats.qualifiedLeads}
- Connection rate: ${userData.stats.connectionRate.toFixed(1)}%\n`;
  }

  if (userData.leads && userData.leads.length > 0) {
    context += `\n**Active Leads (${userData.leads.length}):**\n`;
    for (const lead of userData.leads.slice(0, 5)) {
      context += `- ${lead.companyName} (${lead.contactName}) - ${lead.status}`;
      if (lead.fitScore) context += ` [Fit: ${lead.fitScore}%]`;
      context += '\n';
    }
  }

  if (userData.calls && userData.calls.length > 0) {
    context += `\n**Recent Calls (${userData.calls.length}):**\n`;
    for (const call of userData.calls.slice(0, 3)) {
      context += `- ${call.createdAt}: ${call.disposition || 'unknown'}`;
      if (call.duration) context += ` (${Math.round(call.duration / 60)}min)`;
      context += '\n';
    }
  }

  if (userData.team) {
    context += `\n**Team Overview:**
- Total SDRs: ${userData.team.totalSdrs}
- Total Leads: ${userData.team.totalLeads}
- Top Performer: ${userData.team.topPerformer || 'N/A'}\n`;
  }

  return context;
}

/**
 * Get agent info for display
 */
export function getAgentInfo(agentType: AgentType) {
  return AGENT_CONFIG[agentType];
}
