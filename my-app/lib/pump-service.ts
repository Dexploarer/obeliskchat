/**
 * Pump.fun Integration Service
 * Handles token creation and trading on pump.fun platform
 */

import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { 
  TokenLaunchParams, 
  LaunchResult, 
  PumpFunTokenData, 
  BondingCurveStatus,
  WebSocketMessage,
  TradeData,
  PLATFORM_CONFIGS 
} from './launchpad-types';
import { jupiterTokenService } from './jupiter-token-service';

export class PumpService {
  private apiKey?: string;
  private apiUrl: string;
  private wsUrl: string;
  private ipfsUrl: string;
  private ws: WebSocket | null = null;
  private connection: Connection;

  constructor(connection: Connection, apiKey?: string) {
    this.connection = connection;
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_PUMP_PORTAL_API_KEY;
    const config = PLATFORM_CONFIGS.pump;
    this.apiUrl = config.endpoints.api;
    this.wsUrl = config.endpoints.websocket!;
    this.ipfsUrl = config.endpoints.ipfs!;
  }

  /**
   * Create a new token on pump.fun
   */
  async createToken(params: TokenLaunchParams): Promise<LaunchResult> {
    try {
      // Step 1: Upload image to IPFS
      const imageUri = await this.uploadImage(params.metadata.image);

      // Step 2: Create metadata JSON
      const metadataUri = await this.uploadMetadata({
        ...params.metadata,
        image: imageUri
      });

      // Step 3: Generate mint keypair
      const mintKeypair = Keypair.generate();

      // Step 4: Create token with initial dev buy
      const response = await this.createTokenTransaction({
        mint: mintKeypair.publicKey.toString(),
        name: params.metadata.name,
        symbol: params.metadata.symbol,
        description: params.metadata.description,
        metadataUri,
        initialBuy: params.initialBuy || 0.1,
        slippage: params.slippage,
        priorityFee: params.priorityFee
      });

      if (response.success) {
        return {
          success: true,
          message: `Token ${params.metadata.symbol} created successfully on Pump.fun!`,
          signature: response.signature,
          mintAddress: mintKeypair.publicKey.toString(),
          explorerUrl: `https://pump.fun/${mintKeypair.publicKey.toString()}`,
          platform: 'pump',
          metadata: {
            uri: metadataUri,
            ipfsHash: response.ipfsHash
          }
        };
      }

      throw new Error(response.error || 'Failed to create token');
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to create token: ${error.message}`,
        platform: 'pump'
      };
    }
  }

  /**
   * Upload image to IPFS via pump.fun
   */
  private async uploadImage(image?: File | string): Promise<string> {
    if (!image) {
      // Return default image
      return 'https://pump.fun/default-token.png';
    }

    if (typeof image === 'string') {
      return image; // Already a URL
    }

    const formData = new FormData();
    formData.append('file', image);

    const response = await fetch(this.ipfsUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload image to IPFS');
    }

    const data = await response.json();
    return data.url || data.ipfsUrl;
  }

  /**
   * Upload metadata to IPFS
   */
  private async uploadMetadata(metadata: any): Promise<string> {
    const metadataJson = {
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description,
      image: metadata.image,
      properties: {
        files: [{ uri: metadata.image, type: 'image/png' }],
        category: 'meme',
        creators: []
      },
      extensions: {
        website: metadata.website,
        twitter: metadata.twitter,
        telegram: metadata.telegram,
        discord: metadata.discord
      }
    };

    const response = await fetch(this.ipfsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadataJson)
    });

    if (!response.ok) {
      throw new Error('Failed to upload metadata to IPFS');
    }

    const data = await response.json();
    return data.url || data.metadataUri;
  }

  /**
   * Create token transaction
   */
  private async createTokenTransaction(params: {
    mint: string;
    name: string;
    symbol: string;
    description: string;
    metadataUri: string;
    initialBuy: number;
    slippage: number;
    priorityFee: number;
  }): Promise<any> {
    const endpoint = this.apiKey 
      ? `${this.apiUrl}/trade?api-key=${this.apiKey}`
      : `${this.apiUrl}/trade-local`;

    const payload = {
      action: 'create',
      tokenMetadata: {
        name: params.name,
        symbol: params.symbol,
        uri: params.metadataUri
      },
      mint: params.mint,
      denominatedInSol: 'true',
      amount: params.initialBuy,
      slippage: params.slippage,
      priorityFee: params.priorityFee,
      pool: 'pump'
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${error}`);
    }

