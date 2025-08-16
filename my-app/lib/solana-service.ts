import { 
  Connection, 
  PublicKey, 
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  SystemProgram,
  TransactionInstruction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  address,
  lamports,
  Address,
  Rpc,
  RpcSubscriptions,
  createKeyPairSignerFromBytes,
  KeyPairSigner,
} from '@solana/kit';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getMint,
  getAccount,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { SOLANA_CONFIG } from './solana-config';
import { jupiterTokenService } from './jupiter-token-service';
import { JupiterTokenData, PriceComparison } from './jupiter-token-types';

export class SolanaService {
  private connection: Connection;
  private rpc: Rpc<any>;
  private rpcSubscriptions: RpcSubscriptions<any>;
  private wallet: Keypair | null = null;
  private signer: KeyPairSigner | null = null;

  constructor() {
    const rpcUrl = SOLANA_CONFIG.rpcUrl[SOLANA_CONFIG.network];
    const wsUrl = SOLANA_CONFIG.wsUrl[SOLANA_CONFIG.network];
    this.connection = new Connection(rpcUrl, SOLANA_CONFIG.commitment);
    this.rpc = createSolanaRpc(rpcUrl);
    this.rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);
    
    // Initialize wallet from environment if available
    this.initializeWallet();
  }

  private async initializeWallet() {
    const privateKey = process.env.SOLANA_PRIVATE_KEY;
    if (privateKey) {
      try {
        // Try to decode from base58
        const decoded = bs58.decode(privateKey);
        this.wallet = Keypair.fromSecretKey(decoded);
        this.signer = await createKeyPairSignerFromBytes(decoded);
      } catch (e) {
        console.warn('Failed to initialize wallet from private key:', e);
      }
    }
  }

  // Get wallet public key
  getWalletAddress(): PublicKey | null {
    return this.wallet?.publicKey || null;
  }

  // Check SOL balance
  async getBalance(addressStr: string): Promise<number> {
    try {
      const pubkey = new PublicKey(addressStr);
      const balance = await this.connection.getBalance(pubkey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  // Get token balance
  async getTokenBalance(walletAddress: string, mintAddress: string): Promise<number> {
    try {
      const wallet = new PublicKey(walletAddress);
      const mint = new PublicKey(mintAddress);
      
      const tokenAccount = await getAssociatedTokenAddress(mint, wallet);
      const accountInfo = await getAccount(this.connection, tokenAccount);
      
      const mintInfo = await getMint(this.connection, mint);
      return Number(accountInfo.amount) / Math.pow(10, mintInfo.decimals);
    } catch (error) {
      console.error('Error getting token balance:', error);
      return 0;
    }
  }

  // Transfer SOL
  async transferSol(
    from: Keypair,
    to: string,
    amount: number
  ): Promise<string> {
    try {
      const toPubkey = new PublicKey(to);
      const lamportsToSend = amount * LAMPORTS_PER_SOL;
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: from.publicKey,
          toPubkey: toPubkey,
          lamports: lamportsToSend,
        })
      );
      
      // Add priority fee
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: SOLANA_CONFIG.priorityFee * LAMPORTS_PER_SOL * 1000000
        })
      );
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [from],
        {
          commitment: SOLANA_CONFIG.commitment,
        }
      );
      
      return signature;
    } catch (error) {
      console.error('Error transferring SOL:', error);
      throw error;
    }
  }

  // Transfer SPL Token
  async transferToken(
    from: Keypair,
    to: string,
    mintAddress: string,
    amount: number
  ): Promise<string> {
    try {
      const fromPubkey = from.publicKey;
      const toPubkey = new PublicKey(to);
      const mint = new PublicKey(mintAddress);
      
      // Get token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(mint, fromPubkey);
      const toTokenAccount = await getAssociatedTokenAddress(mint, toPubkey);
      
      // Get mint info for decimals
      const mintInfo = await getMint(this.connection, mint);
      const amountInDecimals = amount * Math.pow(10, mintInfo.decimals);
      
      const transaction = new Transaction();
      
      // Check if destination token account exists
      const toAccountInfo = await this.connection.getAccountInfo(toTokenAccount);
      if (!toAccountInfo) {
        // Create associated token account for recipient
        transaction.add(
          createAssociatedTokenAccountInstruction(
            fromPubkey,
            toTokenAccount,
            toPubkey,
            mint
          )
        );
      }
      
      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPubkey,
          amountInDecimals
        )
      );
      
      // Add priority fee
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: SOLANA_CONFIG.priorityFee * LAMPORTS_PER_SOL * 1000000
        })
      );
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [from],
        {
          commitment: SOLANA_CONFIG.commitment,
        }
      );
      
      return signature;
    } catch (error) {
      console.error('Error transferring token:', error);
      throw error;
    }
  }

  // Get recent blockhash
  async getRecentBlockhash() {
    return await this.connection.getLatestBlockhash();
  }

  // Get transaction details
  async getTransaction(signature: string) {
    try {
      const result = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });
      return result;
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  // Get token price with Jupiter API v2 (with CoinGecko fallback)
  async getTokenPrice(tokenSymbolOrMint: string): Promise<{ price: number; change24h: number } | null> {
    try {
      // First try Jupiter API for Solana tokens
      if (this.isValidMintAddress(tokenSymbolOrMint)) {
        const jupiterData = await jupiterTokenService.getTokenData(tokenSymbolOrMint);
        if (jupiterData) {
          return {
            price: jupiterData.usdPrice,
            change24h: jupiterData.stats24h.priceChange,
          };
        }
      } else {
        // Try searching by symbol in Jupiter
        const searchResult = await jupiterTokenService.searchTokens({ 
          query: tokenSymbolOrMint.toUpperCase(), 
          limit: 1 
        });
        if (searchResult.tokens.length > 0) {
          const token = searchResult.tokens[0];
          return {
            price: token.usdPrice,
            change24h: token.stats24h.priceChange,
          };
        }
      }

      // Fallback to CoinGecko
      return await this.getCoinGeckoPrice(tokenSymbolOrMint);
    } catch (error) {
      console.error('Error fetching token price:', error);
      // Try CoinGecko as last resort
      return await this.getCoinGeckoPrice(tokenSymbolOrMint);
    }
  }

  // Enhanced token data from Jupiter
  async getEnhancedTokenData(mintAddress: string): Promise<JupiterTokenData | null> {
    try {
      return await jupiterTokenService.getTokenData(mintAddress);
    } catch (error) {
      console.error('Error fetching enhanced token data:', error);
      return null;
    }
  }

  // Token validation using Jupiter
  async validateToken(mintAddress: string) {
    try {
      return await jupiterTokenService.validateToken(mintAddress);
    } catch (error) {
      console.error('Error validating token:', error);
      return {
        isValid: false,
        isVerified: false,
        riskLevel: 'extreme' as const,
        warnings: ['Validation failed'],
        organicScore: 0,
        recommendedAction: 'avoid' as const
      };
    }
  }

  // Search tokens using Jupiter
  async searchTokens(query: string, limit: number = 20) {
    try {
      return await jupiterTokenService.searchTokens({ query, limit });
    } catch (error) {
      console.error('Error searching tokens:', error);
      return { tokens: [], total: 0, hasMore: false };
    }
  }

  // Get trending tokens
  async getTrendingTokens(interval: '5m' | '1h' | '6h' | '24h' = '24h', limit: number = 50) {
    try {
      return await jupiterTokenService.getTokensByCategory({
        category: 'toptrending',
        interval,
        limit
      });
    } catch (error) {
      console.error('Error fetching trending tokens:', error);
      return { tokens: [], category: 'toptrending', interval, total: 0 };
    }
  }

  // Get recent tokens
  async getRecentTokens(limit: number = 30) {
    try {
      return await jupiterTokenService.getRecentTokens({ limit });
    } catch (error) {
      console.error('Error fetching recent tokens:', error);
      return { tokens: [], total: 0 };
    }
  }

  // Get verified tokens
  async getVerifiedTokens(limit: number = 100) {
    try {
      return await jupiterTokenService.getTokensByTag({ tag: 'verified', limit });
    } catch (error) {
      console.error('Error fetching verified tokens:', error);
      return { tokens: [], tag: 'verified', total: 0 };
    }
  }

  // Private helper methods
  private isValidMintAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return address.length === 44; // Base58 encoded public key length
    } catch {
      return false;
    }
  }

  private async getCoinGeckoPrice(tokenSymbol: string): Promise<{ price: number; change24h: number } | null> {
    try {
      const apiKey = SOLANA_CONFIG.coingeckoApiKey;
      const url = apiKey 
        ? `https://pro-api.coingecko.com/api/v3/simple/price?ids=${tokenSymbol}&vs_currencies=usd&include_24hr_change=true&x_cg_pro_api_key=${apiKey}`
        : `https://api.coingecko.com/api/v3/simple/price?ids=${tokenSymbol}&vs_currencies=usd&include_24hr_change=true`;
      
      const response = await fetch(url);
      if (!response.ok) return null;
      
      const data = await response.json();
      
      if (data[tokenSymbol]) {
        return {
          price: data[tokenSymbol].usd,
          change24h: data[tokenSymbol].usd_24h_change,
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching CoinGecko price:', error);
      return null;
    }
  }

  // Get connection instance
  getConnection(): Connection {
    return this.connection;
  }

  // Get RPC instance
  getRpc(): Rpc<any> {
    return this.rpc;
  }

  // Get RPC Subscriptions instance
  getRpcSubscriptions(): RpcSubscriptions<any> {
    return this.rpcSubscriptions;
  }
}

// Export singleton instance
export const solanaService = new SolanaService();