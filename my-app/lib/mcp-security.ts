import { z } from 'zod';
import type { MCPServerConfig } from './mcp-client';

// Security configuration for MCP servers
export const MCP_SECURITY_CONFIG = {
  // Allowed commands for stdio transport
  allowedCommands: [
    'npx',
    'node',
    'python',
    'python3',
  ],
  
  // Blocked command patterns
  blockedPatterns: [
    'rm -rf',
    'sudo',
    'su',
    'chmod 777',
    'curl',
    'wget',
    'ssh',
    'scp',
  ],
  
  // Maximum execution time for commands (milliseconds)
  maxExecutionTime: 30000,
  
  // Allowed URL schemes for remote MCP servers
  allowedUrlSchemes: ['http', 'https'],
  
  // Allowed domains for remote MCP servers (empty = all allowed)
  allowedDomains: [] as string[],
  
  // Maximum number of concurrent MCP servers
  maxServers: 10,
  
  // Environment variable validation
  requiredEnvVars: ['NODE_ENV'],
  
  // File system access restrictions
  allowedPaths: ['/tmp', './data', './cache'],
  blockedPaths: ['/etc', '/usr', '/bin', '/sbin', '/home'],
};

// Server configuration validation schema
export const MCPServerConfigSchema = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9-_]+$/),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  type: z.enum(['stdio', 'sse', 'http']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().url().optional(),
  enabled: z.boolean(),
  category: z.string().min(1).max(50),
  version: z.string().optional(),
  author: z.string().optional(),
  tools: z.array(z.string()).optional(),
});

export class MCPSecurityManager {
  /**
   * Validate MCP server configuration
   */
  static validateServerConfig(config: MCPServerConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Schema validation
      MCPServerConfigSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
      }
    }

    // Command security validation for stdio
    if (config.type === 'stdio') {
      if (!config.command) {
        errors.push('Command is required for stdio transport');
      } else {
        const isAllowedCommand = MCP_SECURITY_CONFIG.allowedCommands.some(cmd => 
          config.command?.startsWith(cmd)
        );
        
        if (!isAllowedCommand) {
          errors.push(`Command not in allowed list: ${config.command}`);
        }

        const hasBlockedPattern = MCP_SECURITY_CONFIG.blockedPatterns.some(pattern => 
          config.command?.includes(pattern) || config.args?.some(arg => arg.includes(pattern))
        );
        
        if (hasBlockedPattern) {
          errors.push('Command contains blocked patterns');
        }
      }
    }

    // URL security validation for remote transports
    if (config.type === 'sse' || config.type === 'http') {
      if (!config.url) {
        errors.push('URL is required for remote transport');
      } else {
        try {
          const url = new URL(config.url);
          
          if (!MCP_SECURITY_CONFIG.allowedUrlSchemes.includes(url.protocol.slice(0, -1))) {
            errors.push(`URL scheme not allowed: ${url.protocol}`);
          }

          if (MCP_SECURITY_CONFIG.allowedDomains.length > 0) {
            const isAllowedDomain = MCP_SECURITY_CONFIG.allowedDomains.some(domain => 
              url.hostname === domain || url.hostname.endsWith('.' + domain)
            );
            
            if (!isAllowedDomain) {
              errors.push(`Domain not in allowed list: ${url.hostname}`);
            }
          }
        } catch (error) {
          errors.push('Invalid URL format');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize command arguments
   */
  static sanitizeArgs(args: string[]): string[] {
    return args.map(arg => {
      // Remove dangerous characters
      const sanitized = arg.replace(/[;&|`$(){}[\]<>]/g, '');
      
      // Ensure paths are within allowed directories
      if (arg.startsWith('/') || arg.startsWith('./') || arg.startsWith('../')) {
        const isAllowedPath = MCP_SECURITY_CONFIG.allowedPaths.some(allowed => 
          sanitized.startsWith(allowed)
        );
        
        const isBlockedPath = MCP_SECURITY_CONFIG.blockedPaths.some(blocked => 
          sanitized.startsWith(blocked)
        );
        
        if (!isAllowedPath || isBlockedPath) {
          throw new Error(`Path not allowed: ${arg}`);
        }
      }
      
      return sanitized;
    });
  }

  /**
   * Check if server limit is reached
   */
  static checkServerLimit(currentCount: number): boolean {
    return currentCount < MCP_SECURITY_CONFIG.maxServers;
  }

  /**
   * Validate environment for MCP operations
   */
  static validateEnvironment(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    
    for (const envVar of MCP_SECURITY_CONFIG.requiredEnvVars) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Create secure execution timeout
   */
  static createExecutionTimeout<T>(
    promise: Promise<T>, 
    timeout: number = MCP_SECURITY_CONFIG.maxExecutionTime
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Execution timeout')), timeout)
      ),
    ]);
  }

  /**
   * Log security event
   */
  static logSecurityEvent(event: string, details: any): void {
    console.warn('[MCP Security]', event, details);
    
    // In production, you might want to send this to a security monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service
    }
  }

  /**
   * Rate limiting for MCP operations
   */
  private static operationCounts = new Map<string, { count: number; resetTime: number }>();
  
  static checkRateLimit(operation: string, maxOperations: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const key = operation;
    const record = this.operationCounts.get(key);
    
    if (!record || now > record.resetTime) {
      this.operationCounts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (record.count >= maxOperations) {
      return false;
    }
    
    record.count++;
    return true;
  }
}

// Input sanitization utilities
export const sanitizeInput = {
  /**
   * Sanitize string input for MCP tools
   */
  string: (input: string, maxLength: number = 1000): string => {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }
    
    if (input.length > maxLength) {
      throw new Error(`Input too long: ${input.length} > ${maxLength}`);
    }
    
    // Remove potentially dangerous characters
    return input.replace(/[<>;"'`]/g, '');
  },

  /**
   * Sanitize URL input
   */
  url: (input: string): string => {
    try {
      const url = new URL(input);
      if (!MCP_SECURITY_CONFIG.allowedUrlSchemes.includes(url.protocol.slice(0, -1))) {
        throw new Error(`URL scheme not allowed: ${url.protocol}`);
      }
      return url.toString();
    } catch (error) {
      throw new Error('Invalid URL');
    }
  },

  /**
   * Sanitize file path input
   */
  path: (input: string): string => {
    const normalized = input.replace(/\.\./g, '').replace(/\/+/g, '/');
    
    const isAllowed = MCP_SECURITY_CONFIG.allowedPaths.some(allowed => 
      normalized.startsWith(allowed)
    );
    
    if (!isAllowed) {
      throw new Error(`Path not allowed: ${input}`);
    }
    
    return normalized;
  },
};

// Error classes for MCP security
export class MCPSecurityError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'MCPSecurityError';
  }
}

export class MCPRateLimitError extends MCPSecurityError {
  constructor(operation: string) {
    super(`Rate limit exceeded for operation: ${operation}`, 'RATE_LIMIT');
  }
}

export class MCPValidationError extends MCPSecurityError {
  constructor(message: string) {
    super(message, 'VALIDATION');
  }
}