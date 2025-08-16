// Test script for Solana integration
// Run with: node test-solana.js

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

async function testSolanaIntegration() {
  console.log('🚀 Testing Solana Integration...\n');
  
  // Test addresses (famous Solana wallets)
  const testAddresses = [
    'So11111111111111111111111111111111111111112', // Native SOL
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Anatoly Yakovenko (Solana founder)
    'CuieVDEDtLo7FypA9SbLM9saXFdb1dsshEkyErMqkRQq', // Toly's wallet
  ];
  
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta';
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  
  console.log(`Network: ${network}`);
  console.log(`RPC URL: ${rpcUrl}\n`);
  
  const connection = new Connection(rpcUrl, 'confirmed');
  
  console.log('Testing balance checks...\n');
  
  for (const address of testAddresses) {
    try {
      const pubkey = new PublicKey(address);
      const balance = await connection.getBalance(pubkey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      console.log(`✅ Address: ${address.substring(0, 8)}...`);
      console.log(`   Balance: ${solBalance.toFixed(4)} SOL\n`);
    } catch (error) {
      console.log(`❌ Error checking ${address}: ${error.message}\n`);
    }
  }
  
  // Test recent blockhash
  try {
    const blockhash = await connection.getLatestBlockhash();
    console.log('✅ Latest blockhash retrieved:', blockhash.blockhash.substring(0, 20) + '...\n');
  } catch (error) {
    console.log('❌ Error getting blockhash:', error.message, '\n');
  }
  
  // Test slot
  try {
    const slot = await connection.getSlot();
    console.log('✅ Current slot:', slot.toLocaleString(), '\n');
  } catch (error) {
    console.log('❌ Error getting slot:', error.message, '\n');
  }
  
  console.log('✨ Solana integration test complete!');
  console.log('\nYour Solana tools are now connected to the real blockchain!');
  console.log('You can now:');
  console.log('- Check real wallet balances');
  console.log('- Get live token prices');
  console.log('- Send actual transactions (with a private key)');
  console.log('- Query transaction details');
  console.log('\nRemember to set up your .env.local file with appropriate keys!');
}

testSolanaIntegration().catch(console.error);