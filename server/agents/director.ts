/**
 * Director Agent
 * Orchestrates complex tasks across multiple specialized agents
 */

import { getClaudeClient } from '../ai/claudeClient.js';
import { buildAgentSystemPrompt } from './promptLoader.js';
import { executeAgent } from './agentExecutor.js';
import {
  AgentType,
  AgentRequest,
  AgentResponse,
  DirectorPlan,
  DirectorStep,
  UserContext,
  AGENT_CONFIG
} from './types.js';

/**
 * Director routing prompt for task analysis
 */
const DIRECTOR_ROUTING_PROMPT = `You are the Director Agent analyzing a user request to determine the best approach.

Available sub-agents:
1. **Researcher** 🔍 - Intelligence gathering, lead research, company analysis, pain point identification
2. **Business Analyst** 📊 - Data analysis, metrics, performance diagnosis, forecasting, strategic insights
3. **UX Agent** 🎨 - User experience, design audit, workflow optimization, frontend improvements

Analyze the user's request and respond with a JSON plan:

{
  "task": "Brief summary of the task",
  "approach": "single" | "sequential" | "parallel",
  "agents": ["agent-type-1", "agent-type-2"],
  "steps": [
    {
      "stepNumber": 1,
      "agent": "agent-type",
      "action": "What this agent should do",
      "dependsOn": []
    }
  ],
  "requiresApproval": false,
  "approvalReason": null
}

Rules:
- Use "single" approach if only one agent is needed
- Use "sequential" if agents need to pass results between them
- Use "parallel" if agents can work independently
- Set requiresApproval=true for: database changes, UI modifications, external integrations, data deletion
- Valid agent types: "researcher", "business-analyst", "ux-agent"
- Keep steps minimal - don't over-engineer

Respond ONLY with the JSON, no markdown or explanation.`;

/**
 * Execute the Director agent to orchestrate a complex task
 */
export async function executeDirector(request: AgentRequest): Promise<AgentResponse> {
  const startTime = Date.now();
  console.log('[Director] Starting orchestration for:', request.message.substring(0, 100));

  try {
    // Step 1: Analyze the task and create a plan
    const plan = await createExecutionPlan(request.message, request.userContext);
    console.log('[Director] Created plan:', JSON.stringify(plan, null, 2));

    // Step 2: Check if approval is required
    if (plan.requiresApproval) {
      return createApprovalResponse(plan, startTime);
    }

    // Step 3: Execute the plan
    const result = await executePlan(plan, request);

    // Step 4: Aggregate results
    const aggregatedResponse = aggregateResults(plan, result);

    return {
      response: aggregatedResponse,
      agentType: 'director',
      timestamp: new Date().toISOString(),
      subAgentsUsed: plan.agents,
      metadata: {
        executionTime: Date.now() - startTime
      }
    };
  } catch (error) {
    console.error('[Director] Error during orchestration:', error);
    throw error;
  }
}

/**
 * Create an execution plan by analyzing the user's request
 */
async function createExecutionPlan(message: string, userContext?: UserContext): Promise<DirectorPlan> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: DIRECTOR_ROUTING_PROMPT,
    messages: [
      {
        role: 'user',
        content: `User request: "${message}"\n\nUser role: ${userContext?.userRole || 'unknown'}`
      }
    ],
    temperature: 0.3 // Low temperature for consistent routing
  });

  const textContent = response.content.find(block => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No response from Director routing');
  }

  try {
    // Parse the JSON plan
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Director response');
    }

    const plan = JSON.parse(jsonMatch[0]) as DirectorPlan;

    // Validate and normalize the plan
    plan.steps = plan.steps.map((step, index) => ({
      ...step,
      stepNumber: index + 1,
      status: 'pending' as const,
      dependsOn: step.dependsOn || []
    }));

    return plan;
  } catch (error) {
    console.error('[Director] Failed to parse plan:', textContent.text);
    // Fallback to single agent if parsing fails
    return createFallbackPlan(message);
  }
}

/**
 * Create a fallback plan if routing fails
 */
function createFallbackPlan(message: string): DirectorPlan {
  // Simple keyword-based fallback routing
  const lowerMessage = message.toLowerCase();

  let agent: AgentType = 'researcher';
  if (lowerMessage.includes('analytics') || lowerMessage.includes('performance') ||
      lowerMessage.includes('metrics') || lowerMessage.includes('why')) {
    agent = 'business-analyst';
  } else if (lowerMessage.includes('design') || lowerMessage.includes('ux') ||
             lowerMessage.includes('workflow') || lowerMessage.includes('simplify')) {
    agent = 'ux-agent';
  }

  return {
    task: message,
    approach: 'single',
    agents: [agent],
    steps: [{
      stepNumber: 1,
      agent,
      action: message,
      status: 'pending',
      dependsOn: []
    }]
  };
}

/**
 * Execute the plan by running agents in the correct order
 */
