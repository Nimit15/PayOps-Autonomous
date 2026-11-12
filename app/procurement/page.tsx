'use client';

import { useState, useEffect, useCallback } from 'react';
import Script from 'next/script';

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
    brand?: { id: string; name: string };
    category?: { id: string; name: string; slug: string };
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

// Preset procurement scenarios
const PRESET_SCENARIOS = [
  {
    id: 'office-setup',
    name: 'Office Setup',
    description: 'Complete office furniture & equipment',
    icon: '🏢',
    items: [
      { query: 'ergonomic office chair', quantity: 5, maxPrice: 400, preferredBrands: ['Herman Miller', 'Steelcase'] },
      { query: '4K USB-C monitor 27 inch', quantity: 8, maxPrice: 350, preferredRetailers: ['amazon.com', 'newegg.com', 'bhphotovideo.com'] },
      { query: 'standing desk converter', quantity: 5, maxPrice: 300, preferredBrands: ['Vari', 'Uplift'] },
      { query: 'mechanical keyboard', quantity: 12, maxPrice: 150, preferredBrands: ['Keychron', 'Logitech', 'Razer'] },
    ],
  },
  {
    id: 'remote-work',
    name: 'Remote Work Kit',
    description: 'Essential gear for distributed teams',
    icon: '🏠',
    items: [
      { query: 'wireless noise-cancelling headphones', quantity: 10, maxPrice: 200, color: 'black', preferredRetailers: ['amazon.com', 'bestbuy.com'] },
      { query: '1080p webcam with privacy cover', quantity: 10, maxPrice: 100, preferredBrands: ['Logitech', 'Razer', 'Elgato'] },
      { query: 'USB-C hub 7-in-1', quantity: 12, maxPrice: 80, preferredRetailers: ['amazon.com', 'anker.com'] },
      { query: 'portable laptop stand', quantity: 10, maxPrice: 40, preferredBrands: ['Rain Design', 'Twelve South'] },
    ],
  },
  {
    id: 'dev-workstation',
    name: 'Dev Workstation',
    description: 'High-performance developer equipment',
    icon: '💻',
    items: [
      { query: 'mechanical keyboard RGB', quantity: 8, maxPrice: 200, preferredBrands: ['Keychron', 'Ducky', 'Varmilo'] },
      { query: 'vertical ergonomic mouse', quantity: 8, maxPrice: 100, preferredBrands: ['Logitech', 'Evoluent', 'Anker'] },
      { query: '34 inch ultrawide monitor', quantity: 4, maxPrice: 600, preferredRetailers: ['amazon.com', 'newegg.com', 'lg.com'] },
      { query: 'programmable macropad', quantity: 8, maxPrice: 60, preferredBrands: ['Drop', 'KBDfans', 'QMK'] },
    ],
  },
  {
    id: 'audio-visual',
    name: 'A/V Production',
    description: 'Content creation & streaming gear',
    icon: '🎬',
    items: [
      { query: 'USB condenser microphone', quantity: 4, maxPrice: 200, preferredBrands: ['Shure', 'Rode', 'Blue'] },
      { query: 'ring light 18 inch', quantity: 4, maxPrice: 80, preferredRetailers: ['amazon.com', 'bhphotovideo.com'] },
      { query: 'green screen backdrop', quantity: 2, maxPrice: 60, preferredRetailers: ['amazon.com', 'elgato.com'] },
      { query: 'stream deck 15 key', quantity: 4, maxPrice: 150, preferredBrands: ['Elgato'] },
    ],
  },
];