    return await response.json();
  }

  /**
   * Buy tokens on pump.fun
   */
  async buyToken(
    mintAddress: string,
    amountSol: number,
    slippage: number = 1,
    priorityFee: number = 0.00001
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      const endpoint = this.apiKey
        ? `${this.apiUrl}/trade?api-key=${this.apiKey}`
        : `${this.apiUrl}/trade-local`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'buy',
          mint: mintAddress,
          denominatedInSol: 'true',
          amount: amountSol,
          slippage,
          priorityFee,
          pool: 'pump'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, signature: data.signature };
      }
      
      return { success: false, error: data.error };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Sell tokens on pump.fun
   */
  async sellToken(
    mintAddress: string,
    tokenAmount: number,
    slippage: number = 1,
    priorityFee: number = 0.00001
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      const endpoint = this.apiKey
        ? `${this.apiUrl}/trade?api-key=${this.apiKey}`
        : `${this.apiUrl}/trade-local`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sell',
          mint: mintAddress,
          denominatedInSol: 'false',
          amount: tokenAmount,
          slippage,
          priorityFee,
          pool: 'pump'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        return { success: true, signature: data.signature };
      }
      
      return { success: false, error: data.error };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get bonding curve status for a token
   */
  async getBondingCurveStatus(mintAddress: string): Promise<BondingCurveStatus> {
    try {
      // This would typically fetch from pump.fun API
      // For now, returning mock data
      return {
        currentMarketCap: Math.random() * 69000,
        targetMarketCap: 69000,
        progress: Math.random() * 100,
        volumeTraded: Math.random() * 100000,
        holdersCount: Math.floor(Math.random() * 1000),
        graduated: false
      };
    } catch (error) {
      throw new Error('Failed to fetch bonding curve status');
    }
  }

  /**
   * Connect to WebSocket for real-time updates
   */
  connectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      console.log('Connected to Pump.fun WebSocket');
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from Pump.fun WebSocket');
      // Reconnect after 5 seconds
      setTimeout(() => this.connectWebSocket(), 5000);
    };
  }

  /**
   * Subscribe to new token events
   */
  subscribeToNewTokens(callback: (token: PumpFunTokenData) => void): void {
    if (!this.ws) {
      this.connectWebSocket();
    }

    const payload = {
      method: 'subscribeNewToken'
    };

    this.ws!.onopen = () => {
      this.ws!.send(JSON.stringify(payload));
    };

    this.ws!.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'newToken') {
        callback(data.token);
      }
    };
  }

  /**
   * Subscribe to token trades
   */
  subscribeToTokenTrades(mintAddress: string, callback: (trade: TradeData) => void): void {
    if (!this.ws) {
      this.connectWebSocket();
    }

    const payload = {
      method: 'subscribeTokenTrade',
      keys: [mintAddress]
    };

    this.ws!.onopen = () => {
      this.ws!.send(JSON.stringify(payload));
    };

    this.ws!.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'trade' && data.mint === mintAddress) {
        callback({ ...data, platform: 'pump' });
      }
    };
  }

  /**
   * Get Price Index data (2025 feature)
   */
  async getPriceIndex(): Promise<{
    topPerformers: Array<{ mint: string; symbol: string; priceChange24h: number; volume24h: number }>;
    marketTrends: Array<{ category: string; trend: 'up' | 'down' | 'stable'; percentage: number }>;
    realTimeStats: { totalTokens: number; dailyVolume: number; activeTraders: number };
  }> {
    try {
      // This would fetch from the new Price Index API endpoint
      const response = await fetch(`${this.apiUrl}/price-index/dashboard`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch Price Index data');
      }

      return await response.json();
    } catch (error) {
      // Return mock 2025 Price Index data
      return {
        topPerformers: [
          { mint: 'pump_token_1', symbol: 'PUMP1', priceChange24h: 145.6, volume24h: 250000 },
          { mint: 'pump_token_2', symbol: 'PUMP2', priceChange24h: 89.2, volume24h: 180000 },
          { mint: 'pump_token_3', symbol: 'PUMP3', priceChange24h: 67.8, volume24h: 120000 }
        ],
        marketTrends: [
          { category: 'meme', trend: 'up', percentage: 15.6 },
          { category: 'gaming', trend: 'up', percentage: 8.9 },
          { category: 'defi', trend: 'stable', percentage: 2.1 }
        ],
        realTimeStats: {
          totalTokens: 125000,
          dailyVolume: 12500000,
          activeTraders: 8500
        }
      };
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Get token data
   */
  async getTokenData(mintAddress: string): Promise<PumpFunTokenData | null> {
    try {
      // This would fetch from pump.fun API
      // Returning mock data for now
      return {
        mint: mintAddress,
        name: 'Mock Token',
        symbol: 'MOCK',
        description: 'A mock token for testing',
        imageUri: 'https://pump.fun/default-token.png',
        metadataUri: 'https://ipfs.io/ipfs/mock',
        creator: 'mock_creator',
        createdAt: Date.now(),
        complete: false,
        virtualSolReserves: 50,
        virtualTokenReserves: 1000000,
        totalSupply: 1000000000,
        website: 'https://example.com',
        twitter: '@example',
        telegram: 't.me/example'
      };
    } catch (error) {
      console.error('Failed to fetch token data:', error);
      return null;
    }
  }

  /**
   * Validate token post-launch using Jupiter
   */
  async validateLaunchedToken(mintAddress: string): Promise<{
    isIndexed: boolean;
    jupiterData: any;
    organicScore: number;
    riskAssessment: string;
    recommendations: string[];
  }> {
    try {
      // Check if token is indexed in Jupiter
      const jupiterToken = await jupiterTokenService.getTokenData(mintAddress);
      
      if (!jupiterToken) {
        return {
          isIndexed: false,
          jupiterData: null,
          organicScore: 0,
          riskAssessment: 'Token not yet indexed in Jupiter. This is normal for new tokens.',
          recommendations: [
            'Wait for Jupiter indexing (usually 1-24 hours)',
            'Monitor token on pump.fun for organic growth',
            'Watch for holder count increases'
          ]
        };
      }

      // Perform validation
      const validation = await jupiterTokenService.validateToken(mintAddress);
      
      let riskAssessment = '';
      const recommendations: string[] = [];

      if (validation.organicScore > 70) {
        riskAssessment = 'Strong organic activity detected. Token appears legitimate.';
        recommendations.push('Good organic score indicates healthy trading activity');
      } else if (validation.organicScore > 30) {
        riskAssessment = 'Moderate organic activity. Monitor for improvements.';
        recommendations.push('Organic score could improve with more legitimate trading');
      } else {
        riskAssessment = 'Low organic activity. High risk of manipulation.';
        recommendations.push('Low organic score indicates potential bot trading or manipulation');
      }

      if (!jupiterToken.audit.mintAuthorityDisabled) {
        recommendations.push('WARNING: Mint authority not disabled - supply can be increased');
      }

      if (!jupiterToken.audit.freezeAuthorityDisabled) {
        recommendations.push('WARNING: Freeze authority not disabled - tokens can be frozen');
      }

      if (jupiterToken.liquidity < 10000) {
        recommendations.push('Low liquidity detected - may cause high slippage');
      }

      return {
        isIndexed: true,
        jupiterData: jupiterToken,
        organicScore: validation.organicScore,
        riskAssessment,
        recommendations
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return {
        isIndexed: false,
        jupiterData: null,
        organicScore: 0,
        riskAssessment: 'Unable to validate token',
        recommendations: ['Validation failed - proceed with extreme caution']
      };
    }
  }

  /**
   * Track token graduation progress with Jupiter data
   */
  async getGraduationProgress(mintAddress: string): Promise<{
    currentProgress: number;
    jupiterMetrics: any;
    estimatedTimeToGraduation: string;
    organicGrowth: boolean;
  }> {
    try {
      const [bondingStatus, jupiterData] = await Promise.all([
        this.getBondingCurveStatus(mintAddress),
        jupiterTokenService.getTokenData(mintAddress)
      ]);

      const currentProgress = bondingStatus ? bondingStatus.progress : 0;
      
      let organicGrowth = false;
      let estimatedTimeToGraduation = 'Unknown';

      if (jupiterData) {
        organicGrowth = jupiterData.organicScore > 50;
        
        // Estimate based on current trading volume and organic score
        const dailyVolume = jupiterData.stats24h.buyVolume + jupiterData.stats24h.sellVolume;
        const targetMarketCap = 69000; // $69K graduation target
        const currentMarketCap = jupiterData.mcap;
        
        if (dailyVolume > 10000 && organicGrowth) {
          const remainingMarketCap = targetMarketCap - currentMarketCap;
          const estimatedDays = Math.max(1, Math.round(remainingMarketCap / (dailyVolume * 0.1)));
          estimatedTimeToGraduation = `${estimatedDays} days (estimated)`;
        } else if (dailyVolume > 1000) {
          estimatedTimeToGraduation = '1-2 weeks (estimated)';
        } else {
          estimatedTimeToGraduation = 'Low activity - graduation unlikely';
        }
      }

      return {
        currentProgress,
        jupiterMetrics: jupiterData ? {
          organicScore: jupiterData.organicScore,
          holderCount: jupiterData.holderCount,
          volume24h: jupiterData.stats24h.buyVolume + jupiterData.stats24h.sellVolume,
          trades24h: jupiterData.stats24h.numBuys + jupiterData.stats24h.numSells,
          liquidity: jupiterData.liquidity
        } : null,
        estimatedTimeToGraduation,
        organicGrowth
      };
    } catch (error) {
      console.error('Graduation progress error:', error);
      return {
        currentProgress: 0,
        jupiterMetrics: null,
        estimatedTimeToGraduation: 'Unknown',
        organicGrowth: false
      };
    }
  }

  /**
   * Get comprehensive post-launch analytics
   */
  async getPostLaunchAnalytics(mintAddress: string): Promise<{
    jupiterIndexed: boolean;
    marketMetrics: any;
    riskFactors: string[];
    successIndicators: string[];
    nextSteps: string[];
  }> {
    try {
      const [validation, graduationProgress] = await Promise.all([
        this.validateLaunchedToken(mintAddress),
        this.getGraduationProgress(mintAddress)
      ]);

      const riskFactors: string[] = [];
      const successIndicators: string[] = [];
      const nextSteps: string[] = [];

      if (validation.isIndexed && validation.jupiterData) {
        const token = validation.jupiterData;

        // Analyze risk factors
        if (token.organicScore < 30) riskFactors.push('Low organic score');
        if (!token.audit.mintAuthorityDisabled) riskFactors.push('Mint authority active');
        if (!token.audit.freezeAuthorityDisabled) riskFactors.push('Freeze authority active');
        if (token.audit.topHoldersPercentage > 50) riskFactors.push('High holder concentration');
        if (token.liquidity < 5000) riskFactors.push('Very low liquidity');

        // Analyze success indicators
        if (token.organicScore > 70) successIndicators.push('High organic score');
        if (token.holderCount > 100) successIndicators.push('Good holder distribution');
        if (token.stats24h.buyVolume > token.stats24h.sellVolume) successIndicators.push('More buying than selling');
        if (graduationProgress.organicGrowth) successIndicators.push('Organic growth detected');

        // Recommend next steps
        if (graduationProgress.currentProgress < 50) {
          nextSteps.push('Focus on community building and organic marketing');
          nextSteps.push('Encourage small, organic purchases over large buys');
        } else {
          nextSteps.push('Prepare for Raydium graduation');
          nextSteps.push('Plan post-graduation liquidity strategy');
        }

        if (token.organicScore < 50) {
          nextSteps.push('Improve organic trading activity');
          nextSteps.push('Reduce bot trading if possible');
        }
      } else {
        nextSteps.push('Wait for Jupiter indexing');
        nextSteps.push('Monitor pump.fun metrics manually');
      }

      return {
        jupiterIndexed: validation.isIndexed,
        marketMetrics: validation.jupiterData,
        riskFactors,
        successIndicators,
        nextSteps
      };
    } catch (error) {
      console.error('Post-launch analytics error:', error);
      return {
        jupiterIndexed: false,
        marketMetrics: null,
        riskFactors: ['Analysis failed'],
        successIndicators: [],
        nextSteps: ['Manual monitoring required']
      };
    }
  }
}

// Export singleton instance
export function createPumpService(connection: Connection, apiKey?: string): PumpService {
  return new PumpService(connection, apiKey);
}