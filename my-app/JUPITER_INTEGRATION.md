# Jupiter Lite & Ultra API Integration

## Overview

Complete implementation of Jupiter's Lite API (free tier) and Ultra API (premium tier) providing comprehensive Solana trading capabilities including advanced routing, gasless swaps, MEV protection, and real-time token data. This integration also maintains the existing Jupiter Token API v2 for enhanced token discovery and validation.

## New Features

### ⚡ **Jupiter Lite API (Free Tier)**
- **Basic swap quotes** with optimal routing
- **Rate limiting**: 100 requests/minute
- **Direct routes** and multi-hop swaps
- **Price impact** calculation
- **Platform fee** transparency
- **Route comparison** and optimization

### 🚀 **Jupiter Ultra API (Premium Tier)**
- **Advanced order management** with enhanced routing
- **Gasless swaps** via Jupiter Z RFQ
- **MEV protection** and slippage optimization
- **Dynamic rate limits** scaling with volume
- **Account balance** checking across all tokens
- **Token safety shield** with risk assessment
- **Priority fee** optimization
- **95% execution** under 2 seconds

### 🎯 **Unified Service**
- **Intelligent routing** between Lite and Ultra APIs
- **Automatic fallback** from Ultra to Lite
- **Quote comparison** to find best prices
- **Tier detection** based on requirements
- **Configuration management** and health monitoring

### 🛡️ **Enhanced Security**
- **Token risk assessment** via Shield API
- **Organic score** validation
- **Audit information** (mint/freeze authority)
- **Warning system** for high-risk tokens
- **Recommendation engine** for safe trading

### 🚀 **Previous Token Data Features** (Maintained)
- **Real-time pricing** from Jupiter's on-chain data
- **Organic scores** to identify legitimate vs manipulated tokens
- **Holder counts** and distribution analysis
- **CEX listings** and liquidity metrics
- **Trading statistics** (24h volume, buy/sell ratios)

### 🔍 **Token Discovery**
- **Search** by symbol, name, or mint address
- **Trending tokens** with configurable intervals
- **Recent launches** (first pool creation)
- **Verified tokens** with trust indicators
- **Category filtering** (top organic score, most traded)

### 🛡️ **Risk Assessment**
- **Automated validation** of token safety
- **Risk level classification** (low, medium, high, extreme)
- **Warning system** for potential red flags
- **Recommendation engine** (proceed, caution, avoid)

### 🔄 **Smart Fallback**
- **Primary**: Jupiter Token API v2 for Solana tokens
- **Secondary**: CoinGecko for cross-chain tokens and backup
- **Graceful degradation** when APIs are unavailable

## Configuration

### Environment Variables

Add to your `.env.local`:

```env
# Jupiter Lite & Ultra API Configuration
NEXT_PUBLIC_JUPITER_LITE_URL=https://lite-api.jup.ag
NEXT_PUBLIC_JUPITER_ULTRA_URL=https://api.jup.ag
JUPITER_API_KEY=your_jupiter_api_key_here
NEXT_PUBLIC_JUPITER_TIER=auto # 'lite', 'ultra', or 'auto'

# Jupiter Token API v2 (Optional - for token discovery)
NEXT_PUBLIC_JUPITER_API_KEY=your_jupiter_api_key_here

# CoinGecko (Fallback)
COINGECKO_API_KEY=your_coingecko_api_key_here
```

### API Tiers

| Feature | Lite (Free) | Ultra (Premium) | Token API v2 |
|---------|-------------|-----------------|--------------|
| **Rate Limit** | 100 req/min | Dynamic (scales with volume) | 100-600 req/min |
| **Swap Quotes** | ✅ Basic | ✅ Advanced | ❌ |
| **Swap Execution** | ✅ Standard | ✅ Optimized | ❌ |
| **Gasless Swaps** | ❌ | ✅ | ❌ |
| **MEV Protection** | ❌ | ✅ | ❌ |
| **Token Balances** | ❌ | ✅ | ❌ |
| **Token Safety** | ❌ | ✅ Shield | ✅ Organic Score |
| **Token Discovery** | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ✅ | ✅ |
| **API Key Required** | ❌ | ✅ | Optional |

## Usage Examples

### Jupiter Unified Service (Recommended)

