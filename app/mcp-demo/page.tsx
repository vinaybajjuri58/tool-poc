'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import FlowPanel from '@/components/FlowPanel';
import ChatPanel from '@/components/ChatPanel';
import type { ChatMessage, FlowNodeType } from '@/types';

interface FlowNode {
  id: string;
  nodeType: FlowNodeType;
  label: string;
  status: 'loading' | 'done' | 'error';
  detail?: string;
}

export default function MCPDemo() {
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const nodeMapRef = useRef<Map<string, number>>(new Map());
  let nodeCounter = useRef(0);

  const addFlowNode = useCallback(
    (nodeType: FlowNodeType, label: string, status: 'loading' | 'done' | 'error' = 'done', detail?: string) => {
      const id = `node-${++nodeCounter.current}`;
      setFlowNodes((prev) => {
        nodeMapRef.current.set(id, prev.length);
        return [...prev, { id, nodeType, label, status, detail }];
      });
      return id;
    },
    []
  );

  const updateFlowNode = useCallback((status: 'loading' | 'done' | 'error', detail?: string) => {
    setFlowNodes((prev) => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].status === 'loading') {
          updated[i] = { ...updated[i], status, detail };
          break;
        }
      }
      return updated;
    });
  }, []);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMessages((prev) => [...prev, { id, role, content }]);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!apiKey.trim()) {
        setShowApiInput(true);
        return;
      }

      addMessage('user', text);
      setFlowNodes([]);
      nodeCounter.current = 0;
      nodeMapRef.current.clear();
      setIsStreaming(true);

      addFlowNode('user', 'Message received');

      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      history.push({ role: 'user', content: text });

      try {
        const response = await fetch('/api/mcp-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, apiKey }),
        });

        if (!response.ok) {
          const err = await response.json();
          addMessage('assistant', `Error: ${err.error || 'Request failed'}`);
          setIsStreaming(false);
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));

              switch (event.type) {
                case 'flow_node':
                  addFlowNode(
                    event.nodeType,
                    event.label,
                    event.status || 'done',
                    event.detail
                  );
                  break;
                case 'update_node':
                  updateFlowNode(event.status, event.detail);
                  break;
                case 'chat_response':
                  addMessage('assistant', event.content);
                  break;
                case 'error':
                  addMessage('assistant', `Error: ${event.content}`);
                  break;
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      } catch (error: any) {
        addMessage('assistant', `Connection error: ${error.message}`);
      } finally {
        setIsStreaming(false);
      }
    },
    [apiKey, messages, addFlowNode, updateFlowNode, addMessage]
  );

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="shrink-0 border-b border-gray-800 px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            ← Customer Support
          </Link>
          <div className="w-px h-5 bg-gray-700" />
          <span className="text-lg">🛵</span>
          <h1 className="text-sm font-bold text-gray-200">
            Swiggy MCP Demo
          </h1>
          <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-medium">
            MCP
          </span>
        </div>

        <div className="flex-1" />

        {showApiInput ? (
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 font-medium whitespace-nowrap">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 placeholder-gray-500 w-64 focus:outline-none focus:border-orange-500/50"
            />
            <button
              onClick={() => setShowApiInput(false)}
              disabled={!apiKey.trim()}
              className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-gray-200 rounded px-3 py-1.5 transition-colors"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowApiInput(true)}
            className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
          >
            <span>🔑</span>
            <span className="font-mono">
              {apiKey.slice(0, 10)}...
            </span>
            <span className="text-gray-600">Change</span>
          </button>
        )}
      </header>

      {/* Main split panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Flow Panel */}
        <div className="w-[35%] min-w-[320px] border-r border-gray-800 bg-gray-900/50">
          <FlowPanel nodes={flowNodes} isStreaming={isStreaming} />
        </div>

        {/* Right: Chat Panel */}
        <div className="flex-1 bg-gray-950">
          <ChatPanel
            messages={messages}
            onSend={handleSend}
            isStreaming={isStreaming}
            placeholder="Ask about food, restaurants..."
            suggestions={{
              label: 'Ask about food, restaurants, or ordering',
              queries: [
                'Find biryani restaurants near me',
                'Search for pizza places in Mumbai',
                'Show me top-rated North Indian restaurants',
                'What are the best desserts available?',
              ],
            }}
          />
        </div>
      </div>
    </div>
  );
}
