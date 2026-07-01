import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';

const SWIGGY_FOOD_MCP = 'https://mcp.swiggy.com/food';

interface MCPConnection {
  client: Client;
  transport: StreamableHTTPClientTransport;
}

let cachedConnection: MCPConnection | null = null;

async function connect(): Promise<MCPConnection> {
  if (cachedConnection) return cachedConnection;

  const transport = new StreamableHTTPClientTransport(
    new URL(SWIGGY_FOOD_MCP)
  );

  const client = new Client(
    { name: 'commandcode-mcp-demo', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);

  cachedConnection = { client, transport };
  return cachedConnection;
}

export async function getMCPTools(): Promise<ChatCompletionTool[]> {
  const { client } = await connect();
  const result = await client.listTools();

  return result.tools.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.inputSchema as ChatCompletionTool['function']['parameters'],
    },
  }));
}

export async function callMCPTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const { client } = await connect();
  const result = await client.callTool({ name, arguments: args });
  return result.content;
}
