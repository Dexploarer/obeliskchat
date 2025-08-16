/**
 * Jupiter Token API v2 Service
 * Comprehensive service for interacting with Jupiter's Token API v2
 */

import {
  JupiterTokenData,
  JupiterSearchResponse,
  JupiterCategoryResponse,
  JupiterRecentResponse,
  JupiterTagResponse,
  JupiterApiConfig,
  JupiterSearchParams,
  JupiterCategoryParams,
  JupiterRecentParams,
  JupiterTagParams,
  JupiterApiError,
  RateLimitStatus,
  TokenValidationResult,
  EnhancedTokenData,
  PriceComparison,
  TokenDiscoveryFilters,
  JupiterApiTier,
  JupiterCategory,
  JupiterTag,
  JupiterInterval,
  JUPITER_CONFIG
} from './jupiter-token-types';
import { SOLANA_CONFIG } from './solana-config';

export class JupiterTokenService {
  private config: JupiterApiConfig;
  private rateLimit: RateLimitStatus;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = SOLANA_CONFIG.jupiter.features.cacheTimeout;

  constructor(tier?: JupiterApiTier, apiKey?: string) {
    const configTier = tier || SOLANA_CONFIG.jupiter.tokenApi.tier;
    const configApiKey = apiKey || SOLANA_CONFIG.jupiter.tokenApi.apiKey;
    
    this.config = {
      tier: configTier,
      baseUrl: configTier === 'pro' ? SOLANA_CONFIG.jupiter.tokenApi.pro : SOLANA_CONFIG.jupiter.tokenApi.lite,
      apiKey: configApiKey,
      rateLimit: SOLANA_CONFIG.jupiter.rateLimits[configTier]
    };

    this.rateLimit = {
      requestsRemaining: this.config.rateLimit.requestsPerMinute,
      resetTime: new Date(Date.now() + 60000),
      isLimited: false
    };
  }

