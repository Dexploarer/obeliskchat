import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager, type MCPServerConfig } from '@/lib/mcp-client';

export async function GET(req: NextRequest) {
  try {
    // Ensure MCP client manager is initialized
    await mcpClientManager.initialize();
    
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'servers':
        return NextResponse.json({
          servers: mcpClientManager.getAvailableServers(),
        });

      case 'enabled':
        return NextResponse.json({
          servers: mcpClientManager.getEnabledServers(),
        });

      case 'tools':
        const tools = await mcpClientManager.getTools();
        return NextResponse.json({ tools });

      case 'health':
        const health = await mcpClientManager.healthCheck();
        return NextResponse.json({ health });

      default:
        return NextResponse.json({
          servers: mcpClientManager.getAvailableServers(),
          enabled: mcpClientManager.getEnabledServers().length,
          total: mcpClientManager.getAvailableServers().length,
        });
    }
  } catch (error) {
    console.error('MCP API GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve MCP data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Ensure MCP client manager is initialized
    await mcpClientManager.initialize();
    
    const body = await req.json();
    const { action, serverId, config } = body;

    switch (action) {
      case 'enable':
        if (!serverId) {
          return NextResponse.json(
            { error: 'Server ID is required' },
            { status: 400 }
          );
        }
        await mcpClientManager.enableServer(serverId);
        return NextResponse.json({ success: true, message: `Server ${serverId} enabled` });

      case 'disable':
        if (!serverId) {
          return NextResponse.json(
            { error: 'Server ID is required' },
            { status: 400 }
          );
        }
        await mcpClientManager.disableServer(serverId);
        return NextResponse.json({ success: true, message: `Server ${serverId} disabled` });

      case 'add':
        if (!config) {
          return NextResponse.json(
            { error: 'Server configuration is required' },
            { status: 400 }
          );
        }
        await mcpClientManager.addServer(config as MCPServerConfig);
        return NextResponse.json({ success: true, message: `Server ${config.name} added` });

      case 'remove':
        if (!serverId) {
          return NextResponse.json(
            { error: 'Server ID is required' },
            { status: 400 }
          );
        }
        await mcpClientManager.removeServer(serverId);
        return NextResponse.json({ success: true, message: `Server ${serverId} removed` });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('MCP API POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}