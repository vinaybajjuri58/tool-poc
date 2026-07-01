import type { ChatCompletionTool } from 'openai/resources/chat/completions';

export const TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_customer_by_name',
      description:
        'Search for a customer by name. Returns their ID, plan, status, and contact info.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Full or partial name' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_customer_by_id',
      description: 'Get full customer details using their Customer ID.',
      parameters: {
        type: 'object',
        properties: { customer_id: { type: 'string' } },
        required: ['customer_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_order_history',
      description: 'Get all orders placed by a customer.',
      parameters: {
        type: 'object',
        properties: { customer_id: { type: 'string' } },
        required: ['customer_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_support_issues',
      description: 'Get open and past support tickets for a customer.',
      parameters: {
        type: 'object',
        properties: { customer_id: { type: 'string' } },
        required: ['customer_id'],
      },
    },
  },
];
