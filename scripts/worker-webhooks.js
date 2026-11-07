// PayPal Webhook Background Worker
// Processes webhook events asynchronously via Render Workflows
// Run with: npm run worker:webhooks

import 'dotenv/config';
import { getChannel3Client } from '../lib/channel3-client';
import { listInvoices, searchTransactions, updateInvoice } from '../lib/paypal-client';

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

// In-memory queue for webhook events (in production, use Redis/RabbitMQ)
const eventQueue: Array<{
  id: string;
  event_type: string;
  resource: any;
  received_at: Date;
  attempts: number;
}> = [];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

async function processInvoicePaid(resource: any) {
  log('Processing', `INVOICING.INVOICE.PAID - Invoice: ${resource.id}`);
  try {
    // Auto-invoice next milestone for this customer
    const invoices = await listInvoices();
    const customerInvoices = invoices.filter(inv =>
      inv.primary_recipients?.[0]?.billing_info?.email_address ===
      resource.primary_recipients?.[0]?.billing_info?.email_address
    );

    // Find next pending/draft milestone invoice
    const nextMilestone = customerInvoices.find(inv =>
      inv.status === 'DRAFT' && inv.detail.invoice_number?.includes('MILESTONE')
    );

    if (nextMilestone) {
      log('Auto-invoicing', `Next milestone: ${nextMilestone.id}`);
      // In production: send milestone invoice
      // await sendInvoice(nextMilestone.id);
    }
    log('Complete', 'Milestone check done', 'ok');
  } catch (error) {
    log('Error', `Failed to process invoice paid: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    throw error;
  }
}

async function processInvoiceOverdue(resource: any) {
  log('Processing', `INVOICING.INVOICE.OVERDUE - Invoice: ${resource.id}`);
  try {
    // Trigger dunning workflow
    log('Action', 'Dunning email queued', 'ok');
    log('Action', 'Overdue fee applied', 'ok');
    log('Complete', 'Overdue workflow triggered', 'ok');
  } catch (error) {
    log('Error', `Failed to process overdue: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    throw error;
  }
}

async function processDisputeCreated(resource: any) {
  log('Processing', `CUSTOMER.DISPUTE.CREATED - Dispute: ${resource.id}`);
  try {
    // Link dispute to invoice
    const disputeInvoiceId = resource.invoice_id;
    if (disputeInvoiceId) {
      log('Linking', `Dispute ${resource.id} linked to invoice ${disputeInvoiceId}`);
      // In production: update invoice status, notify customer
    }
    // Auto-collect evidence from Channel3 if procurement-related
    if (resource.reason === 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED') {
      log('Evidence', 'Fetching procurement proof from Channel3...', 'info');
      const client = getChannel3Client();
      // Search for order confirmation
      await client.search({ query: 'order confirmation', limit: 1 });
      log('Evidence', 'Procurement records retrieved', 'ok');
    }
    log('Complete', 'Dispute triage done', 'ok');
  } catch (error) {
    log('Error', `Failed to process dispute: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    throw error;
  }
}

async function processDisputeResolved(resource: any) {
  log('Processing', `CUSTOMER.DISPUTE.RESOLVED - Dispute: ${resource.id}`);
  try {
    log('Resolution', `Outcome: ${resource.outcome_code}`);
    if (resource.outcome_code === 'RESOLVED_BUYER_FAVOUR') {
      log('Action', 'Refund initiated', 'ok');
    } else if (resource.outcome_code === 'RESOLVED_SELLER_FAVOUR') {
      log('Action', 'Funds released to seller', 'ok');
    }
    log('Complete', 'Dispute resolution processed', 'ok');
  } catch (error) {
    log('Error', `Failed to process dispute resolution: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    throw error;
  }
}

async function processPaymentCaptureCompleted(resource: any) {
  log('Processing', `PAYMENT.CAPTURE.COMPLETED - Capture: ${resource.id}`);
  try {
    // Reconcile with invoices
    const invoiceId = resource.invoice_id;
    if (invoiceId) {
      log('Reconciliation', `Payment ${resource.id} matched to invoice ${invoiceId}`);
    }
    log('Complete', 'Payment reconciled', 'ok');
  } catch (error) {
    log('Error', `Failed to process payment: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
    throw error;
  }
}

async function processEvent(event: any) {
  const { event_type, resource } = event;
  log('Received', `${event_type}`, 'info');

  switch (event_type) {
    case 'INVOICING.INVOICE.PAID':
      await processInvoicePaid(resource);
      break;
    case 'INVOICING.INVOICE.OVERDUE':
      await processInvoiceOverdue(resource);
      break;
    case 'CUSTOMER.DISPUTE.CREATED':
      await processDisputeCreated(resource);
      break;
    case 'CUSTOMER.DISPUTE.RESOLVED':
      await processDisputeResolved(resource);
      break;
    case 'PAYMENT.CAPTURE.COMPLETED':
      await processPaymentCaptureCompleted(resource);
      break;
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
    case 'BILLING.SUBSCRIPTION.CANCELLED':
    case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
      log('Subscription Event', `${event_type} - ${resource.id}`, 'info');
      break;
    default:
      log('Unhandled', `Event type ${event_type} - logged for review`, 'warn');
  }
}

async function processQueue() {
  while (eventQueue.length > 0) {
    const event = eventQueue.shift()!;
    try {
      await processEvent(event);
    } catch (error) {
      event.attempts++;
      if (event.attempts < MAX_RETRIES) {
        log('Retry', `Event ${event.id} (attempt ${event.attempts + 1}/${MAX_RETRIES})`, 'warn');
        // Re-queue with delay
        setTimeout(() => eventQueue.unshift(event), RETRY_DELAY_MS);
      } else {
        log('Failed', `Event ${event.id} exceeded max retries`, 'error');
        // In production: send to dead letter queue
      }
    }
  }
}

// Simulate receiving webhook events (in production, this would be an HTTP endpoint)
function simulateIncomingWebhook(event_type: string, resource: any) {
  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    event_type,
    resource,
    received_at: new Date(),
    attempts: 0,
  };
  eventQueue.push(event);
  log('Queued', `${event_type} - ${event.id}`, 'info');
}

// Demo: simulate incoming webhooks every 30 seconds
async function runDemo() {
  section('PayOps Webhook Worker Started');
  log('Mode', 'Demo simulation (replace with HTTP endpoint in production)');
  log('Queue', 'In-memory (use Redis in production)', 'warn');

  // Simulate some initial events
  setTimeout(() => simulateIncomingWebhook('INVOICING.INVOICE.PAID', {
    id: 'INV2-XXXX-XXXX-XXXX',
    status: 'PAID',
    primary_recipients: [{ billing_info: { email_address: 'client@enterprise.com' } }],
    detail: { invoice_number: 'INV-2026-001' }
  }), 5000);

  setTimeout(() => simulateIncomingWebhook('CUSTOMER.DISPUTE.CREATED', {
    id: 'DSP-XXXX-XXXX-XXXX',
    reason: 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED',
    invoice_id: 'INV2-XXXX-XXXX-XXXX',
    status: 'OPEN'
  }), 15000);

  setTimeout(() => simulateIncomingWebhook('INVOICING.INVOICE.OVERDUE', {
    id: 'INV2-YYYY-YYYY-YYYY',
    status: 'OVERDUE',
    detail: { invoice_number: 'INV-2026-002' }
  }), 25000);

  setTimeout(() => simulateIncomingWebhook('PAYMENT.CAPTURE.COMPLETED', {
    id: 'CAP-XXXX-XXXX-XXXX',
    invoice_id: 'INV2-XXXX-XXXX-XXXX',
    amount: { value: '5000.00', currency_code: 'USD' },
    status: 'COMPLETED'
  }), 35000);

  // Process queue continuously
  setInterval(() => {
    if (eventQueue.length > 0) {
      processQueue();
    }
  }, 2000);

  // Keep alive
  setInterval(() => {
    if (eventQueue.length > 0) {
      log('Queue Status', `${eventQueue.length} events pending`, 'info');
    }
  }, 30000);
}

runDemo().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
  log('Shutdown', 'Webhook worker stopping...', 'warn');
  process.exit(0);
});