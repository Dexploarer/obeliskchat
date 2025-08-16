/**
 * Jupiter Unified Service
 * Intelligent wrapper that routes between Lite and Ultra APIs
 */

import { JupiterLiteService, createJupiterLiteService, LiteQuoteRequest, LiteQuoteResponse, LiteSwapRequest, LiteSwapResponse } from './jupiter-lite-service';
import { JupiterUltraService, createJupiterUltraService } from './jupiter-ultra-service';
import { UltraOrderRequest, UltraOrderResponse, UltraServiceResponse, UltraSwapConfig } from './jupiter-ultra-types';

export type JupiterTier = 'lite' | 'ultra' | 'auto';

export interface UnifiedSwapRequest {
  inputMint: string;
  outputMint: string;
  amount: string;
  userPublicKey: string;
  slippageBps?: number;
  onlyDirectRoutes?: boolean;
  enableGasless?: boolean;
  priorityLevel?: 'Min' | 'Low' | 'Medium' | 'High' | 'VeryHigh';
  integratorFee?: {
    account: string;
    bps: number;
  };
}

export interface UnifiedSwapResponse {
  transaction: string; // Base64 encoded transaction
  lastValidBlockHeight: number;
  priorityFeeEstimate: number;
  route: {
    inputMint: string;
    outputMint: string;
    inputAmount: string;
    outputAmount: string;
    priceImpactPct: number;
    slippageBps: number;
    platformFee?: number;
  };
  gasless?: {
    isEligible: boolean;
    provider?: string;
    estimatedSavings?: number;
  };
  riskAssessment?: {
    isHighRisk: boolean;
    warnings: string[];
  };
  tier: 'lite' | 'ultra';
  timeTaken: number;
}

export interface UnifiedServiceConfig {
  tier?: JupiterTier;
  liteConfig?: any;
  ultraConfig?: any;
  fallbackEnabled?: boolean;
  autoUpgrade?: boolean;
}

export class JupiterUnifiedService {
  private liteService: JupiterLiteService;
  private ultraService: JupiterUltraService;
  private config: UnifiedServiceConfig;
  private preferredTier: JupiterTier;

  constructor(config: UnifiedServiceConfig = {}) {
    this.config = {
      tier: 'auto',
      fallbackEnabled: true,
      autoUpgrade: true,
      ...config
    };

    this.preferredTier = this.config.tier || 'auto';
    this.liteService = createJupiterLiteService(this.config.liteConfig);
    this.ultraService = createJupiterUltraService(this.config.ultraConfig);
  }

  /**
   * Unified swap method that intelligently routes between Lite and Ultra
   */
  async swap(request: UnifiedSwapRequest): Promise<UnifiedSwapResponse> {
    const startTime = Date.now();
    const tier = this.determineTier(request);

    try {
      if (tier === 'ultra') {
        return await this.performUltraSwap(request, startTime);
      } else {
        return await this.performLiteSwap(request, startTime);
      }
    } catch (error) {
      // Fallback logic
      if (this.config.fallbackEnabled && tier === 'ultra') {
        console.warn('Ultra API failed, falling back to Lite API:', error);
        return await this.performLiteSwap(request, startTime);
      }
      throw error;
    }
  }