```typescript
import { jupiterUnifiedService } from '@/lib/jupiter-unified-service'

// Smart swap with automatic tier selection
const swapResult = await jupiterUnifiedService.swap({
  inputMint: 'So11111111111111111111111111111111111111112', // SOL
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  amount: '10000000', // 0.01 SOL
  userPublicKey: 'YourWalletAddress...',
  slippageBps: 50, // 0.5% slippage
  enableGasless: true,
  priorityLevel: 'Medium'
})

console.log(`Swap via ${swapResult.tier} API`)
console.log(`Transaction: ${swapResult.transaction}`)
console.log(`Gasless eligible: ${swapResult.gasless?.isEligible}`)
```

### Quote Comparison

```typescript
// Compare Lite vs Ultra pricing
const comparison = await jupiterUnifiedService.compareQuotes({
  inputMint: 'So11111111111111111111111111111111111111112',
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  amount: '100000000', // 0.1 SOL
  slippageBps: 50
})

console.log(`Recommendation: ${comparison.recommendation}`)
console.log(`Reason: ${comparison.reason}`)
console.log(`Potential savings: ${comparison.savings} tokens`)
```

### Jupiter Lite Service (Free Tier)

```typescript
import { jupiterLiteService } from '@/lib/jupiter-lite-service'

// Get swap quote
const quote = await jupiterLiteService.getQuote({
  inputMint: 'So11111111111111111111111111111111111111112',
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  amount: '10000000',
  slippageBps: 50
})

// Get swap transaction
const swap = await jupiterLiteService.getSwapTransaction({
  quoteResponse: quote,
  userPublicKey: 'YourWalletAddress...',
  wrapAndUnwrapSol: true
})

console.log(`Output: ${quote.outAmount} tokens`)
console.log(`Price impact: ${quote.priceImpactPct}%`)
console.log(`Transaction: ${swap.swapTransaction}`)
```

### Jupiter Ultra Service (Premium Tier)

```typescript
import { jupiterUltraService } from '@/lib/jupiter-ultra-service'

// Advanced swap with MEV protection and gasless support
const result = await jupiterUltraService.performSwap(
  'So11111111111111111111111111111111111111112', // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  '50000000', // 0.05 SOL
  'YourWalletAddress...',
  {
    slippageBps: 30,
    enableGasless: true,
    priorityConfig: { level: 'High' },
    integratorFee: { account: 'FeeAccount...', bps: 25 } // 0.25% fee
  }
)

console.log(`Gasless eligible: ${result.gaslessEligibility?.isEligible}`)
console.log(`Risk assessment: ${result.riskAssessment?.success}`)
console.log(`Order: ${result.order.data?.order}`)

// Check token safety
const safety = await jupiterUltraService.getShield({
  mints: ['TokenMintAddress1...', 'TokenMintAddress2...']
})

safety.data.data.forEach(token => {
  console.log(`${token.mint}: ${token.risky ? 'RISKY' : 'SAFE'} (${token.riskScore}/100)`)
  token.warnings.forEach(warning => 
    console.log(`  ⚠️ ${warning.severity}: ${warning.message}`)
  )
})

// Get account balances
const balances = await jupiterUltraService.getBalances({
  owner: 'WalletAddress...',
  showZeroBalances: false
})

balances.data.balances.forEach(balance => {
  console.log(`${balance.mint}: ${balance.uiAmountString}`)
})
```

### Token Discovery (Legacy Token API)

```typescript
import { solanaService } from '@/lib/solana-service'

// Search for tokens
const searchResult = await solanaService.searchTokens('BONK', 10)
console.log(`Found ${searchResult.tokens.length} tokens`)

// Get enhanced token data
const tokenData = await solanaService.getEnhancedTokenData('mint_address_here')
if (tokenData) {
  console.log(`Organic Score: ${tokenData.organicScore}`)
  console.log(`Holder Count: ${tokenData.holderCount}`)
  console.log(`Liquidity: $${tokenData.liquidity}`)
}
```

### Token Validation

```typescript
// Validate token safety
const validation = await solanaService.validateToken('mint_address_here')
console.log(`Risk Level: ${validation.riskLevel}`)
console.log(`Recommendation: ${validation.recommendedAction}`)
validation.warnings.forEach(warning => console.log(`⚠️ ${warning}`))
```

### Token Discovery

```typescript
// Get trending tokens
const trending = await solanaService.getTrendingTokens('24h', 20)
trending.tokens.forEach(token => {
  console.log(`${token.symbol}: ${token.organicScore.toFixed(1)} organic score`)
})

// Get recent launches
const recent = await solanaService.getRecentTokens(15)
console.log(`${recent.tokens.length} recently launched tokens`)

// Get verified tokens
const verified = await solanaService.getVerifiedTokens(50)
console.log(`${verified.tokens.length} verified tokens`)
```

