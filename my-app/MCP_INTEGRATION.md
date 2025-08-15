# Model Context Protocol (MCP) Integration Guide

This document provides a comprehensive guide to the Model Context Protocol (MCP) integration in your AI Agent system.

## Overview

The Model Context Protocol (MCP) is an open standard that enables AI applications to seamlessly integrate with external tools, data sources, and services. Our implementation provides:

- **Comprehensive MCP Support**: Full integration with the AI SDK for tool calling
- **Security-First Design**: Robust validation and sandboxing for MCP servers
- **User-Friendly Management**: Visual interface for managing MCP servers
- **Agent Orchestration**: Intelligent tool selection and execution planning

## Features

### ✅ **Core Implementation**
- [x] MCP SDK integration with AI SDK
- [x] Support for stdio, SSE, and HTTP transports
- [x] Real-time tool discovery and management
- [x] Security validation and error handling
- [x] Agent orchestration with MCP tools

### ✅ **User Interface**
- [x] MCP Tools management page (`/mcp-tools`)
- [x] Server discovery and configuration
- [x] Health monitoring and status tracking
- [x] Integrated tool selection in chat interface

### ✅ **Security & Error Handling**
- [x] Command validation and sanitization
- [x] URL scheme and domain restrictions
- [x] Rate limiting and execution timeouts
- [x] Comprehensive error handling and logging

## Quick Start

### 1. Accessing MCP Tools

Navigate to `/mcp-tools` in your application to access the MCP management interface.

### 2. Available Default Servers

The following MCP servers are pre-configured (disabled by default for security):

| Server | Description | Category | Tools |
|--------|-------------|----------|--------|
| **Filesystem** | Secure file operations | file-management | `read_file`, `write_file`, `list_directory` |
| **Git** | Git repository operations | development | `git_log`, `git_diff`, `git_show` |
| **Fetch** | Web content fetching | web-scraping | `fetch_url`, `fetch_html`, `fetch_text` |
| **Memory** | Persistent knowledge graph | productivity | `store_memory`, `recall_memory` |
| **Puppeteer** | Browser automation | web-scraping | `navigate`, `click`, `screenshot` |
| **SQLite** | Database queries | database | `execute_query`, `list_tables` |
| **PostgreSQL** | PostgreSQL access | database | `execute_query`, `describe_table` |

### 3. Enabling a Server

1. Go to the MCP Tools page
2. Find the server you want to enable
3. Toggle the switch to enable it
4. The server will connect and its tools become available

### 4. Using MCP Tools in Chat

Once servers are enabled:
1. Open the chat interface
2. Click on the Tools dropdown
3. Select MCP tools alongside regular tools
4. MCP tools are marked with a blue "MCP" badge

## Adding Custom MCP Servers

### Stdio Server Example

```typescript
const customServer: MCPServerConfig = {
  id: 'my-custom-server',
  name: 'My Custom Server',
  description: 'Custom functionality server',
  type: 'stdio',
  command: 'npx',
  args: ['my-mcp-server'],
  enabled: false,
  category: 'custom',
  tools: ['custom_tool_1', 'custom_tool_2'],
};
```

### Remote HTTP Server Example

```typescript
const remoteServer: MCPServerConfig = {
  id: 'remote-api-server',
  name: 'Remote API Server',
  description: 'External service integration',
  type: 'http',
  url: 'https://api.example.com/mcp',
  enabled: false,
  category: 'api',
  tools: ['api_call', 'data_fetch'],
};
```

## Security Configuration

### Command Restrictions

Only these commands are allowed for stdio transport:
- `npx`
- `node`
- `python`/`python3`

### Blocked Patterns

These command patterns are automatically blocked:
- `rm -rf`
- `sudo`
- `chmod 777`
- `curl`/`wget`
- `ssh`/`scp`

### Path Restrictions

File operations are limited to:
- `/tmp`
- `./data`
- `./cache`

### Rate Limiting

- Maximum 5 server additions per minute
- Maximum 10 operations per minute per operation type
- Execution timeout: 30 seconds

## API Endpoints

