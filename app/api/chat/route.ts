import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { TOOLS } from '@/lib/tools';
import { executeTool } from '@/lib/tool-executor';

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a helpful customer support AI for a SaaS company. You have access to tools to look up customer information, order history, and support issues.

Before using tools:
1. Identify which customer the user is asking about.
2. If the user did not provide a customer name or customer ID, ask them for the customer's name. Do not call any tools until you have enough information to identify the customer.
3. If the user provides a customer name, use search_customer_by_name first.
4. If the search returns multiple possible customers, ask the user to clarify which one they mean before fetching more details.

Use tools only for the information the user asks for:
1. Use get_customer_by_id when the user asks for customer profile/details, account status, plan, contact info, or when you need to confirm the selected customer.
2. Use get_order_history only when the user specifically asks about orders, purchases, billing history, spend, invoices, subscriptions, or order-related questions.
3. Use get_support_issues only when the user specifically asks about support tickets, issues, complaints, escalations, or open/past problems.
4. Do not fetch orders or support issues automatically just because you found a customer.

Summarize findings clearly and conversationally. If you cannot find a customer, let the user know and ask for another name or identifier.

Always be polite, professional, and helpful.`;

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
        const conversation: ChatCompletionMessageParam[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ];

        while (true) {
          send({
            type: 'flow_node',
            nodeType: 'ai_request',
            label: 'OpenAI API',
            status: 'loading',
          });

          const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 1024,
            messages: conversation,
            tools: TOOLS,
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
                label: `Tool: ${tc.name}`,
                detail: JSON.stringify(toolInput),
              });

              send({
                type: 'flow_node',
                nodeType: 'tool_execute',
                label: 'Executing...',
                status: 'loading',
              });

              const result = await executeTool(tc.name, toolInput);
              const resultStr = JSON.stringify(result);

              send({
                type: 'update_node',
                status: 'done',
                detail: resultStr,
              });

              send({
                type: 'flow_node',
                nodeType: 'tool_result',
                label: 'Tool Result',
              });

              conversation.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: resultStr,
              });
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
