// AG Studio Dashboard - PayOps Autonomous Command Center
// Main dashboard page with relational data model for AG Studio
// Uses 250-transaction multi-currency dataset with 18 planted anomalies

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  status: string;
  statusGroup: string;
  currency: string;
  paymentTerm: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  total: number;
  issuedAmount: number;
  paidAmount: number;
  refundedAmount: number;
  netCollected: number;
  isReceivable: boolean;
  outstanding: number;
  overdueAmount: number;
  daysOverdue: number;
  agingBucket: string | null;
  daysToPay: number | null;
  taxTotal: number;
}

interface Customer {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  invoiceCount: number;
}

interface Product {
  id: string;
  name: string;
  type: string | null;
  category: string | null;
  description: string | null;
  createTime: string | null;
  updateTime: string | null;
  planCount: number;
  avgMonthlyPrice: number;
}

interface Transaction {
  id: string;
  date: string | null;
  eventType: string;
  status: string | null;
  direction: 'Credit' | 'Debit';
  currency: string | null;
  amount: number;
  fee: number;
  net: number;
  endingBalance: number | null;
  counterparty: string | null;
  note: string | null;
  eventCode: string | null;
  referenceId: string | null;
}

interface Payout {
  id: string;
  campaign: string;
  recipient: string;
  date: string | null;
  status: string | null;
  amount: number;
  fee: number;
  note: string | null;
}

interface Balance {
  currency: string;
  total: number;
  available: number;
  withheld: number;
}

interface Dispute {
  id: string;
  createTime: string;
  updateTime: string;
  status: string;
  amount: number;
  reason: string;
  channel: string;
  outcome: string | null;
  signedAmount: number;
}

interface DashboardData {
  asOf: string;
  customers: Customer[];
  invoices: Invoice[];
  invoiceItems: any[];
  invoicePayments: any[];
  products: Product[];
  plans: any[];
  transactions: Transaction[];
  payouts: Payout[];
  balances: Balance[];
  disputes: Dispute[];
}

async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch('/api/dashboard/data');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }
  return response.json();
}

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

function getStatusBadge(status: string) {
  const config: Record<string, { bg: string; text: string }> = {
    PAID: { bg: 'bg-green-900/30', text: 'text-green-400' },
    PAYMENT_PENDING: { bg: 'bg-blue-900/30', text: 'text-blue-400' },
    UNPAID: { bg: 'bg-red-900/30', text: 'text-red-400' },
    PARTIALLY_PAID: { bg: 'bg-yellow-900/30', text: 'text-yellow-400' },
    SENT: { bg: 'bg-blue-900/30', text: 'text-blue-400' },
    DRAFT: { bg: 'bg-gray-700/50', text: 'text-gray-400' },
    SCHEDULED: { bg: 'bg-gray-700/50', text: 'text-gray-400' },
    REFUNDED: { bg: 'bg-purple-900/30', text: 'text-purple-400' },
    PARTIALLY_REFUNDED: { bg: 'bg-purple-900/30', text: 'text-purple-400' },
    CANCELLED: { bg: 'bg-gray-700/50', text: 'text-gray-500' },
    MARKED_AS_PAID: { bg: 'bg-green-900/30', text: 'text-green-400' },
    MARKED_AS_REFUNDED: { bg: 'bg-purple-900/30', text: 'text-purple-400' },
  };
  const c = config[status.toUpperCase()] || { bg: 'bg-gray-700/50', text: 'text-gray-400' };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${c.bg} ${c.text} border border-current/10`}>
      {status}
    </span>
  );
}

function KPICard({ title, value, currency, icon, trend, decimals = 0 }: {
  title: string; value: number; currency: string; icon: string; trend: { value: number; positive: boolean }; decimals?: number;
}) {
  const formattedValue = currency === '%'
    ? `${value.toFixed(decimals)}%`
    : currency
      ? `${currency}${formatNumber(Math.abs(value))}`
      : formatNumber(value);

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 hover:border-cyan-500/30 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-white mt-2 tabular-nums">{formattedValue}</p>
        </div>
        <span className="text-3xl opacity-80">{icon}</span>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className={`text-sm font-medium ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
          {trend.positive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
        </span>
        <span className="text-sm text-gray-500">vs last period</span>
      </div>
    </div>
  );
}

