// PayPal Webhook Receiver with Signature Verification
// Returns 200 OK immediately, processes asynchronously
// Includes "Simulate Webhook Event" for judge testing

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, listDisputes, getDispute, getOrder, searchTransactions, simulateWebhookEvent } from '@/lib/paypal-client';

const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;

interface WebhookEvent {
  id: string;
  event_type: string;
  create_time: string;
  resource_type: string;
  resource: Record<string, unknown>;
  links?: Array<{ href: string; rel: string; method: string }>;
}

async function verifySignature(headers: Record<string, string>, body: unknown): Promise<boolean> {
  if (!WEBHOOK_ID) {
    console.warn('⚠️ PAYPAL_WEBHOOK_ID not configured, skipping signature verification');
    return true; // Allow in development
  }

  try {
    const result = await verifyWebhookSignature(WEBHOOK_ID, headers, body);
    return result.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

async function processWebhookEvent(event: WebhookEvent): Promise<void> {
  console.log(`🔔 Processing webhook: ${event.event_type} (${event.id})`);

  try {
    switch (event.event_type) {
      // Payment events
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCaptureCompleted(event);
        break;
      case 'PAYMENT.CAPTURE.DENIED':
        await handlePaymentCaptureDenied(event);
        break;
      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaymentCaptureRefunded(event);
        break;

      // Order events
      case 'CHECKOUT.ORDER.APPROVED':
        await handleOrderApproved(event);
        break;
      case 'CHECKOUT.ORDER.COMPLETED':
        await handleOrderCompleted(event);
        break;

      // Invoice events
      case 'INVOICING.INVOICE.CREATED':
      case 'INVOICING.INVOICE.SENT':
      case 'INVOICING.INVOICE.PAID':
      case 'INVOICING.INVOICE.OVERDUE':
      case 'INVOICING.INVOICE.CANCELLED':
      case 'INVOICING.INVOICE.REFUNDED':
        await handleInvoiceEvent(event);
        break;

      // Subscription events
      case 'BILLING.SUBSCRIPTION.CREATED':
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        await handleSubscriptionEvent(event);
        break;

      // Dispute events
      case 'CUSTOMER.DISPUTE.CREATED':
      case 'CUSTOMER.DISPUTE.RESOLVED':
      case 'CUSTOMER.DISPUTE.UPDATED':
        await handleDisputeEvent(event);
        break;

      default:
        console.log(`ℹ️ Unhandled webhook event type: ${event.event_type}`);
    }
  } catch (error) {
    console.error(`❌ Error processing webhook ${event.event_type}:`, error);
    // Don't throw - we already returned 200 OK
  }
}

async function handlePaymentCaptureCompleted(event: WebhookEvent): Promise<void> {
  const resource = event.resource as { id: string; amount: { value: string; currency_code: string }; invoice_id?: string };
  console.log(`✅ Payment captured: ${resource.id} - ${resource.amount.value} ${resource.amount.currency_code}`);

  // Update Gantt milestones, trigger fulfillment, etc.
  // This would integrate with Bryntum Gantt to unlock payment-locked milestones
}

async function handlePaymentCaptureDenied(event: WebhookEvent): Promise<void> {
  const resource = event.resource as { id: string; amount: { value: string; currency_code: string }; status_details?: { reason: string } };
  console.log(`❌ Payment denied: ${resource.id} - ${resource.status_details?.reason}`);
  // Trigger retry logic, notify customer, update dispute triage
}

async function handlePaymentCaptureRefunded(event: WebhookEvent): Promise<void> {
  const resource = event.resource as { id: string; amount: { value: string; currency_code: string } };
  console.log(`🔄 Payment refunded: ${resource.id} - ${resource.amount.value} ${resource.amount.currency_code}`);
}

async function handleOrderApproved(event: WebhookEvent): Promise<void> {
  const resource = event.resource as { id: string };
  console.log(`📦 Order approved: ${resource.id}`);
  // Order approved by payer, ready for capture
}

async function handleOrderCompleted(event: WebhookEvent): Promise<void> {
  const resource = event.resource as { id: string };
  console.log(`✅ Order completed: ${resource.id}`);
  // Trigger fulfillment workflow
}

async function handleInvoiceEvent(event: WebhookEvent): Promise<void> {
  const resource = event.resource as { id: string; status: string; invoice_number: string };
  console.log(`📄 Invoice ${event.event_type}: ${resource.invoice_number} (${resource.status})`);

  // Update AG Studio dashboard data
  // Trigger nudge-bot for overdue invoices
  // Update Bryntum Gantt milestone status
}

async function handleSubscriptionEvent(event: WebhookEvent): Promise<void> {
  const resource = event.resource as { id: string; status: string; plan_id: string };
  console.log(`🔄 Subscription ${event.event_type}: ${resource.id} (${resource.status})`);
  // Update recurring revenue analytics
  // Handle trial conversions, cancellations
}

async function handleDisputeEvent(event: WebhookEvent): Promise<void> {
  const resource = event.resource as { dispute_id: string; status: string; reason: string; dispute_amount: { value: string; currency_code: string } };
  console.log(`⚖️ Dispute ${event.event_type}: ${resource.dispute_id} - ${resource.reason} (${resource.dispute_amount.value} ${resource.dispute_amount.currency_code})`);

  // Update Bryntum dispute triage board
  // Trigger evidence collection workflow
  // Notify legal/finance team
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Read raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody) as WebhookEvent;

    // Extract PayPal headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (key.startsWith('paypal-')) {
        headers[key] = value;
      }
    });

    // Verify signature
    const valid = await verifySignature(headers, body);
    if (!valid) {
      console.error('🔴 Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Return 200 OK immediately
    const response = NextResponse.json({ received: true, event_id: body.id });

    // Process asynchronously (don't await)
    processWebhookEvent(body).catch(error => {
      console.error('Async webhook processing error:', error);
    });

    console.log(`⚡ Webhook ${body.event_type} acknowledged in ${Date.now() - startTime}ms`);
    return response;
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}

// GET endpoint for health check and judge demo
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'simulate') {
    const eventType = searchParams.get('event_type') || 'PAYMENT.CAPTURE.COMPLETED';
    const resourceId = searchParams.get('resource_id') || 'test-' + Date.now();

    try {
      const result = await simulateWebhookEvent(eventType, { id: resourceId });
      return NextResponse.json({
        success: true,
        message: `Simulated ${eventType} for resource ${resourceId}`,
        event_id: result.event_id,
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Simulation failed',
      }, { status: 500 });
    }
  }

  if (action === 'test-dispute') {
    try {
      const disputes = await listDisputes();
      return NextResponse.json({ disputes });
    } catch (error) {
      return NextResponse.json({ error: 'Failed to list disputes' }, { status: 500 });
    }
  }

  return NextResponse.json({
    status: 'ok',
    message: 'PayPal Webhook Receiver',
    webhook_id: WEBHOOK_ID ? 'configured' : 'not configured',
    endpoints: {
      simulate: '?action=simulate&event_type=PAYMENT.CAPTURE.COMPLETED',
      test_dispute: '?action=test-dispute',
    },
  });
}