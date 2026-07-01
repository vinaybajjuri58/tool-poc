import {
  searchCustomerByName,
  getCustomerById,
  getOrderHistory,
  getSupportIssues,
} from './data';

export async function executeTool(name: string, input: Record<string, unknown>) {
  switch (name) {
    case 'search_customer_by_name':
      return searchCustomerByName(input.name as string);
    case 'get_customer_by_id':
      return getCustomerById(input.customer_id as string);
    case 'get_order_history':
      return getOrderHistory(input.customer_id as string);
    case 'get_support_issues':
      return getSupportIssues(input.customer_id as string);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
