import Link from 'next/link';

const DEMOS = [
  {
    href: '/customer-support',
    icon: '🤖',
    title: 'Customer Support AI',
    badge: 'Chat',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    accentColor: 'blue',
    description:
      'AI-powered customer support agent with live tool execution. Look up customers, check order history, and review support issues — all through natural conversation with real-time reasoning flow.',
    features: ['Live tool execution', 'Real-time reasoning flow', 'Google Sheets backend'],
  },
  {
    href: '/mcp-demo',
    icon: '🛵',
    title: 'Swiggy MCP Demo',
    badge: 'MCP',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    accentColor: 'orange',
    description:
      'Model Context Protocol integration with Swiggy\'s food API. Dynamically discover and call MCP tools — search restaurants, find dishes, and explore food delivery options with live tool streaming.',
    features: ['MCP protocol', 'Dynamic tool discovery', 'Streaming SSE responses'],
  },
  {
    href: '/knowledge-graph',
    icon: '🕸️',
    title: 'Knowledge Graph',
    badge: 'AI',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    accentColor: 'purple',
    description:
      'Extract entities and relationships from any text using AI. Paste articles, bios, or research — and watch a force-directed knowledge graph visualize connections between people, places, and concepts.',
    features: ['Entity extraction', 'Force-directed graph', 'Interactive visualization'],
  },
];

const accentBorders: Record<string, string> = {
  blue: 'hover:border-blue-500/40',
  orange: 'hover:border-orange-500/40',
  purple: 'hover:border-purple-500/40',
};

const accentHovers: Record<string, string> = {
  blue: 'group-hover:text-blue-400',
  orange: 'group-hover:text-orange-400',
  purple: 'group-hover:text-purple-400',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <span className="text-xl">⚡</span>
        <div>
          <h1 className="text-sm font-bold text-gray-200">AI Demos</h1>
          <p className="text-[11px] text-gray-600">
            Customer support, MCP protocol, and knowledge graph experiments
          </p>
        </div>
        <div className="flex-1" />
        <Link
          href="https://github.com"
          target="_blank"
          className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
        >
          View on GitHub ↗
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-600 uppercase tracking-widest">
              Choose a Demo
            </p>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Three AI-powered tools built with Next.js, OpenAI, and streaming
              server-sent events
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEMOS.map((demo) => (
              <Link
                key={demo.href}
                href={demo.href}
                className={`group block bg-gray-900 border border-gray-800 ${accentBorders[demo.accentColor]} rounded-xl p-5 transition-all hover:bg-gray-900/80 hover:-translate-y-0.5`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{demo.icon}</span>
                  <div>
                    <h2
                      className={`text-sm font-semibold text-gray-200 ${accentHovers[demo.accentColor]} transition-colors`}
                    >
                      {demo.title}
                    </h2>
                  </div>
                  <span
                    className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border font-medium ${demo.badgeColor}`}
                  >
                    {demo.badge}
                  </span>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-4">
                  {demo.description}
                </p>

                <div className="space-y-1.5">
                  {demo.features.map((f) => (
                    <div
                      key={f}
                      className="flex items-center gap-2 text-[11px] text-gray-600"
                    >
                      <span
                        className={`w-1 h-1 rounded-full bg-${demo.accentColor}-500/50`}
                      />
                      {f}
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>

          <p className="text-center text-[10px] text-gray-700">
            Requires an OpenAI API key • All demos use gpt-4o-mini
          </p>
        </div>
      </main>
    </div>
  );
}
