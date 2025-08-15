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
const AGENT_SYSTEM_PROMPT = `You are an advanced AI agent with access to various tools and capabilities. Your goal is to help users by:

1. **Understanding the Request**: Carefully analyze what the user needs
2. **Planning**: Determine which tools or steps are needed to fulfill the request
3. **Execution**: Use available tools systematically to gather information or perform actions
4. **Reasoning**: Think through problems step by step and explain your reasoning
5. **Synthesis**: Combine information from multiple sources to provide comprehensive answers

Available tools and their purposes:
- web-search: Search for current information on the internet
- calculator: Perform mathematical calculations
- code-interpreter: Execute and analyze code snippets
- weather: Get current weather information
- solana-balance: Check Solana wallet balances
- solana-token-price: Get Solana token prices and market data
- defi-analyzer: Analyze DeFi protocols and yields
- nft-analyzer: Analyze NFT collections and market trends
- image-generator: Generate images from text descriptions
- pdf-reader: Read and analyze PDF documents

When using tools:
- Choose the most appropriate tools for each task
- Use multiple tools when necessary to provide complete answers
- Explain why you're using specific tools
- Handle errors gracefully and try alternative approaches

Always aim to be helpful, accurate, and thorough in your responses.`;

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

  // Add provider-specific tools
  if (provider === 'openai' && enabledTools.includes('web-search')) {
    tools.web_search_preview = openai.tools.webSearchPreview({
      searchContextSize: 'high',
    });
  }

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
