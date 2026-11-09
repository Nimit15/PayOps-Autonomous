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
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header with Counterfactual Simulator */}
        <header className="bg-gray-900 text-white px-6 py-4 border-b border-gray-700">
          <div className="max-w-full mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">AG Studio v3.1 - PayOps Command Center</h1>
              <p className="text-gray-400 text-sm mt-1">Relational Analytics • AI Harness • PayPal Integration</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-green-600 text-white text-sm rounded">
                {isReady ? 'Studio Ready' : 'Initializing...'}
              </span>
              <span className="text-sm text-gray-400">
                {studioData ? studioData.sources.length : 0} sources • {studioData?.relationships?.length ?? 0} relationships
              </span>
            </div>
          </div>
        </header>

        {/* Counterfactual Simulator Panel */}
        <CounterfactualSimulator />

        {/* Studio */}
        <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <AgStudio
            data={studioData || { sources: [], relationships: [], expressions: [], calendars: [] }}
            mode="edit"
            ai={aiHarness}
            onApiReady={handleApiReady}
            onStudioReady={handleStudioReady}
            panels={panelsConfig}
            themeStyleContainer={typeof document !== 'undefined' ? document.body : undefined}
            style={{ height: '100%', width: '100%' }}
          />
        </div>
      </div>
    </AgStudioProvider>
  );
}