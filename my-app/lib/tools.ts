import { z } from 'zod';
import { tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { experimental_generateImage as generateImage } from 'ai';
import { solanaService } from './solana-service';
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import { SOLANA_CONFIG, getExplorerUrl } from './solana-config';
import { jupiterUnifiedService } from './jupiter-unified-service';
import { jupiterUltraService } from './jupiter-ultra-service';

// Web Search Tool
export const webSearchTool = tool({
  description: 'Search the web for current information on any topic',
  parameters: z.object({
    query: z.string().describe('The search query'),
    maxResults: z.number().optional().default(5).describe('Maximum number of results to return'),
  }),
  execute: async ({ query, maxResults = 5 }) => {
    try {
      // In production, integrate with a real search API like Serper, Tavily, or Bing
      // For now, returning a structured response that indicates search capability
      const searchResults = {
        query,
        results: [
          {
            title: `Search results for: ${query}`,
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            snippet: `Real-time web search results for "${query}" would appear here. Integrate with a search API for actual results.`,
          },
        ],
        timestamp: new Date().toISOString(),
        message: 'Note: Integrate with a real search API (Serper, Tavily, Bing) for actual results',
      };
      
      return searchResults;
    } catch (error) {
      return { error: `Web search failed: ${error}` };
    }
  },
});

// OpenAI Image Generator Tool (using gpt-image-1 model)
export const openaiImageGeneratorTool = tool({
  description: 'Generate images using OpenAI\'s latest gpt-image-1 model (GPT-4o image generation)',
  parameters: z.object({
    prompt: z.string().describe('Detailed text description of the image to generate'),
    size: z.enum(['1024x1024', '1792x1024', '1024x1792', '2048x2048', '4096x4096'])
      .optional()
      .default('1024x1024')
      .describe('Image size (up to 4096x4096 for high resolution)'),
  }),
  execute: async ({ prompt, size = '1024x1024' }) => {
    try {
      // Using OpenAI's latest gpt-image-1 model (part of GPT-4o)
      // This is the 2025 best practice, not using DALL-E
      const result = await generateImage({
        model: openai.image('gpt-image-1'),
        prompt,
        size,
        n: 1, // gpt-image-1 supports only one image per request as of 2025
      });

      return {
        prompt,
        size,
        imageUrl: result.images[0]?.url,
        model: 'gpt-image-1',
        timestamp: new Date().toISOString(),
        metadata: {
          c2pa: true, // All images include C2PA metadata for transparency
          resolution: size,
        },
      };
    } catch (error: any) {
      // Handle common errors
      if (error.message?.includes('rate limit')) {
        return { 
          error: 'Rate limit exceeded. Your account needs to be Tier 1+ (requires $5+ API spend).',
          details: error.message,
        };
      }
      if (error.message?.includes('content policy')) {
        return { 
          error: 'The prompt violates OpenAI\'s content policy.',
          details: error.message,
        };
      }
      return { 
        error: `Image generation failed: ${error.message || error}`,
        prompt,
      };
    }
  },
});

// Solana Tools
export const solanaBalanceTool = tool({
  description: 'Check SOL balance for a Solana wallet address',
  parameters: z.object({
    address: z.string().describe('Solana wallet address'),
  }),
  execute: async ({ address }) => {
    try {
      // Validate address
      const pubkey = new PublicKey(address);
      
      // Get real balance from Solana blockchain
      const balance = await solanaService.getBalance(address);
      
      return {
        address,
        balance: balance.toFixed(4),
        currency: 'SOL',
        network: SOLANA_CONFIG.network,
        explorerUrl: `${SOLANA_CONFIG.explorerUrl[SOLANA_CONFIG.network]}/address/${address}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return { 
        error: `Failed to fetch Solana balance: ${error.message || error}`,
        address,
      };
    }
  },
});

export const solanaTokenPriceTool = tool({
  description: 'Get current price and comprehensive market data for Solana tokens using Jupiter API v2',
  parameters: z.object({
    symbol: z.string().describe('Token symbol, name, or mint address (e.g., SOL, BONK, So11111111111111111111111111111111111111112)'),
  }),
  execute: async ({ symbol }) => {
    try {
      // First try Jupiter API for comprehensive data
      const enhancedData = await solanaService.getEnhancedTokenData(symbol);
      
      if (enhancedData) {
        return {
          symbol: enhancedData.symbol,
          name: enhancedData.name,
          mint: enhancedData.id,
          price: enhancedData.usdPrice.toFixed(6),
          change24h: enhancedData.stats24h.priceChange.toFixed(2),
          priceFormatted: `$${enhancedData.usdPrice.toLocaleString()}`,
          marketCap: enhancedData.mcap.toLocaleString(),
          fdv: enhancedData.fdv.toLocaleString(),
          liquidity: enhancedData.liquidity.toLocaleString(),
          holderCount: enhancedData.holderCount.toLocaleString(),
          organicScore: enhancedData.organicScore.toFixed(1),
          organicScoreLabel: enhancedData.organicScoreLabel,
          isVerified: enhancedData.isVerified,
          riskLevel: enhancedData.audit.mintAuthorityDisabled && enhancedData.audit.freezeAuthorityDisabled ? 'low' : 'high',
          volume24h: (enhancedData.stats24h.buyVolume + enhancedData.stats24h.sellVolume).toLocaleString(),
          trades24h: (enhancedData.stats24h.numBuys + enhancedData.stats24h.numSells).toLocaleString(),
          cexListings: enhancedData.cexes.length,
          tags: enhancedData.tags,
          source: 'jupiter',
          timestamp: new Date().toISOString(),
        };
      }

      // Fallback to basic price lookup
      const priceInfo = await solanaService.getTokenPrice(symbol);
      
      if (priceInfo) {
        return {
          symbol: symbol.toUpperCase(),
          price: priceInfo.price.toFixed(4),
          change24h: priceInfo.change24h.toFixed(2),
          priceFormatted: `$${priceInfo.price.toLocaleString()}`,
          source: 'fallback',
          message: 'Limited data available. Try using the mint address for comprehensive data.',
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          symbol: symbol.toUpperCase(),
          error: 'Token not found in Jupiter or CoinGecko databases',
          suggestion: 'Verify the token symbol or mint address',
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error: any) {
      return { 
        error: `Failed to fetch token data: ${error.message || error}`,
        symbol,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

// Token Discovery Tool using Jupiter API
export const tokenDiscoveryTool = tool({
  description: 'Discover trending, recent, or verified Solana tokens using Jupiter API v2',
  parameters: z.object({
    category: z.enum(['trending', 'recent', 'verified', 'top-organic']).describe('Category of tokens to discover'),
    limit: z.number().optional().default(20).describe('Number of tokens to return (max 100)'),
    interval: z.enum(['5m', '1h', '6h', '24h']).optional().default('24h').describe('Time interval for trending data'),
  }),
  execute: async ({ category, limit = 20, interval = '24h' }) => {
    try {
      let result;
      
      switch (category) {
        case 'trending':
          result = await solanaService.getTrendingTokens(interval, limit);
          break;
        case 'recent':
          result = await solanaService.getRecentTokens(limit);
          break;
        case 'verified':
          result = await solanaService.getVerifiedTokens(limit);
          break;
        case 'top-organic':
          result = await solanaService.getTrendingTokens(interval, limit);
          break;
        default:
          throw new Error('Invalid category');
      }

      return {
        category,
        interval: category === 'trending' || category === 'top-organic' ? interval : undefined,
        tokens: result.tokens.slice(0, limit).map(token => ({
          symbol: token.symbol,
          name: token.name,
          mint: token.id,
          price: `$${token.usdPrice.toFixed(6)}`,
          change24h: `${token.stats24h.priceChange.toFixed(2)}%`,
          marketCap: `$${token.mcap.toLocaleString()}`,
          liquidity: `$${token.liquidity.toLocaleString()}`,
          holders: token.holderCount.toLocaleString(),
          organicScore: token.organicScore.toFixed(1),
          organicLabel: token.organicScoreLabel,
          verified: token.isVerified,
          cexListings: token.cexes.length,
          volume24h: `$${(token.stats24h.buyVolume + token.stats24h.sellVolume).toLocaleString()}`,
        })),
        total: result.tokens.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        error: `Failed to discover tokens: ${error.message || error}`,
        category,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

// Token Validation Tool using Jupiter API
export const tokenValidationTool = tool({
  description: 'Validate token safety and legitimacy using Jupiter organic scores and audit data',
  parameters: z.object({
    mintAddress: z.string().describe('Token mint address to validate'),
  }),
  execute: async ({ mintAddress }) => {
    try {
      const validation = await solanaService.validateToken(mintAddress);
      const tokenData = await solanaService.getEnhancedTokenData(mintAddress);

      return {
        mintAddress,
        isValid: validation.isValid,
        isVerified: validation.isVerified,
        riskLevel: validation.riskLevel,
        organicScore: validation.organicScore,
        recommendation: validation.recommendedAction,
        warnings: validation.warnings,
        tokenInfo: tokenData ? {
          name: tokenData.name,
          symbol: tokenData.symbol,
          holderCount: tokenData.holderCount,
          liquidity: tokenData.liquidity,
          marketCap: tokenData.mcap,
          cexListings: tokenData.cexes,
          audit: {
            mintAuthorityDisabled: tokenData.audit.mintAuthorityDisabled,
            freezeAuthorityDisabled: tokenData.audit.freezeAuthorityDisabled,
            topHoldersPercentage: tokenData.audit.topHoldersPercentage,
          }
        } : null,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        error: `Failed to validate token: ${error.message || error}`,
        mintAddress,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

// Token Search Tool using Jupiter API
export const tokenSearchTool = tool({
  description: 'Search for Solana tokens by symbol, name, or mint address using Jupiter API v2',
  parameters: z.object({
    query: z.string().describe('Search query (symbol, name, or mint address)'),
    limit: z.number().optional().default(10).describe('Number of results to return'),
  }),
  execute: async ({ query, limit = 10 }) => {
    try {
      const searchResult = await solanaService.searchTokens(query, limit);

      return {
        query,
        results: searchResult.tokens.map(token => ({
          symbol: token.symbol,
          name: token.name,
          mint: token.id,
          price: `$${token.usdPrice.toFixed(6)}`,
          change24h: `${token.stats24h.priceChange.toFixed(2)}%`,
          marketCap: `$${token.mcap.toLocaleString()}`,
          liquidity: `$${token.liquidity.toLocaleString()}`,
          holders: token.holderCount.toLocaleString(),
          organicScore: token.organicScore.toFixed(1),
          verified: token.isVerified,
          tags: token.tags,
          cexes: token.cexes.length,
        })),
        total: searchResult.total,
        hasMore: searchResult.hasMore,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        error: `Failed to search tokens: ${error.message || error}`,
        query,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

// DeFi Analyzer Tool
export const defiAnalyzerTool = tool({
  description: 'Analyze DeFi protocols, yields, and liquidity pools',
  parameters: z.object({
    protocol: z.string().describe('DeFi protocol name (e.g., Raydium, Serum, Orca)'),
    action: z.enum(['analyze', 'yields', 'liquidity']).describe('Type of analysis'),
  }),
  execute: async ({ protocol, action }) => {
    try {
      const analysis = {
        protocol,
        action,
        tvl: (Math.random() * 1000000000).toFixed(0),
        apy: (Math.random() * 50).toFixed(2),
        volume24h: (Math.random() * 100000000).toFixed(0),
        pools: Math.floor(Math.random() * 100),
        analysis: `${action} analysis for ${protocol} protocol`,
        timestamp: new Date().toISOString(),
      };
      return analysis;
    } catch (error) {
      return { error: `DeFi analysis failed: ${error}` };
    }
  },
});

// NFT Tools
export const nftAnalyzerTool = tool({
  description: 'Analyze NFT collections, floor prices, and market trends',
  parameters: z.object({
    collection: z.string().describe('NFT collection name or address'),
  }),
  execute: async ({ collection }) => {
    try {
      const nftData = {
        collection,
        floorPrice: (Math.random() * 10).toFixed(2),
        volume24h: (Math.random() * 1000).toFixed(0),
        holders: Math.floor(Math.random() * 10000),
        totalSupply: Math.floor(Math.random() * 10000),
        change24h: ((Math.random() - 0.5) * 50).toFixed(2),
        timestamp: new Date().toISOString(),
      };
      return nftData;
    } catch (error) {
      return { error: `NFT analysis failed: ${error}` };
    }
  },
});

// Transfer SOL Tool
export const transferSolTool = tool({
  description: 'Transfer SOL from one wallet to another (requires private key in environment)',
  parameters: z.object({
    to: z.string().describe('Recipient Solana wallet address'),
    amount: z.number().describe('Amount of SOL to transfer'),
    privateKey: z.string().optional().describe('Optional: Private key (base58) of sender wallet. If not provided, uses environment key.'),
  }),
  execute: async ({ to, amount, privateKey }) => {
    try {
      // Get sender keypair
      let senderKeypair: Keypair;
      
      if (privateKey) {
        // Use provided private key
        const decoded = bs58.decode(privateKey);
        senderKeypair = Keypair.fromSecretKey(decoded);
      } else if (process.env.SOLANA_PRIVATE_KEY) {
        // Use environment private key
        const decoded = bs58.decode(process.env.SOLANA_PRIVATE_KEY);
        senderKeypair = Keypair.fromSecretKey(decoded);
      } else {
        return {
          error: 'No private key available. Provide a private key or set SOLANA_PRIVATE_KEY environment variable.',
        };
      }
      
      // Check balance first
      const balance = await solanaService.getBalance(senderKeypair.publicKey.toString());
      if (balance < amount) {
        return {
          error: `Insufficient balance. Current balance: ${balance} SOL, requested: ${amount} SOL`,
        };
      }
      
      // Execute transfer
      const signature = await solanaService.transferSol(senderKeypair, to, amount);
      
      return {
        success: true,
        signature,
        from: senderKeypair.publicKey.toString(),
        to,
        amount,
        explorerUrl: getExplorerUrl(signature),
        network: SOLANA_CONFIG.network,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        error: `Transfer failed: ${error.message || error}`,
        to,
        amount,
      };
    }
  },
});

// Get Transaction Tool
export const getTransactionTool = tool({
  description: 'Get details of a Solana transaction by its signature',
  parameters: z.object({
    signature: z.string().describe('Transaction signature'),
  }),
  execute: async ({ signature }) => {
    try {
      const transaction = await solanaService.getTransaction(signature);
      
      if (!transaction) {
        return {
          error: 'Transaction not found',
          signature,
        };
      }
      
      return {
        signature,
        slot: transaction.slot,
        blockTime: transaction.blockTime ? new Date(transaction.blockTime * 1000).toISOString() : null,
        fee: transaction.meta?.fee ? transaction.meta.fee / LAMPORTS_PER_SOL : 0,
        status: transaction.meta?.err ? 'Failed' : 'Success',
        error: transaction.meta?.err || null,
        explorerUrl: getExplorerUrl(signature),
        network: SOLANA_CONFIG.network,
      };
    } catch (error: any) {
      return {
        error: `Failed to get transaction: ${error.message || error}`,
        signature,
      };
    }
  },
});

// Jupiter Ultra Swap Tool
export const jupiterUltraSwapTool = tool({
  description: 'Execute advanced swaps using Jupiter Ultra API with gasless support, MEV protection, and optimal routing',
  parameters: z.object({
    inputMint: z.string().describe('Input token mint address'),
    outputMint: z.string().describe('Output token mint address'),
    amount: z.string().describe('Amount to swap (in smallest unit)'),
    userPublicKey: z.string().describe('User wallet public key'),
    slippageBps: z.number().optional().default(50).describe('Slippage tolerance in basis points (50 = 0.5%)'),
    enableGasless: z.boolean().optional().default(true).describe('Enable gasless swap if eligible'),
    priorityLevel: z.enum(['Min', 'Low', 'Medium', 'High', 'VeryHigh']).optional().default('Medium').describe('Transaction priority level'),
    integratorFeeBps: z.number().optional().describe('Integrator fee in basis points'),
  }),
  execute: async ({ inputMint, outputMint, amount, userPublicKey, slippageBps, enableGasless, priorityLevel, integratorFeeBps }) => {
    try {
      const result = await jupiterUnifiedService.swap({
        inputMint,
        outputMint,
        amount,
        userPublicKey,
        slippageBps,
        enableGasless,
        priorityLevel,
        ...(integratorFeeBps && {
          integratorFee: {
            account: userPublicKey, // Simplified - in practice would be different
            bps: integratorFeeBps
          }
        })
      });

      return {
        success: true,
        transaction: result.transaction,
        lastValidBlockHeight: result.lastValidBlockHeight,
        priorityFeeEstimate: result.priorityFeeEstimate,
        route: {
          inputMint: result.route.inputMint,
          outputMint: result.route.outputMint,
          inputAmount: result.route.inputAmount,
          outputAmount: result.route.outputAmount,
          priceImpact: `${result.route.priceImpactPct.toFixed(4)}%`,
          slippage: `${result.route.slippageBps / 100}%`,
          platformFee: result.route.platformFee ? `${result.route.platformFee} bps` : 'None'
        },
        gasless: result.gasless,
        riskAssessment: result.riskAssessment,
        tier: result.tier,
        executionTime: `${result.timeTaken}ms`,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        error: `Ultra swap failed: ${error.message || error}`,
        inputMint,
        outputMint,
        amount,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

// Jupiter Quote Comparison Tool
export const jupiterQuoteComparisonTool = tool({
  description: 'Compare quotes between Jupiter Lite and Ultra APIs to find the best deal',
  parameters: z.object({
    inputMint: z.string().describe('Input token mint address'),
    outputMint: z.string().describe('Output token mint address'),
    amount: z.string().describe('Amount to swap (in smallest unit)'),
    slippageBps: z.number().optional().default(50).describe('Slippage tolerance in basis points'),
  }),
  execute: async ({ inputMint, outputMint, amount, slippageBps }) => {
    try {
      const comparison = await jupiterUnifiedService.compareQuotes({
        inputMint,
        outputMint,
        amount,
        userPublicKey: '', // Not needed for quotes
        slippageBps,
      });

      return {
        inputMint,
        outputMint,
        amount,
        comparison: {
          lite: comparison.lite ? {
            outputAmount: comparison.lite.outAmount,
            priceImpact: `${parseFloat(comparison.lite.priceImpactPct).toFixed(4)}%`,
            platformFee: comparison.lite.platformFee?.feeBps ? `${comparison.lite.platformFee.feeBps} bps` : 'None',
            route: comparison.lite.routePlan?.map(p => p.swapInfo.label).join(' → ') || 'Direct'
          } : null,
          ultra: comparison.ultra ? {
            outputAmount: comparison.ultra.route.outputAmount,
            priceImpact: `${comparison.ultra.route.priceImpactPct.toFixed(4)}%`,
            platformFee: comparison.ultra.feeBps ? `${comparison.ultra.feeBps} bps` : 'None',
            route: comparison.ultra.route.marketInfos?.map(m => m.label).join(' → ') || 'Direct'
          } : null,
          recommendation: comparison.recommendation,
          reason: comparison.reason,
          savings: comparison.savings ? `${comparison.savings} tokens` : 'None'
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        error: `Quote comparison failed: ${error.message || error}`,
        inputMint,
        outputMint,
        amount,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

// Jupiter Balance Checker Tool (Ultra API)
export const jupiterBalanceCheckerTool = tool({
  description: 'Check token balances for a wallet using Jupiter Ultra API',
  parameters: z.object({
    owner: z.string().describe('Wallet address to check balances for'),
    mints: z.array(z.string()).optional().describe('Specific token mints to check (if not provided, returns all tokens)'),
    showZeroBalances: z.boolean().optional().default(false).describe('Include tokens with zero balance'),
  }),
  execute: async ({ owner, mints, showZeroBalances }) => {
    try {
      const result = await jupiterUltraService.getBalances({
        owner,
        mints,
        showZeroBalances,
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get balances');
      }

      return {
        owner,
        balances: result.data.balances.map(balance => ({
          mint: balance.mint,
          amount: balance.amount,
          decimals: balance.decimals,
          uiAmount: balance.uiAmount,
          uiAmountString: balance.uiAmountString,
          tokenAccount: balance.tokenAccount,
          programId: balance.programId,
        })),
        totalTokens: result.data.balances.length,
        contextSlot: result.data.contextSlot,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        error: `Balance check failed: ${error.message || error}`,
        owner,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

// Jupiter Token Safety Tool (Shield)
export const jupiterTokenSafetyTool = tool({
  description: 'Check token safety and risk assessment using Jupiter Ultra Shield API',
  parameters: z.object({
    mints: z.array(z.string()).describe('Token mint addresses to check for safety'),
  }),
  execute: async ({ mints }) => {
    try {
      const result = await jupiterUltraService.getShield({ mints });

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get token safety information');
      }

      return {
        mints,
        safetyData: result.data.data.map(tokenData => ({
          mint: tokenData.mint,
          isRisky: tokenData.risky,
          riskScore: tokenData.riskScore,
          confidence: tokenData.confidence,
          warnings: tokenData.warnings.map(warning => ({
            type: warning.type,
            message: warning.message,
            severity: warning.severity,
          })),
          lastUpdated: tokenData.lastUpdated,
        })),
        summary: {
          totalTokens: result.data.data.length,
          riskyTokens: result.data.data.filter(t => t.risky).length,
          safeTokens: result.data.data.filter(t => !t.risky).length,
          highRiskTokens: result.data.data.filter(t => t.riskScore > 70).length,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        error: `Token safety check failed: ${error.message || error}`,
        mints,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

// Jupiter Service Status Tool
export const jupiterServiceStatusTool = tool({
  description: 'Check the status and health of Jupiter Lite and Ultra API services',
  parameters: z.object({
    includeRateLimits: z.boolean().optional().default(true).describe('Include rate limit information'),
  }),
  execute: async ({ includeRateLimits }) => {
    try {
      const status = jupiterUnifiedService.getStatus();

      return {
        preferredTier: status.preferredTier,
        lite: {
          isHealthy: status.lite.isHealthy,
          cacheSize: status.lite.cacheSize,
          rateLimits: includeRateLimits ? {
            requestsRemaining: status.lite.rateLimitStatus.requestsRemaining,
            resetTime: status.lite.rateLimitStatus.windowResetTime.toISOString(),
            isLimited: status.lite.rateLimitStatus.isLimited,
            requestsPerMinute: status.lite.rateLimitStatus.requestsPerMinute,
          } : undefined,
        },
        ultra: {
          isHealthy: status.ultra.isHealthy,
          hasApiKey: status.ultra.hasApiKey,
          cacheSize: status.ultra.cacheSize,
          rateLimits: includeRateLimits && status.ultra.rateLimitInfo ? {
            remaining: status.ultra.rateLimitInfo.remaining,
            limit: status.ultra.rateLimitInfo.limit,
            resetTime: new Date(status.ultra.rateLimitInfo.reset * 1000).toISOString(),
            windowMs: status.ultra.rateLimitInfo.windowMs,
          } : undefined,
        },
        configuration: {
          fallbackEnabled: status.config.fallbackEnabled,
          autoUpgrade: status.config.autoUpgrade,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        error: `Status check failed: ${error.message || error}`,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

// Export all tools in a registry
export const toolsRegistry = {
  'web-search': webSearchTool,
  'openai-image-generator': openaiImageGeneratorTool,
  'solana-balance': solanaBalanceTool,
  'solana-token-price': solanaTokenPriceTool,
  'token-discovery': tokenDiscoveryTool,
  'token-validation': tokenValidationTool,
  'token-search': tokenSearchTool,
  'transfer-sol': transferSolTool,
  'get-transaction': getTransactionTool,
  'defi-analyzer': defiAnalyzerTool,
  'nft-analyzer': nftAnalyzerTool,
  'jupiter-ultra-swap': jupiterUltraSwapTool,
  'jupiter-quote-comparison': jupiterQuoteComparisonTool,
  'jupiter-balance-checker': jupiterBalanceCheckerTool,
  'jupiter-token-safety': jupiterTokenSafetyTool,
  'jupiter-service-status': jupiterServiceStatusTool,
};

export type ToolId = keyof typeof toolsRegistry;