import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { getMCPTools, callMCPTool } from '@/lib/mcp-client';

export const maxDuration = 120;

const SYSTEM_PROMPT = `You are a helpful AI assistant with access to Swiggy's Food delivery service via MCP (Model Context Protocol).

You can help users:
- Search for restaurants by cuisine, name, or dish
- Browse restaurant menus and pricing
- Manage their food cart (add items, view cart)
- Place food orders and track deliveries

When a user asks about food:
1. If they want to find restaurants, use search_restaurants first
2. Use the appropriate tools to explore menus, manage carts, and place orders
3. Summarize findings clearly and conversationally
4. Always confirm before placing an order

Be polite, helpful, and food-enthusiastic! 🍕`;

export async function POST(req: Request) {
  const { messages, apiKey } = await req.json();

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const openai = new OpenAI({ apiKey });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (event: object) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      try {
        send({
          type: 'flow_node',
          nodeType: 'ai_request',
          label: 'MCP Connect',
          status: 'loading',
          detail: 'Connecting to Swiggy Food MCP...',
        });

        const mcpTools = await getMCPTools();

        send({
          type: 'update_node',
          status: 'done',
          detail: `Connected. ${mcpTools.length} tools available from Swiggy Food MCP.`,
        });

        const conversation: ChatCompletionMessageParam[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ];

        while (true) {
          send({
            type: 'flow_node',
            nodeType: 'ai_request',
            label: 'OpenAI + MCP Tools',
            status: 'loading',
            detail: `${mcpTools.length} Swiggy tools loaded`,
          });

          const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 1024,
            messages: conversation,
            tools: mcpTools,
            stream: true,
          });

          let fullText = '';
          const toolCallMap = new Map<
            number,
            { id: string; name: string; arguments: string }
          >();

          for await (const chunk of response) {
            const delta = chunk.choices[0]?.delta;

            if (delta?.content) {
              fullText += delta.content;
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const index = tc.index;
                if (!toolCallMap.has(index)) {
                  toolCallMap.set(index, {
                    id: tc.id ?? '',
                    name: tc.function?.name ?? '',
                    arguments: '',
                  });
                }
                const entry = toolCallMap.get(index)!;
                if (tc.id) entry.id = tc.id;
                if (tc.function?.name) entry.name = tc.function.name;
                if (tc.function?.arguments) entry.arguments += tc.function.arguments;
              }
            }

            const finishReason = chunk.choices[0]?.finish_reason;
            if (finishReason) {
              send({
                type: 'update_node',
                status: 'done',
                detail: `stop: ${finishReason}`,
              });
            }
          }

          const toolCalls = Array.from(toolCallMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([, tc]) => tc);

          if (toolCalls.length > 0) {
            const assistantToolMsg: ChatCompletionMessageParam = {
              role: 'assistant',
              content: null,
              tool_calls: toolCalls.map((tc) => ({
                id: tc.id,
                type: 'function' as const,
                function: { name: tc.name, arguments: tc.arguments },
              })),
            };
            conversation.push(assistantToolMsg);

            for (const tc of toolCalls) {
              const toolInput = JSON.parse(tc.arguments);

              send({
                type: 'flow_node',
                nodeType: 'tool_call',
                label: `MCP: ${tc.name}`,
                detail: JSON.stringify(toolInput),
              });

              send({
                type: 'flow_node',
                nodeType: 'tool_execute',
                label: 'Swiggy MCP →',
                status: 'loading',
              });

              try {
                const result = await callMCPTool(tc.name, toolInput);
                const resultStr = JSON.stringify(result);

                send({
                  type: 'update_node',
                  status: 'done',
                  detail: resultStr,
                });

                send({
                  type: 'flow_node',
                  nodeType: 'tool_result',
                  label: 'MCP Result',
                });

                conversation.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: resultStr,
                });
              } catch (err: unknown) {
                const message =
                  err instanceof Error ? err.message : 'MCP tool error';

                send({
                  type: 'update_node',
                  status: 'error',
                  detail: message,
                });

                conversation.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: JSON.stringify({ error: message || 'Tool execution failed' }),
                });
              }
            }
          } else {
            send({
              type: 'flow_node',
              nodeType: 'ai_response',
              label: 'Final Response',
            });

            send({ type: 'chat_response', content: fullText });
            controller.close();
            break;
          }
        }
      } catch (error: unknown) {
        send({
          type: 'error',
          content: error instanceof Error ? error.message : 'Something went wrong',
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
