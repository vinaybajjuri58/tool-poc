import { getZeptoMCPTools } from '@/lib/zepto-mcp-client';

export async function GET() {
  try {
    const tools = await getZeptoMCPTools();
    const simplified = tools.map((t) => ({
      name: t.function.name,
      description: t.function.description || '',
      rawDefinition: JSON.stringify(t, null, 2),
    }));

    return Response.json({ tools: simplified });
  } catch (error: unknown) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch Zepto MCP tools',
      },
      { status: 500 }
    );
  }
}