  /**
   * Get quote from the appropriate service
   */
  async getQuote(request: UnifiedSwapRequest): Promise<{
    inputMint: string;
    outputMint: string;
    inputAmount: string;
    outputAmount: string;
    priceImpactPct: number;
    slippageBps: number;
    platformFee?: number;
    route: string;
    tier: 'lite' | 'ultra';
    timeTaken: number;
  }> {
    const startTime = Date.now();
    const tier = this.determineTier(request);

    try {
      if (tier === 'ultra') {
        const response = await this.ultraService.getOrder({
          inputMint: request.inputMint,
          outputMint: request.outputMint,
          amount: request.amount,
          slippageBps: request.slippageBps || 50,
          onlyDirectRoutes: request.onlyDirectRoutes,
          swapMode: 'ExactIn'
        });

        if (!response.success) {
          throw new Error(response.error?.message || 'Ultra API failed');
        }

        const route = response.data.route;
        return {
          inputMint: route.inputMint,
          outputMint: route.outputMint,
          inputAmount: route.inputAmount,
          outputAmount: route.outputAmount,
          priceImpactPct: route.priceImpactPct,
          slippageBps: route.slippageBps,
          platformFee: response.data.feeBps,
          route: route.marketInfos.map(m => m.label).join(' → '),
          tier: 'ultra',
          timeTaken: Date.now() - startTime
        };
      } else {
        const response = await this.liteService.getQuote({
          inputMint: request.inputMint,
          outputMint: request.outputMint,
          amount: request.amount,
          slippageBps: request.slippageBps || 50,
          onlyDirectRoutes: request.onlyDirectRoutes,
          swapMode: 'ExactIn'
        });

        return {
          inputMint: response.inputMint,
          outputMint: response.outputMint,
          inputAmount: response.inAmount,
          outputAmount: response.outAmount,
          priceImpactPct: parseFloat(response.priceImpactPct),
          slippageBps: response.slippageBps,
          platformFee: response.platformFee?.feeBps,
          route: response.routePlan.map(p => p.swapInfo.label).join(' → '),
          tier: 'lite',
          timeTaken: Date.now() - startTime
        };
      }
    } catch (error) {
      // Fallback logic for quotes
      if (this.config.fallbackEnabled && tier === 'ultra') {
        console.warn('Ultra API quote failed, falling back to Lite API:', error);
        const response = await this.liteService.getQuote({
          inputMint: request.inputMint,
          outputMint: request.outputMint,
          amount: request.amount,
          slippageBps: request.slippageBps || 50,
          onlyDirectRoutes: request.onlyDirectRoutes,
          swapMode: 'ExactIn'
        });

        return {
          inputMint: response.inputMint,
          outputMint: response.outputMint,
          inputAmount: response.inAmount,
          outputAmount: response.outAmount,
          priceImpactPct: parseFloat(response.priceImpactPct),
          slippageBps: response.slippageBps,
          platformFee: response.platformFee?.feeBps,
          route: response.routePlan.map(p => p.swapInfo.label).join(' → '),
          tier: 'lite',
          timeTaken: Date.now() - startTime
        };
      }
      throw error;
    }
  }

  /**
   * Compare prices between Lite and Ultra APIs
   */
  async compareQuotes(request: UnifiedSwapRequest): Promise<{
    lite: any;
    ultra?: any;
    recommendation: 'lite' | 'ultra';
    savings?: number;
    reason: string;
  }> {
    const promises = [];

    // Always get Lite quote
    promises.push(
      this.liteService.getQuote({
        inputMint: request.inputMint,
        outputMint: request.outputMint,
        amount: request.amount,
        slippageBps: request.slippageBps || 50,
        onlyDirectRoutes: request.onlyDirectRoutes,
        swapMode: 'ExactIn'
      }).then(result => ({ type: 'lite', data: result })).catch(error => ({ type: 'lite', error }))
    );

    // Get Ultra quote if service is available
    const ultraStatus = this.ultraService.getStatus();
    if (ultraStatus.hasApiKey) {
      promises.push(
        this.ultraService.getOrder({
          inputMint: request.inputMint,
          outputMint: request.outputMint,
          amount: request.amount,
          slippageBps: request.slippageBps || 50,
          onlyDirectRoutes: request.onlyDirectRoutes,
          swapMode: 'ExactIn'
        }).then(result => ({ type: 'ultra', data: result })).catch(error => ({ type: 'ultra', error }))
      );
    }

    const results = await Promise.allSettled(promises);
    const lite = results.find((r: any) => r.value?.type === 'lite')?.value;
    const ultra = results.find((r: any) => r.value?.type === 'ultra')?.value;

    // Analyze results
    if (!lite?.data) {
      return {
        lite: null,
        ultra: ultra?.data,
        recommendation: 'ultra',
        reason: 'Lite API unavailable'
      };
    }

    if (!ultra?.data || ultra.error) {
      return {
        lite: lite.data,
        recommendation: 'lite',
        reason: 'Ultra API unavailable or failed'
      };
    }

    // Compare output amounts
    const liteOutput = parseInt(lite.data.outAmount);
    const ultraOutput = parseInt(ultra.data.data.route.outputAmount);
    
    if (ultraOutput > liteOutput) {
      const savings = ultraOutput - liteOutput;
      return {
        lite: lite.data,
        ultra: ultra.data.data,
        recommendation: 'ultra',
        savings,
        reason: `Ultra provides ${savings} more output tokens`
      };
    } else {
      const savings = liteOutput - ultraOutput;
      return {
        lite: lite.data,
        ultra: ultra.data.data,
        recommendation: 'lite',
        savings,
        reason: `Lite provides ${savings} more output tokens`
      };
    }
  }