  /**
   * Search for tokens by symbol, name, or mint address
   */
  async searchTokens(params: JupiterSearchParams): Promise<JupiterSearchResponse> {
    const cacheKey = `search:${JSON.stringify(params)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const queryParams = new URLSearchParams({
        query: params.query,
        ...(params.limit && { limit: params.limit.toString() }),
        ...(params.offset && { offset: params.offset.toString() })
      });

      const response = await this.makeRequest(`/search?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const tokens: JupiterTokenData[] = await response.json();
      
      const result: JupiterSearchResponse = {
        tokens,
        total: tokens.length,
        hasMore: tokens.length === (params.limit || 20)
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Jupiter search error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get tokens by category (toporganicscore, toptraded, toptrending)
   */
  async getTokensByCategory(params: JupiterCategoryParams): Promise<JupiterCategoryResponse> {
    const cacheKey = `category:${JSON.stringify(params)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const queryParams = new URLSearchParams({
        ...(params.limit && { limit: params.limit.toString() }),
        ...(params.offset && { offset: params.offset.toString() })
      });

      const endpoint = `/${params.category}/${params.interval}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await this.makeRequest(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const tokens: JupiterTokenData[] = await response.json();
      
      const result: JupiterCategoryResponse = {
        tokens,
        category: params.category,
        interval: params.interval,
        total: tokens.length
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Jupiter category error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get recently created tokens
   */
  async getRecentTokens(params: JupiterRecentParams = {}): Promise<JupiterRecentResponse> {
    const cacheKey = `recent:${JSON.stringify(params)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const queryParams = new URLSearchParams({
        ...(params.limit && { limit: params.limit.toString() }),
        ...(params.offset && { offset: params.offset.toString() })
      });

      const endpoint = `/recent${queryParams.toString() ? `?${queryParams}` : ''}`;
      const response = await this.makeRequest(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const tokens: JupiterTokenData[] = await response.json();
      
      const result: JupiterRecentResponse = {
        tokens,
        total: tokens.length
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Jupiter recent tokens error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get tokens by tag (lst, verified)
   */
  async getTokensByTag(params: JupiterTagParams): Promise<JupiterTagResponse> {
    const cacheKey = `tag:${JSON.stringify(params)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const queryParams = new URLSearchParams({
        query: params.tag,
        ...(params.limit && { limit: params.limit.toString() }),
        ...(params.offset && { offset: params.offset.toString() })
      });

      const response = await this.makeRequest(`/tag?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const tokens: JupiterTokenData[] = await response.json();
      
      const result: JupiterTagResponse = {
        tokens,
        tag: params.tag,
        total: tokens.length
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Jupiter tag error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get single token data by mint address
   */
  async getTokenData(mintAddress: string): Promise<JupiterTokenData | null> {
    try {
      const searchResult = await this.searchTokens({ query: mintAddress, limit: 1 });
      return searchResult.tokens.length > 0 ? searchResult.tokens[0] : null;
    } catch (error) {
      console.error('Error getting token data:', error);
      return null;
    }
  }

  /**
   * Validate token safety and legitimacy
   */
  async validateToken(mintAddress: string): Promise<TokenValidationResult> {
    try {
      const token = await this.getTokenData(mintAddress);
      
      if (!token) {
        return {
          isValid: false,
          isVerified: false,
          riskLevel: 'extreme',
          warnings: ['Token not found in Jupiter database'],
          organicScore: 0,
          recommendedAction: 'avoid'
        };
      }

      const warnings: string[] = [];
      let riskLevel: 'low' | 'medium' | 'high' | 'extreme' = 'low';

      // Check mint authority
      if (!token.audit.mintAuthorityDisabled) {
        warnings.push('Mint authority not disabled - supply can be increased');
        riskLevel = 'high';
      }

      // Check freeze authority
      if (!token.audit.freezeAuthorityDisabled) {
        warnings.push('Freeze authority not disabled - tokens can be frozen');
        riskLevel = 'high';
      }

      // Check organic score
      if (token.organicScore < JUPITER_CONFIG.ORGANIC_SCORE_THRESHOLDS.low) {
        warnings.push('Low organic score - potentially manipulated');
        riskLevel = 'extreme';
      } else if (token.organicScore < JUPITER_CONFIG.ORGANIC_SCORE_THRESHOLDS.medium) {
        warnings.push('Medium organic score - proceed with caution');
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }

      // Check liquidity
      if (token.liquidity < JUPITER_CONFIG.RISK_THRESHOLDS.liquidity.low) {
        warnings.push('Low liquidity - high slippage risk');
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }

      // Check holder count
      if (token.holderCount < JUPITER_CONFIG.RISK_THRESHOLDS.holders.low) {
        warnings.push('Low holder count - limited distribution');
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }

      // Check top holders concentration
      if (token.audit.topHoldersPercentage > 50) {
        warnings.push('High concentration - top holders own >50%');
        riskLevel = 'high';
      }

      const recommendedAction = 
        riskLevel === 'extreme' ? 'avoid' :
        riskLevel === 'high' ? 'caution' : 'proceed';

      return {
        isValid: true,
        isVerified: token.isVerified,
        riskLevel,
        warnings,
        organicScore: token.organicScore,
        recommendedAction
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return {
        isValid: false,
        isVerified: false,
        riskLevel: 'extreme',
        warnings: ['Validation failed'],
        organicScore: 0,
        recommendedAction: 'avoid'
      };
    }
  }

  /**
   * Get enhanced token data with computed risk metrics
   */
  async getEnhancedTokenData(mintAddress: string): Promise<EnhancedTokenData | null> {
    try {
      const token = await this.getTokenData(mintAddress);
      if (!token) return null;

      // Calculate risk score (0-100, higher is riskier)
      let riskScore = 0;
      
      if (!token.audit.mintAuthorityDisabled) riskScore += 30;
      if (!token.audit.freezeAuthorityDisabled) riskScore += 30;
      if (token.organicScore < 30) riskScore += 25;
      if (token.liquidity < 10000) riskScore += 10;
      if (token.holderCount < 100) riskScore += 5;

      // Determine ratings
      const liquidityRating = 
        token.liquidity > 100000 ? 'high' :
        token.liquidity > 10000 ? 'medium' : 'low';

      const volumeRating = 
        token.stats24h.buyVolume + token.stats24h.sellVolume > 100000 ? 'high' :
        token.stats24h.buyVolume + token.stats24h.sellVolume > 10000 ? 'medium' : 'low';

      const holderDistribution = 
        token.audit.topHoldersPercentage < 20 ? 'distributed' :
        token.audit.topHoldersPercentage < 50 ? 'moderate' : 'concentrated';

      // Detect launch platform
      let launchPlatform: EnhancedTokenData['launchPlatform'] = 'unknown';
      if (token.tags.includes('pump')) launchPlatform = 'pump';
      else if (token.tags.includes('bonk')) launchPlatform = 'bonk';
      else if (token.tags.includes('raydium')) launchPlatform = 'raydium';
      else if (token.tags.includes('orca')) launchPlatform = 'orca';

      // Calculate social score
      const socialScore = Math.min(100, 
        (token.ctLikes / 100) * 30 + 
        (token.smartCtLikes / 50) * 40 + 
        (token.holderCount / 1000) * 30
      );

      return {
        ...token,
        riskScore,
        liquidityRating,
        volumeRating,
        holderDistribution,
        launchPlatform,
        socialScore,
        communitySize: token.holderCount,
        devActivity: token.stats24h.numBuys > token.stats24h.numSells ? 'high' : 'medium'
      };
    } catch (error) {
      console.error('Error getting enhanced token data:', error);
      return null;
    }
  }

  /**
   * Discover tokens with filters
   */
  async discoverTokens(filters: TokenDiscoveryFilters): Promise<JupiterTokenData[]> {
    try {
      let tokens: JupiterTokenData[] = [];

      // Get tokens from different categories
      if (filters.categories?.length) {
        for (const category of filters.categories) {
          const result = await this.getTokensByCategory({
            category,
            interval: filters.timeframe || '24h',
            limit: 50
          });
          tokens.push(...result.tokens);
        }
      } else {
        // Default to top organic score
        const result = await this.getTokensByCategory({
          category: 'toporganicscore',
          interval: filters.timeframe || '24h',
          limit: 100
        });
        tokens = result.tokens;
      }

      // Apply filters
      return tokens.filter(token => {
        if (filters.minLiquidity && token.liquidity < filters.minLiquidity) return false;
        if (filters.maxLiquidity && token.liquidity > filters.maxLiquidity) return false;
        if (filters.minOrganicScore && token.organicScore < filters.minOrganicScore) return false;
        if (filters.minHolders && token.holderCount < filters.minHolders) return false;
        if (filters.verifiedOnly && !token.isVerified) return false;
        if (filters.excludeScams && token.organicScore < 30) return false;
        if (filters.tags?.length && !filters.tags.some(tag => token.tags.includes(tag))) return false;
        
        return true;
      });
    } catch (error) {
      console.error('Token discovery error:', error);
      return [];
    }
  }

  /**
   * Get token price with comparison to other sources
   */
  async getTokenPrice(mintAddress: string): Promise<PriceComparison | null> {
    try {
      const token = await this.getTokenData(mintAddress);
      if (!token) return null;

      return {
        jupiter: token.usdPrice,
        difference: 0,
        confidence: 'high',
        source: 'jupiter'
      };
    } catch (error) {
      console.error('Error getting token price:', error);
      return null;
    }
  }

  /**
   * Make HTTP request with rate limiting
   */
  private async makeRequest(endpoint: string): Promise<Response> {
    if (this.rateLimit.isLimited && new Date() < this.rateLimit.resetTime) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Jupiter-Token-Service/1.0'
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      headers,
      method: 'GET'
    });

    // Update rate limit status
    this.updateRateLimit(response);

    return response;
  }

  /**
   * Update rate limit status from response headers
   */
  private updateRateLimit(response: Response): void {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');

    if (remaining) {
      this.rateLimit.requestsRemaining = parseInt(remaining);
      this.rateLimit.isLimited = this.rateLimit.requestsRemaining <= 0;
    }

    if (reset) {
      this.rateLimit.resetTime = new Date(parseInt(reset) * 1000);
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): JupiterApiError {
    if (error instanceof Error) {
      return {
        error: error.name,
        message: error.message
      };
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
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): RateLimitStatus {
    return { ...this.rateLimit };
  }
}

// Factory function for creating Jupiter service instances
export function createJupiterTokenService(tier: JupiterApiTier = 'lite', apiKey?: string): JupiterTokenService {
  return new JupiterTokenService(tier, apiKey);
}

// Default service instance
export const jupiterTokenService = createJupiterTokenService();