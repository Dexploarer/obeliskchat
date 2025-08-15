import { 
  experimental_createMCPClient, 
  type experimental_MCPClient as MCPClient 
} from 'ai';
// Import MCP SDK only on server-side to avoid browser compatibility issues
let StdioClientTransport: any;
let SSEClientTransport: any;
let StreamableHTTPClientTransport: any;

if (typeof window === 'undefined') {
  // Server-side imports
  try {
    const stdioModule = require('@modelcontextprotocol/sdk/client/stdio.js');
    const sseModule = require('@modelcontextprotocol/sdk/client/sse.js');
    const httpModule = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
    
    StdioClientTransport = stdioModule.StdioClientTransport;
    SSEClientTransport = sseModule.SSEClientTransport;
    StreamableHTTPClientTransport = httpModule.StreamableHTTPClientTransport;
  } catch (error) {
    console.warn('MCP SDK not available on server:', error);
  }
}
import { 
  MCPSecurityManager, 
  MCPSecurityError, 
  MCPRateLimitError,
  sanitizeInput 
} from './mcp-security';

// Transport interface for type safety
interface Transport {
  connect(): Promise<void>;
  close(): Promise<void>;
  send(message: any): Promise<any>;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  type: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  enabled: boolean;
  category: string;
  version?: string;
  author?: string;
  tools?: string[];
}

export interface MCPClientManager {
  clients: Map<string, MCPClient>;
  configs: MCPServerConfig[];
  initialize(): Promise<void>;
  addServer(config: MCPServerConfig): Promise<void>;
  removeServer(serverId: string): Promise<void>;
  getTools(): Promise<Record<string, any>>;
  getServerStatus(serverId: string): 'connected' | 'disconnected' | 'error';
  cleanup(): Promise<void>;
}

class MCPClientManagerImpl implements MCPClientManager {
  public clients = new Map<string, MCPClient>();
  public configs: MCPServerConfig[] = [];
  private transports = new Map<string, Transport>();

  async initialize(): Promise<void> {
    // Only initialize on server-side
    if (typeof window !== 'undefined') {
      console.log('MCP Client Manager: Client-side, skipping initialization');
      return;
    }
    
    console.log('Initializing MCP Client Manager...');
    // Load default server configurations
    await this.loadDefaultServers();
  }

  private async loadDefaultServers(): Promise<void> {
    // Popular MCP servers with safe defaults
    const defaultServers: MCPServerConfig[] = [
      {
        id: 'filesystem',
        name: 'Filesystem',
        description: 'Secure file operations with configurable access controls',
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
        enabled: false,
        category: 'file-management',
        tools: ['read_file', 'write_file', 'list_directory', 'create_directory'],
      },
      {
        id: 'git',
        name: 'Git',
        description: 'Tools to read, search, and manipulate Git repositories',
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-git', '--repository', '.'],
        enabled: false,
        category: 'development',
        tools: ['git_log', 'git_diff', 'git_show', 'git_blame'],
      },
      {
        id: 'fetch',
        name: 'Fetch',
        description: 'Web content fetching and conversion for efficient LLM usage',
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-fetch'],
        enabled: false,
        category: 'web-scraping',
        tools: ['fetch_url', 'fetch_html', 'fetch_text'],
      },
      {
        id: 'memory',
        name: 'Memory',
        description: 'Knowledge graph-based persistent memory system',
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-memory'],
        enabled: false,
        category: 'productivity',
        tools: ['store_memory', 'recall_memory', 'search_memory'],
      },
      {
        id: 'puppeteer',
        name: 'Puppeteer',
        description: 'Browser automation via Puppeteer with structured accessibility data',
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-puppeteer'],
        enabled: false,
        category: 'web-scraping',
        tools: ['puppeteer_navigate', 'puppeteer_click', 'puppeteer_screenshot'],
      },
      {
        id: 'sqlite',
        name: 'SQLite',
        description: 'Read-only access to SQLite databases with schema exploration',
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sqlite', '--db-path', './data.db'],
        enabled: false,
        category: 'database',
        tools: ['execute_query', 'describe_table', 'list_tables'],
      },
      {
        id: 'postgres',
        name: 'PostgreSQL',
        description: 'Read-only access to PostgreSQL databases',
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost/mydb'],
        enabled: false,
        category: 'database',
        tools: ['execute_query', 'describe_table', 'list_tables'],
      },
    ];

    this.configs = defaultServers;
  }

