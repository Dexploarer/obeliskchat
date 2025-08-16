import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  sendAndConfirmTransaction
} from '@solana/web3.js'
import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  BlinkConfig,
  BlinkMetadata,
  ActionType,
  ACTIONS_CORS_HEADERS,
  ERROR_MESSAGES,
  createBlinkUrl
} from './blinks-types'
import { SOLANA_CONFIG } from './solana-config'

export class BlinksService {
  private connection: Connection

  constructor() {
    this.connection = new Connection(
      SOLANA_CONFIG.rpcUrl[SOLANA_CONFIG.network],
      'confirmed'
    )
  }

  /**
   * Create an ActionGetResponse for a Blink
   */
  createActionGetResponse(config: BlinkConfig): ActionGetResponse {
    const response: ActionGetResponse = {
      icon: config.icon,
      title: config.title,
      description: config.description,
      label: config.label
    }

    if (config.actions && config.actions.length > 0) {
      response.links = {
        actions: config.actions.map(action => ({
          label: action.label,
          href: action.href,
          parameters: action.parameters
        }))
      }
    }

    return response
  }

  /**
   * Create a transfer SOL transaction
   */
  async createTransferTransaction(
    from: string,
    to: string,
    amount: number
  ): Promise<string> {
    try {
      const fromPubkey = new PublicKey(from)
      const toPubkey = new PublicKey(to)
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: amount * LAMPORTS_PER_SOL
        })
      )

      // Set recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = fromPubkey

      // Serialize transaction
      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      })

      return serializedTransaction.toString('base64')
    } catch (error) {
      console.error('Error creating transfer transaction:', error)
      throw new Error(ERROR_MESSAGES.TRANSACTION_FAILED)
    }
  }

  /**
   * Create a stake SOL transaction
   */
  async createStakeTransaction(
    staker: string,
    validatorVote: string,
    amount: number
  ): Promise<string> {
    try {
      const stakerPubkey = new PublicKey(staker)
      const validatorVotePubkey = new PublicKey(validatorVote)
      
      // This is a simplified version - real staking requires more complex operations
      // including creating stake account, delegating, etc.
      const transaction = new Transaction()
      
      // Add staking instructions here
      // For now, returning a simple transfer as placeholder
      const instruction = SystemProgram.transfer({
        fromPubkey: stakerPubkey,
        toPubkey: validatorVotePubkey,
        lamports: amount * LAMPORTS_PER_SOL
      })
      
      transaction.add(instruction)

      const { blockhash } = await this.connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = stakerPubkey

      const serializedTransaction = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
      })

      return serializedTransaction.toString('base64')
    } catch (error) {
      console.error('Error creating stake transaction:', error)
      throw new Error(ERROR_MESSAGES.TRANSACTION_FAILED)
    }
  }

  /**
   * Validate a Solana address
   */
  isValidAddress(address: string): boolean {
    try {
      new PublicKey(address)
      return true
    } catch {
      return false
    }
  }

  /**
   * Validate transaction parameters
   */
  validateTransactionParams(params: {
    from?: string
    to?: string
    amount?: number
    action?: string
  }): { valid: boolean; error?: string } {
    // Validate addresses
    if (params.from && !this.isValidAddress(params.from)) {
      return { valid: false, error: ERROR_MESSAGES.INVALID_ACCOUNT }
    }
    
    if (params.to && !this.isValidAddress(params.to)) {
      return { valid: false, error: 'Invalid recipient address' }
    }

    // Validate amount
    if (params.amount !== undefined) {
      if (isNaN(params.amount) || params.amount <= 0) {
        return { valid: false, error: ERROR_MESSAGES.INVALID_AMOUNT }
      }
    }

    // Validate action
    if (params.action) {
      const validActions = Object.values(ActionType)
      if (!validActions.includes(params.action as ActionType)) {
        return { valid: false, error: 'Invalid action type' }
      }
    }

    return { valid: true }
  }

  /**
   * Generate a shareable Blink URL
   */
  generateBlinkUrl(endpoint: string): string {
    return createBlinkUrl(endpoint)
  }

  /**
   * Parse query parameters from a Blink URL
   */
  parseBlinkParams(url: string): Record<string, string> {
    const urlObj = new URL(url)
    const params: Record<string, string> = {}
    
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value
    })
    
    return params
  }

  /**
   * Create metadata for a Blink
   */
  createBlinkMetadata(config: BlinkConfig): BlinkMetadata {
    return {
      url: config.endpoint,
      title: config.title,
      description: config.description,
      icon: config.icon,
      creator: config.metadata?.creator,
      createdAt: config.metadata?.createdAt || new Date().toISOString(),
      network: config.network,
      version: '2.1.3'
    }
  }

  /**
   * Estimate transaction fee
   */
  async estimateTransactionFee(transaction: string): Promise<number> {
    try {
      const tx = Transaction.from(Buffer.from(transaction, 'base64'))
      const fee = await this.connection.getFeeForMessage(
        tx.compileMessage(),
        'confirmed'
      )
      return (fee.value ?? 5000) / LAMPORTS_PER_SOL
    } catch (error) {
      console.error('Error estimating fee:', error)
      return 0.000005 // Default fee estimate
    }
  }

  /**
   * Get recent blockhash for transaction
   */
  async getRecentBlockhash(): Promise<string> {
    const { blockhash } = await this.connection.getLatestBlockhash()
    return blockhash
  }

  /**
   * Check if wallet has sufficient balance
   */
  async checkBalance(address: string, amount: number): Promise<boolean> {
    try {
      const pubkey = new PublicKey(address)
      const balance = await this.connection.getBalance(pubkey)
      const balanceInSol = balance / LAMPORTS_PER_SOL
      return balanceInSol >= amount
    } catch (error) {
      console.error('Error checking balance:', error)
      return false
    }
  }

  /**
   * Create a response for POST requests
   */
  createActionPostResponse(
    transaction: string,
    message?: string
  ): ActionPostResponse {
    return {
      transaction,
      message: message || 'Transaction created successfully'
    }
  }

  /**
   * Create an error response
   */
  createErrorResponse(message: string): ActionPostResponse {
    return {
      transaction: '',
      error: { message }
    }
  }

  /**
   * Generate QR code data for a Blink URL
   */
  generateQRCodeData(blinkUrl: string): string {
    // This would typically use a QR code library
    // For now, returning the URL which can be used with a QR generator
    return blinkUrl
  }

  /**
   * Verify a transaction signature
   */
  async verifyTransaction(signature: string): Promise<boolean> {
    try {
      const result = await this.connection.getTransaction(signature, {
        commitment: 'confirmed'
      })
      return result !== null
    } catch (error) {
      console.error('Error verifying transaction:', error)
      return false
    }
  }

  /**
   * Get explorer URL for a transaction
   */
  getExplorerUrl(signature: string): string {
    const baseUrl = SOLANA_CONFIG.explorerUrl[SOLANA_CONFIG.network as keyof typeof SOLANA_CONFIG.explorerUrl]
    return `${baseUrl}/tx/${signature}`
  }
}

// Export singleton instance
export const blinksService = new BlinksService()