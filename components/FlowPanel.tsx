"use client"

import { useEffect, useRef } from "react"
import type { FlowNodeType } from "@/types"

interface FlowNode {
  id: string
  nodeType: FlowNodeType
  label: string
  status: "loading" | "done" | "error"
  detail?: string
}

const NODE_CONFIG: Record<
  FlowNodeType,
  { color: string; bg: string; border: string; icon: string }
> = {
  user: {
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: "👤",
  },
  ai_request: {
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    icon: "🧠",
  },
  tool_call: {
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    icon: "🔧",
  },
  tool_execute: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    icon: "⚙️",
  },
  tool_result: {
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    icon: "📊",
  },
  ai_response: {
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    icon: "💬",
  },
}

interface FlowPanelProps {
  nodes: FlowNode[]
  isStreaming: boolean
}

export default function FlowPanel({ nodes, isStreaming }: FlowPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [nodes])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-700/50 shrink-0">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
          AI Customer Support
        </h2>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-0"
      >
        {nodes.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            <p>Send a message to see the AI reasoning flow</p>
          </div>
        )}

        {nodes.map((node, i) => {
          const config = NODE_CONFIG[node.nodeType] || NODE_CONFIG.ai_request
          const isLast = i === nodes.length - 1

          return (
            <div key={node.id}>
              {i > 0 && (
                <div className="flex justify-center py-0.5">
                  <div className="w-0.5 h-4 bg-gray-600/50 rounded" />
                </div>
              )}
              <div
                className={`rounded-lg border ${config.border} ${config.bg} p-3 relative`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{config.icon}</span>
                  <span className={`text-xs font-medium ${config.color}`}>
                    {node.label}
                  </span>
                  {node.status === "loading" && (
                    <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin ml-auto" />
                  )}
                  {node.status === "done" && (
                    <span className="ml-auto w-2 h-2 bg-green-400 rounded-full" />
                  )}
                  {node.status === "error" && (
                    <span className="ml-auto w-2 h-2 bg-red-400 rounded-full" />
                  )}
                </div>
                {node.detail && (
                  <p className="mt-1 text-[10px] text-gray-500 font-mono leading-relaxed break-all">
                    {node.detail}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