### Get MCP Status
```bash
GET /api/mcp
```

### Get Available Servers
```bash
GET /api/mcp?action=servers
```

### Get Available Tools
```bash
GET /api/mcp?action=tools
```

### Enable Server
```bash
POST /api/mcp
{
  "action": "enable",
  "serverId": "filesystem"
}
```

### Add Custom Server
```bash
POST /api/mcp
{
  "action": "add",
  "config": {
    "id": "my-server",
    "name": "My Server",
    "type": "stdio",
    "command": "npx my-mcp-server"
  }
}
```

## Agent Integration

### Tool Selection

The agent automatically analyzes user input to suggest appropriate MCP tools:

```typescript
// Example: User asks "read the README file"
// Agent identifies: filesystem tools needed
const suggestedTools = await agentOrchestrator.analyzeRequiredTools(
  "read the README file", 
  enabledTools
);
// Returns: ['filesystem_read_file']
```

### Execution Planning

```typescript
const plan = await agentOrchestrator.planExecution(userInput, enabledTools);
// Returns execution steps including MCP tool usage
```

## Troubleshooting

### Common Issues

#### 1. Server Won't Connect
- **Check command**: Ensure the command exists and is in PATH
- **Verify permissions**: MCP servers may need specific permissions
- **Review logs**: Check browser console for detailed error messages

#### 2. Tools Not Appearing
- **Server status**: Verify server is enabled and healthy
- **Refresh tools**: Try refreshing the page or restarting the server
- **Network issues**: For remote servers, check connectivity

#### 3. Security Errors
- **Command blocked**: Use only allowed commands (`npx`, `node`, etc.)
- **Path restricted**: Ensure file operations are in allowed directories
- **Rate limited**: Wait before retrying operations

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

## Popular MCP Servers

### Community Servers

Explore additional MCP servers:
- **AgentQL**: Structured web data extraction
- **Bright Data**: Professional web scraping
- **302AI Sandbox**: Secure code execution
- **Academia MCP**: Scientific publication search

### Installation Commands

```bash
# Filesystem server
npx -y @modelcontextprotocol/server-filesystem /tmp

# Git server  
npx -y @modelcontextprotocol/server-git --repository .

# Web fetch server
npx -y @modelcontextprotocol/server-fetch

# Memory server
npx -y @modelcontextprotocol/server-memory
```

## Best Practices

### Security
1. **Always validate** server configurations before enabling
2. **Use stdio transport** for local tools when possible
3. **Limit server count** to avoid resource exhaustion
4. **Monitor execution times** and implement timeouts

### Performance
1. **Enable only needed servers** to reduce overhead
2. **Use caching** for frequently accessed data
3. **Implement connection pooling** for remote servers
4. **Monitor resource usage** regularly

### Development
1. **Test servers locally** before production deployment
2. **Implement proper error handling** in custom servers
3. **Document tool capabilities** clearly
4. **Version control** server configurations

## Advanced Usage

### Custom Transport Implementation

```typescript
class CustomTransport implements Transport {
  async connect(): Promise<void> {
    // Custom connection logic
  }
  
  async send(message: any): Promise<any> {
    // Custom message handling
  }
}
```

### Server Health Monitoring

```typescript
const health = await mcpClientManager.healthCheck();
// Returns health status for all enabled servers
```

### Tool Result Processing

```typescript
const tools = await mcpClientManager.getTools();
const toolResult = await tools['filesystem_read_file'].execute({
  path: '/tmp/example.txt'
});
```

## Support

For issues and questions:
1. Check this documentation
2. Review console logs for errors
3. Test with minimal configurations
4. Report issues with detailed reproduction steps

## Changelog

### v1.0.0 (Current)
- ✅ Complete MCP SDK integration
- ✅ Security framework implementation  
- ✅ Management UI with server controls
- ✅ Agent orchestration with MCP tools
- ✅ Popular server configurations
- ✅ Comprehensive error handling

---

**Note**: This integration follows MCP specification v1.0 and is compatible with all compliant MCP servers. Always ensure you trust MCP servers before enabling them, as they may have access to system resources.