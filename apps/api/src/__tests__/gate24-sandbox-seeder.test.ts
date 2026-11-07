import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the paypal-client module
vi.mock('@/lib/paypal-client', () => ({
  listProducts: vi.fn(),
  createProduct: vi.fn(),
  listPlans: vi.fn(),
  createPlan: vi.fn(),
  listInvoices: vi.fn(),
  createInvoice: vi.fn(),
  sendInvoice: vi.fn(),
  createOrder: vi.fn(),
  createSubscription: vi.fn(),
  listDisputes: vi.fn(),
  searchTransactions: vi.fn(),
  createShippingTracker: vi.fn(),
  generateInvoiceQrCode: vi.fn(),
  updateInvoiceEarlyPaymentDiscount: vi.fn(),
  recordInvoicePayment: vi.fn(),
}));

import {
  listProducts,
  createProduct,
  listPlans,
  createPlan,
  listInvoices,
  createInvoice,
  sendInvoice,
  createOrder,
  createSubscription,
  listDisputes,
  searchTransactions,
  generateInvoiceQrCode,
  updateInvoiceEarlyPaymentDiscount,
  recordInvoicePayment,
} from '@/lib/paypal-client';

describe('Gate 2.4: Idempotent Live Sandbox Auto-Seeder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global seed status store
    (globalThis as any).__seedStatusStore = new Map();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/sandbox/seed', () => {
    it('should start seeding and return seedId', async () => {
      // Mock successful API calls
      (listProducts as any).mockResolvedValue([]);
      (createProduct as any).mockImplementation((p: any) => Promise.resolve({ id: `PROD-${Date.now()}`, ...p }));
      (listPlans as any).mockResolvedValue([]);
      (createPlan as any).mockImplementation((p: any) => Promise.resolve({ id: `PLAN-${Date.now()}`, ...p }));
      (listInvoices as any).mockResolvedValue([]);
      (createInvoice as any).mockImplementation((i: any) => Promise.resolve({ id: `INV-${Date.now()}`, ...i }));
      (sendInvoice as any).mockResolvedValue(undefined);
      (createOrder as any).mockImplementation((o: any) => Promise.resolve({ id: `ORD-${Date.now()}`, ...o }));
      (createSubscription as any).mockImplementation((s: any) => Promise.resolve({ id: `SUB-${Date.now()}`, ...s }));
      (listDisputes as any).mockResolvedValue([]);
      (searchTransactions as any).mockResolvedValue([]);

      const { POST } = await import('@app/api/sandbox/seed/route');

      const request = new NextRequest('http://localhost:3000/api/sandbox/seed', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.seedId).toBeDefined();
      expect(data.status).toBe('started');
      expect(data.message).toContain('Sandbox seeding started');
    });

    it('should handle idempotent product creation', async () => {
      const existingProduct = { id: 'PROD-EXISTING', name: 'AI-Powered Procurement Platform', type: 'SERVICE', category: 'SOFTWARE', description: 'Autonomous procurement with Channel3 integration and PayPal guarded checkout' };
      (listProducts as any).mockResolvedValue([existingProduct]);
      (createProduct as any).mockImplementation((p: any) => Promise.resolve({ id: `PROD-${Date.now()}`, ...p }));
      (listPlans as any).mockResolvedValue([]);
      (createPlan as any).mockImplementation((p: any) => Promise.resolve({ id: `PLAN-${Date.now()}`, ...p }));
      (listInvoices as any).mockResolvedValue([]);
      (createInvoice as any).mockImplementation((i: any) => Promise.resolve({ id: `INV-${Date.now()}`, ...i }));
      (sendInvoice as any).mockResolvedValue(undefined);
      (createOrder as any).mockImplementation((o: any) => Promise.resolve({ id: `ORD-${Date.now()}`, ...o }));
      (createSubscription as any).mockImplementation((s: any) => Promise.resolve({ id: `SUB-${Date.now()}`, ...s }));
      (listDisputes as any).mockResolvedValue([]);
      (searchTransactions as any).mockResolvedValue([]);

      const { POST } = await import('@app/api/sandbox/seed/route');

      const request = new NextRequest('http://localhost:3000/api/sandbox/seed', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Product should not be recreated - verify it wasn't called with the matching name
      const createProductCalls = (createProduct as any).mock.calls;
      const calledWithExistingName = createProductCalls.some((call: any[]) =>
        call[0]?.name === 'AI-Powered Procurement Platform'
      );
      expect(calledWithExistingName).toBe(false);
    });

    it('should handle idempotent invoice creation', async () => {
      const existingInvoice = {
        id: 'INV-EXISTING',
        detail: { invoice_number: 'INV-202611-0001' },
      };
      (listProducts as any).mockResolvedValue([{ id: 'PROD-1', name: 'Test Product', type: 'SERVICE', category: 'SOFTWARE' }]);
      (createProduct as any).mockImplementation((p: any) => Promise.resolve({ id: `PROD-${Date.now()}`, ...p }));
      (listPlans as any).mockResolvedValue([]);
      (createPlan as any).mockImplementation((p: any) => Promise.resolve({ id: `PLAN-${Date.now()}`, ...p }));
      (listInvoices as any).mockResolvedValue([existingInvoice]);
      (createInvoice as any).mockImplementation((i: any) => Promise.resolve({ id: `INV-${Date.now()}`, ...i }));
      (sendInvoice as any).mockResolvedValue(undefined);
      (createOrder as any).mockImplementation((o: any) => Promise.resolve({ id: `ORD-${Date.now()}`, ...o }));
      (createSubscription as any).mockImplementation((s: any) => Promise.resolve({ id: `SUB-${Date.now()}`, ...s }));
      (listDisputes as any).mockResolvedValue([]);
      (searchTransactions as any).mockResolvedValue([]);

      const { POST } = await import('@app/api/sandbox/seed/route');

      const request = new NextRequest('http://localhost:3000/api/sandbox/seed', {
        method: 'POST',
      });

      await POST(request);
      // Wait a bit for async seeding to run listInvoices
      await new Promise(resolve => setTimeout(resolve, 100));

      // Invoices with duplicate numbers should not be recreated
      // Verify listInvoices was called to check existing invoices
      expect(listInvoices).toHaveBeenCalled();
    });
  });

  describe('GET /api/sandbox/status', () => {
    it('should return 404 for unknown seedId', async () => {
      const { GET } = await import('@app/api/sandbox/status/route');

      const request = new NextRequest('http://localhost:3000/api/sandbox/status?seedId=unknown-id');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Seed not found');
    });

    it('should return seed status when found', async () => {
      const mockStatus = {
        id: 'test-seed-id',
        startedAt: new Date().toISOString(),
        status: 'running',
        counts: {
          products: { created: 2, existing: 2 },
          plans: { created: 1, existing: 2 },
          invoices: { created: 5, existing: 0 },
          orders: { created: 3, existing: 2 },
          subscriptions: { created: 2, existing: 0 },
          disputes: { fetched: 0 },
          shipments: { created: 0 },
        },
      };

      (globalThis as any).__seedStatusStore = new Map([['test-seed-id', mockStatus]]);

      const { GET } = await import('@app/api/sandbox/status/route');

      const request = new NextRequest('http://localhost:3000/api/sandbox/status?seedId=test-seed-id');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('test-seed-id');
      expect(data.status).toBe('running');
      expect(data.counts.products.created).toBe(2);
    });
  });
});