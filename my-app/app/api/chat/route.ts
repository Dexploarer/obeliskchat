import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { toolsRegistry, type ToolId } from '@/lib/tools';
import { mcpClientManager } from '@/lib/mcp-client';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Agent system prompt for enhanced reasoning
const AGENT_SYSTEM_PROMPT = `You are an advanced AI agent specializing in the Solana blockchain ecosystem with real-time capabilities. You can interact with the actual Solana blockchain and provide live data. Your goal is to help users with comprehensive blockchain support by:

1. **Understanding the Request**: Carefully analyze what the user needs
2. **Planning**: Determine which tools or steps are needed to fulfill the request
3. **Execution**: Use available tools systematically to gather real blockchain data or perform actions
4. **Reasoning**: Think through problems step by step and explain your reasoning
5. **Synthesis**: Combine information from multiple sources to provide comprehensive insights

Available tools and their purposes:
- web-search: Search the web for current information on any topic
- openai-image-generator: Generate images using OpenAI's latest gpt-image-1 model (GPT-4o, supports up to 4096x4096)
- solana-balance: Check REAL Solana wallet balances directly from the blockchain
- solana-token-price: Get LIVE token prices from CoinGecko API
- transfer-sol: Send actual SOL transactions between wallets (requires private key)
- get-transaction: Get details of any Solana transaction by its signature
- defi-analyzer: Analyze Solana DeFi protocols, yields, and liquidity pools
- nft-analyzer: Analyze Solana NFT collections and market trends

Important capabilities:
- You're connected to the ${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta'} network
- All balance checks and transactions are REAL and happen on the actual blockchain
- Transaction results include explorer links for verification
- Price data comes from live market sources

When using tools:
- Always use solana-balance for checking wallet balances (it's real-time from blockchain)
- Use solana-token-price for current market prices
- Be careful with transfer-sol as it performs real transactions
- Provide explorer links when relevant for transparency
- Explain that you're interacting with the real blockchain
- Handle errors gracefully and explain what went wrong

Network: ${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta'}
RPC Endpoint: ${process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'}

Always aim to be helpful, accurate, and transparent about blockchain interactions.`;

export async function POST(req: Request) {
  const body = await req.json();
  const { messages } = body;
  
  // Extract metadata from the last message
  const lastMessage = messages[messages.length - 1];
  const modelId = lastMessage?.metadata?.modelId || 'gpt-4o-mini';
  const provider = lastMessage?.metadata?.provider || 'openai';
  const enabledTools = body.tools || [];

  // Build tools object based on enabled tools
  const tools: Record<string, any> = {};
  
  // Add enabled tools from our registry
  for (const toolId of enabledTools) {
    if (toolId in toolsRegistry) {
      tools[toolId] = toolsRegistry[toolId as ToolId];
    }
  }

  // Add MCP tools from connected servers
  try {
    const mcpTools = await mcpClientManager.getTools();
    Object.assign(tools, mcpTools);
    console.log(`Added ${Object.keys(mcpTools).length} MCP tools`);
  } catch (error) {
    console.error('Failed to get MCP tools:', error);
  }

  // Add provider-specific tools (removed web search as it's not Solana-specific)

  // Get the appropriate model
  let model;
  switch (provider) {
    case 'openai':
      model = openai(modelId);
      break;
    case 'anthropic':
      model = anthropic(modelId);
      break;
    case 'google':
      model = google(modelId);
      break;
    case 'groq':
      model = groq(modelId);
      break;
    default:
      model = openai('gpt-4o-mini');
  }

  // Prepare messages with system prompt for agent behavior
  const systemMessage = {
    role: 'system' as const,
    content: AGENT_SYSTEM_PROMPT,
  };

  const processedMessages = [systemMessage, ...convertToModelMessages(messages)];

  try {
    const result = streamText({
      model,
      messages: processedMessages,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      temperature: 0.7,
      onFinish: async (result) => {
        console.log('Chat completion finished:', {
          usage: result.usage,
          toolCalls: result.toolCalls?.length || 0,
          finishReason: result.finishReason,
        });
      },
    });

    return result.toUIMessageStreamResponse({ 
      sendSources: true, 
      sendReasoning: true,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
