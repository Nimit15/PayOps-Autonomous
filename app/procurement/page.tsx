// Agentic Procurement Page - Channel3 Integration
// 100M+ products across 25,000+ retailers for autonomous procurement

'use client';

import { useState } from 'react';

interface ProcurementItem {
  query: string;
  quantity: number;
  maxPrice?: number;
  preferredBrands?: string[];
  preferredRetailers?: string[];
  requiredAttributes?: Record<string, string[]>;
  color?: string;
}

interface ProcurementResult {
  product: {
    id: string;
    title: string;
    description?: string;
    brand?: string;
    category?: string;
    images: Array<{ url: string; is_primary?: boolean }>;
    structured_attributes?: Record<string, string[]>;
  };
  offer: {
    id: string;
    domain: string;
    url: string;
    price: { amount: number; currency: string };
    availability: string;
    max_commission_rate?: number;
  };
  quantity: number;
  estimated_total: number;
}

interface SearchResponse {
  success: boolean;
  results?: ProcurementResult[];
  summary?: {
    total_items: number;
    estimated_subtotal: number;
  };
  error?: string;
}

const INITIAL_ITEMS: ProcurementItem[] = [
  { query: 'wireless noise-cancelling headphones', quantity: 10, maxPrice: 200, color: 'black', preferredRetailers: ['amazon.com', 'bestbuy.com'] },
  { query: 'ergonomic office chair', quantity: 5, maxPrice: 400, preferredBrands: ['Herman Miller', 'Steelcase'] },
  { query: '4K USB-C monitor 27 inch', quantity: 8, maxPrice: 350, preferredRetailers: ['amazon.com', 'newegg.com', 'bhphotovideo.com'] },
  { query: 'mechanical keyboard', quantity: 12, maxPrice: 150, preferredBrands: ['Keychron', 'Logitech', 'Razer'] },
];

