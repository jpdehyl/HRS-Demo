/**
 * Agent API Routes
 * Endpoints for interacting with the multi-agent system
 */

import { Express, Request, Response, NextFunction } from 'express';
import {
  executeAgent,
  executeDirector,
  detectRequestedAgent,
  routeToAgent,
  getAgentInfo,
  getAvailableAgents,
  AgentType,
  AgentRequest,
  AGENT_CONFIG
} from './agents/index.js';
import { storage } from './storage.js';

// Authentication middleware (reuse from routes.ts pattern)
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

export function registerAgentRoutes(app: Express) {
  /**
   * GET /api/agents
   * List all available agents with their info
   */
  app.get('/api/agents', requireAuth, (req: Request, res: Response) => {
    const agents = getAvailableAgents().map(agentType => ({
      type: agentType,
      ...AGENT_CONFIG[agentType]
    }));
    res.json({ agents });
  });

  /**
   * GET /api/agents/:type
   * Get info about a specific agent
   */
  app.get('/api/agents/:type', requireAuth, (req: Request, res: Response) => {
    const agentType = req.params.type as AgentType;

    if (!AGENT_CONFIG[agentType]) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json({
      type: agentType,
      ...AGENT_CONFIG[agentType]
    });
  });

  /**
   * POST /api/agents/ask
   * Main endpoint - ask any agent a question
   * Auto-routes to appropriate agent if not specified
   */
  app.post('/api/agents/ask', requireAuth, async (req: Request, res: Response) => {
    try {
      const { message, agentType: requestedAgent, conversationHistory, includeUserData = true } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: 'Message is required' });
      }

      // Get user context
      const userId = req.session!.userId;
      const user = await storage.getUserById(userId);

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const userContext = {
        userId,
        userRole: user.role as 'admin' | 'manager' | 'sdr' | 'account_executive' | 'account_specialist',
        sdrId: user.sdrId || undefined,
        managerId: user.managerId || undefined
      };

      // Determine which agent to use
      let agentType: AgentType;

      // Check for explicit @mention first
      const mentionedAgent = detectRequestedAgent(message);
      if (mentionedAgent) {
        agentType = mentionedAgent;
      } else if (requestedAgent && AGENT_CONFIG[requestedAgent as AgentType]) {
        // Use explicitly requested agent
        agentType = requestedAgent as AgentType;
      } else {
        // Auto-route based on message content
        agentType = routeToAgent(message);
      }

      console.log(`[AgentRoutes] Routing to ${agentType} for: ${message.substring(0, 50)}...`);

      // Build agent request
      const agentRequest: AgentRequest = {
        message: message.replace(/@\w+\s*/g, '').trim(), // Remove @mentions from message
        agentType,
        conversationHistory,
        userContext,
        includeUserData
      };

      // Execute appropriate agent
      let response;
      if (agentType === 'director') {
        response = await executeDirector(agentRequest);
      } else {
        response = await executeAgent(agentRequest);
      }

      res.json(response);
    } catch (error) {
      console.error('[AgentRoutes] Error processing agent request:', error);
      res.status(500).json({
        message: 'Failed to process agent request',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/agents/director
   * Direct access to Director agent for orchestration
   */
  app.post('/api/agents/director', requireAuth, async (req: Request, res: Response) => {
    try {
      const { message, conversationHistory } = req.body;

      if (!message) {
        return res.status(400).json({ message: 'Message is required' });
      }

      const userId = req.session!.userId;
      const user = await storage.getUserById(userId);

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const agentRequest: AgentRequest = {
        message,
        agentType: 'director',
        conversationHistory,
        userContext: {
          userId,
          userRole: user.role as 'admin' | 'manager' | 'sdr' | 'account_executive' | 'account_specialist',
          sdrId: user.sdrId || undefined,
          managerId: user.managerId || undefined
        },
        includeUserData: true
      };

      const response = await executeDirector(agentRequest);
      res.json(response);
    } catch (error) {
      console.error('[AgentRoutes] Error in director:', error);
      res.status(500).json({
        message: 'Director agent failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /api/agents/:type/ask
   * Ask a specific agent directly
   */
  app.post('/api/agents/:type/ask', requireAuth, async (req: Request, res: Response) => {
    try {
      const agentType = req.params.type as AgentType;

      if (!AGENT_CONFIG[agentType]) {
        return res.status(404).json({ message: 'Agent not found' });
      }

      const { message, conversationHistory, includeUserData = true } = req.body;

      if (!message) {
        return res.status(400).json({ message: 'Message is required' });
      }

      const userId = req.session!.userId;
      const user = await storage.getUserById(userId);

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      const agentRequest: AgentRequest = {
        message,
        agentType,
        conversationHistory,
        userContext: {
          userId,
          userRole: user.role as 'admin' | 'manager' | 'sdr' | 'account_executive' | 'account_specialist',
          sdrId: user.sdrId || undefined,
          managerId: user.managerId || undefined
        },
        includeUserData
      };

      let response;
      if (agentType === 'director') {
        response = await executeDirector(agentRequest);
      } else {
        response = await executeAgent(agentRequest);
      }

      res.json(response);
    } catch (error) {
      console.error(`[AgentRoutes] Error in ${req.params.type}:`, error);
      res.status(500).json({
        message: 'Agent request failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/agents/quick-actions/:role
   * Get suggested quick actions for a user role
   */
  app.get('/api/agents/quick-actions/:role', requireAuth, (req: Request, res: Response) => {
    const role = req.params.role;

    const quickActions: Record<string, Array<{ label: string; message: string; agent: AgentType }>> = {
      sdr: [
        { label: '🔍 Research my top lead', message: '@researcher Research my highest priority lead and give me talk tracks', agent: 'researcher' },
        { label: '📊 How am I doing?', message: '@analyst Analyze my performance this week and suggest improvements', agent: 'business-analyst' },
        { label: '📞 Prep for next call', message: '@researcher Give me a pre-call brief for my next scheduled lead', agent: 'researcher' },
        { label: '💡 Coaching tips', message: 'What should I focus on to improve my qualification rate?', agent: 'sage' }
      ],
      manager: [
        { label: '📊 Team performance', message: '@analyst Give me a team performance overview for this week', agent: 'business-analyst' },
        { label: '🔍 Who needs coaching?', message: '@analyst Which SDRs need coaching and on what skills?', agent: 'business-analyst' },
        { label: '📈 Pipeline health', message: '@analyst Analyze our pipeline health and forecast next month', agent: 'business-analyst' },
        { label: '🎬 Full analysis', message: '@director Why is our qualification rate declining? Diagnose and suggest fixes.', agent: 'director' }
      ],
      admin: [
        { label: '🎬 System analysis', message: '@director Give me a comprehensive system health check', agent: 'director' },
        { label: '📊 Company metrics', message: '@analyst Analyze company-wide sales performance', agent: 'business-analyst' },
        { label: '🎨 UX audit', message: '@ux Audit our main workflows for usability issues', agent: 'ux-agent' }
      ],
      account_executive: [
        { label: '🔍 Research handoff', message: '@researcher Research my latest handoff lead in depth', agent: 'researcher' },
        { label: '📊 Pipeline review', message: '@analyst Review my pipeline and prioritize opportunities', agent: 'business-analyst' }
      ]
    };

    const actions = quickActions[role] || quickActions.sdr;
    res.json({ quickActions: actions });
  });

  console.log('[AgentRoutes] Agent routes registered');
}
