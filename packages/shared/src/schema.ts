import { z } from 'zod';

/**
 * Core PayPal schema definitions with Zod validators
 * All invariants must pass through these validators
 */

// Idempotency key - must be valid UUID v4
export const IdempotencyKeySchema = z.string().uuid('PayPal-Request-Id must be a valid UUID v4');

// Money schema - currency + value with 2 decimal precision
export const MoneySchema = z.object({
  currency_code: z.string().length(3, 'Currency must be 3-letter ISO code'),
  value: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Value must have max 2 decimal places'),
});

// Invoice status enum
export const InvoiceStatusSchema = z.enum([
  'DRAFT',
  'SENT',
  'PAID',
  'MARKED_AS_PAID',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
  'UNPAID',
  'PAYMENT_PENDING',
]);

// Order intent enum
export const OrderIntentSchema = z.enum(['CAPTURE', 'AUTHORIZE']);

// Order status enum
export const OrderStatusSchema = z.enum([
  'CREATED',
  'SAVED',
  'APPROVED',
  'VOIDED',
  'COMPLETED',
  'PAYER_ACTION_REQUIRED',
]);

// Subscription status enum
export const SubscriptionStatusSchema = z.enum([
  'APPROVAL_PENDING',
  'APPROVED',
  'ACTIVE',
  'SUSPENDED',
  'CANCELLED',
  'EXPIRED',
]);

// Dispute status enum
export const DisputeStatusSchema = z.enum([
  'OPEN',
  'WAITING_FOR_BUYER_RESPONSE',
  'WAITING_FOR_SELLER_RESPONSE',
  'UNDER_REVIEW',
  'RESOLVED',
  'CLOSED',
]);

// Product schema
export const ProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(127),
  description: z.string().max(127).optional(),
  type: z.enum(['PHYSICAL', 'DIGITAL', 'SERVICE']),
  category: z.string().optional(),
  image_url: z.string().url().optional(),
  home_url: z.string().url().optional(),
});

// Plan schema
export const PlanSchema = z.object({
  id: z.string().optional(),
  product_id: z.string(),
  name: z.string().min(1).max(127),
  description: z.string().max(127).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  billing_cycles: z.array(z.object({
    frequency: z.object({
      interval_unit: z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR']),
      interval_count: z.number().int().positive(),
    }),
    tenure_type: z.enum(['REGULAR', 'TRIAL']),
    sequence: z.number().int().positive(),
    total_cycles: z.number().int().positive().optional(),
    pricing_scheme: z.object({
      fixed_price: MoneySchema,
      version: z.number().int().optional(),
    }),
  })).min(1),
  payment_preferences: z.object({
    auto_bill_outstanding: z.boolean().default(true),
    setup_fee: MoneySchema.optional(),
    setup_fee_failure_action: z.enum(['CONTINUE', 'CANCEL']).default('CONTINUE'),
    payment_failure_threshold: z.number().int().positive().default(3),
  }).optional(),
  taxes: z.object({
    percentage: z.string().optional(),
    inclusive: z.boolean().default(false),
  }).optional(),
});

// Invoice schema
export const InvoiceSchema = z.object({
  id: z.string().optional(),
  status: InvoiceStatusSchema.default('DRAFT'),
  detail: z.object({
    invoice_number: z.string().optional(),
    reference: z.string().optional(),
    invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    payment_term: z.object({
      term_type: z.enum(['NO_DUE_DATE', 'DUE_ON_RECEIPT', 'NET_10', 'NET_15', 'NET_30', 'NET_45', 'NET_60', 'NET_90']),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).optional(),
    note: z.string().max(4000).optional(),
    memo: z.string().max(4000).optional(),
    currency_code: z.string().length(3),
  }),
  invoicer: z.object({
    name: z.object({
      given_name: z.string(),
      surname: z.string().optional(),
    }).optional(),
    email_address: z.string().email(),
    phone: z.object({
      country_code: z.string(),
      national_number: z.string(),
    }).optional(),
    address: z.object({
      address_line_1: z.string(),
      address_line_2: z.string().optional(),
      admin_area_2: z.string(),
      admin_area_1: z.string(),
      postal_code: z.string(),
      country_code: z.string().length(2),
    }).optional(),
  }),
  primary_recipients: z.array(z.object({
    billing_info: z.object({
      name: z.object({
        given_name: z.string(),
        surname: z.string().optional(),
      }).optional(),
      email_address: z.string().email(),
      phone: z.object({
        country_code: z.string(),
        national_number: z.string(),
      }).optional(),
      address: z.object({
        address_line_1: z.string(),
        address_line_2: z.string().optional(),
        admin_area_2: z.string(),
        admin_area_1: z.string(),
        postal_code: z.string(),
        country_code: z.string().length(2),
      }).optional(),
    }),
  })).min(1),
  items: z.array(z.object({
    name: z.string().min(1).max(127),
    description: z.string().max(127).optional(),
    quantity: z.string().regex(/^\d+(\.\d{1,2})?$/),
    unit_amount: MoneySchema,
    tax: z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      percent: z.string().optional(),
    }).optional(),
    discount: z.object({
      percent: z.string().optional(),
      amount: MoneySchema.optional(),
    }).optional(),
    unit_of_measure: z.enum(['QUANTITY', 'HOURS', 'AMOUNT']).default('QUANTITY'),
  })).min(1),
  configuration: z.object({
    partial_payment: z.object({
      allow_partial_payment: z.boolean().default(false),
      minimum_amount_due: MoneySchema.optional(),
    }).optional(),
    allow_tip: z.boolean().default(false),
    template_id: z.string().optional(),
  }).optional(),
});

