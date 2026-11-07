'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface StatusPillProps {
  label: string;
  status: 'connected' | 'warning' | 'error' | 'neutral';
  onClick?: () => void;
  className?: string;
}

function StatusPill({ label, status, onClick, className }: StatusPillProps) {
  const statusClass = `status-pill status-pill--${status}`;
  return (
    <button
      type="button"
      className={`${statusClass} ${className || ''}`}
      onClick={onClick}
      aria-pressed={status === 'connected'}
    >
      {label}
    </button>
  );
}

interface WebhookAuditEntry {
  id: string;
  timestamp: Date;
  eventType: string;
  status: 'request' | 'response' | 'error';
  payload: unknown;
}

function WebhookAuditDrawer({ isOpen, onClose, entries }: { isOpen: boolean; onClose: () => void; entries: WebhookAuditEntry[] }) {
  if (!isOpen) return null;

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Webhook Audit Log">
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="drawer-content">
        <div className="p-4 border-b border-[var(--border-hairline)] flex items-center justify-between">
          <h2 className="text-lg font-semibold">Webhook Audit Log</h2>
          <button
            type="button"
            className="btn-ghost p-2"
            onClick={onClose}
            aria-label="Close audit log"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {entries.length === 0 ? (
            <p className="text-[var(--text-muted)] text-center py-8">No webhook events captured yet</p>
          ) : (
            [...entries].reverse().map((entry) => (
              <div
                key={entry.id}
                className={`audit-entry ${
                  entry.status === 'request' ? 'audit-entry-request' :
                  entry.status === 'response' ? 'audit-entry-response' :
                  'audit-entry-error'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-neutral">{entry.eventType}</span>
                  <span className="text-[var(--text-muted)] text-xs">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                  <span
                    className={`badge ${
                      entry.status === 'request' ? 'badge-neutral' :
                      entry.status === 'response' ? 'badge-autonomous' :
                      'badge-blocked'
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(entry.payload, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface SeedSandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSeed: () => void;
  isSeeding: boolean;
}

function SeedSandboxModal({ isOpen, onClose, onSeed, isSeeding }: SeedSandboxModalProps) {
  if (!isOpen) return null;

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Seed PayPal Sandbox">
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="drawer-content max-w-md">
        <div className="p-4 border-b border-[var(--border-hairline)] flex items-center justify-between">
          <h2 className="text-lg font-semibold">Seed/Reset PayPal Sandbox</h2>
          <button
            type="button"
            className="btn-ghost p-2"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-[var(--text-secondary)]">
            This will create deterministic sandbox data including products, plans, invoices, orders, subscriptions, disputes, and shipments. Existing sandbox data will be preserved (idempotent operations).
          </p>
          <button
            type="button"
            className="btn-primary w-full"
            onClick={onSeed}
            disabled={isSeeding}
          >
            {isSeeding ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Seeding...
              </>
            ) : (
              'Seed Sandbox Data'
            )}
          </button>
          <p className="text-xs text-[var(--text-muted)] text-center">
            Runs <code className="font-mono">POST /api/sandbox/seed</code>
          </p>
        </div>
      </div>
    </div>
  );
}

interface SimulateWebhookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (eventType: string) => void;
  isSimulating: boolean;
}

const WEBHOOK_EVENTS = [
  { id: 'CHECKOUT.ORDER.APPROVED', label: 'Order Approved', description: 'Buyer approved the order' },
  { id: 'CHECKOUT.ORDER.COMPLETED', label: 'Order Completed', description: 'Payment captured successfully' },
  { id: 'INVOICING.INVOICE.SENT', label: 'Invoice Sent', description: 'Invoice sent to recipient' },
  { id: 'INVOICING.INVOICE.PAID', label: 'Invoice Paid', description: 'Invoice marked as paid' },
  { id: 'BILLING.SUBSCRIPTION.CREATED', label: 'Subscription Created', description: 'New subscription activated' },
  { id: 'BILLING.SUBSCRIPTION.CANCELLED', label: 'Subscription Cancelled', description: 'Subscription cancelled' },
  { id: 'CUSTOMER.DISPUTE.CREATED', label: 'Dispute Created', description: 'Buyer opened a dispute' },
  { id: 'CUSTOMER.DISPUTE.RESOLVED', label: 'Dispute Resolved', description: 'Dispute resolved in favor of seller' },
  { id: 'SHIPPING.TRACKER.CREATED', label: 'Shipment Created', description: 'Tracking number added' },
  { id: 'SHIPPING.TRACKER.DELIVERED', label: 'Shipment Delivered', description: 'Package delivered' },
  { id: 'PAYMENT.CAPTURE.COMPLETED', label: 'Payment Captured', description: 'Authorization captured' },
  { id: 'PAYMENT.CAPTURE.REFUNDED', label: 'Payment Refunded', description: 'Refund processed' },
];

function SimulateWebhookModal({ isOpen, onClose, onSimulate, isSimulating }: SimulateWebhookModalProps) {
  if (!isOpen) return null;

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Simulate Live Webhook">
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="drawer-content max-w-md">
        <div className="p-4 border-b border-[var(--border-hairline)] flex items-center justify-between">
          <h2 className="text-lg font-semibold">Simulate Live Webhook</h2>
          <button
            type="button"
            className="btn-ghost p-2"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          <p className="text-[var(--text-secondary)] text-sm mb-2">
            Select an event type to simulate. Each simulation creates a signed webhook event broadcast via SSE.
          </p>
          {WEBHOOK_EVENTS.map((event) => (
            <button
              key={event.id}
              type="button"
              className="w-full text-left p-3 rounded-lg border border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] transition-all duration-150 flex items-start gap-3"
              onClick={() => onSimulate(event.id)}
              disabled={isSimulating}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{event.label}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{event.description}</div>
              </div>
              <span className="badge badge-neutral text-xs shrink-0 mt-0.5">{event.id}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface BuyerCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: { email: string; password: string; clientId: string };
}

function BuyerCredentialsModal({ isOpen, onClose, credentials }: BuyerCredentialsModalProps) {
  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast notification here
  };

  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Sandbox Buyer Credentials">
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="drawer-content max-w-md">
        <div className="p-4 border-b border-[var(--border-hairline)] flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sandbox Buyer Credentials</h2>
          <button
            type="button"
            className="btn-ghost p-2"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Email</label>
            <div className="flex gap-2">
              <code className="font-mono text-sm flex-1 bg-[var(--bg-elevated)] px-3 py-2 rounded-lg">{credentials.email}</code>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => copyToClipboard(credentials.email, 'email')}
              >
                Copy
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Password</label>
            <div className="flex gap-2">
              <code className="font-mono text-sm flex-1 bg-[var(--bg-elevated)] px-3 py-2 rounded-lg">{credentials.password}</code>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => copyToClipboard(credentials.password, 'password')}
              >
                Copy
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Client ID</label>
            <div className="flex gap-2">
              <code className="font-mono text-sm flex-1 bg-[var(--bg-elevated)] px-3 py-2 rounded-lg">{credentials.clientId}</code>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => copyToClipboard(credentials.clientId, 'clientId')}
              >
                Copy
              </button>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] text-center pt-2 border-t border-[var(--border-hairline)]">
            Use these credentials at <a href="https://www.sandbox.paypal.com" target="_blank" rel="noopener noreferrer" className="text-[var(--paypal-blue)] hover:underline">sandbox.paypal.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<'procurement' | 'invoicing' | 'ag-studio' | 'gantt'>('procurement');
  const [status, setStatus] = useState<{
    oauth: 'connected' | 'warning' | 'error' | 'neutral';
    ledger: 'connected' | 'warning' | 'error' | 'neutral';
    sse: 'connected' | 'warning' | 'error' | 'neutral';
  }>({
    oauth: 'neutral',
    ledger: 'neutral',
    sse: 'neutral',
  });
  const [webhookEntries, setWebhookEntries] = useState<WebhookAuditEntry[]>([]);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isSeedModalOpen, setIsSeedModalOpen] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastSeedResult, setLastSeedResult] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Initialize SSE connection
  useEffect(() => {
    const es = new EventSource('/api/webhooks/stream');
    eventSourceRef.current = es;

    es.onopen = () => {
      setStatus(prev => ({ ...prev, sse: 'connected' }));
    };

    es.onerror = () => {
      setStatus(prev => ({ ...prev, sse: 'error' }));
    };

    es.addEventListener('webhook', (event) => {
      try {
        const data = JSON.parse(event.data);
        const entry: WebhookAuditEntry = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          eventType: data.event_type || 'UNKNOWN',
          status: 'request',
          payload: data.resource || data,
        };
        setWebhookEntries(prev => [...prev.slice(-99), entry]);
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener('connected', () => {
      setStatus(prev => ({ ...prev, sse: 'connected' }));
    });

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, []);

  // Check OAuth token status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
          const data = await res.json();
          setStatus(prev => ({ ...prev, oauth: data.cached ? 'connected' : 'warning' }));
        } else {
          setStatus(prev => ({ ...prev, oauth: 'error' }));
        }
      } catch {
        setStatus(prev => ({ ...prev, oauth: 'error' }));
      }
    };
    checkAuth();
    const interval = setInterval(checkAuth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check ledger integrity
  useEffect(() => {
    const checkLedger = async () => {
      try {
        const res = await fetch('/api/ledger/verify');
        if (res.ok) {
          const data = await res.json();
          setStatus(prev => ({ ...prev, ledger: data.valid ? 'connected' : 'error' }));
        } else {
          setStatus(prev => ({ ...prev, ledger: 'error' }));
        }
      } catch {
        setStatus(prev => ({ ...prev, ledger: 'error' }));
      }
    };
    checkLedger();
    const interval = setInterval(checkLedger, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSeedSandbox = useCallback(async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/sandbox/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setLastSeedResult(`✓ Seeded: ${data.summary || 'Complete'}`);
      } else {
        setLastSeedResult(`✗ Failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setLastSeedResult(`✗ Error: ${error instanceof Error ? error.message : 'Network error'}`);
    } finally {
      setIsSeeding(false);
    }
  }, []);

  const handleSimulateWebhook = useCallback(async (eventType: string) => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/webhooks/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Simulation failed');

      // Add to audit log
      const entry: WebhookAuditEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        eventType,
        status: 'response',
        payload: data,
      };
      setWebhookEntries(prev => [...prev.slice(-99), entry]);
    } catch (error) {
      const entry: WebhookAuditEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        eventType,
        status: 'error',
        payload: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
      setWebhookEntries(prev => [...prev.slice(-99), entry]);
    } finally {
      setIsSimulating(false);
    }
  }, []);

  const tabs = [
    { id: 'procurement', label: 'Procurement', href: '/procurement' },
    { id: 'invoicing', label: 'Invoicing', href: '/invoicing' },
    { id: 'ag-studio', label: 'AG Studio', href: '/ag-studio' },
    { id: 'gantt', label: 'Gantt', href: '/gantt' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] flex flex-col">
      {/* Top Global Operations Bar */}
      <header className="border-b border-[var(--border-hairline)] bg-[var(--bg-card)] sticky top-0 z-40">
        <div className="max-w-full mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--paypal-blue)] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </div>
              <span className="font-semibold text-lg">PayOps Autonomous</span>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-2 shrink-0">
              <StatusPill
                label={`OAuth2: ${status.oauth === 'connected' ? 'Token Cached' : status.oauth === 'warning' ? 'Refreshing...' : 'Error'}`}
                status={status.oauth}
              />
              <StatusPill
                label={`Ledger: ${status.ledger === 'connected' ? 'Balanced' : 'Error'}`}
                status={status.ledger}
              />
              <StatusPill
                label={`SSE: ${status.sse === 'connected' ? 'Stream Connected' : status.sse === 'warning' ? 'Connecting...' : 'Disconnected'}`}
                status={status.sse}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsSeedModalOpen(true)}
                disabled={isSeeding}
              >
                Seed Sandbox
              </button>
              <div className="relative">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsSimulateModalOpen(true)}
                  disabled={isSimulating}
                >
                  Simulate Webhook
                </button>
                <button
                  type="button"
                  className="btn-ghost p-2 ml-1"
                  onClick={() => setIsAuditOpen(true)}
                  aria-label="Open webhook audit log"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setIsCredentialsModalOpen(true)}
              >
                <code className="font-mono text-xs px-2 py-1 bg-[var(--bg-elevated)] rounded border border-[var(--border-hairline)]">
                  SB Buyer Credentials
                </code>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="border-t border-[var(--border-hairline)]" aria-label="Workspaces">
            <div className="flex gap-1 overflow-x-auto px-2 py-2" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  id={`${tab.id}-tab`}
                  className={`tab-btn ${activeTab === tab.id ? 'tab-btn-active' : ''} whitespace-nowrap`}
                  onClick={() => {
                    setActiveTab(tab.id as typeof activeTab);
                    router.push(tab.href);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden" id="main-content">
        <div className="h-full w-full">
          {activeTab === 'procurement' && (
            <div id="procurement-panel" role="tabpanel" aria-labelledby="procurement-tab">
              <iframe
                src="/procurement"
                className="w-full h-full border-0"
                title="Procurement Workspace"
              />
            </div>
          )}
          {activeTab === 'invoicing' && (
            <div id="invoicing-panel" role="tabpanel" aria-labelledby="invoicing-tab">
              <iframe
                src="/invoicing"
                className="w-full h-full border-0"
                title="Invoicing Workspace"
              />
            </div>
          )}
          {activeTab === 'ag-studio' && (
            <div id="ag-studio-panel" role="tabpanel" aria-labelledby="ag-studio-tab">
              <iframe
                src="/ag-studio"
                className="w-full h-full border-0"
                title="AG Studio Workspace"
              />
            </div>
          )}
          {activeTab === 'gantt' && (
            <div id="gantt-panel" role="tabpanel" aria-labelledby="gantt-tab">
              <iframe
                src="/gantt"
                className="w-full h-full border-0"
                title="Gantt Workspace"
              />
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <WebhookAuditDrawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        entries={webhookEntries}
      />
      <SeedSandboxModal
        isOpen={isSeedModalOpen}
        onClose={() => setIsSeedModalOpen(false)}
        onSeed={handleSeedSandbox}
        isSeeding={isSeeding}
      />
      <SimulateWebhookModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        onSimulate={handleSimulateWebhook}
        isSimulating={isSimulating}
      />
      <BuyerCredentialsModal
        isOpen={isCredentialsModalOpen}
        onClose={() => setIsCredentialsModalOpen(false)}
        credentials={{
          email: 'sb-buyer@payops.example.com',
          password: 'Sandbox123!',
          clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'PAYPAL_CLIENT_ID',
        }}
      />

      {lastSeedResult && (
        <div
          className="fixed bottom-4 right-4 z-50 animate-slideIn"
          role="status"
          aria-live="polite"
        >
          <div className="card p-4 min-w-[300px] shadow-lg border-[var(--border-strong)]">
            <p className="text-sm font-mono">{lastSeedResult}</p>
          </div>
        </div>
      )}
    </div>
  );
}