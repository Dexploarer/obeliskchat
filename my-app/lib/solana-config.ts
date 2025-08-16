import { Commitment } from '@solana/web3.js';

// Type for network names
type NetworkName = 'mainnet-beta' | 'testnet' | 'devnet';

// Get current network
const currentNetwork = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta') as NetworkName;

export const SOLANA_CONFIG = {
  // Network configuration
  network: currentNetwork,
  rpcUrl: {
    'mainnet-beta': process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    'testnet': process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.testnet.solana.com',
    'devnet': process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  },
  wsUrl: {
    'mainnet-beta': process.env.NEXT_PUBLIC_SOLANA_WS_URL || 'wss://api.mainnet-beta.solana.com',
    'testnet': process.env.NEXT_PUBLIC_SOLANA_WS_URL || 'wss://api.testnet.solana.com',
    'devnet': process.env.NEXT_PUBLIC_SOLANA_WS_URL || 'wss://api.devnet.solana.com',
  },
  
  // Commitment level
  commitment: 'confirmed' as Commitment,
  
  // API Keys
  coingeckoApiKey: process.env.COINGECKO_API_KEY,
  
  // Jupiter API Configuration (Lite, Ultra, and Token APIs)
  jupiter: {
    // Lite API Configuration (Free tier)
    lite: {
      baseUrl: process.env.NEXT_PUBLIC_JUPITER_LITE_URL || 'https://lite-api.jup.ag',
      rateLimits: {
        requestsPerMinute: 100,
        burstLimit: 20,
      },
      features: {
        quote: true,
        swap: true,
        basicRouting: true,
      },
    },
    
    // Ultra API Configuration (Premium tier)
    ultra: {
      baseUrl: process.env.NEXT_PUBLIC_JUPITER_ULTRA_URL || 'https://api.jup.ag',
      apiKey: process.env.JUPITER_API_KEY,
      rateLimits: {
        dynamic: true, // Rate limits scale with volume
        baseLimit: 1000,
      },
      features: {
        order: true,
        execute: true,
        balances: true,
        shield: true,
        gaslessSwaps: true,
        mevProtection: true,
        advancedRouting: true,
      },
    },
    
    // Token API v2 Configuration
    tokenApi: {
      lite: 'https://lite-api.jup.ag/tokens/v2',
      pro: 'https://api.jup.ag/tokens/v2',
      apiKey: process.env.NEXT_PUBLIC_JUPITER_API_KEY,
      tier: (process.env.NEXT_PUBLIC_JUPITER_TIER || 'lite') as 'lite' | 'pro',
    },
    
    // Unified service configuration
    unified: {
      tier: (process.env.NEXT_PUBLIC_JUPITER_TIER || 'auto') as 'lite' | 'ultra' | 'auto',
      fallbackEnabled: true,
      autoUpgrade: true,
      cacheTimeout: 30000, // 30 seconds
    },
    
    // Legacy configuration for backward compatibility
    apiUrl: 'https://api.jupiter.ag',
    rateLimits: {
      lite: {
        requestsPerMinute: 100,
        burstLimit: 20,
      },
      pro: {
        requestsPerMinute: 600,
        burstLimit: 100,
      },
    },
    features: {
      enableTokenValidation: true,
      enableOrganicScoring: true,
      enableRiskAssessment: true,
      cacheTimeout: 30000, // 30 seconds
    },
  },
  
  // Program IDs
  programIds: {
    token: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    token2022: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
    associatedToken: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
    memo: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
    metaplex: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
  },
  
  // Default settings
  defaultSlippage: 1, // 1%
  priorityFee: 0.00005, // SOL
  
  // Explorer URLs
  explorerUrl: {
    'mainnet-beta': 'https://explorer.solana.com',
    'testnet': 'https://explorer.solana.com?cluster=testnet',
    'devnet': 'https://explorer.solana.com?cluster=devnet',
  },
  
  // Rate limiting
  rateLimit: {
    maxRequestsPerSecond: 10,
    maxConcurrentRequests: 5,
  },
};

export const getExplorerUrl = (signature: string, network?: string) => {
  const networkKey = (network || SOLANA_CONFIG.network) as NetworkName;
  const baseUrl = SOLANA_CONFIG.explorerUrl[networkKey] || SOLANA_CONFIG.explorerUrl['mainnet-beta'];
  return `${baseUrl}/tx/${signature}`;
};

export const getAddressExplorerUrl = (address: string, network?: string) => {
  const networkKey = (network || SOLANA_CONFIG.network) as NetworkName;
  const baseUrl = SOLANA_CONFIG.explorerUrl[networkKey] || SOLANA_CONFIG.explorerUrl['mainnet-beta'];
  return `${baseUrl}/address/${address}`;
};