  async addServer(config: MCPServerConfig): Promise<void> {
    // Only allow server operations on server-side
    if (typeof window !== 'undefined') {
      throw new Error('MCP server operations are not available in browser environment');
    }
    
    try {
      // Security validation
      if (!MCPSecurityManager.checkRateLimit('add_server', 5, 60000)) {
        throw new MCPRateLimitError('add_server');
      }

      const validation = MCPSecurityManager.validateServerConfig(config);
      if (!validation.valid) {
        throw new MCPSecurityError(`Validation failed: ${validation.errors.join(', ')}`, 'VALIDATION');
      }

      if (!MCPSecurityManager.checkServerLimit(this.clients.size)) {
        throw new MCPSecurityError('Server limit exceeded', 'LIMIT_EXCEEDED');
      }

      if (this.clients.has(config.id)) {
        throw new Error(`Server ${config.id} already exists`);
      }

      const transport = await MCPSecurityManager.createExecutionTimeout(
        this.createTransport(config),
        30000
      );
      
      const client = await MCPSecurityManager.createExecutionTimeout(
        experimental_createMCPClient({ transport: transport as any }),
        30000
      );
      
      this.clients.set(config.id, client);
      this.transports.set(config.id, transport);
      
      const existingIndex = this.configs.findIndex(c => c.id === config.id);
      if (existingIndex >= 0) {
        this.configs[existingIndex] = config;
      } else {
        this.configs.push(config);
      }

      MCPSecurityManager.logSecurityEvent('server_added', { 
        serverId: config.id, 
        type: config.type 
      });
      
      console.log(`MCP server ${config.name} connected successfully`);
    } catch (error) {
      MCPSecurityManager.logSecurityEvent('server_add_failed', { 
        serverId: config.id, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      console.error(`Failed to add MCP server ${config.name}:`, error);
      throw error;
    }
  }

  private async createTransport(config: MCPServerConfig): Promise<Transport> {
    if (!StdioClientTransport || !SSEClientTransport || !StreamableHTTPClientTransport) {
      throw new Error('MCP SDK not available - server-side only');
    }
    
    switch (config.type) {
      case 'stdio':
        if (!config.command) {
          throw new Error('Command is required for stdio transport');
        }
        
        // Sanitize command arguments
        const sanitizedArgs = config.args ? MCPSecurityManager.sanitizeArgs(config.args) : [];
        
        return new StdioClientTransport({
          command: config.command,
          args: sanitizedArgs,
        });
      
      case 'sse':
        if (!config.url) {
          throw new Error('URL is required for SSE transport');
        }
        
        // Sanitize and validate URL
        const sseUrl = sanitizeInput.url(config.url);
        return new SSEClientTransport(new URL(sseUrl));
      
      case 'http':
        if (!config.url) {
          throw new Error('URL is required for HTTP transport');
        }
        
        // Sanitize and validate URL
        const httpUrl = sanitizeInput.url(config.url);
        return new StreamableHTTPClientTransport(new URL(httpUrl));
      
      default:
        throw new Error(`Unsupported transport type: ${config.type}`);
    }
  }

  async removeServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    const transport = this.transports.get(serverId);
    
    if (client) {
      try {
        await client.close();
      } catch (error) {
        console.error(`Error closing client ${serverId}:`, error);
      }
    }

    if (transport) {
      try {
        await transport.close();
      } catch (error) {
        console.error(`Error closing transport ${serverId}:`, error);
      }
    }

    this.clients.delete(serverId);
    this.transports.delete(serverId);
    this.configs = this.configs.filter(c => c.id !== serverId);

    console.log(`MCP server ${serverId} removed`);
  }

  async getTools(): Promise<Record<string, any>> {
    const allTools: Record<string, any> = {};
    
    for (const [serverId, client] of this.clients) {
      try {
        const serverTools = await client.tools();
        // Prefix tool names with server ID to avoid conflicts
        for (const [toolName, tool] of Object.entries(serverTools)) {
          allTools[`${serverId}_${toolName}`] = tool;
        }
      } catch (error) {
        console.error(`Failed to get tools from server ${serverId}:`, error);
      }
    }

    return allTools;
  }

  getServerStatus(serverId: string): 'connected' | 'disconnected' | 'error' {
    const client = this.clients.get(serverId);
    if (!client) return 'disconnected';
    
    // Simple status check - in a real implementation, you'd want to ping the server
    return 'connected';
  }

  async enableServer(serverId: string): Promise<void> {
    const config = this.configs.find(c => c.id === serverId);
    if (!config) {
      throw new Error(`Server ${serverId} not found`);
    }

    config.enabled = true;
    await this.addServer(config);
  }

  async disableServer(serverId: string): Promise<void> {
    const config = this.configs.find(c => c.id === serverId);
    if (config) {
      config.enabled = false;
    }
    await this.removeServer(serverId);
  }

  getEnabledServers(): MCPServerConfig[] {
    return this.configs.filter(c => c.enabled);
  }

  getAvailableServers(): MCPServerConfig[] {
    return [...this.configs];
  }

  async cleanup(): Promise<void> {
    console.log('Cleaning up MCP clients...');
    
    for (const [serverId] of this.clients) {
      await this.removeServer(serverId);
    }
    
    this.clients.clear();
    this.transports.clear();
  }

  // Health check for all connected servers
  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    for (const [serverId, client] of this.clients) {
      try {
        // Simple health check by trying to get tools
        await client.tools();
        health[serverId] = true;
      } catch (error) {
        console.error(`Health check failed for ${serverId}:`, error);
        health[serverId] = false;
      }
    }
    
    return health;
  }
}

// Singleton instance
export const mcpClientManager = new MCPClientManagerImpl();

// Initialize only when explicitly called to avoid SSR issues
// mcpClientManager.initialize() should be called client-side when needed