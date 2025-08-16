/**
 * Jupiter Lite API Service
 * Free tier implementation for basic swap functionality
 */

import { createJupiterApiClient } from '@jup-ag/api';

// Lite API specific types
export interface JupiterLiteConfig {
  baseUrl: string;
  timeout?: number;
  retryAttempts?: number;
  cacheTtl?: number;
}

export interface LiteQuoteRequest {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
  onlyDirectRoutes?: boolean;
  asLegacyTransaction?: boolean;
  maxAccounts?: number;
  swapMode?: 'ExactIn' | 'ExactOut';
  dexes?: string[];
  excludeDexes?: string[];
}

export interface LiteQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: LiteRoutePlan[];
  contextSlot: number;
  timeTaken: number;
}

export interface LiteRoutePlan {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    feeAmount: string;
    feeMint: string;
  };
  percent: number;
}

export interface LiteSwapRequest {
  quoteResponse: LiteQuoteResponse;
  userPublicKey: string;
  wrapAndUnwrapSol?: boolean;
  useSharedAccounts?: boolean;
  feeAccount?: string;
  computeUnitPriceMicroLamports?: number;
  priorityLevelWithMaxLamports?: {
    priorityLevel: string;
    maxLamports?: number;
  };
}

export interface LiteSwapResponse {
  swapTransaction: string; // Base64 encoded transaction
  lastValidBlockHeight: number;
  priorityFeeEstimate?: {
    priorityFeeEstimate: number;
    priorityFeeLevels: {
      min: number;
      low: number;
      medium: number;
      high: number;
      veryHigh: number;
      unsafeMax: number;
    };
  };
  computeUnitLimit?: number;
}

export interface LiteRateLimitStatus {
  requestsRemaining: number;
  windowResetTime: Date;
  isLimited: boolean;
  requestsPerMinute: number;
}

export interface LiteServiceError {
  error: string;
  message: string;
  code?: number;
  statusCode?: number;
}

export class JupiterLiteService {
  private config: JupiterLiteConfig;
  private rateLimit: LiteRateLimitStatus;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private jupiterClient: any;

  constructor(config?: Partial<JupiterLiteConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.NEXT_PUBLIC_JUPITER_LITE_URL || 'https://lite-api.jup.ag',
      timeout: config?.timeout || 30000,
      retryAttempts: config?.retryAttempts || 3,
      cacheTtl: config?.cacheTtl || 30000 // 30 seconds
    };

    // Initialize rate limit status
    this.rateLimit = {
      requestsRemaining: 100, // Lite API limit
      windowResetTime: new Date(Date.now() + 60000),
      isLimited: false,
      requestsPerMinute: 100
    };

