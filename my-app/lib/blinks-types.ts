// Solana Blinks and Actions Type Definitions
// Based on Solana Actions Specification

export interface ActionGetResponse {
  icon: string // Absolute URL to icon image
  title: string // Action title
  description: string // Action description
  label?: string // Default button label (for single action)
  disabled?: boolean // Whether the action is disabled
  links?: {
    actions: LinkedAction[]
  }
  error?: ActionError
}

export interface LinkedAction {
  label: string // Button label
  href: string // URL with parameters (e.g., "?action=transfer&amount={amount}")
  parameters?: ActionParameter[]
}

export interface ActionParameter {
  name: string // Parameter name (e.g., "amount")
  label: string // Display label
  type?: "text" | "number" | "email" | "url" | "select" | "checkbox" | "radio" | "textarea"
  required?: boolean
  pattern?: string // Regex pattern for validation
  patternDescription?: string // Description of the pattern
  min?: number | string // Minimum value
  max?: number | string // Maximum value
  options?: Array<{
    label: string
    value: string
    selected?: boolean
  }>
}

export interface ActionPostRequest {
  account: string // User's public key
  signature?: string // Optional signature for authentication
  data?: Record<string, any> // Additional data
}

export interface ActionPostResponse {
  transaction: string // Base64 encoded transaction
  message?: string // Success message to display
  redirect?: string // Optional redirect URL
  error?: ActionError
}

export interface ActionError {
  message: string // Error message to display
}

// Blinks-specific types
export interface BlinkMetadata {
  url: string // Original Action URL
  title: string
  description: string
  icon: string
  creator?: string // Creator's wallet address
  createdAt?: string // ISO timestamp
  network: "mainnet-beta" | "devnet" | "testnet"
  version?: string // Actions spec version
}

export interface BlinkTransaction {
  signature: string
  status: "pending" | "confirmed" | "failed"
  timestamp: string
  from: string
  to?: string
  amount?: number
  token?: string
  message?: string
}

export interface BlinkAnalytics {
  totalClicks: number
  uniqueUsers: number
  successfulTransactions: number
  failedTransactions: number
  averageResponseTime: number
  lastUsed?: string
}

// Action types for different operations
export enum ActionType {
  TRANSFER = "transfer",
  SWAP = "swap",
  STAKE = "stake",
  UNSTAKE = "unstake",
  MINT_NFT = "mint-nft",
  TRANSFER_NFT = "transfer-nft",
  VOTE = "vote",
  DONATE = "donate",
  CUSTOM = "custom"
}

// Configuration for creating Blinks
export interface BlinkConfig {
  id?: string
  title: string
  description: string
  icon: string // Absolute URL
  label?: string // Default action label
  actions: BlinkAction[]
  endpoint: string // API endpoint URL
  network: "mainnet-beta" | "devnet" | "testnet"
  customization?: {
    primaryColor?: string
    secondaryColor?: string
    fontFamily?: string
    borderRadius?: string
  }
  security?: {
    corsEnabled?: boolean
    allowedDomains?: string[]
    requireWalletConnection?: boolean
    requireSignature?: boolean
  }
  metadata?: {
    creator?: string
    createdAt?: string
    updatedAt?: string
    tags?: string[]
  }
}

export interface BlinkAction {
  id: string
  type: ActionType
  label: string
  href: string // URL pattern with parameters
  parameters: ActionParameter[]
  validation?: {
    minAmount?: number
    maxAmount?: number
    allowedTokens?: string[]
    requiresBalance?: boolean
  }
}

// Helper type for building transactions
export interface TransactionBuilder {
  addInstruction(instruction: any): TransactionBuilder
  setFeePayer(publicKey: string): TransactionBuilder
  setRecentBlockhash(blockhash: string): TransactionBuilder
  build(): string // Returns base64 encoded transaction
}

// Response from dial.to or other Blinks processors
export interface BlinkProcessorResponse {
  success: boolean
  signature?: string
  error?: string
  explorerUrl?: string
}

// Constants
export const ACTIONS_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids",
  "Access-Control-Expose-Headers": "X-Action-Version, X-Blockchain-Ids",
  "X-Action-Version": "2.1.3", // Current Actions spec version
  "X-Blockchain-Ids": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" // Mainnet
}

// Validation helpers
export const validateActionGetResponse = (response: any): response is ActionGetResponse => {
  return (
    typeof response === "object" &&
    typeof response.icon === "string" &&
    typeof response.title === "string" &&
    typeof response.description === "string"
  )
}

export const validateActionPostRequest = (request: any): request is ActionPostRequest => {
  return (
    typeof request === "object" &&
    typeof request.account === "string"
  )
}

// URL builders
export const createBlinkUrl = (actionUrl: string): string => {
  return `https://dial.to/?action=solana-action:${encodeURIComponent(actionUrl)}`
}

export const createTwitterBlinkUrl = (actionUrl: string): string => {
  // Twitter/X will auto-unfurl this if user has Blinks enabled
  return actionUrl
}

// Error messages
export const ERROR_MESSAGES = {
  INVALID_ACCOUNT: "Invalid account provided",
  INVALID_AMOUNT: "Invalid amount specified",
  INSUFFICIENT_BALANCE: "Insufficient balance for this operation",
  TRANSACTION_FAILED: "Transaction failed to execute",
  NETWORK_ERROR: "Network error occurred",
  INVALID_PARAMETERS: "Invalid parameters provided",
  UNAUTHORIZED: "Unauthorized access",
  RATE_LIMITED: "Rate limit exceeded"
}