### Enhanced Price Data

```typescript
// Get price with comprehensive data
const enhancedData = await solanaService.getEnhancedTokenData('So11111111111111111111111111111111111111112')
if (enhancedData) {
  console.log(`Price: $${enhancedData.usdPrice}`)
  console.log(`24h Change: ${enhancedData.stats24h.priceChange.toFixed(2)}%`)
  console.log(`Market Cap: $${enhancedData.mcap.toLocaleString()}`)
  console.log(`FDV: $${enhancedData.fdv.toLocaleString()}`)
  console.log(`Liquidity: $${enhancedData.liquidity.toLocaleString()}`)
}
```

## UI Components

### Token Selector Component

```typescript
import { TokenSelector } from '@/components/ui/token-selector'

function MyComponent() {
  const handleTokenSelect = (token: JupiterTokenData) => {
    console.log('Selected token:', token.symbol)
  }

  return (
    <TokenSelector
      onTokenSelect={handleTokenSelect}
      placeholder="Search for tokens..."
      showVerifiedOnly={false}
      showMetrics={true}
      maxResults={10}
    />
  )
}
```

### Token Discovery Component

```typescript
import { TokenDiscovery } from '@/components/ui/token-selector'

function TrendingTokens() {
  return (
    <TokenDiscovery
      category="trending"
      onTokenSelect={(token) => console.log(token)}
      limit={20}
      interval="24h"
    />
  )
}
```

## Launchpad Integration

### Pump.fun Integration

```typescript
import { createPumpService } from '@/lib/pump-service'

const pumpService = createPumpService(connection)

// Validate launched token
const validation = await pumpService.validateLaunchedToken(mintAddress)
console.log(`Jupiter Indexed: ${validation.isIndexed}`)
console.log(`Organic Score: ${validation.organicScore}`)
console.log(`Risk Assessment: ${validation.riskAssessment}`)

// Track graduation progress
const progress = await pumpService.getGraduationProgress(mintAddress)
console.log(`Progress: ${progress.currentProgress}%`)
console.log(`Organic Growth: ${progress.organicGrowth}`)
console.log(`Estimated Graduation: ${progress.estimatedTimeToGraduation}`)

// Get comprehensive analytics
const analytics = await pumpService.getPostLaunchAnalytics(mintAddress)
console.log('Risk Factors:', analytics.riskFactors)
console.log('Success Indicators:', analytics.successIndicators)
console.log('Next Steps:', analytics.nextSteps)
```

### LetsBonk.fun Integration

```typescript
import { createBonkService } from '@/lib/bonk-service'

const bonkService = createBonkService(connection)

// Validate LetsBonk token (immediate Raydium listing)
const validation = await bonkService.validateLaunchedToken(mintAddress)
console.log(`Raydium Liquidity: $${validation.raydiumMetrics?.liquidity}`)
console.log(`BONK Burned (24h): $${validation.bonkBurnTracking?.bonkBurned}`)

// Get BONK ecosystem metrics
const ecosystemMetrics = await bonkService.getBonkEcosystemMetrics(mintAddress)
console.log('AI Token Rewards:', ecosystemMetrics.aiTokenRewards)
console.log('Ecosystem Integration:', ecosystemMetrics.ecosystemIntegration)

// Compare with Pump.fun
const comparison = await bonkService.compareWithPumpFun(mintAddress)
console.log('Platform Advantages:', comparison.platformAdvantages)
console.log('Burn Benefits:', comparison.burnBenefits)
```

## Tools Integration

### New Jupiter Ultra/Lite API Tools

### `jupiterUltraSwapTool`
- Execute advanced swaps using Jupiter Ultra API
- Gasless swap support and MEV protection
- Priority fee optimization and dynamic routing
- Risk assessment and execution time tracking

### `jupiterQuoteComparisonTool`
- Compare quotes between Lite and Ultra APIs
- Automatic recommendation for best price
- Savings calculation and reason explanation
- Route comparison and fee analysis

### `jupiterBalanceCheckerTool`
- Check token balances using Ultra API
- Multi-token balance queries
- Zero balance filtering
- Real-time context slot information

### `jupiterTokenSafetyTool`
- Comprehensive token safety assessment via Shield API
- Risk scoring and confidence levels
- Warning categorization by severity
- Batch token safety checking

### `jupiterServiceStatusTool`
- Monitor health of Lite and Ultra services
- Rate limit status and API availability
- Cache performance and configuration status
- Service tier recommendations

