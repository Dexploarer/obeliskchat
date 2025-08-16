/**
 * Jupiter Ultra API Types and Interfaces
 * Based on the official Jupiter Ultra API schema
 */

// Base Ultra API Configuration
export interface JupiterUltraConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
}

// Ultra API Order Request
export interface UltraOrderRequest {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
  onlyDirectRoutes?: boolean;
  asLegacyTransaction?: boolean;
  maxAccounts?: number;
  quoteMint?: string;
  swapMode?: 'ExactIn' | 'ExactOut';
  dexes?: string[];
  excludeDexes?: string[];
  restrictIntermediateTokens?: boolean;
  integratorFeeAccount?: string;
  integratorFeeBps?: number;
  computeUnitPriceMicroLamports?: number;
  priorityLevelWithMaxLamports?: {
    priorityLevel: 'Min' | 'Low' | 'Medium' | 'High' | 'VeryHigh' | 'UnsafeMax';
    maxLamports?: number;
  };
}

// Ultra API Order Response
export interface UltraOrderResponse {
  order: string; // Base64 encoded transaction
  lastValidBlockHeight: number;
  priorityFeeEstimate: number;
  slippage: number;
  computeUnitLimit: number;
  route: UltraRoute;
  contextSlot: number;
  timeTaken: number;
  feeAccount?: string;
  feeBps?: number;
}

// Route information in Ultra API
export interface UltraRoute {
  inputMint: string;
  outputMint: string;
  inputAmount: string;
  outputAmount: string;
  otherAmountThreshold: string;
  swapMode: 'ExactIn' | 'ExactOut';
  slippageBps: number;
  priceImpactPct: number;
  marketInfos: UltraMarketInfo[];
  mints: string[];
  instructions: UltraInstruction[];
  timeTaken: number;
}

// Market info for route
export interface UltraMarketInfo {
  id: string;
  label: string;
  inputMint: string;
  outputMint: string;
  notEnoughLiquidity: boolean;
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  lpFee: {
    amount: string;
    mint: string;
    pct: number;
  };
  platformFee: {
    amount: string;
    mint: string;
    pct: number;
  };
}

// Instruction details
export interface UltraInstruction {
  programId: string;
  accounts: UltraAccountMeta[];
  data: string;
}

export interface UltraAccountMeta {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

// Execute Request
export interface UltraExecuteRequest {
  signedTransaction: string; // Base64 encoded signed transaction
  options?: {
    skipPreflight?: boolean;
    preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
    maxRetries?: number;
    minContextSlot?: number;
  };
}

// Execute Response
export interface UltraExecuteResponse {
  signature: string;
  lastValidBlockHeight: number;
  priorityFeeEstimate: number;
  confirmed?: boolean;
  confirmationTime?: number;
  slot?: number;
  error?: string;
  logs?: string[];
}

// Balances Request
export interface UltraBalancesRequest {
  owner: string;
  mints?: string[];
  showZeroBalances?: boolean;
}

// Balances Response
export interface UltraBalancesResponse {
  balances: UltraTokenBalance[];
  owner: string;
  contextSlot: number;
}

export interface UltraTokenBalance {
  mint: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
  programId: string;
  tokenAccount?: string;
}

// Shield Request (Token Safety)
export interface UltraShieldRequest {
  mints: string[];
}

// Shield Response
export interface UltraShieldResponse {
  data: UltraShieldData[];
}

export interface UltraShieldData {
  mint: string;
  risky: boolean;
  warnings: UltraWarning[];
  confidence: 'high' | 'medium' | 'low';
  riskScore: number; // 0-100, higher is riskier
  lastUpdated: string;
}

export interface UltraWarning {
  type: 'freeze_authority' | 'mint_authority' | 'low_liquidity' | 'suspicious_activity' | 'unverified_token';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Error Response
export interface UltraErrorResponse {
  error: string;
  message: string;
  details?: any;
  code?: number;
}

// Rate Limit Info
export interface UltraRateLimitInfo {
  remaining: number;
  reset: number;
  limit: number;
  windowMs: number;
}

// Enhanced Ultra Service Response
export interface UltraServiceResponse<T> {
  data: T;
  success: boolean;
  error?: UltraErrorResponse;
  rateLimitInfo?: UltraRateLimitInfo;
  timeTaken?: number;
}

// Gasless Detection
export interface GaslessEligibility {
  isEligible: boolean;
  reason?: string;
  estimatedSavings?: number;
  provider?: 'jupiter_z' | 'gasless_support';
}

// Priority Level Configuration
export type PriorityLevel = 'Min' | 'Low' | 'Medium' | 'High' | 'VeryHigh' | 'UnsafeMax';

export interface PriorityConfig {
  level: PriorityLevel;
  maxLamports?: number;
  computeUnitPriceMicroLamports?: number;
}

// Swap Configuration
export interface UltraSwapConfig {
  slippageBps: number;
  priorityConfig?: PriorityConfig;
  enableGasless?: boolean;
  maxAccounts?: number;
  asLegacyTransaction?: boolean;
  integratorFee?: {
    account: string;
    bps: number;
  };
}

// Constants
export const ULTRA_API_ENDPOINTS = {
  ORDER: '/ultra/v1/order',
  EXECUTE: '/ultra/v1/execute', 
  BALANCES: '/ultra/v1/balances',
  SHIELD: '/ultra/v1/shield'
} as const;

export const PRIORITY_LEVELS: Record<PriorityLevel, number> = {
  Min: 0,
  Low: 25000,
  Medium: 50000,
  High: 100000,
  VeryHigh: 200000,
  UnsafeMax: 1000000
} as const;

export const DEFAULT_ULTRA_CONFIG: Partial<UltraSwapConfig> = {
  slippageBps: 50, // 0.5%
  enableGasless: true,
  maxAccounts: 64,
  asLegacyTransaction: false,
  priorityConfig: {
    level: 'Medium'
  }
} as const;

// Type guards
export function isUltraErrorResponse(response: any): response is UltraErrorResponse {
  return response && typeof response.error === 'string';
}

export function isGaslessEligible(eligibility: GaslessEligibility): boolean {
  return eligibility.isEligible;
}

export function isHighRiskToken(shieldData: UltraShieldData): boolean {
  return shieldData.risky || shieldData.riskScore > 70;
}