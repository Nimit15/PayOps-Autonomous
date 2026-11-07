// PayPal Scheduled Tasks Worker
// Runs periodic reconciliation, overdue checks, and reporting
// Run with: npm run worker:scheduled (or via Render cronJob every 15 minutes)

import 'dotenv/config';
import { listInvoices, searchTransactions, getBalances, listProducts, listPlans } from '../lib/paypal-client';
import { getChannel3Client } from '../lib/channel3-client';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function log(label: string, message: string, status: 'ok' | 'warn' | 'error' | 'info' = 'info') {
  const prefix = status === 'ok' ? `${GREEN}✓${RESET}` : status === 'warn' ? `${YELLOW}⚠${RESET}` : status === 'error' ? `${RED}✗${RESET}` : `${BLUE}ℹ${RESET}`;
  console.log(`${prefix} ${CYAN}${label}${RESET}: ${message}`);
}

function section(title: string) {
  console.log(`\n${BOLD}${BLUE}=== ${title} ===${RESET}\n`);
}

async function checkOverdueInvoices() {
  section('Overdue Invoice Check');
  try {
    const invoices = await listInvoices();
    const overdue = invoices.filter(inv =>
      inv.status === 'SENT' && inv.detail.payment_term?.due_date &&
      new Date(inv.detail.payment_term.due_date) < new Date()
    );

    log('Total Invoices', `${invoices.length}`, 'info');
    log('Overdue Found', `${overdue.length}`, overdue.length > 0 ? 'warn' : 'ok');

    for (const inv of overdue) {
      const daysOverdue = Math.floor((Date.now() - new Date(inv.detail.payment_term!.due_date!).getTime()) / (1000 * 60 * 60 * 24));
      log(`  ${inv.detail.invoice_number}`, `${daysOverdue} days overdue | $${inv.detail.amount?.value}`, 'warn');
      // In production: trigger dunning email, apply late fees
    }

    return overdue.length;
  } catch (error) {
    log('Error', `Overdue check failed: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    return 0;
  }
}

async function reconcileTransactions() {
  section('Transaction Reconciliation');
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    const transactions = await searchTransactions(startDate, endDate);

    log('Transactions (24h)', `${transactions.length}`, 'info');

    // Group by event type
    const byType = transactions.reduce((acc: Record<string, number>, t) => {
      const code = t.transaction_info?.transaction_event_code ?? 'UNKNOWN';
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {});

    for (const [type, count] of Object.entries(byType)) {
      log(`  ${type}`, `${count}`, 'info');
    }

    // Check for failed payments
    const failed = transactions.filter(t =>
      t.transaction_info?.transaction_status === 'D' || // Denied
      t.transaction_info?.transaction_event_code === 'T1105' // Payment failed
    );

    log('Failed Payments', `${failed.length}`, failed.length > 0 ? 'warn' : 'ok');

    return transactions.length;
  } catch (error) {
    log('Error', `Reconciliation failed: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    return 0;
  }
}

async function checkAccountHealth() {
  section('Account Health Check');
  try {
    const balances = await getBalances();
    let healthy = true;

    for (const b of balances.balances || []) {
      const available = parseFloat(b.available_balance?.value || '0');
      const withheld = parseFloat(b.withheld_balance?.value || '0');
      const total = parseFloat(b.total_balance?.value || '0');

      log(`${b.currency} Balance`, `Total: $${total} | Available: $${available} | Withheld: $${withheld}`, 'info');

      // Alert if available balance is low
      if (available < 1000) {
        log('Low Balance Alert', `Available balance below $1000: $${available}`, 'warn');
        healthy = false;
      }

      // Alert if high withheld percentage
      if (total > 0 && (withheld / total) > 0.2) {
        log('High Withheld Alert', `${((withheld / total) * 100).toFixed(1)}% of funds withheld`, 'warn');
        healthy = false;
      }
    }

    return healthy;
  } catch (error) {
    log('Error', `Health check failed: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    return false;
  }
}

async function syncCatalog() {
  section('Catalog Sync');
  try {
    const [products, plans] = await Promise.all([
      listProducts(),
      listPlans(),
    ]);

    log('Products Synced', `${products.length}`, 'ok');
    log('Plans Synced', `${plans.length}`, 'ok');

    // Check for products without active plans
    const productsWithPlans = new Set(plans.map(p => p.product_id));
    const productsWithoutPlans = products.filter(p => !productsWithPlans.has(p.id));

    log('Products Without Plans', `${productsWithoutPlans.length}`, productsWithoutPlans.length > 0 ? 'warn' : 'ok');

    // Sync with Channel3 for procurement products
    const client = getChannel3Client();
    const result = await client.search({ query: 'software subscription', limit: 5 });
    log('Channel3 Sync Test', `${result.data.length} products found`, 'info');

    return true;
  } catch (error) {
    log('Error', `Catalog sync failed: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    return false;
  }
}

async function generateDailyReport() {
  section('Daily Report Generation');
  try {
    const invoices = await listInvoices();
    const transactions = await searchTransactions(
      new Date(Date.now() - 24 * 60 * 60 * 1000),
      new Date()
    );

    const metrics = {
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter(i => i.status === 'PAID').length,
      sentInvoices: invoices.filter(i => i.status === 'SENT').length,
      overdueInvoices: invoices.filter(i => i.status === 'OVERDUE').length,
      draftInvoices: invoices.filter(i => i.status === 'DRAFT').length,
      totalReceivables: invoices
        .filter(i => ['SENT', 'OVERDUE'].includes(i.status))
        .reduce((sum, i) => sum + parseFloat(i.detail.amount?.value || '0'), 0),
      transactions24h: transactions.length,
      revenue24h: transactions
        .filter(t => t.transaction_info?.transaction_event_code === 'T0000')
        .reduce((sum, t) => sum + parseFloat(t.transaction_info?.transaction_amount?.value || '0'), 0),
    };

    log('Daily Metrics', JSON.stringify(metrics, null, 2), 'ok');

    // In production: save to database, send to Slack/email, push to analytics
    log('Report', 'Generated successfully', 'ok');

    return metrics;
  } catch (error) {
    log('Error', `Report generation failed: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    return null;
  }
}

async function checkDisputeAging() {
  section('Dispute Aging Check');
  try {
    // In production, would query disputes from PayPal API
    // For now, simulate check
    log('Open Disputes', 'Check disputes via PayPal Dashboard', 'info');
    log('Aging', 'Disputes > 10 days need escalation', 'info');
    log('Evidence', 'Auto-collect from Channel3 for procurement disputes', 'info');
    return true;
  } catch (error) {
    log('Error', `Dispute check failed: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    return false;
  }
}

async function runScheduledTasks() {
  console.log(`${BOLD}${CYAN}`);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              PAYOPS SCHEDULED TASKS WORKER                   ║');
  console.log('║              PayPal AI Hackathon 2026                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`${RESET}`);
  log('Timestamp', new Date().toISOString());
  log('Mode', process.env.NODE_ENV || 'development');

  const results = await Promise.allSettled([
    checkOverdueInvoices(),
    reconcileTransactions(),
    checkAccountHealth(),
    syncCatalog(),
    generateDailyReport(),
    checkDisputeAging(),
  ]);

  section('Task Summary');
  const taskNames = [
    'Overdue Check',
    'Reconciliation',
    'Health Check',
    'Catalog Sync',
    'Daily Report',
    'Dispute Aging',
  ];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      log(taskNames[i], 'Completed', 'ok');
    } else {
      log(taskNames[i], `Failed: ${result.reason}`, 'error');
    }
  });

  log('Next Run', 'In 15 minutes (Render cronJob)', 'info');
}

// Run once and exit (for cronJob)
runScheduledTasks()
  .then(() => {
    log('Worker', 'All tasks completed', 'ok');
    process.exit(0);
  })
  .catch(error => {
    log('Worker', `Fatal error: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    process.exit(1);
  });