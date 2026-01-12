/**
 * useAgents Hook
 * Provides agent-related functionality for the chat interface
 */

import { useState, useCallback } from 'react';

export type AgentType = 'sage' | 'director' | 'researcher' | 'business-analyst' | 'ux-agent';

export interface Agent {
  type: AgentType;
  name: string;
  emoji: string;
  description: string;
}

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  agentType?: AgentType;
}

export interface AgentResponse {
  response: string;
  agentType: AgentType;
  timestamp: string;
  subAgentsUsed?: AgentType[];
  userData?: Record<string, unknown>;
  metadata?: {
    executionTime?: number;
    tokensUsed?: number;
    confidence?: 'high' | 'medium' | 'low';
  };
}

export interface QuickAction {
  label: string;
  message: string;
  agent: AgentType;
}

// Agent definitions
export const AGENTS: Agent[] = [
  {
    type: 'sage',
    name: 'Sage',
    emoji: '🧙',
    description: 'AI sales coach - answers questions about leads, calls, and performance'
  },
  {
    type: 'director',
    name: 'Director',
    emoji: '🎬',
    description: 'Orchestrates complex tasks using multiple specialized agents'
  },
  {
    type: 'researcher',
    name: 'Researcher',
    emoji: '🔍',
    description: 'Deep intelligence gathering for leads and companies'
  },
  {
    type: 'business-analyst',
    name: 'Analyst',
    emoji: '📊',
    description: 'Strategic insights, analytics, and performance diagnosis'
  },
  {
    type: 'ux-agent',
    name: 'UX Agent',
    emoji: '🎨',
    description: 'User experience optimization and design recommendations'
  }
];

// Quick actions by role
export const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  sdr: [
    { label: '🔍 Research my top lead', message: '@researcher Research my highest priority lead and give me talk tracks', agent: 'researcher' },
    { label: '📊 How am I doing?', message: '@analyst Analyze my performance this week and suggest improvements', agent: 'business-analyst' },
    { label: '📞 Prep for next call', message: '@researcher Give me a pre-call brief for my next scheduled lead', agent: 'researcher' },
    { label: '💡 Coaching tips', message: 'What should I focus on to improve my qualification rate?', agent: 'sage' },
    { label: '🎬 Full analysis', message: '@director Why are my calls not converting? Analyze and suggest fixes.', agent: 'director' }
  ],
  manager: [
    { label: '📊 Team performance', message: '@analyst Give me a team performance overview for this week', agent: 'business-analyst' },
    { label: '🔍 Who needs coaching?', message: '@analyst Which SDRs need coaching and on what skills?', agent: 'business-analyst' },
    { label: '📈 Pipeline health', message: '@analyst Analyze our pipeline health and forecast next month', agent: 'business-analyst' },
    { label: '🎬 Diagnose issues', message: '@director Why is our qualification rate declining? Diagnose and suggest fixes.', agent: 'director' },
    { label: '🔍 Research lead', message: '@researcher Research a specific company for an SDR', agent: 'researcher' }
  ],
  admin: [
    { label: '🎬 System analysis', message: '@director Give me a comprehensive system health check', agent: 'director' },
    { label: '📊 Company metrics', message: '@analyst Analyze company-wide sales performance', agent: 'business-analyst' },
    { label: '🎨 UX audit', message: '@ux Audit our main workflows for usability issues', agent: 'ux-agent' },
    { label: '🔍 Market research', message: '@researcher Research industry trends affecting our customers', agent: 'researcher' }
  ],
  account_executive: [
    { label: '🔍 Research handoff', message: '@researcher Research my latest handoff lead in depth', agent: 'researcher' },
    { label: '📊 Pipeline review', message: '@analyst Review my pipeline and prioritize opportunities', agent: 'business-analyst' },
    { label: '💡 Deal strategy', message: 'Help me develop a strategy for my highest value opportunity', agent: 'sage' }
  ]
};

export function useAgents() {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('sage');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Send a message to an agent
   */
  const askAgent = useCallback(async (
    message: string,
    agentType?: AgentType,
    conversationHistory?: AgentMessage[]
  ): Promise<AgentResponse> => {
    setIsLoading(true);
    setError(null);

    const agent = agentType || selectedAgent;

    try {
      const response = await fetch('/api/agents/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message,
          agentType: agent,
          conversationHistory,
          includeUserData: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to get agent response');
      }

      const data: AgentResponse = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedAgent]);

  /**
   * Get quick actions for a user role
   */
  const getQuickActions = useCallback((role: string): QuickAction[] => {
    return QUICK_ACTIONS[role] || QUICK_ACTIONS.sdr;
  }, []);

  /**
   * Get agent by type
   */
  const getAgent = useCallback((type: AgentType): Agent | undefined => {
    return AGENTS.find(a => a.type === type);
  }, []);

  /**
   * Detect which agent should handle a message based on @mentions
   */
  const detectAgentFromMessage = useCallback((message: string): AgentType | null => {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('@director') || lowerMessage.includes('@direct')) return 'director';
    if (lowerMessage.includes('@researcher') || lowerMessage.includes('@research')) return 'researcher';
    if (lowerMessage.includes('@analyst') || lowerMessage.includes('@business')) return 'business-analyst';
    if (lowerMessage.includes('@ux') || lowerMessage.includes('@design')) return 'ux-agent';
    if (lowerMessage.includes('@sage')) return 'sage';

    return null;
  }, []);

  return {
    agents: AGENTS,
    selectedAgent,
    setSelectedAgent,
    askAgent,
    getQuickActions,
    getAgent,
    detectAgentFromMessage,
    isLoading,
    error
  };
}