// Order schema
export const OrderSchema = z.object({
  id: z.string().optional(),
  intent: OrderIntentSchema,
  status: OrderStatusSchema.optional(),
  purchase_units: z.array(z.object({
    reference_id: z.string().optional(),
    amount: z.object({
      currency_code: z.string().length(3),
      value: z.string().regex(/^\d+(\.\d{1,2})?$/),
      breakdown: z.object({
        item_total: MoneySchema.optional(),
        shipping: MoneySchema.optional(),
        handling: MoneySchema.optional(),
        tax_total: MoneySchema.optional(),
        insurance: MoneySchema.optional(),
        shipping_discount: MoneySchema.optional(),
        discount: MoneySchema.optional(),
      }).optional(),
    }),
    items: z.array(z.object({
      name: z.string().min(1).max(127),
      description: z.string().max(127).optional(),
      quantity: z.string().regex(/^\d+$/),
      unit_amount: MoneySchema,
      tax: z.object({
        amount: MoneySchema.optional(),
      }).optional(),
      category: z.enum(['PHYSICAL_GOODS', 'DIGITAL_GOODS', 'DONATION']).optional(),
    })).optional(),
    shipping: z.object({
      name: z.object({
        full_name: z.string(),
      }).optional(),
      address: z.object({
        address_line_1: z.string(),
        address_line_2: z.string().optional(),
        admin_area_2: z.string(),
        admin_area_1: z.string(),
        postal_code: z.string(),
        country_code: z.string().length(2),
      }).optional(),
    }).optional(),
  })).min(1),
  application_context: z.object({
    brand_name: z.string().optional(),
    locale: z.string().optional(),
    landing_page: z.enum(['LOGIN', 'BILLING', 'NO_PREFERENCE']).optional(),
    shipping_preference: z.enum(['GET_FROM_FILE', 'NO_SHIPPING', 'SET_PROVIDED_ADDRESS']).optional(),
    user_action: z.enum(['CONTINUE', 'PAY_NOW']).optional(),
    payment_method: z.object({
      payer_selected: z.enum(['PAYPAL', 'PAY_LATER', 'CREDIT_CARD', 'VENMO', 'IDEAL', 'BANCONTACT', 'BLIK', 'PAY_UPON_INVOICE']).optional(),
      payee_preferred: z.enum(['UNRESTRICTED', 'IMMEDIATE_PAYMENT_REQUIRED']).optional(),
    }).optional(),
    return_url: z.string().url().optional(),
    cancel_url: z.string().url().optional(),
  }).optional(),
});

// Webhook event schema
export const WebhookEventSchema = z.object({
  id: z.string(),
  event_version: z.string(),
  create_time: z.string(),
  resource_type: z.string(),
  event_type: z.string(),
  summary: z.string(),
  resource: z.record(z.unknown()),
  links: z.array(z.object({
    href: z.string().url(),
    rel: z.string(),
    method: z.string().optional(),
  })).optional(),
});

// Type exports
export type IdempotencyKey = z.infer<typeof IdempotencyKeySchema>;
export type Money = z.infer<typeof MoneySchema>;
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;
export type OrderIntent = z.infer<typeof OrderIntentSchema>;
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;
export type DisputeStatus = z.infer<typeof DisputeStatusSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

// Validation functions
export function validateIdempotencyKey(key: string): IdempotencyKey {
  return IdempotencyKeySchema.parse(key);
}

export function validateMoney(money: unknown): Money {
  return MoneySchema.parse(money);
}

export function validateInvoice(invoice: unknown): Invoice {
  return InvoiceSchema.parse(invoice);
}

export function validateOrder(order: unknown): Order {
  return OrderSchema.parse(order);
}

export function validateWebhookEvent(event: unknown): WebhookEvent {
  return WebhookEventSchema.parse(event);
}

// Generate UUID v4 for idempotency
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}