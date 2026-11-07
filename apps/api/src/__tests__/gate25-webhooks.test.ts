import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock paypal-client
vi.mock('@/lib/paypal-client', () => ({
  verifyWebhookSignature: vi.fn(),
  simulateWebhookEvent: vi.fn(),
  get: vi.fn(),
}));

import { verifyWebhookSignature, simulateWebhookEvent, get } from '@/lib/paypal-client';

describe('Gate 2.5: Raw-Body Signed Webhook Receiver, Simulator & SSE Stream', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.PAYPAL_WEBHOOK_ID = 'WH-TEST123';
    // Reset processed events
    const { processedEventIds } = await import('@app/api/webhooks/paypal/route');
    processedEventIds.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/webhooks/paypal', () => {
    it('should reject request without PAYPAL_WEBHOOK_ID', async () => {
      delete process.env.PAYPAL_WEBHOOK_ID;

      const { POST } = await import('@app/api/webhooks/paypal/route');

      const request = new NextRequest('http://localhost:3000/api/webhooks/paypal', {
        method: 'POST',
        body: JSON.stringify({ id: 'evt-1', event_type: 'INVOICING.INVOICE.PAID' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Webhook not configured');
    });

    it('should verify webhook signature using raw body', async () => {
      (verifyWebhookSignature as any).mockResolvedValue({
        verification_status: 'SUCCESS',
      });

      const { POST } = await import('@app/api/webhooks/paypal/route');

      const rawBody = JSON.stringify({
        id: 'evt-test-1',
        event_type: 'INVOICING.INVOICE.PAID',
        create_time: new Date().toISOString(),
        resource: { id: 'INV-123', amount: { value: '100.00', currency_code: 'USD' } },
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/paypal', {
        method: 'POST',
        body: rawBody,
        headers: {
          'Content-Type': 'application/json',
          'paypal-auth-algo': 'SHA256',
          'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/cert/CERT-123',
          'paypal-transmission-id': 'trans-123',
          'paypal-transmission-sig': 'sig-123',
          'paypal-transmission-time': new Date().toISOString(),
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('received');
      expect(data.eventId).toBe('evt-test-1');
      // Verify called with raw body headers
      expect(verifyWebhookSignature).toHaveBeenCalledWith(
        'WH-TEST123',
        expect.objectContaining({
          'paypal-auth-algo': 'SHA256',
          'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/cert/CERT-123',
        }),
        expect.any(Object)
      );
    });

    it('should reject invalid signature', async () => {
      (verifyWebhookSignature as any).mockResolvedValue({
        verification_status: 'FAILURE',
      });

      const { POST } = await import('@app/api/webhooks/paypal/route');

      const request = new NextRequest('http://localhost:3000/api/webhooks/paypal', {
        method: 'POST',
        body: JSON.stringify({ id: 'evt-test-2', event_type: 'INVOICING.INVOICE.PAID' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid signature');
    });

    it('should deduplicate events by event ID', async () => {
      (verifyWebhookSignature as any).mockResolvedValue({
        verification_status: 'SUCCESS',
      });

      const { POST, processedEventIds } = await import('@app/api/webhooks/paypal/route');

      const rawBody = JSON.stringify({
        id: 'evt-duplicate',
        event_type: 'INVOICING.INVOICE.PAID',
        create_time: new Date().toISOString(),
        resource: { id: 'INV-123' },
      });

      // First request
      const request1 = new NextRequest('http://localhost:3000/api/webhooks/paypal', {
        method: 'POST',
        body: rawBody,
        headers: { 'Content-Type': 'application/json' },
      });
      await POST(request1);

      // Second request with same event ID
      const request2 = new NextRequest('http://localhost:3000/api/webhooks/paypal', {
        method: 'POST',
        body: rawBody,
        headers: { 'Content-Type': 'application/json' },
      });
      const response2 = await POST(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(200);
      expect(data2.status).toBe('duplicate');
      expect(data2.eventId).toBe('evt-duplicate');
    });

    it('should process different event types', async () => {
      (verifyWebhookSignature as any).mockResolvedValue({
        verification_status: 'SUCCESS',
      });

      const { POST } = await import('@app/api/webhooks/paypal/route');

      const eventTypes = [
        'INVOICING.INVOICE.PAID',
        'INVOICING.INVOICE.OVERDUE',
        'PAYMENT.CAPTURE.COMPLETED',
        'PAYMENT.CAPTURE.DENIED',
        'CUSTOMER.DISPUTE.CREATED',
        'CUSTOMER.DISPUTE.RESOLVED',
        'BILLING.SUBSCRIPTION.CREATED',
        'CHECKOUT.ORDER.APPROVED',
      ];

      for (const eventType of eventTypes) {
        const rawBody = JSON.stringify({
          id: `evt-${eventType.replace(/\./g, '-').toLowerCase()}`,
          event_type: eventType,
          create_time: new Date().toISOString(),
          resource: { id: 'RES-123' },
        });

        const request = new NextRequest('http://localhost:3000/api/webhooks/paypal', {
          method: 'POST',
          body: rawBody,
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe('received');
      }
    });
  });

  describe('POST /api/webhooks/simulate', () => {
    it('should return supported events on GET', async () => {
      const { GET } = await import('@app/api/webhooks/simulate/route');

      const request = new NextRequest('http://localhost:3000/api/webhooks/simulate');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.simulatableEvents).toBeDefined();
      expect(data.simulatableEvents).toContain('INVOICING.INVOICE.PAID');
      expect(data.simulatableEvents).toContain('PAYMENT.CAPTURE.COMPLETED');
      expect(data.simulatableEvents).toContain('CUSTOMER.DISPUTE.CREATED');
    });

    it('should simulate INVOICING.INVOICE.PAID event', async () => {
      (simulateWebhookEvent as any).mockResolvedValue({ event_id: 'sim-evt-1' });
      (get as any).mockResolvedValue({
        headers: {
          'paypal-auth-algo': 'SHA256',
          'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/cert/CERT-123',
          'paypal-transmission-id': 'trans-123',
          'paypal-transmission-sig': 'sig-123',
          'paypal-transmission-time': new Date().toISOString(),
        },
        event: { id: 'sim-evt-1', event_type: 'INVOICING.INVOICE.PAID' },
      });
      (verifyWebhookSignature as any).mockResolvedValue({
        verification_status: 'SUCCESS',
      });

      const { POST } = await import('@app/api/webhooks/simulate/route');

      const request = new NextRequest('http://localhost:3000/api/webhooks/simulate', {
        method: 'POST',
        body: JSON.stringify({ eventType: 'INVOICING.INVOICE.PAID' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.eventId).toBe('sim-evt-1');
      expect(data.verification).toBeDefined();
      expect(simulateWebhookEvent).toHaveBeenCalledWith(
        'INVOICING.INVOICE.PAID',
        expect.any(Object)
      );
    });

    it('should simulate PAYMENT.CAPTURE.COMPLETED event', async () => {
      (simulateWebhookEvent as any).mockResolvedValue({ event_id: 'sim-evt-2' });
      (get as any).mockResolvedValue({
        headers: {},
        event: { id: 'sim-evt-2', event_type: 'PAYMENT.CAPTURE.COMPLETED' },
      });
      (verifyWebhookSignature as any).mockResolvedValue({
        verification_status: 'SUCCESS',
      });

      const { POST } = await import('@app/api/webhooks/simulate/route');

      const request = new NextRequest('http://localhost:3000/api/webhooks/simulate', {
        method: 'POST',
        body: JSON.stringify({ eventType: 'PAYMENT.CAPTURE.COMPLETED' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.eventId).toBe('sim-evt-2');
    });

    it('should simulate CUSTOMER.DISPUTE.CREATED event', async () => {
      (simulateWebhookEvent as any).mockResolvedValue({ event_id: 'sim-evt-3' });
      (get as any).mockResolvedValue({
        headers: {},
        event: { id: 'sim-evt-3', event_type: 'CUSTOMER.DISPUTE.CREATED' },
      });
      (verifyWebhookSignature as any).mockResolvedValue({
        verification_status: 'SUCCESS',
      });

      const { POST } = await import('@app/api/webhooks/simulate/route');

      const request = new NextRequest('http://localhost:3000/api/webhooks/simulate', {
        method: 'POST',
        body: JSON.stringify({ eventType: 'CUSTOMER.DISPUTE.CREATED' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.eventId).toBe('sim-evt-3');
    });

    it('should reject unsupported event type', async () => {
      const { POST } = await import('@app/api/webhooks/simulate/route');

      const request = new NextRequest('http://localhost:3000/api/webhooks/simulate', {
        method: 'POST',
        body: JSON.stringify({ eventType: 'INVALID.EVENT.TYPE' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Unsupported event type');
    });
  });

  describe('GET /api/events/stream', () => {
    it('should return SSE stream', async () => {
      const { GET } = await import('@app/api/events/stream/route');

      const request = new NextRequest('http://localhost:3000/api/events/stream');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    it('should accept lastEventId parameter', async () => {
      const { GET } = await import('@app/api/events/stream/route');

      const request = new NextRequest('http://localhost:3000/api/events/stream?lastEventId=evt-123');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });
});