#!/usr/bin/env node

/**
 * Jupiter Referral Account Setup Script
 * 
 * This script helps set up a Jupiter referral account to earn revenue from swaps.
 * You need to run this once to get your referral account address.
 */

const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Configuration
const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

async function setupJupiterReferral() {
  console.log('🚀 Setting up Jupiter Referral Account...\n');
  
  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    
    // Check if we already have a referral keypair
    const keypairPath = path.join(__dirname, '..', 'jupiter-referral-keypair.json');
    let keypair;
    
    if (fs.existsSync(keypairPath)) {
      console.log('📂 Found existing referral keypair...');
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
      keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
    } else {
      console.log('🔑 Generating new referral keypair...');
      keypair = Keypair.generate();
      
      // Save keypair to file (KEEP THIS SECURE!)
      fs.writeFileSync(
        keypairPath, 
        JSON.stringify(Array.from(keypair.secretKey)),
        { mode: 0o600 } // Restrict file permissions
      );
      console.log(`✅ Saved referral keypair to: ${keypairPath}`);
      console.log('⚠️  IMPORTANT: Keep this keypair file secure and backed up!\n');
    }
    
    const publicKey = keypair.publicKey.toString();
    console.log(`🆔 Referral Account: ${publicKey}`);
    
    // Check account balance
    const balance = await connection.getBalance(keypair.publicKey);
    console.log(`💰 Current Balance: ${balance / 1e9} SOL\n`);
    
    // If on devnet and no balance, provide airdrop info
    if (SOLANA_NETWORK === 'devnet' && balance === 0) {
      console.log('💸 Devnet detected with 0 balance. You can request an airdrop:');
      console.log(`   solana airdrop 1 ${publicKey} --url devnet\n`);
    }
    
    // Update .env.local file
    const envPath = path.join(__dirname, '..', '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Remove existing Jupiter referral configs
    envContent = envContent
      .split('\n')
      .filter(line => !line.startsWith('NEXT_PUBLIC_JUPITER_REFERRAL_'))
      .join('\n');
    
    // Add Jupiter referral configuration
    const jupiterConfig = `
# Jupiter Plugin Referral Configuration
NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT=${publicKey}
NEXT_PUBLIC_JUPITER_REFERRAL_FEE=50
`;
    
    envContent = envContent.trim() + jupiterConfig;
    fs.writeFileSync(envPath, envContent);
    
    console.log('✅ Updated .env.local with referral configuration');
    console.log('\n📊 Referral Setup Complete!');
    console.log('💰 Fee Rate: 0.5% (50 basis points)');
    console.log('💸 Your Revenue Share: 80% of fees collected');
    console.log('🎯 Jupiter Revenue Share: 20% of fees collected');
    console.log('\n🔄 Next steps:');
    console.log('1. Restart your development server');
    console.log('2. Test swap functionality');
    console.log('3. Monitor revenue in Jupiter dashboard');
    
    // Revenue calculation example
    console.log('\n💡 Revenue Example:');
    console.log('   $1,000 swap volume → $5 total fees → $4 your revenue → $1 Jupiter fee');
    
  } catch (error) {
    console.error('❌ Error setting up Jupiter referral:', error.message);
    process.exit(1);
  }
}

// Revenue monitoring helper
async function checkReferralRevenue() {
  console.log('📈 Checking referral revenue...\n');
  
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) {
      console.log('❌ No .env.local file found. Run setup first.');
      return;
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const referralAccount = envContent
      .split('\n')
      .find(line => line.startsWith('NEXT_PUBLIC_JUPITER_REFERRAL_ACCOUNT='))
      ?.split('=')[1];
    
    if (!referralAccount) {
      console.log('❌ No referral account found in .env.local. Run setup first.');
      return;
    }
    
    console.log(`🆔 Referral Account: ${referralAccount}`);
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const publicKey = new PublicKey(referralAccount);
    const balance = await connection.getBalance(publicKey);
    
    console.log(`💰 Current Balance: ${balance / 1e9} SOL`);
    console.log('📊 For detailed revenue analytics, visit: https://referral.jup.ag/');
    console.log(`🔍 Track your account: https://solscan.io/account/${referralAccount}`);
    
  } catch (error) {
    console.error('❌ Error checking revenue:', error.message);
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'check' || command === 'revenue') {
  checkReferralRevenue();
} else if (command === 'setup' || !command) {
  setupJupiterReferral();
} else {
  console.log('Usage: node setup-jupiter-referral.js [setup|check]');
  console.log('  setup (default): Set up new referral account');
  console.log('  check: Check current referral revenue');
}