'use client';

import { useState, useEffect, useRef } from 'react';

interface InspectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTransaction: any;
  anomalies: any[];
  demoMode: boolean;
}

const TABS = [
  { id: 'transaction', label: 'Transaction', icon: '📋' },
  { id: 'policy', label: 'Policy Check', icon: '🛡️' },
  { id: 'anomalies', label: 'Anomalies', icon: '🔍' },
];

export default function InspectorDrawer({
  isOpen,
  onClose,
  selectedTransaction,
  anomalies,
  demoMode,
}: InspectorDrawerProps) {
  const [activeTab, setActiveTab] = useState<'transaction' | 'policy' | 'anomalies'>('transaction');
  const drawerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        onClose();
      }
      // Tab switching with numbers
      if (isOpen && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === '1') setActiveTab('transaction');
        if (e.key === '2') setActiveTab('policy');
        if (e.key === '3') setActiveTab('anomalies');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="drawer" onClick={handleBackdropClick} role="dialog" aria-modal="true" aria-label="Inspector">
      <div className="drawer-backdrop" />
      <div className="drawer-content" style={{ width: '380px' }} ref={drawerRef}>
        {/* Drawer Header */}
        <div className="p-4 border-b border-[var(--border-hairline)] flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--paypal-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Inspector
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            aria-label="Close inspector"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="p-3 border-b border-[var(--border-hairline)]">
          <div className="tab-nav" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`tab-btn ${activeTab === tab.id ? 'tab-btn-active' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-2 text-center">
            Press 1, 2, 3 to switch tabs • Esc to close
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {activeTab === 'transaction' && (
            <TransactionTab transaction={selectedTransaction} demoMode={demoMode} />
          )}
          {activeTab === 'policy' && (
            <PolicyTab transaction={selectedTransaction} demoMode={demoMode} />
          )}
          {activeTab === 'anomalies' && (
            <AnomaliesTab anomalies={anomalies} transaction={selectedTransaction} demoMode={demoMode} />
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span>{demoMode ? '📊 Demo Dataset' : '🔴 Live PayPal Data'}</span>
            <span>380px width</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionTab({ transaction, demoMode }: { transaction: any; demoMode: boolean }) {
  if (!transaction) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">
        <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>Select a transaction from the grid</p>
        <p className="text-xs mt-1">Click any row to inspect details</p>
      </div>
    );
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      payment_received: 'var(--emerald)',
      payment_sent: 'var(--paypal-blue)',
      refund: 'var(--amber)',
      fee: 'var(--text-muted)',
      dispute: 'var(--crimson)',
      payout: 'var(--paypal-blue-light)',
    };
    return colors[type] || 'var(--text-secondary)';
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, 'autonomous' | 'guarded' | 'blocked' | 'neutral'> = {
      COMPLETED: 'autonomous',
      PENDING: 'guarded',
      FAILED: 'blocked',
      REFUNDED: 'neutral',
    };
    return statusMap[status] || 'neutral';
  };

  return (
    <div className="space-y-4">
      {/* Transaction Header */}
      <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={`badge badge-${getStatusBadge(transaction.status)} text-xs`}>
              {transaction.status}
            </span>
            <span className="ml-2 text-xs text-[var(--text-muted)]">{transaction.type.replace('_', ' ').toUpperCase()}</span>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg font-semibold" style={{ color: getTypeColor(transaction.type) }}>
              {formatAmount(transaction.amount, transaction.currency)}
            </div>
            <div className="text-xs text-[var(--text-muted)]">{transaction.currency}</div>
          </div>
        </div>
      </div>

      {/* Detail Grid */}
      <div className="space-y-3">
        <DetailRow label="Transaction ID" value={transaction.id} copyable />
        <DetailRow label="Date" value={formatDate(transaction.date)} />
        <DetailRow label="Description" value={transaction.description} />
        {transaction.policyId && (
          <DetailRow label="Policy ID" value={transaction.policyId} copyable monospace />
        )}
        {transaction.idempotencyKey && (
          <DetailRow label="Idempotency Key" value={transaction.idempotencyKey} copyable monospace />
        )}
        {demoMode && (
          <DetailRow
            label="Source"
            value={
              <span className="badge badge-neutral text-xs">Generated Dataset</span>
            }
          />
        )}
      </div>

      {/* Quick Actions */}
      <div className="pt-2 border-t border-[var(--border-hairline)]">
        <button className="btn-secondary w-full text-sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(transaction, null, 2))}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy JSON
        </button>
      </div>
    </div>
  );
}

function PolicyTab({ transaction, demoMode }: { transaction: any; demoMode: boolean }) {
  if (!transaction) {
    return (
      <div className="text-center py-8 text-[var(--text-muted)]">
        <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <p>Select a transaction to check policy</p>
      </div>
    );
  }

  const amountUSD = transaction.amount; // Assuming amounts are in their currency; in real app would convert
  const isAutonomous = amountUSD <= 500;
  const requiresApproval = amountUSD > 500 && amountUSD <= 15000;
  const isBlocked = amountUSD > 15000;

  const getPolicyStatus = () => {
    if (isAutonomous) return { label: 'AUTONOMOUS', color: 'var(--emerald)', badge: 'autonomous', icon: '⚡' };
    if (requiresApproval) return { label: 'APPROVAL REQUIRED', color: 'var(--amber)', badge: 'guarded', icon: '🛡️' };
    return { label: 'BLOCKED', color: 'var(--crimson)', badge: 'blocked', icon: '🚫' };
  };

  const policy = getPolicyStatus();

  return (
    <div className="space-y-4">
      {/* Policy Decision Card */}
      <div className="p-4 rounded-lg border-2" style={{ borderColor: policy.color, background: `${policy.color}15` }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${policy.color}30` }}>
            {policy.icon}
          </div>
          <div>
            <div className="text-xs text-[var(--text-muted)]">Policy Decision</div>
            <div className="font-semibold" style={{ color: policy.color }}>{policy.label}</div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t" style={{ borderColor: policy.color }}>
          <div className="text-sm">
            <span className="text-[var(--text-muted)]">Amount: </span>
            <span className="font-mono font-semibold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: transaction.currency }).format(transaction.amount)}</span>
          </div>
          <div className="text-sm mt-1">
            <span className="text-[var(--text-muted)]">Threshold: </span>
            <span className="font-mono">$500 autonomous • $15,000 approval cap</span>
          </div>
        </div>
      </div>

      {/* Policy Rules */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-[var(--text-secondary)]">Policy Rules Evaluation</h4>
        <PolicyRule
          label="Amount ≤ $500 (Autonomous)"
          passed={isAutonomous}
          description="Auto-approved without human review"
        />
        <PolicyRule
          label="$500 < Amount ≤ $15,000 (Approval Required)"
          passed={requiresApproval}
          description="Escalated to designated approver"
        />
        <PolicyRule
          label="Amount > $15,000 (Blocked)"
          passed={isBlocked}
          description="Requires executive sign-off"
        />
        <PolicyRule
          label="Idempotency Key Present"
          passed={!!transaction.idempotencyKey}
          description="Prevents duplicate processing"
        />
        <PolicyRule
          label="Valid Currency"
          passed={['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'SGD'].includes(transaction.currency)}
          description="Supported multi-currency"
        />
        <PolicyRule
          label="Transaction Status Valid"
          passed={['COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'].includes(transaction.status)}
          description="Valid ledger state"
        />
      </div>

      {/* Approval Flow (if applicable) */}
      {requiresApproval && (
        <div className="p-3 rounded-lg bg-[var(--amber)]/10 border border-[var(--amber)]/30">
          <h4 className="text-sm font-medium text-[var(--amber)] mb-2 flex items-center gap-1">
            <span>🛡️</span> Approval Flow
          </h4>
          <div className="space-y-2 text-sm">
            <ApprovalStep step={1} label="Submitted" completed={true} />
            <ApprovalStep step={2} label="Approver Notified" completed={true} />
            <ApprovalStep step={3} label="Under Review" completed={true} current />
            <ApprovalStep step={4} label="Approved / Rejected" completed={false} />
            <ApprovalStep step={5} label="Executed" completed={false} />
          </div>
        </div>
      )}

      {isBlocked && (
        <div className="p-3 rounded-lg bg-[var(--crimson)]/10 border border-[var(--crimson)]/30">
          <h4 className="text-sm font-medium text-[var(--crimson)] mb-2 flex items-center gap-1">
            <span>🚫</span> Blocked - Executive Review Required
          </h4>
          <p className="text-sm text-[var(--text-secondary)]">
            This transaction exceeds the $15,000 autonomous cap. It requires CFO/VP Finance approval before processing.
          </p>
        </div>
      )}
    </div>
  );
}

function AnomaliesTab({ anomalies, transaction, demoMode }: { anomalies: any[]; transaction: any; demoMode: boolean }) {
  const relatedAnomalies = transaction
    ? anomalies.filter(a => a.transactionId === transaction.id)
    : anomalies;

  return (
    <div className="space-y-4">
      {/* Anomaly Summary */}
      <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--text-muted)]">Total Anomalies in Dataset</div>
            <div className="font-mono text-2xl font-semibold text-[var(--crimson)]">{anomalies.length}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--text-muted)]">Related to Selection</div>
            <div className="font-mono text-2xl font-semibold">{relatedAnomalies.length}</div>
          </div>
        </div>
      </div>

      {/* Anomaly Categories */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-[var(--text-secondary)]">Anomaly Categories</h4>
        <AnomalyCategoryBadge label="Amount Mismatch" count={anomalies.filter(a => a.type === 'amount_mismatch').length} color="var(--crimson)" />
        <AnomalyCategoryBadge label="Duplicate Idempotency Key" count={anomalies.filter(a => a.type === 'duplicate_idempotency').length} color="var(--amber)" />
        <AnomalyCategoryBadge label="Currency Conversion Error" count={anomalies.filter(a => a.type === 'currency_conversion').length} color="var(--paypal-blue)" />
        <AnomalyCategoryBadge label="Missing Idempotency Key" count={anomalies.filter(a => a.type === 'missing_idempotency').length} color="var(--text-muted)" />
        <AnomalyCategoryBadge label="Policy Violation" count={anomalies.filter(a => a.type === 'policy_violation').length} color="var(--crimson)" />
        <AnomalyCategoryBadge label="Timing Anomaly" count={anomalies.filter(a => a.type === 'timing').length} color="var(--amber)" />
        <AnomalyCategoryBadge label="Balance Drift" count={anomalies.filter(a => a.type === 'balance_drift').length} color="var(--paypal-blue)" />
        <AnomalyCategoryBadge label="Status Inconsistency" count={anomalies.filter(a => a.type === 'status_inconsistency').length} color="var(--crimson)" />
      </div>

      {/* Related Anomalies */}
      {relatedAnomalies.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-[var(--text-secondary)]">Anomalies in Selected Transaction</h4>
          {relatedAnomalies.map((anomaly, idx) => (
            <AnomalyCard key={idx} anomaly={anomaly} />
          ))}
        </div>
      )}

      {relatedAnomalies.length === 0 && transaction && (
        <div className="p-4 rounded-lg bg-[var(--emerald)]/10 border border-[var(--emerald)]/30 text-center">
          <svg className="w-8 h-8 mx-auto mb-2 text-[var(--emerald)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-[var(--emerald)]">No anomalies detected in this transaction</p>
        </div>
      )}

      {!transaction && (
        <div className="text-center py-8 text-[var(--text-muted)]">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p>Select a transaction to see related anomalies</p>
        </div>
      )}
    </div>
  );
}

