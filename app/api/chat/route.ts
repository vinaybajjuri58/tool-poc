import Anthropic from '@anthropic-ai/sdk';
import { TOOLS } from '@/lib/tools';
import { executeTool } from '@/lib/tool-executor';

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a helpful customer support AI for a SaaS company. You have access to tools to look up customer information, order history, and support issues.

When a user asks about a customer:
1. If they mention a name, use search_customer_by_name first
2. Then use get_customer_by_id, get_order_history, or get_support_issues as needed
3. Summarize findings clearly and conversationally
4. If a customer has open issues, highlight them

Always be polite, professional, and helpful. If you cannot find a customer, let the user know.`;

export async function POST(req: Request) {
  const { messages, apiKey } = await req.json();

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const anthropic = new Anthropic({ apiKey });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (event: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      try {
        const history: Anthropic.Messages.MessageParam[] = [...messages];

        while (true) {
          send({
            type: 'flow_node',
            nodeType: 'ai_request',
            label: 'Claude API',
            status: 'loading',
          });

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            tools: TOOLS as any,
            messages: history,
          });

          send({
            type: 'update_node',
            status: 'done',
            detail: `stop: ${response.stop_reason}`,
          });

          if (response.stop_reason === 'tool_use') {
            const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

            for (const block of response.content) {
              if (block.type === 'tool_use') {
                const toolInput = block.input as Record<string, unknown>;

                send({
                  type: 'flow_node',
                  nodeType: 'tool_call',
                  label: `Tool: ${block.name}`,
                  detail: JSON.stringify(toolInput),
                });

                send({
                  type: 'flow_node',
                  nodeType: 'tool_execute',
                  label: 'Executing...',
                  status: 'loading',
                });

                const result = await executeTool(block.name, toolInput);

                const resultStr = JSON.stringify(result);

                send({
                  type: 'update_node',
                  status: 'done',
                  detail: `${resultStr.slice(0, 80)}${resultStr.length > 80 ? '...' : ''}`,
                });

                send({
                  type: 'flow_node',
                  nodeType: 'tool_result',
                  label: 'Tool Result',
                });

                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: resultStr,
                });
              }
            }

            history.push({
              role: 'assistant',
              content: response.content,
            });
            history.push({
              role: 'user',
              content: toolResults,
            });
          } else {
            const text =
              response.content.find((b) => b.type === 'text')?.text ?? '';

            send({
              type: 'flow_node',
              nodeType: 'ai_response',
              label: 'Final Response',
            });

            send({ type: 'chat_response', content: text });
            controller.close();
            break;
          }
        }
      } catch (error: any) {
        send({
          type: 'error',
          content: error?.message || 'Something went wrong',
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
