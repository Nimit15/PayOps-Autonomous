// AG Studio Dashboard - PayOps Autonomous Command Center
// Main dashboard page with relational data model for AG Studio
// PLACEHOLDER: Real AG Studio integration will be added in Gate 5

'use client';

import { useState } from 'react';

interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'PARTIALLY_PAID' | 'REFUNDED' | 'CANCELLED';
  total: number;
  paidAmount: number;
  outstanding: number;
  overdueAmount: number;
  dueDate: string;
  agingBucket: string;
  isReceivable: boolean;
}

interface Customer {
  id: string;
  name: string;
  company: string;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  invoiceCount: number;
}

interface Product {
  id: string;
  name: string;
  type: string;
  category: string;
  planCount: number;
  avgMonthlyPrice: number;
}

interface Transaction {
  id: string;
  date: string;
  eventType: string;
  direction: 'Credit' | 'Debit';
  amount: number;
  fee: number;
  status: 'Success' | 'Pending' | 'Denied';
}

interface Payout {
  id: string;
  campaign: string;
  recipient: string;
  date: string;
  status: 'Success' | 'Pending' | 'Failed';
  amount: number;
  fee: number;
}

interface DashboardData {
  asOf: string;
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  transactions: Transaction[];
  payouts: Payout[];
}

const sampleData: DashboardData = {
  asOf: new Date().toISOString(),
  invoices: [
    { id: 'inv-1', number: 'INV-202611-001', customerId: 'cust-1', customerName: 'Acme Corporation', status: 'PAID', total: 25000, paidAmount: 25000, outstanding: 0, overdueAmount: 0, dueDate: '2026-11-15', agingBucket: 'Current', isReceivable: false },
    { id: 'inv-2', number: 'INV-202611-002', customerId: 'cust-1', customerName: 'Acme Corporation', status: 'SENT', total: 40000, paidAmount: 0, outstanding: 40000, overdueAmount: 0, dueDate: '2026-12-01', agingBucket: 'Current', isReceivable: true },
    { id: 'inv-3', number: 'INV-202611-003', customerId: 'cust-2', customerName: 'Globex Inc', status: 'OVERDUE', total: 15000, paidAmount: 0, outstanding: 15000, overdueAmount: 15000, dueDate: '2026-10-15', agingBucket: '31-60 Days', isReceivable: true },
    { id: 'inv-4', number: 'INV-202611-004', customerId: 'cust-3', customerName: 'Wayne Enterprises', status: 'PARTIALLY_PAID', total: 35000, paidAmount: 10000, outstanding: 25000, overdueAmount: 0, dueDate: '2026-11-30', agingBucket: 'Current', isReceivable: true },
    { id: 'inv-5', number: 'INV-202611-005', customerId: 'cust-2', customerName: 'Globex Inc', status: 'PAID', total: 30000, paidAmount: 30000, outstanding: 0, overdueAmount: 0, dueDate: '2026-11-01', agingBucket: 'Current', isReceivable: false },
    { id: 'inv-6', number: 'INV-202611-006', customerId: 'cust-4', customerName: 'Stark Industries', status: 'SENT', total: 20000, paidAmount: 0, outstanding: 20000, overdueAmount: 0, dueDate: '2026-12-15', agingBucket: 'Current', isReceivable: true },
    { id: 'inv-7', number: 'INV-202611-007', customerId: 'cust-5', customerName: 'Umbrella Corp', status: 'DRAFT', total: 25000, paidAmount: 0, outstanding: 25000, overdueAmount: 0, dueDate: '2027-01-15', agingBucket: 'Future', isReceivable: true },
    { id: 'inv-8', number: 'INV-202611-008', customerId: 'cust-3', customerName: 'Wayne Enterprises', status: 'REFUNDED', total: 5000, paidAmount: 0, outstanding: 0, overdueAmount: 0, dueDate: '2026-10-01', agingBucket: 'Past', isReceivable: false },
  ],
  customers: [
    { id: 'cust-1', name: 'John Smith', company: 'Acme Corporation', totalInvoiced: 65000, totalPaid: 25000, totalOutstanding: 40000, invoiceCount: 2 },
    { id: 'cust-2', name: 'Jane Doe', company: 'Globex Inc', totalInvoiced: 45000, totalPaid: 30000, totalOutstanding: 15000, invoiceCount: 2 },
    { id: 'cust-3', name: 'Bruce Wayne', company: 'Wayne Enterprises', totalInvoiced: 40000, totalPaid: 10000, totalOutstanding: 25000, invoiceCount: 2 },
    { id: 'cust-4', name: 'Tony Stark', company: 'Stark Industries', totalInvoiced: 20000, totalPaid: 0, totalOutstanding: 20000, invoiceCount: 1 },
    { id: 'cust-5', name: 'Albert Wesker', company: 'Umbrella Corp', totalInvoiced: 30000, totalPaid: 0, totalOutstanding: 25000, invoiceCount: 1 },
  ],
  products: [
    { id: 'prod-1', name: 'AI-Powered Procurement Platform', type: 'SERVICE', category: 'SOFTWARE', planCount: 3, avgMonthlyPrice: 49 },
    { id: 'prod-2', name: 'Milestone Invoicing Suite', type: 'SERVICE', category: 'SOFTWARE', planCount: 2, avgMonthlyPrice: 199 },
    { id: 'prod-3', name: 'Analytics Command Center', type: 'DIGITAL', category: 'SOFTWARE', planCount: 1, avgMonthlyPrice: 299 },
    { id: 'prod-4', name: 'Gantt Scheduler Pro', type: 'DIGITAL', category: 'SOFTWARE', planCount: 2, avgMonthlyPrice: 99 },
  ],
  transactions: [
    { id: 'txn-1', date: '2026-11-05', eventType: 'INVOICING.INVOICE.PAID', direction: 'Credit', amount: 25000, fee: 750, status: 'Success' },
    { id: 'txn-2', date: '2026-11-04', eventType: 'PAYMENT.CAPTURE.COMPLETED', direction: 'Credit', amount: 30000, fee: 900, status: 'Success' },
    { id: 'txn-3', date: '2026-11-03', eventType: 'BILLING.SUBSCRIPTION.CREATED', direction: 'Credit', amount: 49, fee: 2, status: 'Success' },
    { id: 'txn-4', date: '2026-11-02', eventType: 'PAYMENT.CAPTURE.DENIED', direction: 'Debit', amount: -500, fee: 0, status: 'Denied' },
    { id: 'txn-5', date: '2026-11-01', eventType: 'INVOICING.INVOICE.SENT', direction: 'Debit', amount: -15000, fee: 0, status: 'Pending' },
  ],
  payouts: [
    { id: 'payout-1', campaign: 'Q4 Procurement', recipient: 'Channel3 Vendor', date: '2026-11-05', status: 'Success', amount: 15000, fee: 300 },
    { id: 'payout-2', campaign: 'Milestone 3', recipient: 'Dev Team', date: '2026-11-03', status: 'Success', amount: 35000, fee: 700 },
    { id: 'payout-3', campaign: 'Subscription Revenue', recipient: 'Partners', date: '2026-11-01', status: 'Pending', amount: 5000, fee: 100 },
  ],
};

