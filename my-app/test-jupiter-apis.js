/**
 * Test Jupiter Lite and Ultra APIs Implementation
 * Run with: node test-jupiter-apis.js
 */

const { SOLANA_CONFIG } = require('./lib/solana-config');

// Test configuration
const TEST_CONFIG = {
  // Common Solana token mint addresses for testing
  SOL_MINT: 'So11111111111111111111111111111111111111112',
  USDC_MINT: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  BONK_MINT: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  
  // Test amounts (in smallest units)
  SMALL_AMOUNT: '1000000', // 0.001 SOL
  MEDIUM_AMOUNT: '10000000', // 0.01 SOL
  LARGE_AMOUNT: '100000000', // 0.1 SOL
  
  // Test wallet (dummy for testing)
  TEST_WALLET: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
};

async function testJupiterLiteService() {
  console.log('\n🔍 Testing Jupiter Lite Service...');
  
  try {
    // Import the service
    const { JupiterLiteService, createJupiterLiteService } = await import('./lib/jupiter-lite-service.ts');
    
    const liteService = createJupiterLiteService();
    console.log('✅ Jupiter Lite Service initialized');
    
    // Test 1: Get Quote
    console.log('\n📊 Test 1: Getting quote...');
    try {
      const quote = await liteService.getQuote({
        inputMint: TEST_CONFIG.SOL_MINT,
        outputMint: TEST_CONFIG.USDC_MINT,
        amount: TEST_CONFIG.MEDIUM_AMOUNT,
        slippageBps: 50,
      });
      
      console.log('✅ Quote received:', {
        inputAmount: quote.inAmount,
        outputAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct,
        slippage: quote.slippageBps + ' bps',
        route: quote.routePlan?.length + ' hops'
      });
    } catch (error) {
      console.log('❌ Quote failed:', error.message);
    }
    
    // Test 2: Get Service Status
    console.log('\n📈 Test 2: Getting service status...');
    const status = liteService.getStatus();
    console.log('✅ Service Status:', {
      isHealthy: status.isHealthy,
      requestsRemaining: status.rateLimitStatus.requestsRemaining,
      cacheSize: status.cacheSize,
    });
    
    // Test 3: Best Price Comparison
    console.log('\n💰 Test 3: Getting best price...');
    try {
      const bestPrice = await liteService.getBestPrice(
        TEST_CONFIG.SOL_MINT,
        TEST_CONFIG.USDC_MINT,
        TEST_CONFIG.SMALL_AMOUNT
      );
      
      console.log('✅ Best Price:', {
        outputAmount: bestPrice.bestQuote.outAmount,
        alternatives: bestPrice.alternatives.length,
        priceImpact: bestPrice.bestQuote.priceImpactPct
      });
    } catch (error) {
      console.log('❌ Best price failed:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Jupiter Lite Service test failed:', error.message);
  }
}

async function testJupiterUltraService() {
  console.log('\n🚀 Testing Jupiter Ultra Service...');
  
  try {
    // Import the service
    const { JupiterUltraService, createJupiterUltraService } = await import('./lib/jupiter-ultra-service.ts');
    
    const ultraService = createJupiterUltraService();
    console.log('✅ Jupiter Ultra Service initialized');
    
    // Test 1: Get Service Status
    console.log('\n📈 Test 1: Getting service status...');
    const status = ultraService.getStatus();
    console.log('✅ Service Status:', {
      isHealthy: status.isHealthy,
      hasApiKey: status.hasApiKey,
      cacheSize: status.cacheSize,
    });
    
    if (!status.hasApiKey) {
      console.log('⚠️ No API key configured for Ultra service. Some tests will be skipped.');
      return;
    }
    
    // Test 2: Get Order
    console.log('\n📊 Test 2: Getting Ultra order...');
    try {
      const orderResult = await ultraService.getOrder({
        inputMint: TEST_CONFIG.SOL_MINT,
        outputMint: TEST_CONFIG.USDC_MINT,
        amount: TEST_CONFIG.MEDIUM_AMOUNT,
        slippageBps: 50,
        swapMode: 'ExactIn',
      });
      
      if (orderResult.success) {
        console.log('✅ Order received:', {
          inputAmount: orderResult.data.route.inputAmount,
          outputAmount: orderResult.data.route.outputAmount,
          priceImpact: orderResult.data.route.priceImpactPct + '%',
          marketInfos: orderResult.data.route.marketInfos?.length + ' markets',
          priorityFee: orderResult.data.priorityFeeEstimate + ' lamports'
        });
      } else {
        console.log('❌ Order failed:', orderResult.error?.message);
      }
    } catch (error) {
      console.log('❌ Order request failed:', error.message);
    }
    
    // Test 3: Get Token Safety (Shield)
    console.log('\n🛡️ Test 3: Checking token safety...');
    try {
      const shieldResult = await ultraService.getShield({
        mints: [TEST_CONFIG.SOL_MINT, TEST_CONFIG.BONK_MINT]
      });
      
      if (shieldResult.success) {
        console.log('✅ Shield data received:');
        shieldResult.data.data.forEach(token => {
          console.log(`  ${token.mint.slice(0, 8)}...: ${token.risky ? 'RISKY' : 'SAFE'} (Score: ${token.riskScore})`);
        });
      } else {
        console.log('❌ Shield check failed:', shieldResult.error?.message);
      }
    } catch (error) {
      console.log('❌ Shield request failed:', error.message);
    }
    
    // Test 4: Get Balances
    console.log('\n💰 Test 4: Getting account balances...');
    try {
      const balancesResult = await ultraService.getBalances({
        owner: TEST_CONFIG.TEST_WALLET,
        showZeroBalances: false,
      });
      
      if (balancesResult.success) {
        console.log('✅ Balances received:', {
          totalTokens: balancesResult.data.balances.length,
          contextSlot: balancesResult.data.contextSlot,
        });
      } else {
        console.log('❌ Balances check failed:', balancesResult.error?.message);
      }
    } catch (error) {
      console.log('❌ Balances request failed:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Jupiter Ultra Service test failed:', error.message);
  }
}

async function testJupiterUnifiedService() {
  console.log('\n🎯 Testing Jupiter Unified Service...');
  
  try {
    // Import the service
    const { JupiterUnifiedService, createJupiterUnifiedService } = await import('./lib/jupiter-unified-service.ts');
    
    const unifiedService = createJupiterUnifiedService();
    console.log('✅ Jupiter Unified Service initialized');
    
    // Test 1: Get Service Status
    console.log('\n📈 Test 1: Getting unified service status...');
    const status = unifiedService.getStatus();
    console.log('✅ Unified Status:', {
      preferredTier: status.preferredTier,
      liteHealthy: status.lite.isHealthy,
      ultraHealthy: status.ultra.isHealthy,
      ultraHasKey: status.ultra.hasApiKey,
    });
    
    // Test 2: Get Quote
    console.log('\n📊 Test 2: Getting unified quote...');
    try {
      const quote = await unifiedService.getQuote({
        inputMint: TEST_CONFIG.SOL_MINT,
        outputMint: TEST_CONFIG.USDC_MINT,
        amount: TEST_CONFIG.SMALL_AMOUNT,
        slippageBps: 50,
      });
      
      console.log('✅ Unified Quote:', {
        tier: quote.tier,
        inputAmount: quote.inputAmount,
        outputAmount: quote.outputAmount,
        priceImpact: quote.priceImpactPct + '%',
        route: quote.route,
        timeTaken: quote.timeTaken + 'ms'
      });
    } catch (error) {
      console.log('❌ Unified quote failed:', error.message);
    }
    
    // Test 3: Compare Quotes
    if (status.ultra.hasApiKey) {
      console.log('\n⚖️ Test 3: Comparing quotes between Lite and Ultra...');
      try {
        const comparison = await unifiedService.compareQuotes({
          inputMint: TEST_CONFIG.SOL_MINT,
          outputMint: TEST_CONFIG.USDC_MINT,
          amount: TEST_CONFIG.MEDIUM_AMOUNT,
          slippageBps: 50,
        });
        
        console.log('✅ Quote Comparison:', {
          recommendation: comparison.recommendation,
          reason: comparison.reason,
          savings: comparison.savings || 'N/A',
          liteAvailable: !!comparison.lite,
          ultraAvailable: !!comparison.ultra,
        });
      } catch (error) {
        console.log('❌ Quote comparison failed:', error.message);
      }
    } else {
      console.log('⚠️ Skipping quote comparison - Ultra API key not configured');
    }
    
  } catch (error) {
    console.log('❌ Jupiter Unified Service test failed:', error.message);
  }
}

async function testConfiguration() {
  console.log('\n⚙️ Testing Configuration...');
  
  console.log('📋 Solana Config:', {
    network: SOLANA_CONFIG.network,
    jupiterLiteUrl: SOLANA_CONFIG.jupiter?.lite?.baseUrl,
    jupiterUltraUrl: SOLANA_CONFIG.jupiter?.ultra?.baseUrl,
    tier: SOLANA_CONFIG.jupiter?.unified?.tier,
    fallbackEnabled: SOLANA_CONFIG.jupiter?.unified?.fallbackEnabled,
  });
  
  console.log('🔑 Environment Variables:', {
    jupiterTier: process.env.NEXT_PUBLIC_JUPITER_TIER || 'default',
    hasUltraKey: !!process.env.JUPITER_API_KEY,
    liteUrl: process.env.NEXT_PUBLIC_JUPITER_LITE_URL || 'default',
    ultraUrl: process.env.NEXT_PUBLIC_JUPITER_ULTRA_URL || 'default',
  });
}

async function runAllTests() {
  console.log('🧪 Starting Jupiter APIs Test Suite\n');
  console.log('=' .repeat(50));
  
  try {
    // Test configuration
    await testConfiguration();
    
    // Test individual services
    await testJupiterLiteService();
    await testJupiterUltraService();
    await testJupiterUnifiedService();
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Test suite completed!');
    console.log('\n📝 Notes:');
    console.log('- Lite API tests should work without configuration');
    console.log('- Ultra API tests require JUPITER_API_KEY environment variable');
    console.log('- Some tests may fail if network conditions are poor');
    console.log('- Check the console for specific error messages');
    
  } catch (error) {
    console.log('\n❌ Test suite failed:', error.message);
    console.log('Stack trace:', error.stack);
  }
}

// Handle import/require differences
if (typeof require !== 'undefined' && require.main === module) {
  runAllTests();
} else if (typeof module !== 'undefined') {
  module.exports = {
    runAllTests,
    testJupiterLiteService,
    testJupiterUltraService,
    testJupiterUnifiedService,
    testConfiguration,
    TEST_CONFIG
  };
}

// Export for ES modules
export {
  runAllTests,
  testJupiterLiteService,
  testJupiterUltraService,
  testJupiterUnifiedService,
  testConfiguration,
  TEST_CONFIG
};