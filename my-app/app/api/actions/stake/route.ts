import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions"
import { Connection, PublicKey, Transaction, StakeProgram, LAMPORTS_PER_SOL, Keypair, SystemProgram } from "@solana/web3.js"
import { SOLANA_CONFIG } from "@/lib/solana-config"

export const maxDuration = 30

// Popular Solana validators (for demonstration)
const VALIDATORS = [
  { name: "Chorus One", vote: "ChorusmmK7i1AxXeiTtQgQZhQNiXYU84ULeaYF1EH15n" },
  { name: "Everstake", vote: "CwSZ17woioM2bqEbaswZJYvx5pemN6t3shBcU6zqPHyG" },
  { name: "Figment", vote: "5WPxGiB6zBXNJp8JN3WhSKahZut9DhSFHSULCzsKhqmT" },
]

export async function GET(req: Request) {
  const baseURL = new URL(req.url).origin
  const pathActions = new URL(req.url).pathname
  
  const payload: ActionGetResponse = {
    icon: `${baseURL}/stake-icon.png`,
    title: "Stake SOL",
    description: "Stake your SOL with validators to earn rewards",
    label: "Stake",
    links: {
      actions: [
        {
          label: "Stake SOL",
          href: `${pathActions}?validator={validator}&amount={amount}`,
          type: "transaction" as const,
          parameters: [
            {
              name: "validator",
              label: "Validator (Vote Account)",
              required: true,
            },
            {
              name: "amount",
              label: "Amount to Stake (SOL)",
              required: true,
            },
          ],
        },
        // Quick stake options with popular validators
        ...VALIDATORS.map(validator => ({
          label: `Stake with ${validator.name}`,
          href: `${pathActions}?validator=${validator.vote}&amount={amount}`,
          type: "transaction" as const,
          parameters: [
            {
              name: "amount",
              label: "Amount to Stake (SOL)",
              required: true,
            },
          ],
        })),
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
    const validatorStr = url.searchParams.get("validator")
    const amountStr = url.searchParams.get("amount")
    
    // Validate parameters
    if (!validatorStr || !amountStr) {
      return Response.json(
        { message: "Missing required parameters: validator and amount" },
        {
          status: 400,
          headers: ACTIONS_CORS_HEADERS,
        }
      )
    }
    
    // Validate validator vote account
    let validatorVoteAccount: PublicKey
    try {
      validatorVoteAccount = new PublicKey(validatorStr)
    } catch (err) {
      return Response.json(
        { message: "Invalid validator vote account" },
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
    
    // Check balance
    const balance = await connection.getBalance(userAccount)
    const balanceInSol = balance / LAMPORTS_PER_SOL
    
    // Need extra for stake account rent + fees
    const requiredBalance = amount + 0.01
    if (balanceInSol < requiredBalance) {
      return Response.json(
        { message: `Insufficient balance. You need at least ${requiredBalance.toFixed(4)} SOL (including fees)` },
        {
          status: 400,
          headers: ACTIONS_CORS_HEADERS,
        }
      )
    }
    
    // Note: In a real implementation, you would need to:
    // 1. Create a new stake account (requires a new keypair)
    // 2. Fund the stake account
    // 3. Delegate to the validator
    // 4. Possibly activate the stake
    
    // For this example, we'll create a simplified version
    // Real staking requires multiple transactions or a complex single transaction
    
    const transaction = new Transaction()
    
    // Add a memo instruction as placeholder for the staking operation
    // In production, this would include actual stake program instructions
    const memoInstruction = {
      keys: [],
      programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      data: Buffer.from(`Stake ${amount} SOL with validator ${validatorStr.slice(0, 8)}...`)
    }
    
    transaction.add(memoInstruction)
    
    // Note: Real staking would look something like this:
    // const stakeAccount = Keypair.generate() // New stake account
    // 
    // // Create and initialize stake account
    // transaction.add(
    //   SystemProgram.createAccount({...}),
    //   StakeProgram.initialize({...}),
    //   StakeProgram.delegate({...})
    // )
    
    // Set recent blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = userAccount
    
    // Create response
    const payload = await createPostResponse({
      fields: {
        transaction,
        message: `Stake ${amount} SOL with validator`,
      },
    })
    
    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    })
  } catch (err) {
    console.error("Stake action error:", err)
    return Response.json(
      { message: "An error occurred while creating the stake transaction" },
      {
        status: 500,
        headers: ACTIONS_CORS_HEADERS,
      }
    )
  }
}