function getStatusBadge(status: string) {
  const config: Record<string, { bg: string; text: string }> = {
    PAID: { bg: 'bg-green-100', text: 'text-green-800' },
    SENT: { bg: 'bg-blue-100', text: 'text-blue-800' },
    OVERDUE: { bg: 'bg-red-100', text: 'text-red-800' },
    PARTIALLY_PAID: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800' },
    REFUNDED: { bg: 'bg-purple-100', text: 'text-purple-800' },
    CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-600' },
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  return <span className={`px-2 py-1 rounded text-xs font-medium ${c.bg} ${c.text}`}>{status}</span>;
}

function KPICard({ title, value, currency, icon, trend, decimals = 0 }: {
  title: string; value: number; currency: string; icon: string; trend: { value: number; positive: boolean }; decimals?: number;
}) {
  const formattedValue = currency === '%'
    ? `${value.toFixed(decimals)}%`
    : currency ? `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}` : value.toLocaleString();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formattedValue}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className={`text-sm font-medium ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
          {trend.positive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
        </span>
        <span className="text-sm text-gray-500">vs last month</span>
      </div>
    </div>
  );
}

function DataTable({ title, columns, data, emptyMessage, className = '' }: {
  title: string; columns: { field: string; header: string; width?: string; render?: (row: any) => React.ReactNode }[];
  data: any[]; emptyMessage: string; className?: string;
}) {
  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">{data.length} records</p>
      </div>
      <div className="p-4 overflow-x-auto">
        {data.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {columns.map(col => (
                  <th key={col.field} className="px-3 py-2 text-left font-medium text-gray-500" style={{ width: col.width }}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  {columns.map(col => (
                    <td key={col.field} className="px-3 py-2 text-gray-900">
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
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'customers' | 'products' | 'transactions' | 'payouts'>('overview');

  const totalReceivables = sampleData.invoices.filter(i => i.isReceivable).reduce((sum, i) => sum + i.outstanding, 0);
  const overdueAmount = sampleData.invoices.reduce((sum, i) => sum + i.overdueAmount, 0);
  const activeInvoices = sampleData.invoices.filter(i => i.isReceivable).length;
  const collectionRate = sampleData.invoices.length > 0
    ? sampleData.invoices.reduce((sum, i) => sum + (i.total > 0 ? i.paidAmount / i.total : 0), 0) / sampleData.invoices.length * 100
    : 0;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'customers', label: 'Customers' },
    { id: 'products', label: 'Products' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'payouts', label: 'Payouts' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">PayOps Autonomous</h1>
            <p className="text-gray-600 mt-1">Agentic Commerce, Procurement, Milestone Invoicing & Dispute Command Center</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Live Sandbox Data</span>
            <span className="text-sm text-gray-500">As of {new Date(sampleData.asOf).toLocaleString()}</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard title="Total Receivables" value={totalReceivables} currency="USD" icon="💰" trend={{ value: 12.5, positive: true }} />
          <KPICard title="Overdue Amount" value={overdueAmount} currency="USD" icon="⚠️" trend={{ value: -8.2, positive: false }} />
          <KPICard title="Active Invoices" value={activeInvoices} currency="" icon="📄" trend={{ value: 5, positive: true }} />
          <KPICard title="Collection Rate" value={collectionRate} currency="%" icon="📈" trend={{ value: 3.1, positive: true }} decimals={1} />
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto" aria-label="Tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DataTable
                  title="Top Invoices by Outstanding"
                  columns={[
                    { field: 'number', header: 'Invoice #', width: '130px' },
                    { field: 'customerName', header: 'Customer', width: '180px' },
                    { field: 'status', header: 'Status', width: '120px', render: (r) => getStatusBadge(r.status) },
                    { field: 'total', header: 'Total', width: '100px', render: (r) => `$${r.total.toLocaleString()}` },
                    { field: 'outstanding', header: 'Outstanding', width: '120px', render: (r) => `<span class="font-mono tabular-nums text-red-600">$${r.outstanding.toLocaleString()}</span>` },
                    { field: 'dueDate', header: 'Due Date', width: '110px', render: (r) => new Date(r.dueDate).toLocaleDateString() },
                  ]}
                  data={sampleData.invoices.filter(i => i.isReceivable).sort((a, b) => b.outstanding - a.outstanding).slice(0, 5)}
                  emptyMessage="No receivable invoices"
                />
                <DataTable
                  title="Recent Transactions"
                  columns={[
                    { field: 'date', header: 'Date', width: '100px' },
                    { field: 'eventType', header: 'Type', width: '200px' },
                    { field: 'direction', header: 'Dir', width: '60px', render: (r) => `<span class="${r.direction === 'Credit' ? 'text-green-600' : 'text-red-600'}">${r.direction}</span>` },
                    { field: 'amount', header: 'Amount', width: '100px', render: (r) => `<span class="font-mono tabular-nums ${r.amount >= 0 ? 'text-green-600' : 'text-red-600'}">${r.amount >= 0 ? '+' : ''}$${Math.abs(r.amount).toLocaleString()}</span>` },
                    { field: 'status', header: 'Status', width: '80px', render: (r) => `<span class="${r.status === 'Success' ? 'text-green-600' : r.status === 'Pending' ? 'text-yellow-600' : 'text-red-600'}">${r.status}</span>` },
                  ]}
                  data={sampleData.transactions.slice(0, 5)}
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
                  { field: 'total', header: 'Total', width: '100px', render: (r) => `$${r.total.toLocaleString()}` },
                  { field: 'paidAmount', header: 'Paid', width: '100px', render: (r) => `<span class="font-mono tabular-nums text-green-600">$${r.paidAmount.toLocaleString()}</span>` },
                  { field: 'outstanding', header: 'Outstanding', width: '120px', render: (r) => `<span class="font-mono tabular-nums text-red-600">$${r.outstanding.toLocaleString()}</span>` },
                  { field: 'agingBucket', header: 'Aging', width: '110px' },
                  { field: 'dueDate', header: 'Due Date', width: '110px', render: (r) => new Date(r.dueDate).toLocaleDateString() },
                ]}
                data={sampleData.invoices}
                emptyMessage="No invoices"
              />
            )}

            {activeTab === 'customers' && (
              <DataTable
                title="Customer Summary"
                columns={[
                  { field: 'name', header: 'Contact', width: '150px' },
                  { field: 'company', header: 'Company', width: '180px' },
                  { field: 'totalInvoiced', header: 'Total Invoiced', width: '130px', render: (r) => `$${r.totalInvoiced.toLocaleString()}` },
                  { field: 'totalPaid', header: 'Total Paid', width: '110px', render: (r) => `<span class="font-mono tabular-nums text-green-600">$${r.totalPaid.toLocaleString()}</span>` },
                  { field: 'totalOutstanding', header: 'Outstanding', width: '120px', render: (r) => `<span class="font-mono tabular-nums text-red-600">$${r.totalOutstanding.toLocaleString()}</span>` },
                  { field: 'invoiceCount', header: 'Invoices', width: '80px', render: (r) => `<span class="font-mono tabular-nums">${r.invoiceCount}</span>` },
                ]}
                data={sampleData.customers}
                emptyMessage="No customers"
              />
            )}

            {activeTab === 'products' && (
              <DataTable
                title="Products & Plans"
                columns={[
                  { field: 'name', header: 'Product', width: '220px' },
                  { field: 'type', header: 'Type', width: '100px' },
                  { field: 'category', header: 'Category', width: '120px' },
                  { field: 'planCount', header: 'Plans', width: '80px', render: (r) => `<span class="font-mono tabular-nums">${r.planCount}</span>` },
                  { field: 'avgMonthlyPrice', header: 'Avg Monthly', width: '130px', render: (r) => r.avgMonthlyPrice ? `$${r.avgMonthlyPrice}/mo` : '-' },
                ]}
                data={sampleData.products}
                emptyMessage="No products"
              />
            )}

            {activeTab === 'transactions' && (
              <DataTable
                title="Recent Transactions"
                columns={[
                  { field: 'date', header: 'Date', width: '100px' },
                  { field: 'eventType', header: 'Event Type', width: '220px' },
                  { field: 'direction', header: 'Direction', width: '90px', render: (r) => `<span class="${r.direction === 'Credit' ? 'text-green-600' : 'text-red-600'}">${r.direction}</span>` },
                  { field: 'amount', header: 'Amount', width: '110px', render: (r) => `<span class="font-mono tabular-nums ${r.amount >= 0 ? 'text-green-600' : 'text-red-600'}">${r.amount >= 0 ? '+' : ''}$${Math.abs(r.amount).toLocaleString()}</span>` },
                  { field: 'fee', header: 'Fee', width: '90px', render: (r) => `<span class="font-mono tabular-nums text-gray-500">$${r.fee.toLocaleString()}</span>` },
                  { field: 'status', header: 'Status', width: '100px', render: (r) => `<span class="${r.status === 'Success' ? 'text-green-600' : r.status === 'Pending' ? 'text-yellow-600' : 'text-red-600'}">${r.status}</span>` },
                ]}
                data={sampleData.transactions}
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
                  { field: 'date', header: 'Date', width: '110px' },
                  { field: 'status', header: 'Status', width: '100px', render: (r) => `<span class="${r.status === 'Success' ? 'text-green-600' : r.status === 'Pending' ? 'text-yellow-600' : 'text-red-600'}">${r.status}</span>` },
                  { field: 'amount', header: 'Amount', width: '120px', render: (r) => `<span class="font-mono tabular-nums">$${r.amount.toLocaleString()}</span>` },
                  { field: 'fee', header: 'Fee', width: '100px', render: (r) => `<span class="font-mono tabular-nums text-gray-500">$${r.fee.toLocaleString()}</span>` },
                ]}
                data={sampleData.payouts}
                emptyMessage="No payouts"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}