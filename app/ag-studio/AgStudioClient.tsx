'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import NextDynamic from 'next/dynamic';

// Dynamically import ag-studio React components to avoid SSR issues
const AgStudioProvider = (await import('ag-studio-react')).AgStudioProvider;
const AgStudio = (await import('ag-studio-react')).AgStudio;

// Import non-component functions/classes directly (they don't need SSR avoidance)
import { AgStudioAiModule, createAiHarness } from 'ag-studio';

import type { AgAiHarnessSetup, AgAiHarnessDefaults } from 'ag-studio';
import type { AgDataSourcesDefinition, AgPanelConfig } from 'ag-studio';
import type { AgRegistry } from 'ag-studio-react';
import { buildStudioData, type DashboardData } from '@/lib/dashboard-data';

// Counterfactual Simulator Component (shared with /invoicing page)
const CounterfactualSimulator = NextDynamic(
  () => import('@/app/invoicing/CounterfactualSimulator').then(mod => mod.CounterfactualSimulator),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-gray-400">Loading simulator...</div> }
);

// Simple LLM adapter using @paypal/agent-toolkit for PayPal operations
// In production, replace with Anthropic/OpenAI adapter
function createPayPalLlmAdapter(): any {
  return {
    executeTurn: async (request: any) => {
      const { input, tools, model } = request;
      const lastMessage = input[input.length - 1];

      // Simple routing for demo - in production, use real LLM
      let response = '';
      if (typeof lastMessage?.content === 'string') {
        const query = lastMessage.content.toLowerCase();

        if (query.includes('dispute')) {
          response = 'I can help you analyze disputes. Let me fetch the current disputes from PayPal.';
        } else if (query.includes('balance')) {
          response = 'I\'ll check your current PayPal balances.';
        } else if (query.includes('invoice')) {
          response = 'I can help create or analyze invoices. What would you like to do?';
        } else if (query.includes('transaction')) {
          response = 'I can search transactions for you. What date range?';
        } else if (query.includes('product')) {
          response = 'I can list your PayPal catalog products.';
        } else if (query.includes('plan')) {
          response = 'I can list your billing plans.';
        } else {
          response = 'I\'m the PayOps data analyst. I can help you with disputes, invoices, balances, transactions, products, and plans. What would you like to explore?';
        }
      }

      return {
        stream: {
          [Symbol.asyncIterator]: async function* () {
            yield { type: 'text', content: response } as any;
          }
        },
        complete: Promise.resolve({
          id: 'paypal-analyst-' + Date.now(),
          createdAt: Date.now(),
          status: 'completed',
          output: [{ type: 'text', content: response }],
          usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 },
          model: 'paypal-data-analyst',
        } as any),
      };
    },
  };
}

