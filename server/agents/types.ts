/**
 * Agent System Types
 * Defines the structure for the multi-agent architecture
 */

export type AgentType = 'director' | 'researcher' | 'business-analyst' | 'ux-agent' | 'sage';

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentType?: AgentType;
  timestamp?: string;
}

export interface AgentRequest {
  message: string;
  agentType: AgentType;
  conversationHistory?: AgentMessage[];
  userContext?: UserContext;
  includeUserData?: boolean;
}

export interface UserContext {
  userId: number;
  userRole: 'admin' | 'manager' | 'sdr' | 'account_executive' | 'account_specialist';
  sdrId?: number;
  managerId?: number;
  currentPage?: string;
}

export interface AgentResponse {
  response: string;
  agentType: AgentType;
  timestamp: string;
  subAgentsUsed?: AgentType[];
  userData?: UserData;
  metadata?: AgentMetadata;
}

export interface UserData {
  leads?: LeadSummary[];
  calls?: CallSummary[];
  stats?: UserStats;
  team?: TeamData;
}

export interface LeadSummary {
  id: number;
  companyName: string;
  contactName: string;
  status: string;
  fitScore?: number;
  lastContactedAt?: string;
}

export interface CallSummary {
  id: number;
  leadId?: number;
  companyName?: string;
  duration?: number;
  disposition?: string;
  createdAt: string;
}

export interface UserStats {
  callsThisWeek: number;
  leadsContacted: number;
  qualifiedLeads: number;
  connectionRate: number;
}

export interface TeamData {
  totalSdrs: number;
  totalLeads: number;
  totalCallsToday: number;
  topPerformer?: string;
}

export interface AgentMetadata {
  executionTime?: number;
  tokensUsed?: number;
  confidence?: 'high' | 'medium' | 'low';
  dataSourcesUsed?: string[];
}

export interface DirectorPlan {
  task: string;
  approach: 'single' | 'sequential' | 'parallel';
  agents: AgentType[];
  steps: DirectorStep[];
  requiresApproval?: boolean;
  approvalReason?: string;
}

export interface DirectorStep {
  stepNumber: number;
  agent: AgentType;
  action: string;
  dependsOn?: number[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
}

export interface AgentPrompt {
  agentType: AgentType;
  systemPrompt: string;
  capabilities: string[];
  examples: string[];
}

// Agent configuration
export const AGENT_CONFIG: Record<AgentType, { name: string; emoji: string; description: string }> = {
  'sage': {
    name: 'Sage',
    emoji: '🧙',
    description: 'Your AI sales coach - answers questions about leads, calls, and performance'
  },
  'director': {
    name: 'Director',
    emoji: '🎬',
    description: 'Orchestrates complex tasks using multiple specialized agents'
  },
  'researcher': {
    name: 'Researcher',
    emoji: '🔍',
    description: 'Deep intelligence gathering for leads and companies'
  },
  'business-analyst': {
    name: 'Business Analyst',
    emoji: '📊',
    description: 'Strategic insights, analytics, and performance diagnosis'
  },
  'ux-agent': {
    name: 'UX Agent',
    emoji: '🎨',
    description: 'User experience optimization and design recommendations'
  }
};
