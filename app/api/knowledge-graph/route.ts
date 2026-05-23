import OpenAI from 'openai';

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a knowledge graph extraction engine. Extract all meaningful entities and their relationships from the given text.

Entities: people, organizations, locations, products, technologies, concepts, events, dates, or any significant noun phrases.
Relationships: how these entities connect (verbs or prepositional phrases like "works at", "founded", "located in", "develops", "part of", etc.).

Return a JSON object with two arrays:
- "entities": [{ "id": "e1", "name": "...", "type": "Person|Organization|Location|Product|Technology|Concept|Event|Other" }]
- "relationships": [{ "source": "e1", "target": "e2", "label": "..." }]

Rules:
1. Every relationship must reference valid entity IDs
2. Use concise, readable labels for relationships
3. Include all significant entities and relationships
4. Deduplicate identical entities
5. Limit to 40 entities max for readability`;

export async function POST(req: Request) {
  const { text, apiKey } = await req.json();

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'Text is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'knowledge_graph',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              entities: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    type: {
                      type: 'string',
                      enum: [
                        'Person',
                        'Organization',
                        'Location',
                        'Product',
                        'Technology',
                        'Concept',
                        'Event',
                        'Other',
                      ],
                    },
                  },
                  required: ['id', 'name', 'type'],
                  additionalProperties: false,
                },
              },
              relationships: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    source: { type: 'string' },
                    target: { type: 'string' },
                    label: { type: 'string' },
                  },
                  required: ['source', 'target', 'label'],
                  additionalProperties: false,
                },
              },
            },
            required: ['entities', 'relationships'],
            additionalProperties: false,
          },
        },
      },
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No response from model' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const graph = JSON.parse(content);
    return new Response(JSON.stringify(graph), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate knowledge graph',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
