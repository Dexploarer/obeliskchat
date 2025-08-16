/**
 * Types and interfaces for token launchpad platforms (Pump.fun and LetsBonk.fun)
 */

export type LaunchpadPlatform = 'pump' | 'bonk';

export interface PlatformConfig {
  id: LaunchpadPlatform;
  name: string;
  description: string;
  features: string[];
  fees: {
    platform: number; // Percentage
    trading: number; // Percentage
    burn?: number; // Percentage (for BONK)
  };
  requirements: {
    minSol: number;
    maxSol?: number;
    metadata: boolean;
    liquidity: boolean;
    initialBuy: boolean;
  };
  endpoints: {
    api: string;
    websocket?: string;
    ipfs?: string;
  };
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image?: File | string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
}

export interface TokenLaunchParams {
  platform: LaunchpadPlatform;
  metadata: TokenMetadata;
  supply?: number; // Total supply (optional for bonding curve)
  decimals?: number; // Token decimals (default: 6 for pump.fun, 9 for standard SPL)
  initialBuy?: number; // Initial dev buy in SOL (pump.fun)
  liquidityAmount?: number; // Initial liquidity in SOL (letsbonk.fun)
  slippage: number; // Slippage tolerance (percentage)
  priorityFee: number; // Priority fee in SOL
  pool?: 'pump' | 'raydium' | 'bonk' | 'auto'; // Pool selection
}

export interface LaunchResult {
  success: boolean;
  message: string;
  signature?: string;
  mintAddress?: string;
  explorerUrl?: string;
  platform: LaunchpadPlatform;
  metadata?: {
    uri?: string;
    ipfsHash?: string;
  };
  poolInfo?: {
    address?: string;
    type?: string;
    liquidityAmount?: number;
  };
}

export interface BondingCurveStatus {
  currentMarketCap: number;
  targetMarketCap: number; // $69K for pump.fun
  progress: number; // Percentage
  volumeTraded: number;
  holdersCount: number;
  graduated: boolean;
  raydiumPool?: string;
}

export interface PumpFunTokenData {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  imageUri: string;
  metadataUri: string;
  creator: string;
  createdAt: number;
  complete: boolean; // Graduated to Raydium
  virtualSolReserves: number;
  virtualTokenReserves: number;
  totalSupply: number;
  website?: string;
  twitter?: string;
  telegram?: string;
}

export interface LetsBonkTokenData {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  imageUri: string;
  creator: string;
  createdAt: number;
  raydiumPool: string;
  jupiterRouting: boolean;
  liquidityLocked: boolean;
  bonkBurned: number; // Amount of BONK burned
  tradingVolume: number;
  holders: number;
}

export interface WebSocketMessage {
  type: 'newToken' | 'trade' | 'graduation' | 'priceUpdate';
  data: any;
  timestamp: number;
}

export interface TradeData {
  signature: string;
  mint: string;
  traderPublicKey: string;
  txType: 'buy' | 'sell';
  tokenAmount: number;
  solAmount: number;
  pricePerToken: number;
  timestamp: number;
  platform: LaunchpadPlatform;
}

// Platform configurations
export const PLATFORM_CONFIGS: Record<LaunchpadPlatform, PlatformConfig> = {
  pump: {
    id: 'pump',
    name: 'Pump.fun',
    description: 'Fair launch with bonding curve model. Graduates to Raydium at $69K market cap. Enhanced with Price Index (August 2025).',
    features: [
      'No upfront liquidity required',
      'Bonding curve pricing (starts at $0)',
      'Automatic Raydium graduation at $69K',
      'Price Index for real-time tracking (2025)',
      'Multi-wallet trading capabilities',
      'Livestream promotion tools',
      'Social trading features',
      'Fair launch model (no presale)'
    ],
    fees: {
      platform: 0,
      trading: 0.5 // 0.5% on trades
    },
    requirements: {
      minSol: 0.02, // Minimum for token creation
      maxSol: 10, // Maximum initial buy
      metadata: true,
      liquidity: false, // No upfront liquidity
      initialBuy: true // Dev buy required
    },
    endpoints: {
      api: 'https://pumpportal.fun/api',
      websocket: 'wss://pumpportal.fun/api/data',
      ipfs: 'https://pump.fun/api/ipfs'
    }
  },
  bonk: {
    id: 'bonk',
    name: 'LetsBonk.fun',
    description: 'Launch with instant Raydium liquidity and BONK ecosystem benefits. Market leader with 55.3% share as of July 2025.',
    features: [
      'Instant Raydium liquidity pool',
      'Jupiter routing from launch',
      '30% fee burn to BONK holders',
      'BONK ecosystem integration',
      'Higher graduation rate (1.02%)',
      'Immediate DEX trading',
      'AI-focused tokens get RAY rewards ($100K+ market cap)',
      'Market leader with $539M daily volume'
    ],
    fees: {
      platform: 0.01, // 1% platform fee
      trading: 0.25, // 0.25% trading fee
      burn: 30 // 30% of platform fees burned to BONK
    },
    requirements: {
      minSol: 0.1, // Minimum liquidity
      maxSol: 100, // Maximum liquidity
      metadata: true,
      liquidity: true, // Upfront liquidity required
      initialBuy: false // No separate dev buy
    },
    endpoints: {
      api: 'https://api.letsbonk.fun',
      websocket: 'wss://api.letsbonk.fun/ws'
    }
  }
};

// Helper functions
export function getPlatformConfig(platform: LaunchpadPlatform): PlatformConfig {
  return PLATFORM_CONFIGS[platform];
}

export function calculateFees(
  platform: LaunchpadPlatform,
  amount: number
): { platformFee: number; tradingFee: number; burnAmount?: number; total: number } {
  const config = PLATFORM_CONFIGS[platform];
  const platformFee = (amount * config.fees.platform) / 100;
  const tradingFee = (amount * config.fees.trading) / 100;
  const burnAmount = config.fees.burn ? (platformFee * config.fees.burn) / 100 : undefined;
  
  return {
    platformFee,
    tradingFee,
    burnAmount,
    total: platformFee + tradingFee
  };
}

export function estimateGraduationRequirement(platform: LaunchpadPlatform): number {
  if (platform === 'pump') {
    // Pump.fun graduates at ~$69K market cap, requiring ~86 SOL
    return 86;
  }
  // LetsBonk doesn't have a fixed graduation requirement
  return 0;
}