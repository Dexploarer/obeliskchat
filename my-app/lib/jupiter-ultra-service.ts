/**
 * Jupiter Ultra API Service
 * Premium tier implementation with advanced features
 */

import {
  JupiterUltraConfig,
  UltraOrderRequest,
  UltraOrderResponse,
  UltraExecuteRequest,
  UltraExecuteResponse,
  UltraBalancesRequest,
  UltraBalancesResponse,
  UltraShieldRequest,
  UltraShieldResponse,
  UltraErrorResponse,
  UltraRateLimitInfo,
  UltraServiceResponse,
  GaslessEligibility,
  UltraSwapConfig,
  PriorityLevel,
  ULTRA_API_ENDPOINTS,
  PRIORITY_LEVELS,
  DEFAULT_ULTRA_CONFIG,
  isUltraErrorResponse,
  isGaslessEligible,
  isHighRiskToken
} from './jupiter-ultra-types';

export class JupiterUltraService {
  private config: JupiterUltraConfig;
  private rateLimitInfo: UltraRateLimitInfo | null = null;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor(config?: Partial<JupiterUltraConfig>) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.NEXT_PUBLIC_JUPITER_ULTRA_URL || 'https://api.jup.ag',
      apiKey: config?.apiKey || process.env.JUPITER_API_KEY,
      timeout: config?.timeout || 30000,
      retryAttempts: config?.retryAttempts || 3
    };

    if (!this.config.apiKey) {
      console.warn('Jupiter Ultra API key not provided. Some features may not work.');
    }
  }

  /**
   * Get swap order with advanced routing
   */
  async getOrder(request: UltraOrderRequest): Promise<UltraServiceResponse<UltraOrderResponse>> {
    const cacheKey = `order:${JSON.stringify(request)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        data: cached,
        success: true
      };
    }

    try {
      const response = await this.makeRequest(ULTRA_API_ENDPOINTS.ORDER, {
        method: 'POST',
        body: JSON.stringify(request)
      });

      const data = await response.json();

      if (isUltraErrorResponse(data)) {
        return {
          data: {} as UltraOrderResponse,
          success: false,
          error: data,
          rateLimitInfo: this.rateLimitInfo
        };
      }

      this.setCache(cacheKey, data);

      return {
        data: data as UltraOrderResponse,
        success: true,
        rateLimitInfo: this.rateLimitInfo
      };
    } catch (error) {
      console.error('Ultra API order error:', error);
      return {
        data: {} as UltraOrderResponse,
        success: false,
        error: this.handleError(error),
        rateLimitInfo: this.rateLimitInfo
      };
    }
  }

  /**
   * Execute signed transaction
   */
  async executeTransaction(request: UltraExecuteRequest): Promise<UltraServiceResponse<UltraExecuteResponse>> {
    try {
      const response = await this.makeRequest(ULTRA_API_ENDPOINTS.EXECUTE, {
        method: 'POST',
        body: JSON.stringify(request)
      });

      const data = await response.json();

      if (isUltraErrorResponse(data)) {
        return {
          data: {} as UltraExecuteResponse,
          success: false,
          error: data,
          rateLimitInfo: this.rateLimitInfo
        };
      }

      return {
        data: data as UltraExecuteResponse,
        success: true,
        rateLimitInfo: this.rateLimitInfo
      };
    } catch (error) {
      console.error('Ultra API execute error:', error);
      return {
        data: {} as UltraExecuteResponse,
        success: false,
        error: this.handleError(error),
        rateLimitInfo: this.rateLimitInfo
      };
    }
  }

  /**
   * Get account balances
   */
  async getBalances(request: UltraBalancesRequest): Promise<UltraServiceResponse<UltraBalancesResponse>> {
    const cacheKey = `balances:${JSON.stringify(request)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        data: cached,
        success: true
      };
    }

    try {
      const queryParams = new URLSearchParams({
        owner: request.owner,
        ...(request.mints && { mints: request.mints.join(',') }),
        ...(request.showZeroBalances !== undefined && { 
          showZeroBalances: request.showZeroBalances.toString() 
        })
      });

      const response = await this.makeRequest(
        `${ULTRA_API_ENDPOINTS.BALANCES}?${queryParams}`,
        { method: 'GET' }
      );

      const data = await response.json();

      if (isUltraErrorResponse(data)) {
        return {
          data: {} as UltraBalancesResponse,
          success: false,
          error: data,
          rateLimitInfo: this.rateLimitInfo
        };
      }

      this.setCache(cacheKey, data);

      return {
        data: data as UltraBalancesResponse,
        success: true,
        rateLimitInfo: this.rateLimitInfo
      };
    } catch (error) {
      console.error('Ultra API balances error:', error);
      return {
        data: {} as UltraBalancesResponse,
        success: false,
        error: this.handleError(error),
        rateLimitInfo: this.rateLimitInfo
      };
    }
  }

  /**
   * Get token safety information
   */
  async getShield(request: UltraShieldRequest): Promise<UltraServiceResponse<UltraShieldResponse>> {
    const cacheKey = `shield:${JSON.stringify(request)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        data: cached,
        success: true
      };
    }

    try {
      const response = await this.makeRequest(ULTRA_API_ENDPOINTS.SHIELD, {
        method: 'POST',
        body: JSON.stringify(request)
      });

      const data = await response.json();

      if (isUltraErrorResponse(data)) {
        return {
          data: {} as UltraShieldResponse,
          success: false,
          error: data,
          rateLimitInfo: this.rateLimitInfo
        };
      }

      this.setCache(cacheKey, data);

      return {
        data: data as UltraShieldResponse,
        success: true,
        rateLimitInfo: this.rateLimitInfo
      };
    } catch (error) {
      console.error('Ultra API shield error:', error);
      return {
        data: {} as UltraShieldResponse,
        success: false,
        error: this.handleError(error),
        rateLimitInfo: this.rateLimitInfo
      };
    }
  }

  /**
   * High-level swap with optimal configuration
   */
  async performSwap(
    inputMint: string,
    outputMint: string,
    amount: string,
    userPublicKey: string,
    config?: Partial<UltraSwapConfig>
  ): Promise<{
    order: UltraServiceResponse<UltraOrderResponse>;
    gaslessEligibility?: GaslessEligibility;
    riskAssessment?: UltraServiceResponse<UltraShieldResponse>;
  }> {
    const swapConfig = { ...DEFAULT_ULTRA_CONFIG, ...config };

    // Check token safety first
    const riskAssessment = await this.getShield({
      mints: [inputMint, outputMint]
    });

    // Check for high-risk tokens
    if (riskAssessment.success) {
      const hasHighRiskToken = riskAssessment.data.data.some(token => 
        isHighRiskToken(token)
      );
      
      if (hasHighRiskToken) {
        console.warn('High-risk token detected in swap');
      }
    }

    // Prepare order request
    const orderRequest: UltraOrderRequest = {
      inputMint,
      outputMint,
      amount,
      slippageBps: swapConfig.slippageBps,
      onlyDirectRoutes: false,
      asLegacyTransaction: swapConfig.asLegacyTransaction,
      maxAccounts: swapConfig.maxAccounts,
      swapMode: 'ExactIn',
      ...(swapConfig.priorityConfig && {
        computeUnitPriceMicroLamports: PRIORITY_LEVELS[swapConfig.priorityConfig.level],
        priorityLevelWithMaxLamports: {
          priorityLevel: swapConfig.priorityConfig.level,
          maxLamports: swapConfig.priorityConfig.maxLamports
        }
      }),
      ...(swapConfig.integratorFee && {
        integratorFeeAccount: swapConfig.integratorFee.account,
        integratorFeeBps: swapConfig.integratorFee.bps
      })
    };

    // Get order
    const order = await this.getOrder(orderRequest);

    // Check gasless eligibility
    let gaslessEligibility: GaslessEligibility | undefined;
    if (swapConfig.enableGasless && order.success) {
      gaslessEligibility = this.checkGaslessEligibility(order.data);
    }

    return {
      order,
      gaslessEligibility,
      riskAssessment
    };
  }

  /**
   * Get optimal priority level based on network conditions
   */
  async getOptimalPriorityLevel(
    inputMint: string,
    outputMint: string,
    amount: string
  ): Promise<PriorityLevel> {
    try {
      // Test different priority levels to find optimal
      const levels: PriorityLevel[] = ['Low', 'Medium', 'High'];
      const promises = levels.map(level => 
        this.getOrder({
          inputMint,
          outputMint,
          amount,
          slippageBps: 50,
          priorityLevelWithMaxLamports: { priorityLevel: level }
        })
      );

      const results = await Promise.allSettled(promises);
      
      // Find the lowest priority level that succeeds
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled' && result.value.success) {
          return levels[i];
        }
      }

      return 'Medium'; // Default fallback
    } catch (error) {
      console.error('Error determining optimal priority level:', error);
      return 'Medium';
    }
  }

  /**
   * Check if swap is eligible for gasless execution
   */
  private checkGaslessEligibility(orderResponse: UltraOrderResponse): GaslessEligibility {
    // This is a simplified check - actual implementation would depend on Jupiter's gasless criteria
    const outputAmount = parseInt(orderResponse.route.outputAmount);
    const threshold = 10000000; // 0.01 SOL equivalent in lamports
    
    if (outputAmount >= threshold) {
      return {
        isEligible: true,
        provider: 'jupiter_z',
        estimatedSavings: orderResponse.priorityFeeEstimate
      };
    }

    return {
      isEligible: false,
      reason: 'Swap amount below gasless threshold'
    };
  }

  /**
   * Analyze swap route for optimization opportunities
   */
  analyzeRoute(orderResponse: UltraOrderResponse): {
    priceImpact: number;
    numberOfHops: number;
    liquidityUtilization: number;
    estimatedExecutionTime: number;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const route = orderResponse.route;
    const priceImpact = route.priceImpactPct;
    const numberOfHops = route.marketInfos.length;
    
    // Calculate average liquidity utilization
    const avgLiquidityUtil = route.marketInfos.reduce((sum, market) => {
      const utilization = parseInt(market.inAmount) / 1000000; // Simplified calculation
      return sum + utilization;
    }, 0) / numberOfHops;

    // Estimate execution time based on route complexity
    const estimatedExecutionTime = 2000 + (numberOfHops * 500); // Base 2s + 0.5s per hop

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (priceImpact > 5 || numberOfHops > 3) riskLevel = 'high';
    else if (priceImpact > 2 || numberOfHops > 2) riskLevel = 'medium';

    return {
      priceImpact,
      numberOfHops,
      liquidityUtilization: avgLiquidityUtil,
      estimatedExecutionTime,
      riskLevel
    };
  }

  /**
   * Make HTTP request with proper headers and error handling
   */
  private async makeRequest(endpoint: string, options: RequestInit): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Jupiter-Ultra-Service/1.0',
      ...(options.headers as Record<string, string>)
    };

    if (this.config.apiKey) {
      headers['x-api-key'] = this.config.apiKey;
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.config.timeout!)
    };

    const response = await fetch(url, requestOptions);
    
    // Update rate limit info from headers
    this.updateRateLimitInfo(response);

    return response;
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(response: Response): void {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const limit = response.headers.get('x-ratelimit-limit');
    const reset = response.headers.get('x-ratelimit-reset');
    const window = response.headers.get('x-ratelimit-window');

    if (remaining && limit && reset) {
      this.rateLimitInfo = {
        remaining: parseInt(remaining),
        limit: parseInt(limit),
        reset: parseInt(reset),
        windowMs: window ? parseInt(window) : 60000
      };
    }
  }

  /**
   * Handle errors and create consistent error response
   */
  private handleError(error: any): UltraErrorResponse {
    if (error instanceof Error) {
      return {
        error: error.name,
        message: error.message,
        code: (error as any).code
      };
    }

    if (typeof error === 'object' && error.error) {
      return error as UltraErrorResponse;
    }

    return {
      error: 'Unknown error',
      message: 'An unexpected error occurred'
    };
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
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
   * Get service status and health information
   */
  getStatus(): {
    isHealthy: boolean;
    hasApiKey: boolean;
    rateLimitInfo: UltraRateLimitInfo | null;
    cacheSize: number;
    config: Omit<JupiterUltraConfig, 'apiKey'>;
  } {
    return {
      isHealthy: true,
      hasApiKey: !!this.config.apiKey,
      rateLimitInfo: this.rateLimitInfo,
      cacheSize: this.cache.size,
      config: {
        baseUrl: this.config.baseUrl,
        timeout: this.config.timeout,
        retryAttempts: this.config.retryAttempts
      }
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Factory function
export function createJupiterUltraService(config?: Partial<JupiterUltraConfig>): JupiterUltraService {
  return new JupiterUltraService(config);
}

// Default instance
export const jupiterUltraService = createJupiterUltraService();