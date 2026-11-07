// PayPal API Client - REST v2 APIs with retries, pagination, and error handling
// Uses @paypal/agent-toolkit for agent function-calling

import { paypalAuth } from './paypal-auth';

const BASE_URL = 'https://api-m.sandbox.paypal.com';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [250, 500, 1000]; // ms
export const TRANSACTION_SEARCH_MAX_DAYS = 30;

export class PayPalApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    public readonly body: string,
    public readonly retryable: boolean = false
  ) {
    super(`PayPal API Error: ${status} ${path} - ${body.slice(0, 500)}`);
    this.name = 'PayPalApiError';
  }
}

interface RequestOptions extends RequestInit {
  query?: Record<string, string>;
}

async function buildUrl(path: string, query?: Record<string, string>): Promise<string> {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  return url.toString();
}

async function fetchWithRetry<T>(
  url: string,
  options: RequestOptions,
  attempt: number = 0
): Promise<T> {
  const token = await paypalAuth.getAccessToken();

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/json');
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  // Add PayPal-Request-Id for idempotency on mutating requests
  const isMutating = ['POST', 'PATCH', 'PUT', 'DELETE'].includes((options.method || 'GET').toUpperCase());
  if (isMutating && !headers.has('PayPal-Request-Id')) {
    headers.set('PayPal-Request-Id', crypto.randomUUID());
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store',
    });

    // Handle 401 - token expired, invalidate and retry once
    if (response.status === 401 && attempt === 0) {
      paypalAuth.invalidateToken();
      return fetchWithRetry<T>(url, options, attempt + 1);
    }

    // Handle retryable errors (429, 5xx)
    if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      return fetchWithRetry<T>(url, options, attempt + 1);
    }

    const body = await response.text();

    if (!response.ok) {
      throw new PayPalApiError(
        response.status,
        url,
        body,
        response.status === 429 || response.status >= 500
      );
    }

    if (!body) return {} as T;
    return JSON.parse(body) as T;
  } catch (error) {
    if (error instanceof PayPalApiError) throw error;
    throw new PayPalApiError(0, url, error instanceof Error ? error.message : 'Network error', true);
  }
}

export async function get<T>(path: string, query?: Record<string, string>): Promise<T> {
  const url = await buildUrl(path, query);
  return fetchWithRetry<T>(url, { method: 'GET' });
}