// Demo product data matching Channel3 Product type
const DEMO_PRODUCTS: ProcurementResult[] = [
  {
    product: {
      id: 'demo-prod-1',
      title: 'Sony WH-1000XM5 Wireless Noise-Cancelling Headphones',
      description: 'Industry-leading noise cancellation with Auto NC Optimizer. 30-hour battery life. Multipoint connection.',
      brand: { id: 'sony', name: 'Sony' },
      category: { id: 'electronics-audio-headphones', name: 'Headphones', slug: 'headphones' },
      images: [
        { url: 'https://m.media-amazon.com/images/I/617V5mL4gSL._AC_SX679_.jpg', is_primary: true },
        { url: 'https://m.media-amazon.com/images/I/512G+pAe+xL._AC_SX679_.jpg', is_primary: false }
      ],
      structured_attributes: {
        color: ['Black', 'Silver'],
        connectivity: ['Bluetooth 5.2', 'Wired'],
        noise_cancellation: ['Active'],
        battery_life: ['30 hours'],
      },
    },
    offer: {
      id: 'offer-amazon-headphones',
      domain: 'amazon.com',
      url: 'https://amazon.com/dp/B09XS7JWHH',
      price: { amount: 348.00, currency: 'USD' },
      availability: 'in_stock',
      max_commission_rate: 4.5,
    },
    quantity: 10,
    estimated_total: 3480.00,
  },
  {
    product: {
      id: 'demo-prod-2',
      title: 'Herman Miller Aeron Ergonomic Office Chair',
      description: 'The iconic Aeron chair with PostureFit SL, 8Z Pellicle suspension, and forward tilt. 12-year warranty.',
      brand: { id: 'herman-miller', name: 'Herman Miller' },
      category: { id: 'furniture-office-chairs', name: 'Office Chairs', slug: 'office-chairs' },
      images: [
        { url: 'https://m.media-amazon.com/images/I/71X8e8V5XHL._AC_SX679_.jpg', is_primary: true }
      ],
      structured_attributes: {
        color: ['Graphite', 'Mineral', 'Carbon'],
        size: ['A', 'B', 'C'],
        material: ['Pellicle Mesh'],
        warranty: ['12 years'],
      },
    },
    offer: {
      id: 'offer-amazon-chair',
      domain: 'amazon.com',
      url: 'https://amazon.com/dp/B000NQUP2M',
      price: { amount: 1195.00, currency: 'USD' },
      availability: 'in_stock',
      max_commission_rate: 2.0,
    },
    quantity: 5,
    estimated_total: 5975.00,
  },
  {
    product: {
      id: 'demo-prod-3',
      title: 'LG 27GP850-B 27" UltraGear QHD 180Hz Gaming Monitor',
      description: '27" Nano IPS 1ms (GtG) 180Hz QHD (2560x1440) HDR 400. NVIDIA G-SYNC Compatible.',
      brand: { id: 'lg', name: 'LG' },
      category: { id: 'electronics-monitors', name: 'Monitors', slug: 'monitors' },
      images: [
        { url: 'https://m.media-amazon.com/images/I/81d5F6bY7vL._AC_SX679_.jpg', is_primary: true }
      ],
      structured_attributes: {
        resolution: ['2560x1440 (QHD)'],
        refresh_rate: ['180Hz'],
        panel_type: ['Nano IPS'],
        hdr: ['HDR 400'],
        connectivity: ['HDMI 2.0', 'DisplayPort 1.4', 'USB 3.0'],
      },
    },
    offer: {
      id: 'offer-newegg-monitor',
      domain: 'newegg.com',
      url: 'https://newegg.com/p/13K-00D1-00002',
      price: { amount: 349.99, currency: 'USD' },
      availability: 'in_stock',
      max_commission_rate: 2.5,
    },
    quantity: 8,
    estimated_total: 2799.92,
  },
  {
    product: {
      id: 'demo-prod-4',
      title: 'Keychron K2 Version 2 Wireless Mechanical Keyboard',
      description: '75% layout, hot-swappable, RGB backlight, Mac/Windows compatible. Gateron G Pro switches.',
      brand: { id: 'keychron', name: 'Keychron' },
      category: { id: 'electronics-keyboards', name: 'Keyboards', slug: 'keyboards' },
      images: [
        { url: 'https://m.media-amazon.com/images/I/61OOlv5VGyL._AC_SX679_.jpg', is_primary: true }
      ],
      structured_attributes: {
        layout: ['75%'],
        switches: ['Gateron G Pro Red', 'Gateron G Pro Blue', 'Gateron G Pro Brown'],
        backlight: ['RGB'],
        connectivity: ['Bluetooth 5.1', 'USB-C'],
        compatibility: ['Mac', 'Windows', 'Linux'],
      },
    },
    offer: {
      id: 'offer-amazon-keyboard',
      domain: 'amazon.com',
      url: 'https://amazon.com/dp/B08PNT3SBF',
      price: { amount: 89.99, currency: 'USD' },
      availability: 'in_stock',
      max_commission_rate: 3.5,
    },
    quantity: 12,
    estimated_total: 1079.88,
  },
];