function DataTable({ title, columns, data, emptyMessage, className = '' }: {
  title: string; columns: { field: string; header: string; width?: string; render?: (row: any) => React.ReactNode }[];
  data: any[]; emptyMessage: string; className?: string;
}) {
  return (
    <div className={`bg-gray-900/60 border border-gray-800 rounded-xl ${className}`}>
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{formatNumber(data.length)} records</p>
      </div>
      <div className="p-4 overflow-x-auto">
        {data.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {columns.map(col => (
                  <th key={col.field} className="px-3 py-2 text-left font-medium text-gray-400" style={{ width: col.width }}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  {columns.map(col => (
                    <td key={col.field} className="px-3 py-2 text-gray-200">
                      {col.render ? col.render(row) : String(row[col.field] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 text-center py-8">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'customers' | 'products' | 'transactions' | 'payouts' | 'balances' | 'disputes'>('overview');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const result = await fetchDashboardData();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090A0F] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading 250-transaction dataset...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#090A0F] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error: {error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalReceivables = data.invoices.filter(i => i.isReceivable).reduce((sum, i) => sum + i.outstanding, 0);
  const overdueAmount = data.invoices.reduce((sum, i) => sum + i.overdueAmount, 0);
  const activeInvoices = data.invoices.filter(i => i.isReceivable).length;
  const collectionRate = data.invoices.length > 0
    ? data.invoices.reduce((sum, i) => sum + (i.total > 0 ? i.paidAmount / i.total : 0), 0) / data.invoices.length * 100
    : 0;

  const totalBalance = data.balances.reduce((sum, b) => sum + b.total, 0);
  const availableBalance = data.balances.reduce((sum, b) => sum + b.available, 0);
  const withheldBalance = data.balances.reduce((sum, b) => sum + b.withheld, 0);
  const disputeExposure = data.disputes.reduce((sum, d) => sum + Math.abs(d.signedAmount), 0);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'invoices', label: 'Invoices', icon: '📄' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'products', label: 'Products', icon: '📦' },
    { id: 'transactions', label: 'Transactions', icon: '💳' },
    { id: 'payouts', label: 'Payouts', icon: '💸' },
    { id: 'balances', label: 'Balances', icon: '💰' },
    { id: 'disputes', label: 'Disputes', icon: '⚖️' },
  ];

  return (
    <div className="min-h-screen bg-[#090A0F] text-white">
      {/* Navigation */}
      <nav className="bg-[#11131A]/80 border-b border-gray-800/50 px-6 py-4 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-cyan-400">PayOps Autonomous</h1>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-gray-300 hover:text-cyan-400 transition-colors font-medium">Home</Link>
            <Link href="/ag-studio" className="text-gray-300 hover:text-cyan-400 transition-colors font-medium">AG Studio</Link>
            <Link href="/gantt" className="text-gray-300 hover:text-cyan-400 transition-colors font-medium">Gantt</Link>
            <Link href="/procurement" className="text-gray-300 hover:text-cyan-400 transition-colors font-medium">Procurement</Link>
            <Link href="/invoicing" className="text-gray-300 hover:text-cyan-400 transition-colors font-medium">Invoicing</Link>
            <Link href="/dashboard" className="text-cyan-400 font-medium">Dashboard</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Command Center Dashboard</h1>
            <p className="text-gray-400 mt-1">Agentic Commerce, Procurement, Milestone Invoicing & Dispute Operations</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-green-900/30 text-green-400 border border-green-500/20 rounded-full text-sm font-medium">Live 250-Tx Dataset</span>
            <span className="text-sm text-gray-500" suppressHydrationWarning>As of {new Date(data.asOf).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'UTC' })}</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard title="Total Receivables" value={totalReceivables} currency="$" icon="💰" trend={{ value: 12.5, positive: true }} />
          <KPICard title="Overdue Amount" value={overdueAmount} currency="$" icon="⚠️" trend={{ value: -8.2, positive: false }} />
          <KPICard title="Active Invoices" value={activeInvoices} currency="" icon="📄" trend={{ value: 5, positive: true }} />
          <KPICard title="Collection Rate" value={collectionRate} currency="%" icon="📈" trend={{ value: 3.1, positive: true }} decimals={1} />
        </div>

        {/* Secondary KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard title="Total Balance" value={totalBalance} currency="$" icon="💰" trend={{ value: 2.1, positive: true }} />
          <KPICard title="Available" value={availableBalance} currency="$" icon="✅" trend={{ value: 1.8, positive: true }} />
          <KPICard title="Withheld" value={withheldBalance} currency="$" icon="🔒" trend={{ value: -5.4, positive: true }} />
          <KPICard title="Dispute Exposure" value={disputeExposure} currency="$" icon="⚖️" trend={{ value: -12.3, positive: true }} />
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
          <div className="border-b border-gray-800">
            <nav className="flex overflow-x-auto" aria-label="Tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-cyan-500 text-cyan-400'
                      : 'border-transparent text-gray-500 hover:text-gray-200 hover:border-gray-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 md:p-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DataTable
                  title="Top Invoices by Outstanding"
                  columns={[
                    { field: 'number', header: 'Invoice #', width: '130px' },
                    { field: 'customerName', header: 'Customer', width: '180px' },
                    { field: 'status', header: 'Status', width: '120px', render: (r) => getStatusBadge(r.status) },
                    { field: 'currency', header: 'Ccy', width: '60px', render: (r) => <span className="font-mono text-xs text-gray-400">{r.currency}</span> },
                    { field: 'total', header: 'Total', width: '100px', render: (r) => <span className="font-mono tabular-nums">{formatCurrency(r.total, r.currency)}</span> },
                    { field: 'outstanding', header: 'Outstanding', width: '120px', render: (r) => <span className="font-mono tabular-nums text-red-400">{formatCurrency(r.outstanding, r.currency)}</span> },
                    { field: 'dueDate', header: 'Due Date', width: '110px', render: (r) => r.dueDate ? new Date(r.dueDate + 'T00:00:00').toLocaleDateString('en-US') : '-' },
                  ]}
                  data={data.invoices.filter(i => i.isReceivable).sort((a, b) => b.outstanding - a.outstanding).slice(0, 5)}
                  emptyMessage="No receivable invoices"
                />
                <DataTable
                  title="Recent Transactions"
                  columns={[
                    { field: 'date', header: 'Date', width: '100px', render: (r) => r.date ? new Date(r.date).toLocaleDateString('en-US') : '-' },
                    { field: 'eventType', header: 'Type', width: '200px' },
                    { field: 'direction', header: 'Dir', width: '60px', render: (r) => <span className={r.direction === 'Credit' ? 'text-green-400' : 'text-red-400'}>{r.direction}</span> },
                    { field: 'amount', header: 'Amount', width: '100px', render: (r) => <span className={`font-mono tabular-nums ${r.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>{r.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(r.amount), r.currency || 'USD')}</span> },
                    { field: 'status', header: 'Status', width: '80px', render: (r) => <span className={r.status === 'Success' ? 'text-green-400' : r.status === 'Pending' ? 'text-yellow-400' : 'text-red-400'}>{r.status}</span> },
                  ]}
                  data={data.transactions.slice(0, 5)}
                  emptyMessage="No recent transactions"
                />
              </div>
            )}

            {activeTab === 'invoices' && (
              <DataTable
                title="All Invoices"
                columns={[
                  { field: 'number', header: 'Invoice #', width: '130px' },
                  { field: 'customerName', header: 'Customer', width: '180px' },
                  { field: 'status', header: 'Status', width: '120px', render: (r) => getStatusBadge(r.status) },
                  { field: 'currency', header: 'Ccy', width: '60px', render: (r) => <span className="font-mono text-xs text-gray-400">{r.currency}</span> },
                  { field: 'total', header: 'Total', width: '100px', render: (r) => <span className="font-mono tabular-nums">{formatCurrency(r.total, r.currency)}</span> },
                  { field: 'paidAmount', header: 'Paid', width: '100px', render: (r) => <span className="font-mono tabular-nums text-green-400">{formatCurrency(r.paidAmount, r.currency)}</span> },
                  { field: 'outstanding', header: 'Outstanding', width: '120px', render: (r) => <span className="font-mono tabular-nums text-red-400">{formatCurrency(r.outstanding, r.currency)}</span> },
                  { field: 'agingBucket', header: 'Aging', width: '110px', render: (r) => <span className="text-xs">{r.agingBucket || '-'}</span> },
                  { field: 'dueDate', header: 'Due Date', width: '110px', render: (r) => r.dueDate ? new Date(r.dueDate + 'T00:00:00').toLocaleDateString('en-US') : '-' },
                ]}
                data={data.invoices}
                emptyMessage="No invoices"
              />
            )}

            {activeTab === 'customers' && (
              <DataTable
                title="Customer Summary"
                columns={[
                  { field: 'name', header: 'Contact', width: '150px' },
                  { field: 'company', header: 'Company', width: '180px', render: (r) => r.company || 'Individual' },
                  { field: 'totalInvoiced', header: 'Total Invoiced', width: '130px', render: (r) => <span className="font-mono tabular-nums">{formatCurrency(r.totalInvoiced)}</span> },
                  { field: 'totalPaid', header: 'Total Paid', width: '110px', render: (r) => <span className="font-mono tabular-nums text-green-400">{formatCurrency(r.totalPaid)}</span> },
                  { field: 'totalOutstanding', header: 'Outstanding', width: '120px', render: (r) => <span className="font-mono tabular-nums text-red-400">{formatCurrency(r.totalOutstanding)}</span> },
                  { field: 'invoiceCount', header: 'Invoices', width: '80px', render: (r) => <span className="font-mono tabular-nums">{r.invoiceCount}</span> },
                ]}
                data={data.customers}
                emptyMessage="No customers"
              />
            )}

            {activeTab === 'products' && (
              <DataTable
                title="Products & Plans"
                columns={[
                  { field: 'name', header: 'Product', width: '220px' },
                  { field: 'type', header: 'Type', width: '100px', render: (r) => r.type || '-' },
                  { field: 'category', header: 'Category', width: '120px', render: (r) => r.category || '-' },
                  { field: 'planCount', header: 'Plans', width: '80px', render: (r) => <span className="font-mono tabular-nums">{r.planCount}</span> },
                  { field: 'avgMonthlyPrice', header: 'Avg Monthly', width: '130px', render: (r) => r.avgMonthlyPrice ? `$${r.avgMonthlyPrice}/mo` : '-' },
                ]}
                data={data.products}
                emptyMessage="No products"
              />
            )}

            {activeTab === 'transactions' && (
              <DataTable
                title="All Transactions (250-record dataset)"
                columns={[
                  { field: 'date', header: 'Date', width: '100px', render: (r) => r.date ? new Date(r.date).toLocaleDateString('en-US') : '-' },
                  { field: 'eventType', header: 'Event Type', width: '220px' },
                  { field: 'direction', header: 'Direction', width: '90px', render: (r) => <span className={r.direction === 'Credit' ? 'text-green-400' : 'text-red-400'}>{r.direction}</span> },
                  { field: 'currency', header: 'Ccy', width: '60px', render: (r) => <span className="font-mono text-xs text-gray-400">{r.currency || 'USD'}</span> },
                  { field: 'amount', header: 'Amount', width: '110px', render: (r) => <span className={`font-mono tabular-nums ${r.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>{r.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(r.amount), r.currency || 'USD')}</span> },
                  { field: 'fee', header: 'Fee', width: '90px', render: (r) => <span className="font-mono tabular-nums text-gray-400">{formatCurrency(r.fee, r.currency || 'USD')}</span> },
                  { field: 'status', header: 'Status', width: '100px', render: (r) => <span className={r.status === 'Success' ? 'text-green-400' : r.status === 'Pending' ? 'text-yellow-400' : 'text-red-400'}>{r.status}</span> },
                ]}
                data={data.transactions}
                emptyMessage="No transactions"
              />
            )}

            {activeTab === 'payouts' && (
              <DataTable
                title="Payouts"
                columns={[
                  { field: 'id', header: 'Payout ID', width: '140px' },
                  { field: 'campaign', header: 'Campaign', width: '120px' },
                  { field: 'recipient', header: 'Recipient', width: '180px' },
                  { field: 'date', header: 'Date', width: '110px', render: (r) => r.date ? new Date(r.date).toLocaleDateString('en-US') : '-' },
                  { field: 'status', header: 'Status', width: '100px', render: (r) => <span className={r.status === 'Success' ? 'text-green-400' : r.status === 'Pending' ? 'text-yellow-400' : 'text-red-400'}>{r.status}</span> },
                  { field: 'amount', header: 'Amount', width: '120px', render: (r) => <span className="font-mono tabular-nums">{formatCurrency(r.amount)}</span> },
                  { field: 'fee', header: 'Fee', width: '100px', render: (r) => <span className="font-mono tabular-nums text-gray-400">{formatCurrency(r.fee)}</span> },
                ]}
                data={data.payouts}
                emptyMessage="No payouts"
              />
            )}

            {activeTab === 'balances' && (
              <DataTable
                title="Account Balances by Currency"
                columns={[
                  { field: 'currency', header: 'Currency', width: '100px', render: (r) => <span className="font-mono text-lg font-bold">{r.currency}</span> },
                  { field: 'total', header: 'Total Balance', width: '140px', render: (r) => <span className="font-mono tabular-nums text-white">{formatCurrency(r.total, r.currency)}</span> },
                  { field: 'available', header: 'Available', width: '140px', render: (r) => <span className="font-mono tabular-nums text-green-400">{formatCurrency(r.available, r.currency)}</span> },
                  { field: 'withheld', header: 'Withheld', width: '140px', render: (r) => <span className="font-mono tabular-nums text-yellow-400">{formatCurrency(r.withheld, r.currency)}</span> },
                ]}
                data={data.balances}
                emptyMessage="No balance data"
              />
            )}

            {activeTab === 'disputes' && (
              <DataTable
                title="Disputes"
                columns={[
                  { field: 'id', header: 'Dispute ID', width: '140px' },
                  { field: 'createTime', header: 'Created', width: '120px', render: (r) => new Date(r.createTime).toLocaleDateString('en-US') },
                  { field: 'status', header: 'Status', width: '120px', render: (r) => getStatusBadge(r.status) },
                  { field: 'amount', header: 'Amount', width: '120px', render: (r) => <span className="font-mono tabular-nums">{formatCurrency(r.amount)}</span> },
                  { field: 'reason', header: 'Reason', width: '150px' },
                  { field: 'channel', header: 'Channel', width: '120px' },
                  { field: 'outcome', header: 'Outcome', width: '120px', render: (r) => r.outcome ? getStatusBadge(r.outcome) : <span className="text-gray-500">Pending</span> },
                  { field: 'signedAmount', header: 'Exposure', width: '120px', render: (r) => <span className="font-mono tabular-nums text-red-400">{formatCurrency(Math.abs(r.signedAmount))}</span> },
                ]}
                data={data.disputes}
                emptyMessage="No disputes"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-[#11131A]/80 border-t border-gray-800/50 px-6 py-8 rounded-t-xl">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              PayOps Autonomous — PayPal AI Hackathon 2026 | 250-transaction multi-currency dataset with 18 planted anomalies
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
    </div>
  );
}