  /**
   * Perform Ultra API swap
   */
  private async performUltraSwap(request: UnifiedSwapRequest, startTime: number): Promise<UnifiedSwapResponse> {
    const swapConfig: Partial<UltraSwapConfig> = {
      slippageBps: request.slippageBps || 50,
      enableGasless: request.enableGasless,
      priorityConfig: request.priorityLevel ? { level: request.priorityLevel } : undefined,
      integratorFee: request.integratorFee
    };

    const result = await this.ultraService.performSwap(
      request.inputMint,
      request.outputMint,
      request.amount,
      request.userPublicKey,
      swapConfig
    );

    if (!result.order.success) {
      throw new Error(result.order.error?.message || 'Ultra swap failed');
    }

    const order = result.order.data;
    const route = order.route;

    // Extract risk assessment
    let riskAssessment;
    if (result.riskAssessment?.success) {
      const highRiskTokens = result.riskAssessment.data.data.filter(token => token.risky);
      riskAssessment = {
        isHighRisk: highRiskTokens.length > 0,
        warnings: highRiskTokens.flatMap(token => token.warnings.map(w => w.message))
      };
    }

    return {
      transaction: order.order,
      lastValidBlockHeight: order.lastValidBlockHeight,
      priorityFeeEstimate: order.priorityFeeEstimate,
      route: {
        inputMint: route.inputMint,
        outputMint: route.outputMint,
        inputAmount: route.inputAmount,
        outputAmount: route.outputAmount,
        priceImpactPct: route.priceImpactPct,
        slippageBps: route.slippageBps,
        platformFee: order.feeBps
      },
      gasless: result.gaslessEligibility,
      riskAssessment,
      tier: 'ultra',
      timeTaken: Date.now() - startTime
    };
  }

  /**
   * Perform Lite API swap
   */
  private async performLiteSwap(request: UnifiedSwapRequest, startTime: number): Promise<UnifiedSwapResponse> {
    const result = await this.liteService.quoteAndSwap(
      request.inputMint,
      request.outputMint,
      request.amount,
      request.userPublicKey,
      {
        slippageBps: request.slippageBps,
        onlyDirectRoutes: request.onlyDirectRoutes
      }
    );

    const quote = result.quote;
    const swap = result.swap;

    return {
      transaction: swap.swapTransaction,
      lastValidBlockHeight: swap.lastValidBlockHeight,
      priorityFeeEstimate: swap.priorityFeeEstimate?.priorityFeeEstimate || 0,
      route: {
        inputMint: quote.inputMint,
        outputMint: quote.outputMint,
        inputAmount: quote.inAmount,
        outputAmount: quote.outAmount,
        priceImpactPct: parseFloat(quote.priceImpactPct),
        slippageBps: quote.slippageBps,
        platformFee: quote.platformFee?.feeBps
      },
      tier: 'lite',
      timeTaken: Date.now() - startTime
    };
  }

  /**
   * Determine which tier to use based on request and configuration
   */
  private determineTier(request: UnifiedSwapRequest): 'lite' | 'ultra' {
    // If specific tier is configured, use it
    if (this.preferredTier === 'lite') return 'lite';
    if (this.preferredTier === 'ultra') return 'ultra';

    // Auto-detection logic
    const ultraStatus = this.ultraService.getStatus();
    
    // Check if Ultra API is available
    if (!ultraStatus.hasApiKey) {
      return 'lite';
    }

    // Use Ultra for advanced features
    if (request.enableGasless || request.priorityLevel || request.integratorFee) {
      return 'ultra';
    }

    // Use Ultra for large amounts (where gasless might be beneficial)
    const amount = parseInt(request.amount);
    if (amount > 10000000) { // > 0.01 SOL equivalent
      return 'ultra';
    }

    // Default to Lite for simple swaps
    return 'lite';
  }

  /**
   * Get service status
   */
  getStatus() {
    const liteStatus = this.liteService.getStatus();
    const ultraStatus = this.ultraService.getStatus();

    return {
      preferredTier: this.preferredTier,
      lite: {
        isHealthy: liteStatus.isHealthy,
        rateLimitStatus: liteStatus.rateLimitStatus,
        cacheSize: liteStatus.cacheSize
      },
      ultra: {
        isHealthy: ultraStatus.isHealthy,
        hasApiKey: ultraStatus.hasApiKey,
        rateLimitInfo: ultraStatus.rateLimitInfo,
        cacheSize: ultraStatus.cacheSize
      },
      config: this.config
    };
  }

  /**
   * Set preferred tier
   */
  setTier(tier: JupiterTier): void {
    this.preferredTier = tier;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.liteService.clearCache();
    this.ultraService.clearCache();
  }
}

// Factory function
export function createJupiterUnifiedService(config?: UnifiedServiceConfig): JupiterUnifiedService {
  return new JupiterUnifiedService(config);
}

// Default instance with environment-based configuration
export const jupiterUnifiedService = createJupiterUnifiedService({
  tier: (process.env.NEXT_PUBLIC_JUPITER_TIER as JupiterTier) || 'auto',
  fallbackEnabled: true,
  autoUpgrade: true
});