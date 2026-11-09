// Guarded Checkout API - Creates PayPal Order v2 from Channel3 procurement results
// POST /api/checkout/create-order

import { NextRequest, NextResponse } from 'next/server';
import { createOrder, type Order, type Money } from '@/lib/paypal-client';

interface CheckoutItem {
  product_id: string;
  product_title: string;
  offer_id: string;
  offer_domain: string;
  offer_url: string;
  quantity: number;
  unit_price: { amount: number; currency: string };
  total_price: { amount: number; currency: string };
}

interface CreateOrderRequest {
  items: CheckoutItem[];
  payer?: {
    email_address?: string;
    name?: { given_name?: string; surname?: string };
  };
  return_url?: string;
  cancel_url?: string;
  reference_id?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as CreateOrderRequest;
    const { items, payer, return_url, cancel_url, reference_id } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Validate all items have same currency
    const currencies = new Set(items.map(i => i.unit_price.currency));
    if (currencies.size > 1) {
      return NextResponse.json(
        { error: 'All items must have the same currency' },
        { status: 400 }
      );
    }
    const currency = currencies.values().next().value || 'USD';

    // Calculate totals
    const itemTotal = items.reduce((sum, item) => sum + item.unit_price.amount * item.quantity, 0);
    const shipping = 0; // Could be calculated based on offers
    const taxTotal = items.reduce((sum, item) => sum + (item.total_price.amount * 0.1), 0); // 10% tax estimate

    // Build purchase units
    const purchase_units = items.map((item, index) => ({
      reference_id: item.offer_id || `PU-${index + 1}`,
      amount: {
        value: item.total_price.amount.toFixed(2),
        currency_code: currency,
        breakdown: {
          item_total: {
            value: (item.unit_price.amount * item.quantity).toFixed(2),
            currency_code: currency,
          },
          shipping: {
            value: '0.00',
            currency_code: currency,
          },
          tax_total: {
            value: (item.total_price.amount * 0.1).toFixed(2),
            currency_code: currency,
          },
        },
      },
      items: [{
        name: item.product_title,
        quantity: String(item.quantity),
        unit_amount: {
          value: item.unit_price.amount.toFixed(2),
          currency_code: currency,
        },
        category: 'DIGITAL_GOODS' as const,
      }],
      custom_id: item.product_id, // Link back to Channel3 product
      soft_descriptor: `PAYOPS-${item.offer_domain.slice(0, 15)}`,
    }));

    const orderData: Partial<Order> = {
      intent: 'CAPTURE',
      purchase_units,
      payer: payer ? {
        email_address: payer.email_address,
        name: payer.name,
      } : undefined,
      application_context: {
        return_url: return_url || `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
        cancel_url: cancel_url || `${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel`,
        brand_name: 'PayOps Autonomous',
        locale: 'en-US',
        landing_page: 'NO_PREFERENCE',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    };

    const order = await createOrder(orderData);

    // Find the approve link
    const approveLink = order.links?.find(l => l.rel === 'approve')?.href;

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        intent: order.intent,
        approve_link: approveLink,
        purchase_units: order.purchase_units,
        create_time: order.create_time,
      },
      // Include Channel3 offer URLs for reference
      channel3_offers: items.map(item => ({
        product_id: item.product_id,
        offer_id: item.offer_id,
        offer_url: item.offer_url,
        retailer: item.offer_domain,
      })),
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'Create PayPal Order API',
    usage: 'POST with { items: [{ product_id, product_title, offer_id, offer_domain, offer_url, quantity, unit_price, total_price }], payer, return_url, cancel_url }',
  });
}