    // Initialize Jupiter client for Lite API
    this.jupiterClient = createJupiterApiClient({
      basePath: this.config.baseUrl
    });
  }

  /**
   * Get quote for a swap
   */
  async getQuote(request: LiteQuoteRequest): Promise<LiteQuoteResponse> {
    const cacheKey = `quote:${JSON.stringify(request)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    await this.checkRateLimit();

    try {
      const params = {
        inputMint: request.inputMint,
        outputMint: request.outputMint,
        amount: request.amount,
        slippageBps: request.slippageBps || 50,
        onlyDirectRoutes: request.onlyDirectRoutes,
        asLegacyTransaction: request.asLegacyTransaction,
        maxAccounts: request.maxAccounts,
        swapMode: request.swapMode || 'ExactIn',
        ...(request.dexes && { dexes: request.dexes.join(',') }),
        ...(request.excludeDexes && { excludeDexes: request.excludeDexes.join(',') })
      };

      const response = await this.jupiterClient.quoteGet(params);
      
      if (!response || response.error) {
        throw new Error(response?.error || 'Failed to get quote');
      }

      this.setCache(cacheKey, response);
      this.updateRateLimit();

      return response as LiteQuoteResponse;
    } catch (error) {
      console.error('Jupiter Lite quote error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get swap transaction
   */
  async getSwapTransaction(request: LiteSwapRequest): Promise<LiteSwapResponse> {
    await this.checkRateLimit();

    try {
      const swapRequest = {
        quoteResponse: request.quoteResponse,
        userPublicKey: request.userPublicKey,
        wrapAndUnwrapSol: request.wrapAndUnwrapSol ?? true,
        useSharedAccounts: request.useSharedAccounts ?? true,
        feeAccount: request.feeAccount,
        computeUnitPriceMicroLamports: request.computeUnitPriceMicroLamports,
        priorityLevelWithMaxLamports: request.priorityLevelWithMaxLamports
      };

      const response = await this.jupiterClient.swapPost({ swapRequest });
      
      if (!response || response.error) {
        throw new Error(response?.error || 'Failed to get swap transaction');
      }

      this.updateRateLimit();
      return response as LiteSwapResponse;
    } catch (error) {
      console.error('Jupiter Lite swap error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get quote and swap in one call (convenience method)
   */
  async quoteAndSwap(
    inputMint: string,
    outputMint: string,
    amount: string,
    userPublicKey: string,
    options?: {
      slippageBps?: number;
      onlyDirectRoutes?: boolean;
      wrapAndUnwrapSol?: boolean;
      computeUnitPriceMicroLamports?: number;
    }
  ): Promise<{ quote: LiteQuoteResponse; swap: LiteSwapResponse }> {
    // Get quote first
    const quote = await this.getQuote({
      inputMint,
      outputMint,
      amount,
      slippageBps: options?.slippageBps,
      onlyDirectRoutes: options?.onlyDirectRoutes
    });

    // Get swap transaction
    const swap = await this.getSwapTransaction({
      quoteResponse: quote,
      userPublicKey,
      wrapAndUnwrapSol: options?.wrapAndUnwrapSol,
      computeUnitPriceMicroLamports: options?.computeUnitPriceMicroLamports
    });

    return { quote, swap };
  }

  /**
   * Get best price for multiple routes
   */
  async getBestPrice(
    inputMint: string,
    outputMint: string,
    amount: string,
    options?: {
      maxRoutes?: number;
      excludeDexes?: string[];
    }
  ): Promise<{
    bestQuote: LiteQuoteResponse;
    alternatives: LiteQuoteResponse[];
  }> {
    const promises: Promise<LiteQuoteResponse>[] = [];

    // Get standard quote
    promises.push(this.getQuote({
      inputMint,
      outputMint,
      amount,
      slippageBps: 50
    }));

    // Get direct routes only quote
    promises.push(this.getQuote({
      inputMint,
      outputMint,
      amount,
      slippageBps: 50,
      onlyDirectRoutes: true
    }));

    // Get quote with excluded DEXs if specified
    if (options?.excludeDexes?.length) {
      promises.push(this.getQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps: 50,
        excludeDexes: options.excludeDexes
      }));
    }

    try {
      const quotes = await Promise.allSettled(promises);
      const validQuotes = quotes
        .filter((result): result is PromiseFulfilledResult<LiteQuoteResponse> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);

      if (validQuotes.length === 0) {
        throw new Error('No valid quotes available');
      }

      // Sort by output amount (higher is better)
      validQuotes.sort((a, b) => 
        parseInt(b.outAmount) - parseInt(a.outAmount)
      );

      return {
        bestQuote: validQuotes[0],
        alternatives: validQuotes.slice(1, options?.maxRoutes || 3)
      };
    } catch (error) {
      console.error('Error getting best price:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Check if swap is profitable after fees
   */
  isProfitable(quote: LiteQuoteResponse, minProfitBps: number = 10): boolean {
    const priceImpact = parseFloat(quote.priceImpactPct);
    const platformFeeBps = quote.platformFee?.feeBps || 0;
    const totalCostBps = Math.abs(priceImpact * 100) + platformFeeBps;
    
    return totalCostBps <= minProfitBps;
  }

  /**
   * Calculate swap metrics
   */
  calculateSwapMetrics(quote: LiteQuoteResponse): {
    priceImpact: number;
    minimumReceived: string;
    platformFee: number;
    route: string;
  } {
    const priceImpact = parseFloat(quote.priceImpactPct);
    const platformFee = quote.platformFee?.feeBps || 0;
    const route = quote.routePlan.map(plan => plan.swapInfo.label).join(' → ');

    return {
      priceImpact,
      minimumReceived: quote.otherAmountThreshold,
      platformFee,
      route
    };
  }

  /**
   * Rate limiting check
   */
  private async checkRateLimit(): Promise<void> {
    if (this.rateLimit.isLimited && new Date() < this.rateLimit.windowResetTime) {
      const waitTime = this.rateLimit.windowResetTime.getTime() - Date.now();
      throw new Error(`Rate limited. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    if (new Date() >= this.rateLimit.windowResetTime) {
      this.rateLimit.requestsRemaining = this.rateLimit.requestsPerMinute;
      this.rateLimit.windowResetTime = new Date(Date.now() + 60000);
      this.rateLimit.isLimited = false;
    }
  }

  /**
   * Update rate limit after request
   */
  private updateRateLimit(): void {
    this.rateLimit.requestsRemaining = Math.max(0, this.rateLimit.requestsRemaining - 1);
    this.rateLimit.isLimited = this.rateLimit.requestsRemaining <= 0;
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTtl!) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Error handling
   */
  private handleError(error: any): LiteServiceError {
    if (error instanceof Error) {
      return {
        error: error.name,
        message: error.message,
        code: (error as any).code,
        statusCode: (error as any).statusCode
      };
    }

    if (typeof error === 'object' && error.error) {
      return {
        error: error.error,
        message: error.message || 'Unknown error',
        code: error.code,
        statusCode: error.statusCode
      };
    }

    return {
      error: 'Unknown error',
      message: 'An unexpected error occurred'
    };
  }

  /**
   * Get service status
   */
  getStatus(): {
    isHealthy: boolean;
    rateLimitStatus: LiteRateLimitStatus;
    cacheSize: number;
    config: JupiterLiteConfig;
  } {
    return {
      isHealthy: !this.rateLimit.isLimited,
      rateLimitStatus: { ...this.rateLimit },
      cacheSize: this.cache.size,
      config: { ...this.config }
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Reset rate limit (for testing)
   */
  resetRateLimit(): void {
    this.rateLimit.requestsRemaining = this.rateLimit.requestsPerMinute;
    this.rateLimit.windowResetTime = new Date(Date.now() + 60000);
    this.rateLimit.isLimited = false;
  }
}

// Factory function
export function createJupiterLiteService(config?: Partial<JupiterLiteConfig>): JupiterLiteService {
  return new JupiterLiteService(config);
}

// Default instance
export const jupiterLiteService = createJupiterLiteService();