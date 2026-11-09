// Procurement Search API - Agentic product search via Channel3
// POST /api/procurement/search

import { NextRequest, NextResponse } from 'next/server';
import { getChannel3Client, ProcurementItem, findProductsForProcurement, colorNameToHex } from '@/lib/channel3-client';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { items, user_id, mode = 'agentic' } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required' },
        { status: 400 }
      );
    }

    const client = getChannel3Client();

    // Convert to ProcurementItem format
    const procurementItems: ProcurementItem[] = items.map(item => ({
      query: item.query || item.description || '',
      quantity: item.quantity || 1,
      maxPricePerUnit: item.max_price || item.maxPricePerUnit,
      preferredBrands: item.preferred_brands || item.preferredBrands,
      preferredRetailers: item.preferred_retailers || item.preferredRetailers,
      requiredAttributes: item.required_attributes || item.requiredAttributes,
      color: item.color ? colorNameToHex(item.color) : undefined,
    }));

    const results = await findProductsForProcurement(procurementItems, user_id);

    return NextResponse.json({
      success: true,
      results: results.map(r => ({
        product: {
          id: r.product.id,
          title: r.product.title,
          description: r.product.description,
          brand: r.product.brand,
          category: r.product.category,
          images: r.product.images,
          structured_attributes: r.product.structured_attributes,
        },
        offer: {
          id: r.selectedOffer.id,
          domain: r.selectedOffer.domain,
          url: r.selectedOffer.url,
          price: r.selectedOffer.price,
          availability: r.selectedOffer.availability,
          max_commission_rate: r.selectedOffer.max_commission_rate,
        },
        quantity: r.quantity,
        estimated_total: r.estimatedTotal,
      })),
      summary: {
        total_items: results.length,
        estimated_subtotal: results.reduce((sum, r) => sum + r.estimatedTotal, 0),
      },
    });
  } catch (error) {
    console.error('Procurement search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Procurement search failed',
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'Procurement Search API',
    usage: 'POST with { items: [{ query, quantity, max_price, preferred_brands, preferred_retailers, required_attributes, color }], user_id, mode }',
    example: {
      items: [
        { query: 'wireless headphones', quantity: 10, max_price: 150, color: 'black' },
        { query: 'laptop stand', quantity: 5, max_price: 50, preferred_retailers: ['amazon.com', 'bestbuy.com'] },
      ],
      user_id: 'user_123',
      mode: 'agentic',
    },
  });
}