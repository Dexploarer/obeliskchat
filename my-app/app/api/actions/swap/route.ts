import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions"
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { SOLANA_CONFIG } from "@/lib/solana-config"

export const maxDuration = 30

export async function GET(req: Request) {
  const baseURL = new URL(req.url).origin
  const pathActions = new URL(req.url).pathname
  
  const payload: ActionGetResponse = {
    icon: `${baseURL}/swap-icon.png`,
    title: "Token Swap",
    description: "Swap tokens on Solana using Jupiter or Raydium",
    label: "Swap",
    links: {
      actions: [
        {
          label: "Swap Tokens",
          href: `${pathActions}?fromToken={fromToken}&toToken={toToken}&amount={amount}`,
          type: "transaction" as const,
          parameters: [
            {
              name: "fromToken",
              label: "From Token (Symbol or Address)",
              required: true,
            },
            {
              name: "toToken",
              label: "To Token (Symbol or Address)",
              required: true,
            },
            {
              name: "amount",
              label: "Amount",
              required: true,
            },
          ],
        },
        {
          label: "Quick Swap SOL to USDC",
          href: `${pathActions}?fromToken=SOL&toToken=USDC&amount={amount}`,
          type: "transaction" as const,
          parameters: [
            {
              name: "amount",
              label: "Amount of SOL",
              required: true,
            },
          ],
        },
      ],
    },
  }
  
  return Response.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
  })
}

export async function OPTIONS(req: Request) {
  return new Response(null, { headers: ACTIONS_CORS_HEADERS })
}

export async function POST(req: Request) {
  try {
    const body: ActionPostRequest = await req.json()
    
    // Validate account
    let userAccount: PublicKey
    try {
      userAccount = new PublicKey(body.account)
    } catch (err) {
      return Response.json(
        { message: "Invalid account provided" },
        {
          status: 400,
          headers: ACTIONS_CORS_HEADERS,
        }
      )
    }
    
    // Get parameters
    const url = new URL(req.url)
    const fromToken = url.searchParams.get("fromToken")
    const toToken = url.searchParams.get("toToken")
    const amountStr = url.searchParams.get("amount")
    
    // Validate parameters
    if (!fromToken || !toToken || !amountStr) {
      return Response.json(
        { message: "Missing required parameters" },
        {
          status: 400,
          headers: ACTIONS_CORS_HEADERS,
        }
      )
    }
    
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) {
      return Response.json(
        { message: "Invalid amount specified" },
        {
          status: 400,
          headers: ACTIONS_CORS_HEADERS,
        }
      )
    }
    
    const connection = new Connection(
      SOLANA_CONFIG.rpcUrl[SOLANA_CONFIG.network],
      "confirmed"
    )
    
    // Note: In a real implementation, you would:
    // 1. Use Jupiter API or Raydium SDK to get swap routes
    // 2. Build the actual swap transaction with proper instructions
    // 3. Include token accounts, AMM pools, etc.
    
    // For demonstration, we'll create a placeholder transaction
    // Real swap would require integration with DEX aggregators
    
    const transaction = new Transaction()
    
    // Add a memo instruction as placeholder
    // In production, this would be replaced with actual swap instructions
    const memoInstruction = {
      keys: [],
      programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      data: Buffer.from(`Swap ${amount} ${fromToken} to ${toToken}`)
    }
    
    transaction.add(memoInstruction)
    
    // Set recent blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = userAccount
    
    // Create response
    const payload = await createPostResponse({
      fields: {
        transaction,
        message: `Swap ${amount} ${fromToken} to ${toToken}`,
      },
    })
    
    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    })
  } catch (err) {
    console.error("Swap action error:", err)
    return Response.json(
      { message: "An error occurred while creating the swap transaction" },
      {
        status: 500,
        headers: ACTIONS_CORS_HEADERS,
      }
    )
  }
}