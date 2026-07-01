'use client';

import { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { GraphData } from 'react-force-graph-2d';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-gray-500 text-xs">
      Loading graph...
    </div>
  ),
});

export interface Entity {
  id: string;
  name: string;
  type: string;
}

export interface Relationship {
  source: string;
  target: string;
  label: string;
}

interface KnowledgeGraphPanelProps {
  entities: Entity[];
  relationships: Relationship[];
  isLoading?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  Person: '#a78bfa',
  Organization: '#60a5fa',
  Location: '#34d399',
  Product: '#fbbf24',
  Technology: '#f472b6',
  Concept: '#94a3b8',
  Event: '#fb923c',
  Other: '#6b7280',
};

export { TYPE_COLORS };

export default function KnowledgeGraphPanel({
  entities,
  relationships,
  isLoading = false,
}: KnowledgeGraphPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 400, height: 400 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDims({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    setDims({
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });
    return () => observer.disconnect();
  }, []);

  if (entities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-600 text-xs gap-2 px-4 text-center">
        {isLoading ? (
          <>
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
            <p className="text-purple-400">Analyzing text...</p>
          </>
        ) : (
          <>
            <p className="text-lg">🕸️</p>
            <p>Paste text on the right to generate a knowledge graph</p>
            <p className="text-gray-700 text-[11px]">
              Entities and their relationships will appear here
            </p>
          </>
        )}
      </div>
    );
  }

  const graphData: GraphData = {
    nodes: entities.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      color: TYPE_COLORS[e.type] || TYPE_COLORS.Other,
      val: 3,
    })),
    links: relationships.map((r) => ({
      source: r.source,
      target: r.target,
      label: r.label,
    })),
  };

  return (
    <div ref={containerRef} className="w-full h-full">
      <ForceGraph2D
        graphData={graphData}
        width={dims.width}
        height={dims.height}
        backgroundColor="rgb(17 24 39)"
        nodeLabel="name"
        nodeColor="color"
        nodeVal="val"
        linkLabel="label"
        linkColor={() => 'rgba(148, 163, 184, 0.3)'}
        linkWidth={0.7}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={0.95}
        linkDirectionalArrowColor={() => 'rgba(148, 163, 184, 0.4)'}
        cooldownTicks={100}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
      />
    </div>
  );
}


