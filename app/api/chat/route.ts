import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
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
                detail: `${resultStr.slice(0, 80)}${resultStr.length > 80 ? '...' : ''}`,
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
