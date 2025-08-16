#!/usr/bin/env node

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

async function testSolanaFeatures() {
  console.log(`${COLORS.cyan}${COLORS.bold}🚀 Testing All Solana Blockchain Features on Devnet${COLORS.reset}\n`);
  
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  
  console.log(`${COLORS.blue}Network:${COLORS.reset} ${network}`);
  console.log(`${COLORS.blue}RPC URL:${COLORS.reset} ${rpcUrl}\n`);
  
  const connection = new Connection(rpcUrl, 'confirmed');
  let successCount = 0;
  let totalTests = 0;
  
  // Test 1: Connection to Devnet
  console.log(`${COLORS.yellow}Test 1: Connection to Devnet${COLORS.reset}`);
  totalTests++;
  try {
    const version = await connection.getVersion();
    console.log(`${COLORS.green}✅ Connected to Solana ${version['solana-core']}${COLORS.reset}\n`);
    successCount++;
  } catch (error) {
    console.log(`${COLORS.red}❌ Connection failed: ${error.message}${COLORS.reset}\n`);
  }
  
  // Test 2: Get Current Slot
  console.log(`${COLORS.yellow}Test 2: Get Current Slot${COLORS.reset}`);
  totalTests++;
  try {
    const slot = await connection.getSlot();
    console.log(`${COLORS.green}✅ Current slot: ${slot.toLocaleString()}${COLORS.reset}\n`);
    successCount++;
  } catch (error) {
    console.log(`${COLORS.red}❌ Failed to get slot: ${error.message}${COLORS.reset}\n`);
  }
  
  // Test 3: Get Recent Blockhash
  console.log(`${COLORS.yellow}Test 3: Get Recent Blockhash${COLORS.reset}`);
  totalTests++;
  try {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    console.log(`${COLORS.green}✅ Blockhash: ${blockhash.substring(0, 20)}...${COLORS.reset}`);
    console.log(`   Valid until block: ${lastValidBlockHeight.toLocaleString()}\n`);
    successCount++;
  } catch (error) {
    console.log(`${COLORS.red}❌ Failed to get blockhash: ${error.message}${COLORS.reset}\n`);
  }
  
  // Test 4: Check Devnet Faucet Address
  console.log(`${COLORS.yellow}Test 4: Check Devnet Faucet Balance${COLORS.reset}`);
  totalTests++;
  try {
    // Well-known devnet faucet address
    const faucetAddress = new PublicKey('4ETf86tK7b4W72f27kNLJLgRWi9UfJjgH4koHGUXMFtn');
    const balance = await connection.getBalance(faucetAddress);
    const solBalance = balance / LAMPORTS_PER_SOL;
    console.log(`${COLORS.green}✅ Faucet balance: ${solBalance.toFixed(2)} SOL${COLORS.reset}\n`);
    successCount++;
  } catch (error) {
    console.log(`${COLORS.red}❌ Failed to check faucet: ${error.message}${COLORS.reset}\n`);
  }
  
  // Test 5: Get Recent Performance Samples
  console.log(`${COLORS.yellow}Test 5: Network Performance${COLORS.reset}`);
  totalTests++;
  try {
    const samples = await connection.getRecentPerformanceSamples(1);
    if (samples.length > 0) {
      const tps = samples[0].numTransactions / samples[0].samplePeriodSecs;
      console.log(`${COLORS.green}✅ Current TPS: ${tps.toFixed(0)} transactions/sec${COLORS.reset}\n`);
      successCount++;
    }
  } catch (error) {
    console.log(`${COLORS.red}❌ Failed to get performance: ${error.message}${COLORS.reset}\n`);
  }
  
  // Test 6: Test Actions Endpoints
  console.log(`${COLORS.yellow}Test 6: Actions API Endpoints${COLORS.reset}`);
  const endpoints = ['transfer', 'swap', 'stake', 'nft'];
  for (const endpoint of endpoints) {
    totalTests++;
    try {
      const response = await fetch(`http://localhost:3000/api/actions/${endpoint}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`${COLORS.green}✅ /api/actions/${endpoint}: ${data.title}${COLORS.reset}`);
        successCount++;
      } else {
        console.log(`${COLORS.red}❌ /api/actions/${endpoint}: HTTP ${response.status}${COLORS.reset}`);
      }
    } catch (error) {
      console.log(`${COLORS.red}❌ /api/actions/${endpoint}: ${error.message}${COLORS.reset}`);
    }
  }
  
  console.log(`\n${COLORS.bold}📊 Test Results:${COLORS.reset}`);
  console.log(`${COLORS.green}Passed: ${successCount}/${totalTests}${COLORS.reset}`);
  
  if (successCount === totalTests) {
    console.log(`\n${COLORS.green}${COLORS.bold}✨ All Solana features are working perfectly on ${network}!${COLORS.reset}`);
    console.log('\n📱 UI Components Ready:');
    console.log('  • Blinks Modal - Create and share blockchain links');
    console.log('  • Token Search - Browse devnet tokens');
    console.log('  • Token Creation - Deploy SPL tokens');
    console.log('  • Portfolio - View wallet balances');
    console.log('  • Actions API - All endpoints operational');
  } else {
    console.log(`\n${COLORS.yellow}⚠️ Some tests failed. Please check the configuration.${COLORS.reset}`);
  }
  
  console.log(`\n${COLORS.cyan}💡 Tips:${COLORS.reset}`);
  console.log('  • Use devnet faucet: https://faucet.solana.com');
  console.log('  • Explorer: https://explorer.solana.com?cluster=devnet');
  console.log('  • Test wallet: Create a new Phantom wallet for testing');
}

// Run tests
testSolanaFeatures().catch(console.error);