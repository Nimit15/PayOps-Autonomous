'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

interface Invoice {
  id: string;
  number: string;
  customerId: string;
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

export function InvoiceTable() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'dueDate', direction: 'asc' });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/ag-studio/transactions');
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const data = await res.json();
      setInvoices(data.invoices || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const statusColors: Record<string, string> = {
    Paid: 'bg-green-600/20 text-green-400 border-green-500/30',
    Open: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
    'Partially paid': 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    Refunded: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
    Cancelled: 'bg-red-600/20 text-red-400 border-red-500/30',
    Draft: 'bg-gray-600/20 text-gray-400 border-gray-500/30',
    Scheduled: 'bg-cyan-600/20 text-cyan-400 border-cyan-500/30',
  };

  const agingColors: Record<string, string> = {
    '0. Not yet due': 'text-gray-400',
    '1. 1-30 days': 'text-amber-400',
    '2. 31-60 days': 'text-orange-400',
    '3. 61-90 days': 'text-red-400',
    '4. 90+ days': 'text-red-600 font-bold',
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const filteredInvoices = invoices
    .filter(inv => {
      if (filterStatus !== 'all' && inv.statusGroup !== filterStatus) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          inv.number.toLowerCase().includes(term) ||
          inv.customerId.toLowerCase().includes(term) ||
          inv.id.toLowerCase().includes(term)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortConfig.key as keyof Invoice];
      const bVal = b[sortConfig.key as keyof Invoice];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const receivableInvoices = invoices.filter(inv => inv.isReceivable);
  const totalOutstanding = receivableInvoices.reduce((sum, inv) => sum + inv.outstanding, 0);
  const totalOverdue = receivableInvoices.reduce((sum, inv) => sum + inv.overdueAmount, 0);
  const overdueCount = receivableInvoices.filter(inv => inv.daysOverdue > 0).length;

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center bg-gray-900/50 border border-gray-700 rounded-xl">
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-cyan-500 border-t-transparent"></div>
          <p>Loading PayPal invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-600/20 border border-red-500/30 rounded-xl p-6">
        <p className="text-red-400">Error loading invoices: {error}</p>
        <button onClick={fetchInvoices} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 border-b border-gray-800">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Total Receivable</div>
          <div className="text-2xl font-bold text-white tabular-nums font-mono">
            ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-gray-500 text-xs mt-1">{receivableInvoices.length} invoices</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Overdue Amount</div>
          <div className="text-2xl font-bold text-red-400 tabular-nums font-mono">
            ${totalOverdue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-gray-500 text-xs mt-1">{overdueCount} invoices overdue</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Avg Days to Pay</div>
          <div className="text-2xl font-bold text-cyan-400 tabular-nums font-mono">
            {receivableInvoices.length > 0
              ? Math.round(receivableInvoices.reduce((s, i) => s + (i.daysToPay || 0), 0) / receivableInvoices.filter(i => i.daysToPay).length)
              : 0}
          </div>
          <div className="text-gray-500 text-xs mt-1">Days</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Collection Rate</div>
          <div className="text-2xl font-bold text-green-400 tabular-nums font-mono">
            {receivableInvoices.length > 0
              ? Math.round((receivableInvoices.reduce((s, i) => s + i.paidAmount, 0) /
                  receivableInvoices.reduce((s, i) => s + i.issuedAmount, 0)) * 100)
              : 0}%
          </div>
          <div className="text-gray-500 text-xs mt-1">Paid / Issued</div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Paid">Paid</option>
            <option value="Partially paid">Partially Paid</option>
            <option value="Refunded">Refunded</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Draft">Draft</option>
            <option value="Scheduled">Scheduled</option>
          </select>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search invoice #, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm w-64 focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-gray-500"
            />
          </div>
        </div>
        <div className="text-gray-500 text-sm">
          {filteredInvoices.length} of {invoices.length} invoices
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full" role="grid">
          <thead className="bg-gray-900/50">
            <tr className="border-b border-gray-700">
              {[
                { key: 'number', label: 'Invoice #' },
                { key: 'customerId', label: 'Customer' },
                { key: 'statusGroup', label: 'Status' },
                { key: 'currency', label: 'Currency' },
                { key: 'invoiceDate', label: 'Invoice Date' },
                { key: 'dueDate', label: 'Due Date' },
                { key: 'total', label: 'Total' },
                { key: 'outstanding', label: 'Outstanding' },
                { key: 'overdueAmount', label: 'Overdue' },
                { key: 'agingBucket', label: 'Aging' },
                { key: 'daysOverdue', label: 'Days Overdue' },
              ].map(col => (
                <th
                  key={col.key}
                  scope="col"
                  onClick={() => handleSort(col.key)}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white select-none"
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortConfig.key === col.key && (
                      <svg className={`w-4 h-4 ${sortConfig.direction === 'asc' ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredInvoices.map(invoice => (
              <tr key={invoice.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-sm text-cyan-300 tabular-nums">{invoice.number}</td>
                <td className="px-4 py-3 text-sm text-gray-300 truncate max-w-xs" title={invoice.customerId}>{invoice.customerId}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[invoice.statusGroup] || 'bg-gray-600/20 text-gray-400 border-gray-500/30'}`}>
                    {invoice.statusGroup}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400 font-mono tabular-nums">{invoice.currency}</td>
                <td className="px-4 py-3 text-sm text-gray-300 font-mono tabular-nums">
                  {invoice.invoiceDate ? format(new Date(invoice.invoiceDate), 'MMM d, yyyy') : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300 font-mono tabular-nums">
                  {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM d, yyyy') : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-white font-mono tabular-nums">
                  ${invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-sm text-white font-mono tabular-nums">
                  ${invoice.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-sm font-mono tabular-nums">
                  {invoice.overdueAmount > 0 ? (
                    <span className="text-red-400">${invoice.overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  ) : (
                    <span className="text-gray-500">$0.00</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {invoice.agingBucket ? (
                    <span className={`${agingColors[invoice.agingBucket] || 'text-gray-400'} font-medium`}>
                      {invoice.agingBucket}
                    </span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm font-mono tabular-nums">
                  {invoice.daysOverdue > 0 ? (
                    <span className="text-red-400">{invoice.daysOverdue}</span>
                  ) : (
                    <span className="text-gray-500">0</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-gray-500">
                  No invoices match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Empty state for no invoices at all */}
      {invoices.length === 0 && !isLoading && (
        <div className="p-12 text-center text-gray-500">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg">No invoices found</p>
          <p className="text-sm mt-1">Seed sandbox data to populate invoices</p>
        </div>
      )}
    </div>
  );
}