export async function post<T>(path: string, body: unknown, query?: Record<string, string>): Promise<T> {
  const url = await buildUrl(path, query);
  return fetchWithRetry<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function patch<T>(path: string, body: unknown, query?: Record<string, string>): Promise<T> {
  const url = await buildUrl(path, query);
  return fetchWithRetry<T>(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function put<T>(path: string, body: unknown, query?: Record<string, string>): Promise<T> {
  const url = await buildUrl(path, query);
  return fetchWithRetry<T>(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function del<T>(path: string, query?: Record<string, string>): Promise<T> {
  const url = await buildUrl(path, query);
  return fetchWithRetry<T>(url, { method: 'DELETE' });
}

// Pagination helper
export async function listAll<T>(
  path: string,
  itemsKey: string,
  pageSize: number = 100,
  initialQuery?: Record<string, string>
): Promise<T[]> {
  const items: T[] = [];
  const query = { ...initialQuery, page_size: String(pageSize), total_required: 'true' };

  for (let page = 1; ; page++) {
    const response = await get<Record<string, unknown> & { total_pages?: number }>(path, {
      ...query,
      page: String(page),
    });

    const pageItems = (response[itemsKey] as T[] | undefined) ?? [];
    items.push(...pageItems);

    if (page >= (response.total_pages ?? 1)) break;
  }

  return items;
}

// Type definitions for PayPal APIs
export interface Money {
  value: string;
  currency_code: string;
}

export const amountOf = (money?: Money | null): number => {
  if (!money || money.value === undefined) return 0;
  return Number(money.value);
};

export interface Product {
  id: string;
  name: string;
  description?: string;
  type?: 'PHYSICAL' | 'DIGITAL' | 'SERVICE';
  category?: string;
  create_time: string;
  update_time?: string;
}

export interface BillingCycle {
  frequency: {
    interval_unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
    interval_count: number;
  };
  tenure_type: 'REGULAR' | 'TRIAL';
  sequence: number;
  total_cycles: number;
  pricing_scheme?: {
    fixed_price?: Money;
    version?: number;
  };
}

export interface Plan {
  id: string;
  product_id: string;
  name: string;
  status: 'CREATED' | 'INACTIVE' | 'ACTIVE';
  create_time: string;
  update_time?: string;
  billing_cycles: BillingCycle[];
  payment_preferences?: {
    setup_fee?: Money;
    auto_bill_outstanding?: boolean;
    payment_failure_threshold?: number;
  };
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'SCHEDULED' | 'UNPAID' | 'PAYMENT_PENDING' |
  'PAID' | 'MARKED_AS_PAID' | 'PARTIALLY_PAID' | 'REFUNDED' |
  'PARTIALLY_REFUNDED' | 'MARKED_AS_REFUNDED' | 'CANCELLED';

export interface Invoice {
  id: string;
  status: InvoiceStatus;
  detail: {
    invoice_number: string;
    currency_code: string;
    invoice_date?: string;
    payment_term?: {
      term_type?: string;
      due_date?: string;
    };
    note?: string;
    term?: string;
  };
  primary_recipients?: {
    billing_info?: {
      name?: { full_name?: string };
      business_name?: string;
      email_address?: string;
      address?: {
        address_line_1?: string;
        address_line_2?: string;
        admin_area_2?: string;
        admin_area_1?: string;
        postal_code?: string;
        country_code?: string;
      };
    };
  }[];
  items?: {
    id?: string;
    name: string;
    quantity: string;
    unit_amount: Money;
    unit_of_measure?: string;
    tax?: { percent?: string; amount?: Money };
    discount?: { percent?: string; amount?: Money };
  }[];
  amount?: Money & { breakdown?: { tax_total?: Money; shipping?: { amount?: Money } } };
  due_amount?: Money;
  payments?: {
    paid_amount?: Money;
    transactions?: {
      payment_id?: string;
      payment_date?: string;
      method?: string;
      amount: Money;
    }[];
  };
  refunds?: {
    refund_amount?: Money;
    transactions?: {
      recipient_transaction_id?: string;
      refund_date?: string;
      method?: string;
      amount: Money;
    }[];
  };
}

export interface Transaction {
  transaction_info: {
    transaction_id: string;
    paypal_reference_id?: string;
    transaction_event_code?: string;
    transaction_initiation_date?: string;
    transaction_amount?: Money;
    fee_amount?: Money;
    transaction_status?: string;
    ending_balance?: Money;
    transaction_subject?: string;
    transaction_note?: string;
    custom_field?: string;
  };
  payer_info?: { email_address?: string };
  shipping_info?: {
    name?: { full_name?: string };
    address?: {
      address_line_1?: string;
      admin_area_2?: string;
      admin_area_1?: string;
      postal_code?: string;
      country_code?: string;
    };
  };
}

export interface Balances {
  as_of_time?: string;
  balances?: {
    currency: string;
    total_balance?: Money;
    available_balance?: Money;
    withheld_balance?: Money;
  }[];
}

// API Functions
export async function listProducts(): Promise<Product[]> {
  const summaries = await listAll<{ id: string }>('/v1/catalogs/products', 'products', 20, { total_required: 'true' });
  return Promise.all(summaries.map(p => get<Product>(`/v1/catalogs/products/${encodeURIComponent(p.id)}`)));
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  return post<Product>('/v1/catalogs/products', product);
}

export async function listPlans(): Promise<Plan[]> {
  const summaries = await listAll<{ id: string }>('/v1/billing/plans', 'plans', 20, { total_required: 'true' });
  return Promise.all(summaries.map(p => get<Plan>(`/v1/billing/plans/${encodeURIComponent(p.id)}`)));
}

export async function createPlan(plan: Partial<Plan>): Promise<Plan> {
  return post<Plan>('/v1/billing/plans', plan);
}

export async function listInvoices(): Promise<Invoice[]> {
  const summaries = await listAll<{ id: string }>('/v2/invoicing/invoices', 'items', 100, { total_required: 'true' });
  return Promise.all(summaries.map(i => get<Invoice>(`/v2/invoicing/invoices/${encodeURIComponent(i.id)}`)));
}

export async function createInvoice(invoice: Partial<Invoice>): Promise<Invoice> {
  return post<Invoice>('/v2/invoicing/invoices', invoice);
}

export async function sendInvoice(invoiceId: string, sendToRecipient: boolean = true): Promise<void> {
  await post(`/v2/invoicing/invoices/${encodeURIComponent(invoiceId)}/send`, {
    send_to_recipient: sendToRecipient,
    send_to_invoicer: false,
  });
}

export async function searchTransactions(start: Date, end: Date): Promise<Transaction[]> {
  const iso = (d: Date) => d.toISOString().slice(0, 19) + 'Z';
  return listAll<Transaction>(
    '/v1/reporting/transactions',
    'transaction_details',
    500,
    {
      start_date: iso(start),
      end_date: iso(end),
      fields: 'all',
    }
  );
}

export async function getBalances(): Promise<Balances> {
  return get<Balances>('/v1/reporting/balances');
}

export type WebhookVerificationResult = { verification_status: 'SUCCESS' | 'FAILURE' };

export async function verifyWebhookSignature(
  webhookId: string,
  headers: Record<string, string>,
  body: unknown
): Promise<WebhookVerificationResult> {
  return post<{ verification_status: 'SUCCESS' | 'FAILURE' }>(
    '/v1/notifications/verify-webhook-signature',
    {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: body,
    }
  );
}

export async function simulateWebhookEvent(
  eventType: string,
  resource: Record<string, unknown>
): Promise<{ event_id: string }> {
  return post<{ event_id: string }>('/v1/notifications/simulate-event', {
    event_type: eventType,
    resource,
  });
}

// Order/Checkout APIs (v2)
export interface Order {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  intent: 'CAPTURE' | 'AUTHORIZE';
  purchase_units: Array<{
    reference_id?: string;
    amount: Money & {
      breakdown?: {
        item_total?: Money;
        shipping?: Money;
        handling?: Money;
        tax_total?: Money;
        discount?: Money;
      };
    };
    items?: Array<{
      name: string;
      quantity: string;
      unit_amount: Money;
      category?: 'PHYSICAL_GOODS' | 'DIGITAL_GOODS' | 'DONATION';
    }>;
    shipping?: {
      name?: { full_name?: string };
      address?: {
        address_line_1?: string;
        admin_area_2?: string;
        admin_area_1?: string;
        postal_code?: string;
        country_code?: string;
      };
    };
  }>;
  payer?: {
    name?: { given_name?: string; surname?: string };
    email_address?: string;
    payer_id?: string;
  };
  application_context?: {
    return_url?: string;
    cancel_url?: string;
    brand_name?: string;
    locale?: string;
    landing_page?: 'LOGIN' | 'BILLING' | 'NO_PREFERENCE';
    shipping_preference?: 'GET_FROM_FILE' | 'NO_SHIPPING' | 'SET_PROVIDED_ADDRESS';
    user_action?: 'CONTINUE' | 'PAY_NOW';
  };
  create_time: string;
  update_time: string;
  links?: Array<{ href: string; rel: string; method: string }>;
}

export async function createOrder(order: Partial<Order>): Promise<Order> {
  return post<Order>('/v2/checkout/orders', order);
}

export async function captureOrder(orderId: string): Promise<Order> {
  return post<Order>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {});
}

export async function getOrder(orderId: string): Promise<Order> {
  return get<Order>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
}

// Subscription APIs
export interface Subscription {
  id: string;
  plan_id: string;
  status: 'APPROVAL_PENDING' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
  start_time?: string;
  quantity?: string;
  shipping_amount?: Money;
  subscriber?: {
    name?: { given_name?: string; surname?: string };
    email_address?: string;
    payer_id?: string;
  };
  create_time: string;
  update_time?: string;
}

export async function createSubscription(subscription: Partial<Subscription>): Promise<Subscription> {
  return post<Subscription>('/v1/billing/subscriptions', subscription);
}

export async function getSubscription(subscriptionId: string): Promise<Subscription> {
  return get<Subscription>(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

export async function cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
  await post(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, { reason });
}

// Dispute APIs
export interface Dispute {
  dispute_id: string;
  create_time: string;
  update_time: string;
  status: 'OPEN' | 'WAITING_FOR_BUYER_RESPONSE' | 'WAITING_FOR_SELLER_RESPONSE' |
    'UNDER_REVIEW' | 'RESOLVED' | 'OTHER';
  dispute_amount: Money;
  reason: string;
  dispute_channel: 'INTERNAL' | 'EXTERNAL';
  dispute_outcome?: {
    outcome_code: string;
  };
}

export async function listDisputes(): Promise<Dispute[]> {
  return listAll<Dispute>('/v1/customer/disputes', 'items', 100);
}

export async function getDispute(disputeId: string): Promise<Dispute> {
  return get<Dispute>(`/v1/customer/disputes/${encodeURIComponent(disputeId)}`);
}

export async function acceptDisputeClaim(disputeId: string): Promise<void> {
  await post(`/v1/customer/disputes/${encodeURIComponent(disputeId)}/accept-claim`, {});
}

// Shipping Tracker APIs
export interface ShippingTracker {
  id: string;
  transaction_id: string;
  tracking_number: string;
  status: 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'DELIVERY_DELAYED' | 'EXCEPTION' | 'RETURNED';
  carrier: string;
  shipping_address?: {
    name?: { full_name?: string };
    address?: {
      address_line_1?: string;
      admin_area_2?: string;
      admin_area_1?: string;
      postal_code?: string;
      country_code?: string;
    };
  };
  items?: Array<{
    name: string;
    quantity: string;
  }>;
  quantity?: string;
  create_time: string;
  update_time: string;
}

interface ShippingTrackerBatchResponse {
  trackers: ShippingTracker[];
}

export async function createShippingTracker(
  transactionId: string,
  tracker: Omit<ShippingTracker, 'id' | 'create_time' | 'update_time'>
): Promise<ShippingTracker> {
  return post<ShippingTrackerBatchResponse>(
    `/v1/shipping/trackers-batch`,
    { trackers: [tracker] }
  ).then(res => res.trackers?.[0] as ShippingTracker);
}

export async function getShippingTracker(trackerId: string): Promise<ShippingTracker> {
  return get<ShippingTracker>(`/v1/shipping/trackers/${encodeURIComponent(trackerId)}`);
}

export async function listShippingTrackers(transactionId: string): Promise<ShippingTracker[]> {
  return listAll<ShippingTracker>(`/v1/shipping/trackers`, 'trackers', 100, {
    transaction_id: transactionId,
  });
}

// QR Code generation for invoices
export interface QrCodeResponse {
  qr_code: {
    image_url: string;
    link: string;
  };
}

export async function generateInvoiceQrCode(invoiceId: string): Promise<QrCodeResponse> {
  return post<QrCodeResponse>(
    `/v2/invoicing/invoices/${encodeURIComponent(invoiceId)}/generate-qr-code`,
    {}
  );
}

// Early payment discount for invoices
export interface EarlyPaymentDiscount {
  percent: string;
  days: number;
}

export async function updateInvoiceEarlyPaymentDiscount(
  invoiceId: string,
  discount: EarlyPaymentDiscount
): Promise<void> {
  await patch(
    `/v2/invoicing/invoices/${encodeURIComponent(invoiceId)}`,
    { discount }
  );
}

// Record payment for invoice (to mark as PAID)
export interface RecordPaymentRequest {
  method: 'PAYPAL' | 'BANK_TRANSFER' | 'CASH' | 'CHECK' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'WIRE_TRANSFER' | 'OTHER';
  date: string; // YYYY-MM-DD
  amount: Money;
  note?: string;
  transaction_id?: string;
}

export async function recordInvoicePayment(
  invoiceId: string,
  payment: RecordPaymentRequest
): Promise<Invoice> {
  return post<Invoice>(
    `/v2/invoicing/invoices/${encodeURIComponent(invoiceId)}/payments`,
    payment
  );
}