export default function ProcurementPage() {
  const [items, setItems] = useState<ProcurementItem[]>(INITIAL_ITEMS);
  const [results, setResults] = useState<ProcurementResult[]>([]);
  const [summary, setSummary] = useState({ total_items: 0, estimated_subtotal: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'agentic' | 'default' | 'keyword'>('agentic');
  const [userId, setUserId] = useState('payops-user-001');

  const handleSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/procurement/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, user_id: userId, mode }),
      });

      const data: SearchResponse = await response.json();

      if (data.success) {
        setResults(data.results || []);
        setSummary(data.summary || { total_items: 0, estimated_subtotal: 0 });
      } else {
        setError(data.error || 'Search failed');
        setResults([]);
        setSummary({ total_items: 0, estimated_subtotal: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setResults([]);
      setSummary({ total_items: 0, estimated_subtotal: 0 });
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, field: keyof ProcurementItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { query: '', quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCreateOrder = async () => {
    if (results.length === 0) return;

    try {
      const checkoutItems = results.map(r => ({
        product_id: r.product.id,
        product_title: r.product.title,
        offer_id: r.offer.id,
        offer_domain: r.offer.domain,
        offer_url: r.offer.url,
        quantity: r.quantity,
        unit_price: r.offer.price,
        total_price: { amount: r.offer.price.amount * r.quantity, currency: r.offer.price.currency },
      }));

      const response = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: checkoutItems }),
      });

      const data = await response.json();

      if (data.success && data.order?.approve_link) {
        // Open PayPal checkout in new tab
        window.open(data.order.approve_link, '_blank');
      } else {
        alert(data.error || 'Failed to create order');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create order');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agentic Procurement</h1>
              <p className="text-gray-600 text-sm mt-1">
                100M+ products • 25,000+ retailers • Channel3 universal catalog
              </p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={mode}
                onChange={e => setMode(e.target.value as any)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm"
              >
                <option value="agentic">Agentic (AI-powered)</option>
                <option value="default">Default (Semantic)</option>
                <option value="keyword">Keyword (Fast)</option>
              </select>
              <input
                type="text"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="User ID"
                className="px-3 py-1.5 border border-gray-300 rounded text-sm w-48"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? 'Searching...' : 'Find Products'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Procurement Items Input */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Procurement List</h2>
            <button
              onClick={addItem}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="bg-white rounded-lg shadow p-4 border border-gray-200">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Query</label>
                    <input
                      type="text"
                      value={item.query}
                      onChange={e => updateItem(index, 'query', e.target.value)}
                      placeholder="e.g., wireless noise-cancelling headphones"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="px-3 py-2 text-red-600 hover:text-red-800 disabled:opacity-50"
                    title="Remove item"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Price/Unit</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.maxPrice || ''}
                      onChange={e => updateItem(index, 'maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Brands</label>
                    <input
                      type="text"
                      value={item.preferredBrands?.join(', ') || ''}
                      onChange={e => updateItem(index, 'preferredBrands', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="Herman Miller, Steelcase"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Retailers</label>
                    <input
                      type="text"
                      value={item.preferredRetailers?.join(', ') || ''}
                      onChange={e => updateItem(index, 'preferredRetailers', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="amazon.com, bestbuy.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <input
                      type="text"
                      value={item.color || ''}
                      onChange={e => updateItem(index, 'color', e.target.value || undefined)}
                      placeholder="black, navy, silver"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Required Attributes (JSON)</label>
                    <input
                      type="text"
                      value={item.requiredAttributes ? JSON.stringify(item.requiredAttributes) : ''}
                      onChange={e => {
                        try {
                          updateItem(index, 'requiredAttributes', e.target.value ? JSON.parse(e.target.value) : undefined);
                        } catch {
                          // Invalid JSON, ignore
                        }
                      }}
                      placeholder='{"material": ["Leather"], "wireless": ["true"]}'
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Results */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Search Results
              {summary.total_items > 0 && (
                <span className="ml-3 text-sm font-normal text-gray-500">
                  {summary.total_items} items • Est. ${summary.estimated_subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              )}
            </h2>
            {results.length > 0 && (
              <button
                onClick={handleCreateOrder}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition font-medium"
              >
                Create PayPal Order → Checkout
              </button>
            )}
          </div>

          {loading && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <div className="animate-pulse flex items-center justify-center gap-2">
                <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-gray-600">Searching Channel3 catalog...</span>
              </div>
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <p>No results yet. Add items above and click "Find Products".</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="bg-white rounded-lg shadow p-4 border border-gray-200">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Product Image */}
                    <div className="lg:w-32 flex-shrink-0">
                      {result.product.images?.[0]?.url && (
                        <img
                          src={result.product.images[0].url}
                          alt={result.product.title}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">{result.product.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{result.product.description?.slice(0, 150)}...</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {result.product.brand && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                                {result.product.brand}
                              </span>
                            )}
                            {result.product.category && (
                              <span className="px-2 py-0.5 bg-gray-50 text-gray-700 text-xs rounded">
                                {result.product.category}
                              </span>
                            )}
                            {result.product.structured_attributes && (
                              <>
                                {Object.entries(result.product.structured_attributes).map(([key, values]) => (
                                  <span key={key} className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded">
                                    {key}: {values.join(', ')}
                                  </span>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right lg:w-48 flex-shrink-0">
                          <div className="text-2xl font-bold text-gray-900">
                            ${result.offer.price.amount.toFixed(2)} {result.offer.price.currency}
                          </div>
                          <div className="text-sm text-gray-500">per unit</div>
                          <div className="mt-1 text-lg font-semibold text-gray-900">
                            × {result.quantity} = ${result.estimated_total.toFixed(2)}
                          </div>
                          <div className="mt-2">
                            <a
                              href={result.offer.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              {result.offer.domain}
                            </a>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            Availability: {result.offer.availability}
                            {result.offer.max_commission_rate && ` • Commission: ${result.offer.max_commission_rate}%`}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Order Summary</h3>
                    <p className="text-sm text-gray-500">
                      {summary.total_items} line items • Ready for PayPal Checkout
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">
                      ${summary.estimated_subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-500">Estimated Subtotal</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}