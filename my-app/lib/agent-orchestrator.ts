import { AGENT_CONFIG } from './agent-config';
import { toolsRegistry, type ToolId } from './tools';
import { mcpClientManager } from './mcp-client';

export interface AgentState {
  currentTask?: string;
  activeTools: ToolId[];
  executionHistory: ExecutionStep[];
  context: Record<string, any>;
}

export interface ExecutionStep {
  step: number;
  action: 'tool_call' | 'reasoning' | 'synthesis';
  tool?: ToolId | string;
  input?: any;
  output?: any;
  error?: string;
  timestamp: string;
}

export class AgentOrchestrator {
  private state: AgentState;
  
  constructor(initialTools: ToolId[] = []) {
    this.state = {
      activeTools: initialTools,
      executionHistory: [],
      context: {},
    };
  }

  /**
   * Plan the execution strategy for a given user request
   */
  async planExecution(userInput: string, enabledTools: ToolId[]): Promise<ExecutionStep[]> {
    const plan: ExecutionStep[] = [];
    let stepCounter = 1;

    // Analyze the user input to determine required tools and approach
    const requiredTools = await this.analyzeRequiredTools(userInput, enabledTools);
    
    // Add reasoning step
    plan.push({
      step: stepCounter++,
      action: 'reasoning',
      timestamp: new Date().toISOString(),
    });

    // Add tool execution steps
    for (const tool of requiredTools) {
      plan.push({
        step: stepCounter++,
        action: 'tool_call',
        tool: tool as ToolId,
        timestamp: new Date().toISOString(),
      });
    }

    // Add synthesis step
    plan.push({
      step: stepCounter++,
      action: 'synthesis',
      timestamp: new Date().toISOString(),
    });

    return plan;
  }

  /**
   * Analyze user input to determine which tools might be needed
   */
  private async analyzeRequiredTools(userInput: string, enabledTools: ToolId[]): Promise<(ToolId | string)[]> {
    const input = userInput.toLowerCase();
    const suggestedTools: (ToolId | string)[] = [];

    // Pattern matching for tool requirements
    const toolPatterns = {
      'web-search': ['search', 'find', 'current', 'latest', 'news', 'information'],
      'calculator': ['calculate', 'math', 'compute', 'number', '+', '-', '*', '/', '='],
      'code-interpreter': ['code', 'python', 'javascript', 'run', 'execute', 'debug'],
      'weather': ['weather', 'temperature', 'forecast', 'climate'],
      'solana-balance': ['balance', 'wallet', 'sol balance'],
      'solana-token-price': ['price', 'token', 'sol', 'usdc', 'ray'],
      'defi-analyzer': ['defi', 'yield', 'liquidity', 'apy', 'pool'],
      'nft-analyzer': ['nft', 'collection', 'floor price', 'opensea'],
      'image-generator': ['generate image', 'create image', 'draw', 'picture'],
      'pdf-reader': ['pdf', 'document', 'read file'],
    };

    // Check regular tools
    for (const [tool, patterns] of Object.entries(toolPatterns)) {
      if (enabledTools.includes(tool as ToolId)) {
        const hasMatch = patterns.some(pattern => input.includes(pattern));
        if (hasMatch) {
          suggestedTools.push(tool as ToolId);
        }
      }
    }

    // Check MCP tools
    try {
      const mcpTools = await mcpClientManager.getTools();
      for (const [mcpToolName, mcpTool] of Object.entries(mcpTools)) {
        if (mcpTool.description) {
          const description = mcpTool.description.toLowerCase();
          // Simple keyword matching for MCP tools
          if (input.includes('file') && description.includes('file')) {
            suggestedTools.push(mcpToolName);
          } else if (input.includes('git') && description.includes('git')) {
            suggestedTools.push(mcpToolName);
          } else if (input.includes('database') && description.includes('database')) {
            suggestedTools.push(mcpToolName);
          } else if (input.includes('fetch') && description.includes('fetch')) {
            suggestedTools.push(mcpToolName);
          } else if (input.includes('memory') && description.includes('memory')) {
            suggestedTools.push(mcpToolName);
          }
        }
      }
    } catch (error) {
      console.error('Failed to analyze MCP tools:', error);
    }

    // If no specific tools match but web search is available, include it for general queries
    if (suggestedTools.length === 0 && enabledTools.includes('web-search')) {
      suggestedTools.push('web-search');
    }

    return suggestedTools;
  }

