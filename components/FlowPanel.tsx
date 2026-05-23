"use client"

import { useEffect, useRef, useState } from "react"
import type { FlowNodeType } from "@/types"

interface FlowNode {
  id: string
  nodeType: FlowNodeType
  label: string
  status: "loading" | "done" | "error"
  detail?: string
}

export interface ToolInfo {
  name: string
  description: string
  rawDefinition: string
}

const NODE_ICON: Record<FlowNodeType, string> = {
  user: "👤",
  ai_request: "🧠",
  tool_call: "🔧",
  tool_execute: "⚙️",
  tool_result: "📊",
  ai_response: "💬",
}

interface FlowPanelProps {
  nodes: FlowNode[]
  isStreaming: boolean
  tools?: ToolInfo[]
}

export default function FlowPanel({ nodes, isStreaming, tools }: FlowPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [toolsOpen, setToolsOpen] = useState(false)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [nodes])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-800 shrink-0">
        <h2 className="text-sm font-semibold text-teal-400 uppercase tracking-wide">
          Reasoning Flow
        </h2>
      </div>

      {tools && tools.length > 0 && (
        <div className="shrink-0 border-b border-gray-800">
          <button
            onClick={() => setToolsOpen(!toolsOpen)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-900/50 transition-colors"
          >
            <span className="text-xs font-medium text-gray-400">
              Available Tools ({tools.length})
            </span>
            <span
              className={`text-xs text-gray-500 transition-transform duration-200 ${
                toolsOpen ? 'rotate-90' : ''
              }`}
            >
              ▶
            </span>
          </button>

          {toolsOpen && (
            <div className="px-4 pb-3 space-y-1.5 max-h-[300px] overflow-y-auto">
              {tools.map((tool) => (
                <details key={tool.name} className="group">
                  <summary className="cursor-pointer text-xs text-gray-400 hover:text-teal-400 transition-colors py-1 font-mono select-none">
                    {tool.name}
                  </summary>
                  <div className="pl-1 mt-0.5 space-y-1.5">
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      {tool.description}
                    </p>
                    <p className="text-[10px] text-gray-600 font-medium">Raw tool definition sent to model:</p>
                    <pre className="text-[10px] text-gray-500 font-mono bg-gray-800/60 border border-gray-700/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                      {tool.rawDefinition}
                    </pre>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {nodes.length === 0 && !isStreaming && (
          <div className="flex items-center justify-center h-full text-gray-600 text-xs">
            <p>Send a message to see the reasoning flow</p>
          </div>
        )}

        <div className="flex flex-col items-center gap-0">
          {nodes.map((node, i) => {
            const isLoading = node.status === "loading"

            const formattedDetail = node.detail
              ? (() => {
                  try {
                    return JSON.stringify(JSON.parse(node.detail), null, 2)
                  } catch {
                    return node.detail
                  }
                })()
              : null

            return (
              <div key={node.id} className="flex flex-col items-center w-full">
                {i > 0 && <div className="w-px h-6 bg-gray-700" />}

                <div className="flex items-center gap-3 w-full max-w-[280px]">
                  <div
                    className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-colors ${
                      isLoading
                        ? "border-teal-400 bg-teal-500/10 animate-pulse"
                        : "border-gray-700 bg-gray-800"
                    }`}
                  >
                    {NODE_ICON[node.nodeType] || "●"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-teal-400 truncate">
                      {node.label}
                    </p>
                    {node.status === "loading" && (
                      <p className="text-[10px] text-gray-500">Processing...</p>
                    )}
                    {node.status === "error" && (
                      <p className="text-[10px] text-red-400">Failed</p>
                    )}
                    {node.status === "done" && !formattedDetail && (
                      <p className="text-[10px] text-gray-600">Complete</p>
                    )}
                  </div>
                </div>

                {formattedDetail && (
                  <div className="mt-2 mb-1 w-full max-w-[280px]">
                    <div className="bg-gray-800/50 border border-gray-800 rounded-lg p-2.5">
                      <pre className="text-[11px] text-gray-400 font-mono leading-relaxed whitespace-pre-wrap break-all">
                        {formattedDetail}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