export function AgStudioClient() {
  const [studioApi, setStudioApi] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [aiHarness, setAiHarness] = useState<AgAiHarnessSetup | undefined>(undefined);
  const [studioData, setStudioData] = useState<AgDataSourcesDefinition<AgRegistry> | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'payload' | 'ledger' | 'response'>('payload');

  // Fetch data and build studio data on client
  useEffect(() => {
    async function fetchData() {
      try {
        // Call API route to get AG Studio data
        const res = await fetch('/api/ag-studio/data');
        if (!res.ok) throw new Error('Failed to fetch AG Studio data');
        const studioData = await res.json();
        setStudioData(studioData as AgDataSourcesDefinition<AgRegistry>);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      }
    }
    fetchData();
  }, []);

  // Build AI harness when API is ready
  useEffect(() => {
    if (!studioApi) return;

    const buildHarness = () => {
      try {
        // Create the adapter
        const adapter = createPayPalLlmAdapter();

        // Use AgAiHarnessDefaults for AG's five agents on one model
        const defaults: AgAiHarnessDefaults = {
          adapter,
          primary: 'data',
          models: [
            { id: 'paypal-data-analyst', label: 'PayPal Data Analyst', efforts: [] },
          ],
          promptStarters: [
            { label: 'Show disputes', prompt: 'Show me current disputes' },
            { label: 'Check balances', prompt: 'What are my account balances?' },
            { label: 'Analyze invoices', prompt: 'Analyze overdue invoices' },
            { label: 'Create invoice', prompt: 'Create a new invoice for $5,000 to acme@example.com' },
            { label: 'List products', prompt: 'List my PayPal products' },
            { label: 'List plans', prompt: 'List my billing plans' },
          ],
        };

        const harness = createAiHarness(studioApi, defaults);
        setAiHarness(harness);
      } catch (error) {
        console.error('Failed to create AI harness:', error);
      }
    };

    buildHarness();
  }, [studioApi]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setInspectorOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        setInspectorOpen(false);
        return;
      }
      if (inspectorOpen) {
        if (e.key === '1') setInspectorTab('payload');
        if (e.key === '2') setInspectorTab('ledger');
        if (e.key === '3') setInspectorTab('response');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [inspectorOpen]);

  // Set up API reference when Studio is ready
  const handleApiReady = useCallback((event: any) => {
    const api = event.api;
    setStudioApi(api);
  }, []);

  const handleStudioReady = useCallback((event: any) => {
    setIsReady(true);
  }, []);

  const panelsConfig: AgPanelConfig = {
    edit: {
      left: ['data', 'filters'],
      right: ['ai'],
    },
  };

  return (
    <AgStudioProvider modules={[AgStudioAiModule]}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }} data-testid="ag-studio-container">
        {/* Header with Counterfactual Simulator */}
        <header className="bg-gray-900 text-white px-6 py-4 border-b border-gray-700" data-testid="ag-studio-header">
          <div className="max-w-full mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" data-testid="ag-studio-title">AG Studio v3.1 - PayOps Command Center</h1>
              <p className="text-gray-400 text-sm mt-1">Relational Analytics • AI Harness • PayPal Integration</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-green-600 text-white text-sm rounded" data-testid="studio-status">
                {isReady ? 'Studio Ready' : 'Initializing...'}
              </span>
              <span className="text-sm text-gray-400" data-testid="studio-data-count">
                {studioData ? studioData.sources.length : 0} sources • {studioData?.relationships?.length ?? 0} relationships
              </span>
            </div>
          </div>
        </header>

        {/* Counterfactual Simulator Panel */}
        <CounterfactualSimulator />

        {/* Studio */}
        <div className="flex-1 overflow-auto" style={{ minHeight: '400px', display: 'block' }} data-testid="ag-studio-root">
          <div style={{ height: '100%', minHeight: '400px', width: '100%', display: 'block' }}>
            <AgStudio
              data={studioData || { sources: [], relationships: [], expressions: [], calendars: [] }}
              mode="edit"
              ai={aiHarness}
              onApiReady={handleApiReady}
              onStudioReady={handleStudioReady}
              panels={panelsConfig}
              themeStyleContainer={typeof document !== 'undefined' ? document.body : undefined}
              style={{ height: '100%', minHeight: '400px', width: '100%', display: 'block' }}
            />
          </div>
        </div>

        {inspectorOpen && (
          <aside
            className="fixed right-0 top-0 h-full z-50 w-[380px] bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col inspector-drawer"
            data-testid="inspector-drawer"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="font-semibold text-white">Inspector Drawer</h3>
              <button onClick={() => setInspectorOpen(false)} className="p-2 text-gray-400 hover:text-white rounded hover:bg-gray-800">Close</button>
            </div>
            <div className="flex gap-2 p-3 border-b border-gray-700 text-sm">
              <button onClick={() => setInspectorTab('payload')} className={`px-2 py-1 rounded ${inspectorTab === 'payload' ? 'bg-cyan-700 text-white' : 'bg-gray-800 text-gray-300'}`}>API Payload 1/3</button>
              <button onClick={() => setInspectorTab('ledger')} className={`px-2 py-1 rounded ${inspectorTab === 'ledger' ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-300'}`}>Ledger Trace 2/3</button>
              <button onClick={() => setInspectorTab('response')} className={`px-2 py-1 rounded ${inspectorTab === 'response' ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-300'}`}>API Response 3/3</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-sm text-gray-300 space-y-3" data-testid="inspector-content">
              {inspectorTab === 'payload' && (
                <pre className="whitespace-pre-wrap text-xs bg-gray-950 p-3 rounded border border-gray-700" data-testid="inspector-payload">{JSON.stringify({ source: 'ag-studio', ready: isReady, sources: studioData?.sources?.length ?? 0, relationships: studioData?.relationships?.length ?? 0 }, null, 2)}</pre>
              )}
              {inspectorTab === 'ledger' && (
                <div className="space-y-2" data-testid="inspector-ledger">
                  <div className="font-mono text-white">Ledger Trace</div>
                  <div className="text-xs bg-gray-950 p-3 rounded border border-gray-700 space-y-1">
                    <div>Debit: Discount Expense</div>
                    <div>Credit: Accounts Receivable Reserve</div>
                    <div>FETCH_UNPAID_INVOICES → APPLY_RULE → EMIT_LEDGER_ENTRIES</div>
                  </div>
                </div>
              )}
              {inspectorTab === 'response' && (
                <pre className="whitespace-pre-wrap text-xs bg-gray-950 p-3 rounded border border-gray-700" data-testid="inspector-response">{JSON.stringify({ ok: true, studioReady: isReady, message: 'Inspector ready' }, null, 2)}</pre>
              )}
            </div>
            <div className="p-3 border-t border-gray-700 text-xs text-gray-500">Press Esc to close • 1/2/3 switch tabs • Cmd/Ctrl+I toggle</div>
          </aside>
        )}
      </div>
    </AgStudioProvider>
  );
}