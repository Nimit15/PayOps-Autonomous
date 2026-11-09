import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Navigation */}
      <nav className="bg-gray-900/80 border-b border-gray-800 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-cyan-400">PayOps Autonomous</h1>
          <div className="flex items-center gap-6">
            <Link href="/ag-studio" className="text-gray-300 hover:text-cyan-400 transition-colors font-medium">
              AG Studio
            </Link>
            <Link href="/gantt" className="text-gray-300 hover:text-cyan-400 transition-colors font-medium">
              Gantt
            </Link>
            <Link href="/procurement" className="text-gray-300 hover:text-cyan-400 transition-colors font-medium">
              Procurement
            </Link>
            <Link href="/invoicing" className="text-gray-300 hover:text-cyan-400 transition-colors font-medium">
              Invoicing
            </Link>
            <Link href="/dashboard" className="text-gray-300 hover:text-cyan-400 transition-colors font-medium">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-4xl text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight">
              PayOps Autonomous
              <br />
              <span className="text-cyan-400">Agentic Commerce</span>
              <br />
              <span className="text-amber-400">Operations Platform</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Autonomous AI agents for PayPal commerce operations — invoicing, disputes, procurement, and working capital optimization.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Link
              href="/ag-studio"
              className="group bg-gray-900/80 border border-gray-800 rounded-xl p-6 hover:border-cyan-500/50 transition-all"
            >
              <div className="w-12 h-12 bg-cyan-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-cyan-600/40 transition-colors">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">AG Studio</h3>
              <p className="text-gray-400 text-sm">Relational analytics with AI harness — 5 agents, scenario modes, inspector drawer</p>
            </Link>

            <Link
              href="/gantt"
              className="group bg-gray-900/80 border border-gray-800 rounded-xl p-6 hover:border-amber-500/50 transition-all"
            >
              <div className="w-12 h-12 bg-amber-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-amber-600/40 transition-colors">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Bryntum Gantt</h3>
              <p className="text-gray-400 text-sm">Payment-locked milestone scheduling with SSE live updates</p>
            </Link>

            <Link
              href="/procurement"
              className="group bg-gray-900/80 border border-gray-800 rounded-xl p-6 hover:border-green-500/50 transition-all"
            >
              <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-600/40 transition-colors">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Channel3 Procurement</h3>
              <p className="text-gray-400 text-sm">100M+ product search with PayPal order creation</p>
            </Link>

            <Link
              href="/invoicing"
              className="group bg-gray-900/80 border border-gray-800 rounded-xl p-6 hover:border-purple-500/50 transition-all"
            >
              <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-600/40 transition-colors">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Counterfactual Simulator</h3>
              <p className="text-gray-400 text-sm">Working capital optimization with early-pay discounts & escrow holds</p>
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link
              href="/ag-studio"
              className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
            >
              Launch AG Studio
            </Link>
            <Link
              href="/invoicing"
              className="px-8 py-4 bg-gray-800 border border-gray-700 hover:border-cyan-500 text-white font-medium rounded-lg transition-colors"
            >
              Try Counterfactual Simulator
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900/80 border-t border-gray-800 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            PayOps Autonomous — PayPal AI Hackathon 2026
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <span>Powered by PayPal APIs</span>
            <span>AG Studio v3.1</span>
            <span>Bryntum Gantt v7.3</span>
            <span>Channel3 SDK v4</span>
          </div>
        </div>
      </footer>
    </main>
  );
}