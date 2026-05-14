export const TOOLS = [
  {
    name: 'search_customer_by_name',
    description:
      'Search for a customer by name. Returns their ID, plan, status, and contact info.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Full or partial name' },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_customer_by_id',
    description: 'Get full customer details using their Customer ID.',
    input_schema: {
      type: 'object' as const,
      properties: { customer_id: { type: 'string' } },
      required: ['customer_id'],
    },
  },
  {
    name: 'get_order_history',
    description: 'Get all orders placed by a customer.',
    input_schema: {
      type: 'object' as const,
      properties: { customer_id: { type: 'string' } },
      required: ['customer_id'],
    },
  },
  {
    name: 'get_support_issues',
    description: 'Get open and past support tickets for a customer.',
    input_schema: {
      type: 'object' as const,
      properties: { customer_id: { type: 'string' } },
      required: ['customer_id'],
    },
  },
];
