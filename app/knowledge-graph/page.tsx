'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import KnowledgeGraphPanel, {
  TYPE_COLORS,
} from '@/components/KnowledgeGraphPanel';
import type { Entity, Relationship } from '@/components/KnowledgeGraphPanel';

interface GraphData {
  entities: Entity[];
  relationships: Relationship[];
}

const EXAMPLE_TEXTS = [
  `OpenAI was founded in December 2015 by Sam Altman, Greg Brockman, Elon Musk, and others. The company is headquartered in San Francisco, California. OpenAI developed GPT-4, a large language model, and ChatGPT, a conversational AI product. Microsoft invested billions in OpenAI and integrates its technology into Azure and Office products. Sam Altman serves as the CEO.`,

  `Apple Inc. is an American tech company based in Cupertino, California. It was founded by Steve Jobs, Steve Wozniak, and Ronald Wayne in 1976. Apple designs the iPhone, iPad, Mac computers, and the iOS operating system. Tim Cook has been the CEO since 2011. Apple operates retail stores worldwide and is the largest tech company by revenue.`,

  `The Apollo 11 mission launched on July 16, 1969 from Kennedy Space Center in Florida. Neil Armstrong and Buzz Aldrin landed on the Moon on July 20, 1969, while Michael Collins orbited in the Command Module Columbia. The Saturn V rocket carried the crew to space. The mission was organized by NASA and fulfilled President John F. Kennedy's goal of landing a man on the Moon.`,
];

export default function KnowledgeGraphPage() {
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(true);
  const [text, setText] = useState('');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = useCallback(async () => {
    if (!apiKey.trim()) {
      setShowApiInput(true);
      return;
    }
    if (!text.trim()) return;

    setIsLoading(true);
    setError('');
    setGraphData(null);

    try {
      const response = await fetch('/api/knowledge-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to generate graph');
        return;
      }

      setGraphData(data);
    } catch (err: any) {
      setError(err.message || 'Connection error');
    } finally {
      setIsLoading(false);
    }
  }, [text, apiKey]);

  const entities = graphData?.entities || [];
  const relationships = graphData?.relationships || [];

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="shrink-0 border-b border-gray-800 px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            ← Home
          </Link>
          <div className="w-px h-5 bg-gray-700" />
          <span className="text-lg">🕸️</span>
          <h1 className="text-sm font-bold text-gray-200">
            Knowledge Graph
          </h1>
          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-medium">
            AI
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
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 placeholder-gray-500 w-64 focus:outline-none focus:border-purple-500/50"
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
        {/* Left: Knowledge Graph */}
        <div className="w-[35%] min-w-[320px] border-r border-gray-800 bg-gray-900/50">
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-gray-800 shrink-0">
              <h2 className="text-sm font-semibold text-purple-400 uppercase tracking-wide">
                Knowledge Graph
              </h2>
            </div>
            <div className="flex-1">
              <KnowledgeGraphPanel
                entities={entities}
                relationships={relationships}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Right: Text Input + Results */}
        <div className="flex-1 bg-gray-950 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700/50 shrink-0">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Input Text
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Text input */}
            <div className="space-y-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste any text here — articles, news, biographies, research papers, company descriptions..."
                rows={10}
                disabled={isLoading}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500/50 disabled:opacity-50 resize-y font-mono leading-relaxed"
              />

              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={!text.trim() || isLoading}
                  className="bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Graph'
                  )}
                </button>

                <span className="text-xs text-gray-600">
                  {text.length > 0 && `${text.length} characters`}
                </span>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}
            </div>

            {/* Example texts */}
            {!graphData && !isLoading && (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 font-medium">
                  Try an example:
                </p>
                <div className="space-y-1.5">
                  {EXAMPLE_TEXTS.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setText(example)}
                      className="block w-full text-left text-xs text-gray-500 hover:text-gray-300 bg-gray-800/50 hover:bg-gray-800 rounded px-3 py-2 transition-colors line-clamp-2"
                    >
                      {example.slice(0, 120)}...
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results legend */}
            {entities.length > 0 && (
              <div className="space-y-4">
                {/* Stats */}
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>
                    <span className="text-purple-400 font-semibold">
                      {entities.length}
                    </span>{' '}
                    entities
                  </span>
                  <span>
                    <span className="text-purple-400 font-semibold">
                      {relationships.length}
                    </span>{' '}
                    relationships
                  </span>
                </div>

                {/* Entity list */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 font-medium">Entities:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {entities.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              TYPE_COLORS[e.type] || TYPE_COLORS.Other,
                          }}
                        />
                        <span className="text-gray-300 truncate">
                          {e.name}
                        </span>
                        <span className="text-gray-600 text-[10px]">
                          {e.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Relationships list */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 font-medium">
                    Relationships:
                  </p>
                  <div className="space-y-1">
                    {relationships.map((r, i) => (
                      <div
                        key={`${r.source}-${r.target}-${i}`}
                        className="text-xs text-gray-500 flex items-center gap-2"
                      >
                        <span className="text-gray-300">
                          {entities.find((e) => e.id === r.source)?.name ||
                            r.source}
                        </span>
                        <span className="text-purple-400/70">{r.label}</span>
                        <span className="text-gray-300">
                          {entities.find((e) => e.id === r.target)?.name ||
                            r.target}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-600 font-medium">Legend:</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {Object.entries(TYPE_COLORS).map(([type, color]) => (
                      <div
                        key={type}
                        className="flex items-center gap-1.5 text-[10px] text-gray-500"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        {type}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