// Helper Components
function DetailRow({ label, value, copyable, monospace }: { label: string; value: React.ReactNode; copyable?: boolean; monospace?: boolean }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
      <span className="text-xs text-[var(--text-muted)] font-medium">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`truncate ${monospace ? 'font-mono text-xs' : 'text-sm'}`}>{value}</span>
        {copyable && typeof value === 'string' && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(value)}
            className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            title="Copy"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function PolicyRule({ label, passed, description }: { label: string; passed: boolean; description: string }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${passed ? 'bg-[var(--emerald)]/20' : 'bg-[var(--crimson)]/20'}`}>
        {passed ? (
          <svg className="w-3 h-3 text-[var(--emerald)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-[var(--crimson)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-[var(--text-muted)]">{description}</div>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded ${passed ? 'badge-autonomous' : 'badge-blocked'}`}>
        {passed ? 'PASS' : 'FAIL'}
      </span>
    </div>
  );
}

function ApprovalStep({ step, label, completed, current }: { step: number; label: string; completed: boolean; current?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${completed ? 'bg-[var(--emerald)] text-white' : current ? 'bg-[var(--amber)] text-white animate-pulse' : 'bg-[var(--bg-hover)] text-[var(--text-muted)] border border-[var(--border-hairline)]'}`}>
        {completed ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : step}
      </div>
      <div className="flex-1">
        <div className={`text-sm ${completed ? 'text-[var(--text-secondary)]' : current ? 'text-[var(--amber)] font-medium' : 'text-[var(--text-muted)]'}`}>
          {label}
        </div>
        {current && <div className="text-xs text-[var(--amber)]">Current step</div>}
      </div>
    </div>
  );
}

function AnomalyCategoryBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)]">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-mono text-sm font-semibold" style={{ color }}>{count}</span>
    </div>
  );
}

function AnomalyCard({ anomaly }: { anomaly: any }) {
  const severityColors: Record<string, string> = {
    critical: 'var(--crimson)',
    high: 'var(--crimson)',
    medium: 'var(--amber)',
    low: 'var(--text-muted)',
  };

  const color = severityColors[anomaly.severity] || 'var(--text-muted)';

  return (
    <div className="p-3 rounded-lg border" style={{ borderColor: `${color}40`, background: `${color}10` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{anomaly.type.replace('_', ' ').toUpperCase()}</span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}>
              {anomaly.severity?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">{anomaly.description}</p>
          {anomaly.expected !== undefined && anomaly.actual !== undefined && (
            <div className="text-xs mt-1 flex items-center gap-1 text-[var(--text-muted)]">
              <span>Expected:</span>
              <span className="font-mono text-[var(--emerald)]">{anomaly.expected}</span>
              <span>Actual:</span>
              <span className="font-mono text-[var(--crimson)]">{anomaly.actual}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}