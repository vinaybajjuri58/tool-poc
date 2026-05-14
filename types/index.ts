export type FlowNodeType =
  | 'user'
  | 'ai_request'
  | 'tool_call'
  | 'tool_execute'
  | 'tool_result'
  | 'ai_response';

export interface FlowNode {
  id: string;
  type: 'add' | 'update';
  nodeType?: FlowNodeType;
  label?: string;
  status?: 'loading' | 'done' | 'error';
  detail?: string;
}

export interface SSEChatEvent {
  type: 'flow_node' | 'update_node' | 'chat_response' | 'error';
  nodeType?: FlowNodeType;
  label?: string;
  status?: 'loading' | 'done' | 'error';
  detail?: string;
  content?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}