### Existing Token API Tools (Enhanced)

### `solanaTokenPriceTool`
- Enhanced with organic scores, holder counts, and risk metrics
- Comprehensive market data including volume and trades
- CEX listing information and verification status

### `tokenDiscoveryTool`
- Discover trending, recent, verified, or top organic score tokens
- Configurable intervals and result limits
- Rich metadata including organic scores and market metrics

### `tokenValidationTool`
- Validate token safety using Jupiter's organic scores
- Audit information (mint/freeze authority status)
- Risk assessment with actionable recommendations

### `tokenSearchTool`
- Search by symbol, name, or mint address
- Real-time results with comprehensive token data
- Support for pagination and filtering

## Benefits Over CoinGecko

### 📈 **Superior Data Quality**
- **Real-time** on-chain data vs delayed CoinGecko data
- **Organic scores** to identify legitimate vs manipulated tokens
- **Comprehensive audit** information (mint/freeze authority status)
- **Native Solana** integration with Jupiter ecosystem

### 🎯 **Enhanced User Experience**
- **Better token discovery** with trending/recent categories
- **Verification badges** and trust indicators
- **Detailed trading statistics** and holder analytics
- **Risk assessment** with clear recommendations

### 🚀 **Launchpad Integration**
- **Validate newly created tokens** against Jupiter database
- **Track organic growth** and holder acquisition
- **Monitor token graduation** and liquidity metrics
- **Platform-specific analytics** for Pump.fun and LetsBonk.fun

### 🔧 **Technical Advantages**
- **Better rate limits** and API stability
- **Native Solana ecosystem** integration
- **Access to Jupiter's expanding** feature set
- **Smart caching** and error handling

## Rate Limiting

The integration includes intelligent rate limiting:

- **Automatic rate limit detection** from API headers
- **Request queuing** when limits are approached
- **Graceful degradation** to CoinGecko when needed
- **Configurable cache timeouts** (default: 30 seconds)

## Error Handling

Robust error handling ensures reliability:

- **Automatic fallback** to CoinGecko for unavailable tokens
- **Retry logic** for temporary failures
- **Detailed error messages** for debugging
- **Graceful degradation** when APIs are down

## Monitoring

Track integration health with:

- **Rate limit status** monitoring
- **API response times** tracking
- **Cache hit rates** analysis
- **Fallback usage** statistics

## Testing

### Basic Configuration Test

```bash
# Test basic setup and connectivity
node test-jupiter-basic.js
```

### Comprehensive API Tests

```bash
# Test all Jupiter APIs (Lite, Ultra, Unified)
node test-jupiter-apis.js

# Test launchpad integration
node test-launchpad.js

# Run type checks
npm run type-check
```

### Testing Individual Services

```typescript
// Test Lite API
import { jupiterLiteService } from './lib/jupiter-lite-service'
const status = jupiterLiteService.getStatus()
console.log('Lite API Status:', status)

// Test Ultra API (requires API key)
import { jupiterUltraService } from './lib/jupiter-ultra-service'
const ultraStatus = jupiterUltraService.getStatus()
console.log('Ultra API Status:', ultraStatus)

// Test Unified Service
import { jupiterUnifiedService } from './lib/jupiter-unified-service'
const unifiedStatus = jupiterUnifiedService.getStatus()
console.log('Unified Service Status:', unifiedStatus)
```

### Environment Setup for Testing

1. **Basic Testing (No API Key Required)**:
   ```bash
   # Test Lite API and basic functionality
   npm run test:jupiter-basic
   ```

2. **Full Testing (API Key Required)**:
   ```bash
   # Set your Jupiter API key
   export JUPITER_API_KEY=your_api_key_here
   
   # Run comprehensive tests
   npm run test:jupiter-full
   ```

3. **Production Testing**:
   ```bash
   # Test with production configuration
   export NEXT_PUBLIC_JUPITER_TIER=ultra
   export JUPITER_API_KEY=your_production_key
   npm run test:jupiter-production
   ```

## Support

- **Jupiter Documentation**: https://docs.jup.ag/
- **Jupiter API Reference**: https://dev.jup.ag/docs/token-api/v2
- **Rate Limiting Guide**: https://dev.jup.ag/docs/api-rate-limit
- **API Setup**: https://dev.jup.ag/docs/api-setup

---

This Jupiter Token API v2 integration provides a significant upgrade to the token launchpad platform, offering superior Solana-native data and enabling advanced features like organic score tracking, token verification, and comprehensive market analytics.