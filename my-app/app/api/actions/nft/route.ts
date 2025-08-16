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
    icon: `${baseURL}/nft-icon.png`,
    title: "NFT Operations",
    description: "Mint, transfer, or interact with Solana NFTs",
    label: "NFT",
    links: {
      actions: [
        {
          label: "Mint NFT",
          href: `${pathActions}?action=mint&name={name}&symbol={symbol}&uri={uri}`,
          type: "transaction" as const,
          parameters: [
            {
              name: "name",
              label: "NFT Name",
              required: true,
            },
            {
              name: "symbol",
              label: "NFT Symbol",
              required: true,
            },
            {
              name: "uri",
              label: "Metadata URI",
              required: true,
            },
          ],
        },
        {
          label: "Transfer NFT",
          href: `${pathActions}?action=transfer&mint={mint}&to={to}`,
          type: "transaction" as const,
          parameters: [
            {
              name: "mint",
              label: "NFT Mint Address",
              required: true,
            },
            {
              name: "to",
              label: "Recipient Address",
              required: true,
            },
          ],
        },
        {
          label: "List NFT for Sale",
          href: `${pathActions}?action=list&mint={mint}&price={price}`,
          type: "transaction" as const,
          parameters: [
            {
              name: "mint",
              label: "NFT Mint Address",
              required: true,
            },
            {
              name: "price",
              label: "Price (SOL)",
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
    const action = url.searchParams.get("action")
    
    if (!action) {
      return Response.json(
        { message: "Missing action parameter" },
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
    
    let transaction = new Transaction()
    let message = ""
    
    switch (action) {
      case "mint": {
        const name = url.searchParams.get("name")
        const symbol = url.searchParams.get("symbol")
        const uri = url.searchParams.get("uri")
        
        if (!name || !symbol || !uri) {
          return Response.json(
            { message: "Missing required parameters for minting" },
            {
              status: 400,
              headers: ACTIONS_CORS_HEADERS,
            }
          )
        }
        
        // Note: Real NFT minting would require:
        // 1. Creating a mint account
        // 2. Creating metadata account with Metaplex
        // 3. Minting the token
        // 4. Creating/updating metadata
        
        // Placeholder instruction
        const memoInstruction = {
          keys: [],
          programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
          data: Buffer.from(`Mint NFT: ${name} (${symbol})`)
        }
        
        transaction.add(memoInstruction)
        message = `Mint NFT: ${name}`
        break
      }
      
      case "transfer": {
        const mint = url.searchParams.get("mint")
        const to = url.searchParams.get("to")
        
        if (!mint || !to) {
          return Response.json(
            { message: "Missing required parameters for transfer" },
            {
              status: 400,
              headers: ACTIONS_CORS_HEADERS,
            }
          )
        }
        
        // Validate addresses
        try {
          new PublicKey(mint)
          new PublicKey(to)
        } catch {
          return Response.json(
            { message: "Invalid mint or recipient address" },
            {
              status: 400,
              headers: ACTIONS_CORS_HEADERS,
            }
          )
        }
        
        // Note: Real NFT transfer would require:
        // 1. Finding source and destination token accounts
        // 2. Creating destination token account if needed
        // 3. Transferring the NFT (amount = 1)
        
        // Placeholder instruction
        const memoInstruction = {
          keys: [],
          programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
          data: Buffer.from(`Transfer NFT ${mint.slice(0, 8)}... to ${to.slice(0, 8)}...`)
        }
        
        transaction.add(memoInstruction)
        message = `Transfer NFT to ${to.slice(0, 8)}...`
        break
      }
      
      case "list": {
        const mint = url.searchParams.get("mint")
        const priceStr = url.searchParams.get("price")
        
        if (!mint || !priceStr) {
          return Response.json(
            { message: "Missing required parameters for listing" },
            {
              status: 400,
              headers: ACTIONS_CORS_HEADERS,
            }
          )
        }
        
        const price = parseFloat(priceStr)
        if (isNaN(price) || price <= 0) {
          return Response.json(
            { message: "Invalid price" },
            {
              status: 400,
              headers: ACTIONS_CORS_HEADERS,
            }
          )
        }
        
        // Note: Real NFT listing would require:
        // 1. Integration with a marketplace (e.g., Magic Eden, Tensor)
        // 2. Creating listing account
        // 3. Setting price and conditions
        
        // Placeholder instruction
        const memoInstruction = {
          keys: [],
          programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
          data: Buffer.from(`List NFT ${mint.slice(0, 8)}... for ${price} SOL`)
        }
        
        transaction.add(memoInstruction)
        message = `List NFT for ${price} SOL`
        break
      }
      
      default:
        return Response.json(
          { message: "Invalid action specified" },
          {
            status: 400,
            headers: ACTIONS_CORS_HEADERS,
          }
        )
    }
    
    // Set recent blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = userAccount
    
    // Create response
    const payload = await createPostResponse({
      fields: {
        transaction,
        message,
      },
    })
    
    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS,
    })
  } catch (err) {
    console.error("NFT action error:", err)
    return Response.json(
      { message: "An error occurred while creating the NFT transaction" },
      {
        status: 500,
        headers: ACTIONS_CORS_HEADERS,
      }
    )
  }
}