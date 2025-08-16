/**
 * Jupiter Token API v2 Types and Interfaces
 * Based on the official Jupiter Token API v2 schema
 */

export interface JupiterTokenAudit {
  mintAuthorityDisabled: boolean;
  freezeAuthorityDisabled: boolean;
  topHoldersPercentage: number;
}

export interface JupiterFirstPool {
  id: string;
  createdAt: string;
}

export interface JupiterTradingStats {
  priceChange: number;
  liquidityChange: number;
  volumeChange: number;
  buyVolume: number;
  sellVolume: number;
  buyOrganicVolume: number;
  sellOrganicVolume: number;
  numBuys: number;
  numSells: number;
  numTraders: number;
  numOrganicBuyers: number;
  numNetBuyers: number;
}

export interface JupiterTokenData {
  id: string; // Mint address
  name: string;
  symbol: string;
  icon?: string;
  decimals: number;
  circSupply: number;
  totalSupply: number;
  tokenProgram: string;
  firstPool: JupiterFirstPool;
  holderCount: number;
  audit: JupiterTokenAudit;
  organicScore: number;
  organicScoreLabel: 'low' | 'medium' | 'high';
  isVerified: boolean;
  cexes: string[];
  tags: string[];
  fdv: number; // Fully diluted valuation
  mcap: number; // Market cap
  usdPrice: number;
  priceBlockId: number;
  liquidity: number;
  stats5m: JupiterTradingStats;
  stats1h: JupiterTradingStats;
  stats6h: JupiterTradingStats;
  stats24h: JupiterTradingStats;
  ctLikes: number;
  smartCtLikes: number;
  updatedAt: string;
}

export interface JupiterSearchResponse {
  tokens: JupiterTokenData[];
  total: number;
  hasMore: boolean;
}

export interface JupiterCategoryResponse {
  tokens: JupiterTokenData[];
  category: string;
  interval: string;
  total: number;
}

export interface JupiterRecentResponse {
  tokens: JupiterTokenData[];
  total: number;
}

export interface JupiterTagResponse {
  tokens: JupiterTokenData[];
  tag: string;
  total: number;
}

// API Configuration Types
export type JupiterApiTier = 'lite' | 'pro';
export type JupiterCategory = 'toporganicscore' | 'toptraded' | 'toptrending';
export type JupiterTag = 'lst' | 'verified';
export type JupiterInterval = '5m' | '1h' | '6h' | '24h';

export interface JupiterApiConfig {
  tier: JupiterApiTier;
  baseUrl: string;
  apiKey?: string;
  rateLimit: {
    requestsPerMinute: number;
    burstLimit: number;
  };
}

export interface JupiterSearchParams {
  query: string;
  limit?: number;
  offset?: number;
}

export interface JupiterCategoryParams {
  category: JupiterCategory;
  interval: JupiterInterval;
  limit?: number;
  offset?: number;
}

export interface JupiterRecentParams {
  limit?: number;
  offset?: number;
}

export interface JupiterTagParams {
  tag: JupiterTag;
  limit?: number;
  offset?: number;
}

// Enhanced token metadata for our application
export interface EnhancedTokenData extends JupiterTokenData {
  // Additional computed fields
  riskScore: number; // 0-100, higher is riskier
  liquidityRating: 'low' | 'medium' | 'high';
  volumeRating: 'low' | 'medium' | 'high';
  holderDistribution: 'concentrated' | 'moderate' | 'distributed';
  
  // Launchpad specific fields
  launchPlatform?: 'pump' | 'bonk' | 'raydium' | 'orca' | 'unknown';
  graduationStatus?: 'pending' | 'graduated' | 'failed';
  bondingCurveProgress?: number;
  
  // Social and community metrics
  socialScore: number;
  communitySize: number;
  devActivity: 'low' | 'medium' | 'high';
}

// Error types for Jupiter API
export interface JupiterApiError {
  error: string;
  message?: string;
  code?: number;
  details?: any;
}

// Rate limiting tracker
export interface RateLimitStatus {
  requestsRemaining: number;
  resetTime: Date;
  isLimited: boolean;
}

// Token validation result
export interface TokenValidationResult {
  isValid: boolean;
  isVerified: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  warnings: string[];
  organicScore: number;
  recommendedAction: 'proceed' | 'caution' | 'avoid';
}

// Price comparison between different sources
export interface PriceComparison {
  jupiter: number;
  coingecko?: number;
  birdeye?: number;
  difference: number;
  confidence: 'high' | 'medium' | 'low';
  source: 'jupiter' | 'coingecko' | 'birdeye';
}

// Token discovery filters
export interface TokenDiscoveryFilters {
  minLiquidity?: number;
  maxLiquidity?: number;
  minOrganicScore?: number;
  minHolders?: number;
  verifiedOnly?: boolean;
  excludeScams?: boolean;
  categories?: JupiterCategory[];
  tags?: JupiterTag[];
  timeframe?: JupiterInterval;
}

export const JUPITER_CONFIG = {
  LITE_URL: 'https://lite-api.jup.ag/tokens/v2',
  PRO_URL: 'https://api.jup.ag/tokens/v2',
  RATE_LIMITS: {
    lite: {
      requestsPerMinute: 100,
      burstLimit: 20
    },
    pro: {
      requestsPerMinute: 600,
      burstLimit: 100
    }
  },
  ORGANIC_SCORE_THRESHOLDS: {
    low: 30,
    medium: 60,
    high: 80
  },
  RISK_THRESHOLDS: {
    liquidity: {
      low: 10000,
      high: 100000
    },
    holders: {
      low: 100,
      high: 1000
    },
    organicScore: {
      safe: 70,
      risky: 30
    }
  }
} as const;