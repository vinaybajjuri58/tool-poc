import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { getZeptoMCPTools, callZeptoMCPTool } from '@/lib/zepto-mcp-client';

export const maxDuration = 120;

const SYSTEM_PROMPT = `You are a helpful AI shopping assistant with access to Zepto's quick-commerce platform via MCP (Model Context Protocol).

You can help users:
- Search Zepto's live product catalog for groceries, household essentials, personal care, electronics, toys, stationery, and more
- Compare available products, prices, quantities, and availability
- Manage the user's Zepto cart when they explicitly ask
- Retrieve order history when they explicitly ask
- Help place real Zepto orders after explicit user confirmation

Important safety and confirmation rules:
1. Zepto MCP can interact with real Zepto accounts and real orders. Treat cart changes, checkout, payment, and order placement as real actions.
2. Search and browse freely when the user asks for product recommendations or availability.
3. Do not add, remove, or update cart items unless the user clearly asks you to do that.
4. Before placing an order or initiating payment, summarize the cart, total if available, delivery/payment details if available, and ask for explicit confirmation.
5. Never place an order, initiate payment, or choose a payment method without the user's explicit confirmation in the current conversation.
6. If authentication, location, payment, or account access is required, explain what is needed and ask the user to complete the required step.

Be concise, practical, and clear about what action you are taking.`;

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
          detail: 'Connecting to Zepto MCP...',
        });

        const mcpTools = await getZeptoMCPTools();

        send({
          type: 'update_node',
          status: 'done',
          detail: `Connected. ${mcpTools.length} tools available from Zepto MCP.`,
        });

        const conversation: ChatCompletionMessageParam[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ];

        while (true) {
          send({
            type: 'flow_node',
            nodeType: 'ai_request',
            label: 'OpenAI + Zepto MCP',
            status: 'loading',
            detail: `${mcpTools.length} Zepto tools loaded`,
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
                label: `Zepto MCP: ${tc.name}`,
                detail: JSON.stringify(toolInput),
              });

              send({
                type: 'flow_node',
                nodeType: 'tool_execute',
                label: 'Zepto MCP ->',
                status: 'loading',
              });

              try {
                const result = await callZeptoMCPTool(tc.name, toolInput);
                const resultStr = JSON.stringify(result);

                send({
                  type: 'update_node',
                  status: 'done',
                  detail: resultStr,
                });

                send({
                  type: 'flow_node',
                  nodeType: 'tool_result',
                  label: 'Zepto Result',
                });

                conversation.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: resultStr,
                });
              } catch (err: unknown) {
                const message =
                  err instanceof Error ? err.message : 'Zepto MCP tool error';

                send({
                  type: 'update_node',
                  status: 'error',
                  detail: message,
                });

                conversation.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: JSON.stringify({
                    error: message || 'Tool execution failed',
                  }),
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