export default function ProcurementPage() {
  const [items, setItems] = useState<ProcurementItem[]>([]);
  const [results, setResults] = useState<ProcurementResult[]>(DEMO_PRODUCTS);
  const [summary, setSummary] = useState({
    total_items: DEMO_PRODUCTS.length,
    estimated_subtotal: DEMO_PRODUCTS.reduce((sum, r) => sum + r.estimated_total, 0),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'agentic' | 'default' | 'keyword'>('agentic');
  const [userId, setUserId] = useState('payops-user-001');
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [paypalLoaded, setPaypalLoaded] = useState(false);

  // Load PayPal JS SDK
  useEffect(() => {
    const scriptId = 'paypal-sdk';
    if (document.getElementById(scriptId)) {
      setPaypalLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'demo'}&components=buttons,marks&currency=USD&intent=capture&vault=false`;
    script.async = true;
    script.onload = () => setPaypalLoaded(true);
    script.onerror = () => console.warn('PayPal SDK failed to load');
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, []);

  // Apply preset scenario
  const handlePresetClick = useCallback((preset: typeof PRESET_SCENARIOS[0]) => {
    setItems(preset.items);
    setActivePreset(preset.id);
    setError(null);
    // Auto-search after applying preset
    handleSearch();
  }, []);

  const handleSearch = useCallback(async () => {
    if (items.length === 0) return;

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
  }, [items, userId, mode]);

  const updateItem = useCallback((index: number, field: keyof ProcurementItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }, [items]);

  const addItem = useCallback(() => {
    setItems([...items, { query: '', quantity: 1 }]);
    setActivePreset(null);
  }, [items]);

  const removeItem = useCallback((index: number) => {
    setItems(items.filter((_, i) => i !== index));
  }, [items]);

  const handleCreateOrder = useCallback(async () => {
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
        window.open(data.order.approve_link, '_blank');
      } else {
        alert(data.error || 'Failed to create order');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create order');
    }
  }, [results]);

  // Calculate totals
  const subtotal = results.reduce((sum, r) => sum + r.estimated_total, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  return (
    <div className="min-h-screen bg-[#090A0F] text-white">
      {/* PayPal SDK Script */}
      <Script
        id="paypal-sdk"
        src={`https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'demo'}&components=buttons,marks&currency=USD&intent=capture&vault=false`}
        strategy="lazyOnload"
        onLoad={() => setPaypalLoaded(true)}
        onError={() => console.warn('PayPal SDK failed to load')}
      />

      {/* Header */}
      <header className="bg-[#11131A]/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Agentic Procurement</h1>
              <p className="text-gray-400 text-sm mt-1">
                100M+ products • 25,000+ retailers • Channel3 universal catalog
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={mode}
                onChange={e => setMode(e.target.value as any)}
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
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
                className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white w-48 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300" role="alert">
            {error}
          </div>
        )}

        {/* Preset Scenarios */}
        <section className="mb-8" aria-labelledby="presets-heading">
          <h2 id="presets-heading" className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Quick Start Presets
          </h2>
          <p className="text-gray-500 text-sm mb-4">Click a preset to load a complete procurement list and auto-search</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRESET_SCENARIOS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset)}
                className={`relative p-5 rounded-xl border-2 transition-all duration-200 text-left group ${
                  activePreset === preset.id
                    ? 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
                }`}
                aria-pressed={activePreset === preset.id}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl" aria-hidden="true">{preset.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors">
                      {preset.name}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1 line-clamp-1">{preset.description}</p>
                    <p className="text-gray-500 text-xs mt-2">{preset.items.length} items configured</p>
                  </div>
                  {activePreset === preset.id && (
                    <svg className="w-5 h-5 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Procurement Items Input */}
        <section className="mb-8" aria-labelledby="items-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="items-heading" className="text-lg font-semibold text-white">Procurement List</h2>
            <button
              onClick={addItem}
              className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 border border-gray-700 rounded hover:bg-gray-700 hover:text-white transition"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Product Query</label>
                    <input
                      type="text"
                      value={item.query}
                      onChange={e => updateItem(index, 'query', e.target.value)}
                      placeholder="e.g., wireless noise-cancelling headphones"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-gray-500"
                    />
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="px-3 py-2 text-red-400 hover:text-red-300 disabled:opacity-50"
                    title="Remove item"
                    aria-label="Remove item"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Max Price/Unit</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.maxPrice || ''}
                      onChange={e => updateItem(index, 'maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Preferred Brands</label>
                    <input
                      type="text"
                      value={item.preferredBrands?.join(', ') || ''}
                      onChange={e => updateItem(index, 'preferredBrands', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="Herman Miller, Steelcase"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Preferred Retailers</label>
                    <input
                      type="text"
                      value={item.preferredRetailers?.join(', ') || ''}
                      onChange={e => updateItem(index, 'preferredRetailers', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      placeholder="amazon.com, bestbuy.com"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-gray-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Color</label>
                    <input
                      type="text"
                      value={item.color || ''}
                      onChange={e => updateItem(index, 'color', e.target.value || undefined)}
                      placeholder="black, navy, silver"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Required Attributes (JSON)</label>
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
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-gray-500 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
                <p className="text-gray-400">No items configured. Click a preset above or add items manually.</p>
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-600/50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {loading ? 'Searching...' : 'Find Products'}
              </button>
            </div>
          )}
        </section>

        {/* Results with PayPal Checkout */}
        <section aria-labelledby="results-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="results-heading" className="text-lg font-semibold text-white">
              Search Results
              {summary.total_items > 0 && (
                <span className="ml-3 text-sm font-normal text-gray-400">
                  {summary.total_items} items • Est. ${summary.estimated_subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              )}
            </h2>
            {results.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCreateOrder}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a2 2 0 00-2-2H5a2 2 0 00-2 2v4m2-2h12m-4 4h4m-4 4h4m-4-8v8M9 12l-2 2 2 2M15 12l-2 2 2 2" />
                  </svg>
                  Create PayPal Order
                </button>
                {/* PayPal Pay Later Button */}
                {paypalLoaded && window.paypal && (
                  <div id="paypal-pay-later-button" className="h-12"></div>
                )}
              </div>
            )}
          </div>

          {loading && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
              <div className="animate-pulse flex items-center justify-center gap-3">
                <svg className="animate-spin h-8 w-8 text-cyan-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-gray-300">Searching Channel3 catalog...</span>
              </div>
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center text-gray-400">
              <p>No results yet. Add items above and click "Find Products".</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
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
                          <h3 className="font-semibold text-white">{result.product.title}</h3>
                          <p className="text-sm text-gray-400 mt-1">{result.product.description?.slice(0, 150)}...</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {result.product.brand && (
                              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs rounded border border-cyan-500/30">
                                {result.product.brand.name}
                              </span>
                            )}
                            {result.product.category && (
                              <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded border border-gray-600">
                                {result.product.category.name}
                              </span>
                            )}
                            {result.product.structured_attributes && (
                              <>
                                {Object.entries(result.product.structured_attributes).flatMap(([key, values]) =>
                                  values.map((v, i) => (
                                    <span key={`${key}-${i}`} className="px-2 py-0.5 bg-green-500/20 text-green-300 text-xs rounded border border-green-500/30">
                                      {key}: {v}
                                    </span>
                                  ))
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right lg:w-48 flex-shrink-0">
                          <div className="text-2xl font-bold text-white">
                            ${result.offer.price.amount.toFixed(2)} {result.offer.price.currency}
                          </div>
                          <div className="text-sm text-gray-400">per unit</div>
                          <div className="mt-1 text-lg font-semibold text-white">
                            × {result.quantity} = ${result.estimated_total.toFixed(2)}
                          </div>
                          <div className="mt-2">
                            <a
                              href={result.offer.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-700 text-gray-300 border border-gray-600 rounded hover:bg-gray-600 hover:text-white transition"
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

              {/* Order Summary with PayPal Buttons */}
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Order Summary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Line Items</div>
                    <div className="text-2xl font-bold text-white tabular-nums font-mono">{summary.total_items}</div>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Subtotal</div>
                    <div className="text-2xl font-bold text-white tabular-nums font-mono">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Est. Tax (10%)</div>
                    <div className="text-2xl font-bold text-amber-400 tabular-nums font-mono">${tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Total</div>
                    <div className="text-2xl font-bold text-green-400 tabular-nums font-mono">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>

                {/* PayPal Smart Buttons Container */}
                <div className="space-y-3">
                  <div className="pt-3 border-t border-gray-700">
                    <p className="text-gray-400 text-sm mb-3">PayPal Checkout Options</p>
                    <div id="paypal-button-container" className="min-h-[50px]"></div>
                  </div>
                  <div className="pt-3 border-t border-gray-700">
                    <p className="text-gray-400 text-sm mb-3">Pay Later Options</p>
                    <div id="paypal-pay-later-container" className="min-h-[50px]"></div>
                  </div>
                </div>

                {/* Fallback button if PayPal SDK not loaded */}
                {!paypalLoaded && (
                  <button
                    onClick={handleCreateOrder}
                    className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a2 2 0 00-2-2H5a2 2 0 00-2 2v4m2-2h12m-4 4h4m-4 4h4m-4-8v8M9 12l-2 2 2 2M15 12l-2 2 2 2" />
                    </svg>
                    Create PayPal Order → Checkout
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* PayPal SDK Initialization Effect */}
      <PayPalButtonsInitializer
        paypalLoaded={paypalLoaded}
        results={results}
        onOrderCreated={(approveLink) => window.open(approveLink, '_blank')}
      />
    </div>
  );
}

// Separate component for PayPal button initialization to avoid re-render issues
function PayPalButtonsInitializer({ paypalLoaded, results, onOrderCreated }: {
  paypalLoaded: boolean;
  results: ProcurementResult[];
  onOrderCreated: (approveLink: string) => void;
}) {
  useEffect(() => {
    if (!paypalLoaded || !window.paypal || results.length === 0) return;

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

    const subtotal = results.reduce((sum, r) => sum + r.estimated_total, 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    // Render PayPal Smart Buttons
    window.paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'paypal',
        height: 48,
      },
      createOrder: async () => {
        const response = await fetch('/api/checkout/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: checkoutItems }),
        });
        const data = await response.json();
        if (!data.success || !data.order?.id) {
          throw new Error(data.error || 'Failed to create order');
        }
        return data.order.id;
      },
      onApprove: async (data: { orderID: string }) => {
        // Order approved - could capture here or redirect
        console.log('Order approved:', data.orderID);
        // Redirect to PayPal for completion
        const orderResponse = await fetch('/api/checkout/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: checkoutItems }),
        });
        const orderData = await orderResponse.json();
        if (orderData.success && orderData.order?.approve_link) {
          onOrderCreated(orderData.order.approve_link);
        }
      },
      onError: (err: Error) => {
        console.error('PayPal button error:', err);
      },
    }).render('#paypal-button-container');

    // Render PayPal Pay Later Buttons
    window.paypal.PayLaterButtons({
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'paylater',
        height: 48,
      },
      createOrder: async () => {
        const response = await fetch('/api/checkout/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: checkoutItems }),
        });
        const data = await response.json();
        if (!data.success || !data.order?.id) {
          throw new Error(data.error || 'Failed to create order');
        }
        return data.order.id;
      },
      onApprove: async (data: { orderID: string }) => {
        const orderResponse = await fetch('/api/checkout/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: checkoutItems }),
        });
        const orderData = await orderResponse.json();
        if (orderData.success && orderData.order?.approve_link) {
          onOrderCreated(orderData.order.approve_link);
        }
      },
      onError: (err: Error) => {
        console.error('PayPal Pay Later button error:', err);
      },
    }).render('#paypal-pay-later-container');

    // Cleanup function
    return () => {
      // PayPal buttons don't have explicit destroy, but containers will be remounted
    };
  }, [paypalLoaded, results, onOrderCreated]);

  return null;
}

// Extend Window interface for PayPal SDK
declare global {
  interface Window {
    paypal: any;
  }
}