  /**
   * Execute a planned step
   */
  async executeStep(step: ExecutionStep, context: any = {}): Promise<any> {
    try {
      switch (step.action) {
        case 'tool_call':
          if (!step.tool) throw new Error('No tool specified for tool_call step');
          return await this.executeTool(step.tool, step.input || {});
          
        case 'reasoning':
          return this.performReasoning(context);
          
        case 'synthesis':
          return this.synthesizeResults(context);
          
        default:
          throw new Error(`Unknown action: ${step.action}`);
      }
    } catch (error) {
      step.error = error instanceof Error ? error.message : String(error);
      return { error: step.error };
    }
  }

  /**
   * Execute a specific tool (regular or MCP)
   */
  private async executeTool(toolId: ToolId | string, input: any): Promise<any> {
    // Check if it's a regular tool
    if (typeof toolId === 'string' && toolId in toolsRegistry) {
      const tool = toolsRegistry[toolId as ToolId];
      try {
        const result = await Promise.race([
          tool.execute?.(input, { toolCallId: 'agent-call', messages: [], abortSignal: new AbortController().signal }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tool execution timeout')), AGENT_CONFIG.toolTimeout)
          )
        ]);
        
        this.updateContext(toolId as ToolId, result);
        return result;
      } catch (error) {
        throw new Error(`Tool execution failed: ${error}`);
      }
    }

    // Check if it's an MCP tool
    try {
      const mcpTools = await mcpClientManager.getTools();
      const mcpTool = mcpTools[toolId as string];
      
      if (mcpTool) {
        // MCP tools are handled by the AI SDK during chat completion
        // This is more of a planning/tracking method
        console.log(`MCP tool ${toolId} planned for execution`);
        return { message: `MCP tool ${toolId} will be executed by the AI model` };
      }
    } catch (error) {
      console.error('Failed to check MCP tools:', error);
    }

    throw new Error(`Tool not found: ${toolId}`);
  }

  /**
   * Perform reasoning based on current context
   */
  private performReasoning(context: any): string {
    return `Analyzing the request and determining the best approach...`;
  }

  /**
   * Synthesize results from multiple tool executions
   */
  private synthesizeResults(context: any): string {
    return `Combining information from multiple sources to provide a comprehensive answer...`;
  }

  /**
   * Update the agent's context with new information
   */
  private updateContext(toolId: ToolId, result: any): void {
    this.state.context[toolId] = result;
  }

  /**
   * Get current agent state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Add execution step to history
   */
  addExecutionStep(step: ExecutionStep): void {
    this.state.executionHistory.push(step);
  }

  /**
   * Determine if retry is warranted for a failed step
   */
  shouldRetry(step: ExecutionStep, attemptCount: number): boolean {
    if (attemptCount >= AGENT_CONFIG.errorHandling.maxRetries) {
      return false;
    }

    if (step.error?.includes('timeout')) {
      return true;
    }

    if (step.error?.includes('rate limit')) {
      return true;
    }

    return false;
  }

  /**
   * Get all available tools (regular + MCP)
   */
  async getAllAvailableTools(): Promise<Record<string, any>> {
    const allTools: Record<string, any> = {};
    
    // Add regular tools
    for (const [toolId, tool] of Object.entries(toolsRegistry)) {
      allTools[toolId] = {
        id: toolId,
        name: toolId,
        description: 'Built-in tool',
        type: 'regular',
        tool,
      };
    }

    // Add MCP tools
    try {
      const mcpTools = await mcpClientManager.getTools();
      for (const [toolName, tool] of Object.entries(mcpTools)) {
        allTools[toolName] = {
          id: toolName,
          name: toolName,
          description: tool.description || 'MCP tool',
          type: 'mcp',
          tool,
        };
      }
    } catch (error) {
      console.error('Failed to get MCP tools:', error);
    }

    return allTools;
  }

  /**
   * Get MCP server status for tools
   */
  async getMCPStatus(): Promise<Record<string, any>> {
    const enabledServers = mcpClientManager.getEnabledServers();
    const health = await mcpClientManager.healthCheck();
    
    return {
      enabledServers: enabledServers.length,
      totalServers: mcpClientManager.getAvailableServers().length,
      health,
    };
  }

  /**
   * Reset agent state
   */
  reset(): void {
    this.state = {
      activeTools: [],
      executionHistory: [],
      context: {},
    };
  }
}

// Singleton instance for the application
export const agentOrchestrator = new AgentOrchestrator();