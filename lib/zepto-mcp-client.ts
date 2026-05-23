import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';

const ZEPTO_MCP = 'https://mcp.zepto.co.in/mcp';

interface MCPConnection {
  client: Client;
  transport: StreamableHTTPClientTransport;
}

let cachedConnection: MCPConnection | null = null;

async function connect(): Promise<MCPConnection> {
  if (cachedConnection) return cachedConnection;

  const transport = new StreamableHTTPClientTransport(new URL(ZEPTO_MCP));

  const client = new Client(
    { name: 'commandcode-zepto-mcp-demo', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);

  cachedConnection = { client, transport };
  return cachedConnection;
}

export async function getZeptoMCPTools(): Promise<ChatCompletionTool[]> {
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

export async function callZeptoMCPTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const { client } = await connect();
  const result = await client.callTool({ name, arguments: args });
  return result.content;
}
