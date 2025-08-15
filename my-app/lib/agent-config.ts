export const AGENT_CONFIG = {
  // Maximum number of tool rounds per conversation
  maxToolRoundtrips: 5,
  
  // Default temperature for agent responses
  temperature: 0.7,
  
  // Tool execution timeout (in milliseconds)
  toolTimeout: 30000,
  
  // Maximum number of parallel tool calls
  maxParallelTools: 3,
  
  // Tool categories and their priorities
  toolCategories: {
    'information': ['web-search', 'weather', 'pdf-reader'],
    'computation': ['calculator', 'code-interpreter'],
    'blockchain': ['solana-balance', 'solana-token-price', 'defi-analyzer', 'nft-analyzer'],
    'generation': ['image-generator'],
  },
  
  // Default enabled tools for different scenarios
  defaultToolsets: {
    'general': ['web-search', 'calculator', 'weather'],
    'developer': ['web-search', 'calculator', 'code-interpreter', 'pdf-reader'],
    'crypto': ['web-search', 'calculator', 'solana-balance', 'solana-token-price', 'defi-analyzer', 'nft-analyzer'],
    'creative': ['web-search', 'calculator', 'image-generator', 'code-interpreter'],
  },
  
  // Provider-specific tool support
  providerToolSupport: {
    'openai': {
      supports: ['all'],
      specialFeatures: ['web_search_preview', 'function_calling'],
    },
    'anthropic': {
      supports: ['all'],
      specialFeatures: ['function_calling'],
    },
    'google': {
      supports: ['all'],
      specialFeatures: ['function_calling'],
    },
    'groq': {
      supports: ['basic'],
      specialFeatures: ['function_calling'],
    },
  },
  
  // Error handling strategies
  errorHandling: {
    maxRetries: 2,
    retryDelay: 1000,
    fallbackStrategies: {
      'tool_timeout': 'continue_without_tool',
      'tool_error': 'retry_with_backoff',
      'rate_limit': 'exponential_backoff',
    },
  },
  
  // Performance optimization
  performance: {
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    enableStreaming: true,
    enableParallelExecution: true,
  },
  
  // Security settings
  security: {
    enableSandboxing: true,
    allowedDomains: ['*'], // Configure based on your security requirements
    maxCodeExecutionTime: 10000,
    restrictedOperations: ['file_system', 'network_calls'],
  },
};

export type AgentConfig = typeof AGENT_CONFIG;