/**
 * Basic Jupiter APIs Test
 * Tests basic functionality and configuration
 */

console.log('🧪 Testing Jupiter APIs Configuration...\n');

// Test 1: Environment Variables
console.log('📋 Environment Configuration:');
console.log('- NEXT_PUBLIC_JUPITER_TIER:', process.env.NEXT_PUBLIC_JUPITER_TIER || 'not set (defaults to lite)');
console.log('- NEXT_PUBLIC_JUPITER_LITE_URL:', process.env.NEXT_PUBLIC_JUPITER_LITE_URL || 'not set (defaults to https://lite-api.jup.ag)');
console.log('- NEXT_PUBLIC_JUPITER_ULTRA_URL:', process.env.NEXT_PUBLIC_JUPITER_ULTRA_URL || 'not set (defaults to https://api.jup.ag)');
console.log('- JUPITER_API_KEY:', process.env.JUPITER_API_KEY ? 'configured ✅' : 'not configured (Ultra API features unavailable)');

// Test 2: Package Installation
console.log('\n📦 Package Installation:');
try {
  require('@jup-ag/api');
  console.log('- @jup-ag/api: installed ✅');
} catch (error) {
  console.log('- @jup-ag/api: not installed ❌');
  console.log('  Run: npm install @jup-ag/api --legacy-peer-deps');
}

// Test 3: File Structure
console.log('\n📁 File Structure:');
const fs = require('fs');
const path = require('path');

const files = [
  'lib/jupiter-ultra-types.ts',
  'lib/jupiter-lite-service.ts', 
  'lib/jupiter-ultra-service.ts',
  'lib/jupiter-unified-service.ts'
];

files.forEach(file => {
  try {
    const filepath = path.join(__dirname, file);
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      console.log(`- ${file}: exists ✅ (${Math.round(stats.size / 1024)}KB)`);
    } else {
      console.log(`- ${file}: missing ❌`);
    }
  } catch (error) {
    console.log(`- ${file}: error checking ❌`);
  }
});

// Test 4: Basic Import Test
console.log('\n🔗 Import Test:');

async function testImports() {
  try {
    // Test if we can import the Jupiter API package
    const jupiterApi = await import('@jup-ag/api');
    console.log('- @jup-ag/api import: success ✅');
    
    // Test configuration
    try {
      const config = await import('./lib/solana-config.js');
      console.log('- solana-config import: success ✅');
      
      if (config.SOLANA_CONFIG?.jupiter) {
        console.log('- Jupiter config in SOLANA_CONFIG: found ✅');
        console.log('  - Lite URL:', config.SOLANA_CONFIG.jupiter.lite?.baseUrl || 'not configured');
        console.log('  - Ultra URL:', config.SOLANA_CONFIG.jupiter.ultra?.baseUrl || 'not configured');
        console.log('  - Unified tier:', config.SOLANA_CONFIG.jupiter.unified?.tier || 'not configured');
      } else {
        console.log('- Jupiter config in SOLANA_CONFIG: missing ❌');
      }
    } catch (error) {
      console.log('- solana-config import: failed ❌', error.message);
    }
    
  } catch (error) {
    console.log('- @jup-ag/api import: failed ❌', error.message);
  }
}

// Test 5: API Connectivity (Lite API)
async function testLiteApiConnectivity() {
  console.log('\n🌐 Lite API Connectivity Test:');
  
  try {
    const response = await fetch('https://lite-api.jup.ag', {
      method: 'GET',
      timeout: 5000
    });
    
    console.log(`- Lite API (${response.url}): ${response.status} ${response.statusText} ✅`);
  } catch (error) {
    console.log('- Lite API: connection failed ❌', error.message);
  }
}

// Test 6: API Connectivity (Ultra API)
async function testUltraApiConnectivity() {
  console.log('\n🚀 Ultra API Connectivity Test:');
  
  try {
    const response = await fetch('https://api.jup.ag', {
      method: 'GET',
      timeout: 5000
    });
    
    console.log(`- Ultra API (${response.url}): ${response.status} ${response.statusText} ✅`);
  } catch (error) {
    console.log('- Ultra API: connection failed ❌', error.message);
  }
}

// Run all tests
async function runBasicTests() {
  await testImports();
  await testLiteApiConnectivity();
  await testUltraApiConnectivity();
  
  console.log('\n' + '='.repeat(50));
  console.log('🎯 Basic Test Summary:');
  console.log('');
  console.log('✅ If all tests pass, the Jupiter APIs implementation is ready');
  console.log('⚠️  If Ultra API tests fail, check your JUPITER_API_KEY');
  console.log('❌ If Lite API tests fail, check your network connection');
  console.log('');
  console.log('Next steps:');
  console.log('1. Set JUPITER_API_KEY for Ultra API features');
  console.log('2. Run: node test-jupiter-apis.js for comprehensive testing');
  console.log('3. Test the tools in your application');
}

runBasicTests().catch(console.error);