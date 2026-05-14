import { getMCPTools } from '@/lib/mcp-client';

export async function GET() {
  try {
    const tools = await getMCPTools();
    const simplified = tools.map((t) => ({
      name: t.function.name,
      description: t.function.description || '',
      rawDefinition: JSON.stringify(t, null, 2),
    }));

    return Response.json({ tools: simplified });
  } catch (error: any) {
    return Response.json(
      { error: error?.message || 'Failed to fetch MCP tools' },
      { status: 500 }
    );
  }
}