async function executePlan(
  plan: DirectorPlan,
  originalRequest: AgentRequest
): Promise<Map<number, string>> {
  const results = new Map<number, string>();

  if (plan.approach === 'parallel') {
    // Execute all agents in parallel
    const promises = plan.steps.map(async (step) => {
      step.status = 'in_progress';
      const response = await executeAgent({
        message: step.action,
        agentType: step.agent as AgentType,
        userContext: originalRequest.userContext,
        includeUserData: true
      });
      step.status = 'completed';
      step.result = response.response;
      return { stepNumber: step.stepNumber, result: response.response };
    });

    const parallelResults = await Promise.all(promises);
    for (const { stepNumber, result } of parallelResults) {
      results.set(stepNumber, result);
    }
  } else {
    // Execute agents sequentially
    let previousResult = '';

    for (const step of plan.steps) {
      step.status = 'in_progress';

      // Build context from previous steps if dependent
      let contextMessage = step.action;
      if (step.dependsOn && step.dependsOn.length > 0) {
        const dependencies = step.dependsOn
          .map(dep => results.get(dep))
          .filter(Boolean)
          .join('\n\n---\n\n');
        contextMessage = `${step.action}\n\n**Context from previous analysis:**\n${dependencies}`;
      } else if (previousResult) {
        contextMessage = `${step.action}\n\n**Previous agent findings:**\n${previousResult}`;
      }

      const response = await executeAgent({
        message: contextMessage,
        agentType: step.agent as AgentType,
        userContext: originalRequest.userContext,
        includeUserData: step.stepNumber === 1 // Only include user data on first step
      });

      step.status = 'completed';
      step.result = response.response;
      results.set(step.stepNumber, response.response);
      previousResult = response.response;
    }
  }

  return results;
}

/**
 * Aggregate results from multiple agents into a coherent response
 */
function aggregateResults(plan: DirectorPlan, results: Map<number, string>): string {
  const agentEmojis: Record<string, string> = {
    'researcher': '🔍',
    'business-analyst': '📊',
    'ux-agent': '🎨'
  };

  let response = `## 📋 Task: ${plan.task}\n`;
  response += `**Approach:** ${plan.approach === 'single' ? 'Single agent' : plan.approach === 'sequential' ? 'Sequential analysis' : 'Parallel analysis'}\n`;
  response += `**Agents used:** ${plan.agents.map(a => `${agentEmojis[a] || ''} ${AGENT_CONFIG[a as AgentType]?.name || a}`).join(', ')}\n\n`;
  response += `---\n\n`;

  // Add each agent's results
  for (const step of plan.steps) {
    const emoji = agentEmojis[step.agent] || '🤖';
    const agentName = AGENT_CONFIG[step.agent as AgentType]?.name || step.agent;

    response += `### ${emoji} ${agentName} Analysis\n\n`;
    response += step.result || results.get(step.stepNumber) || '_No results_';
    response += '\n\n---\n\n';
  }

  // Add summary if multiple agents
  if (plan.steps.length > 1) {
    response += `### 💡 Director Summary\n\n`;
    response += `This analysis combined insights from ${plan.steps.length} specialized agents. `;
    response += `Key findings are outlined above. Let me know if you'd like to dive deeper into any area.`;
  }

  return response;
}

/**
 * Create an approval request response
 */
function createApprovalResponse(plan: DirectorPlan, startTime: number): AgentResponse {
  let response = `## ⚠️ Approval Required\n\n`;
  response += `I've analyzed your request and created a plan, but it requires your approval before proceeding.\n\n`;
  response += `**Task:** ${plan.task}\n`;
  response += `**Reason:** ${plan.approvalReason || 'This action may make significant changes'}\n\n`;

  response += `### Proposed Plan\n\n`;
  for (const step of plan.steps) {
    const emoji = AGENT_CONFIG[step.agent as AgentType]?.emoji || '🤖';
    response += `${step.stepNumber}. ${emoji} **${step.agent}**: ${step.action}\n`;
  }

  response += `\n### Potential Impact\n`;
  response += `- Agents involved: ${plan.agents.join(', ')}\n`;
  response += `- Approach: ${plan.approach}\n\n`;

  response += `**Reply "approve" to proceed, or tell me how you'd like to adjust the plan.**`;

  return {
    response,
    agentType: 'director',
    timestamp: new Date().toISOString(),
    subAgentsUsed: [],
    metadata: {
      executionTime: Date.now() - startTime,
      confidence: 'high'
    }
  };
}

/**
 * Check if a message is requesting a specific agent
 */
export function detectRequestedAgent(message: string): AgentType | null {
  const lowerMessage = message.toLowerCase();

  // Check for explicit agent mentions
  if (lowerMessage.includes('@director') || lowerMessage.includes('@direct')) return 'director';
  if (lowerMessage.includes('@researcher') || lowerMessage.includes('@research')) return 'researcher';
  if (lowerMessage.includes('@analyst') || lowerMessage.includes('@business')) return 'business-analyst';
  if (lowerMessage.includes('@ux') || lowerMessage.includes('@design')) return 'ux-agent';
  if (lowerMessage.includes('@sage')) return 'sage';

  return null;
}

/**
 * Determine the best agent for a request without explicit mention
 */
export function routeToAgent(message: string): AgentType {
  const lowerMessage = message.toLowerCase();

  // Research-related keywords
  const researchKeywords = ['research', 'find', 'look up', 'investigate', 'company info', 'lead intel', 'pain points', 'news about'];
  if (researchKeywords.some(kw => lowerMessage.includes(kw))) return 'researcher';

  // Analytics-related keywords
  const analyticsKeywords = ['analytics', 'metrics', 'performance', 'why is', 'declining', 'increasing', 'forecast', 'trend', 'compare', 'benchmark'];
  if (analyticsKeywords.some(kw => lowerMessage.includes(kw))) return 'business-analyst';

  // UX-related keywords
  const uxKeywords = ['design', 'ux', 'workflow', 'simplify', 'improve', 'friction', 'usability', 'ui', 'interface'];
  if (uxKeywords.some(kw => lowerMessage.includes(kw))) return 'ux-agent';

  // Complex tasks that need orchestration
  const complexKeywords = ['and then', 'after that', 'multiple', 'comprehensive', 'full analysis', 'end to end'];
  if (complexKeywords.some(kw => lowerMessage.includes(kw))) return 'director';

  // Default to Sage for general questions
  return 'sage';
}
