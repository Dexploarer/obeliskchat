import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions"
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { SOLANA_CONFIG } from "@/lib/solana-config"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function GET(req: Request) {
  const baseURL = new URL(req.url).origin
  const pathActions = new URL(req.url).pathname
  
  const payload: ActionGetResponse = {
    icon: `${baseURL}/solana-logo.png`, // You'll need to add this image to public folder
    title: "Transfer SOL",
    description: "Send SOL to another wallet address",
    label: "Transfer", // Default label
    links: {
      actions: [
        {
          label: "Send SOL",
          href: `${pathActions}?to={to}&amount={amount}`,
          type: "transaction" as const,
          parameters: [
            {
              name: "to",
              label: "Recipient Address",
              required: true,
            },
            {
              name: "amount",
              label: "Amount (SOL)",
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

// Handle OPTIONS for CORS
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
    
    // Get parameters from URL
    const url = new URL(req.url)
    const to = url.searchParams.get("to")
    const amountStr = url.searchParams.get("amount")
    
    // Validate parameters
    if (!to || !amountStr) {
      return Response.json(
        { message: "Missing required parameters: to and amount" },
        {
          status: 400,
          headers: ACTIONS_CORS_HEADERS,
        }
      )
    }
    
    // Validate recipient address
    let toPubkey: PublicKey
    try {
      toPubkey = new PublicKey(to)
    } catch (err) {
      return Response.json(
        { message: "Invalid recipient address" },
        {
          status: 400,
          headers: ACTIONS_CORS_HEADERS,
        }
      )
    }
    
    // Validate amount
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
    
    // Create connection
    const connection = new Connection(
      SOLANA_CONFIG.rpcUrl[SOLANA_CONFIG.network],
      "confirmed"
    )
    
    // Check balance
    const balance = await connection.getBalance(userAccount)
    const balanceInSol = balance / LAMPORTS_PER_SOL
    
    if (balanceInSol < amount) {
      return Response.json(
        { message: `Insufficient balance. You have ${balanceInSol.toFixed(4)} SOL` },
        {
          status: 400,
          headers: ACTIONS_CORS_HEADERS,
        }
      )
    }
    
    // Create transfer transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: userAccount,
        toPubkey: toPubkey,
        lamports: Math.floor(amount * LAMPORTS_PER_SOL),
      })
    )
    
    // Set recent blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = userAccount
    
    // Create response
    const payload = await createPostResponse({
      fields: {
        transaction,
        message: `Transfer ${amount} SOL to ${to.slice(0, 8)}...${to.slice(-8)}`,
      },
    })
    
    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    })
  } catch (err) {
    console.error("Transfer action error:", err)
    return Response.json(
      { message: "An error occurred while creating the transaction" },
      {
        status: 500,
        headers: ACTIONS_CORS_HEADERS,
      }
    )
  }
}