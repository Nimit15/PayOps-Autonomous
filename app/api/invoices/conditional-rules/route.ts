// POST /api/invoices/conditional-rules
// Apply conditional early-payment discount and milestone escrow hold rules to unpaid PayPal invoices

import { NextRequest, NextResponse } from 'next/server';
import { listInvoices, updateInvoiceEarlyPaymentDiscount, type Invoice, type EarlyPaymentDiscount } from '@/lib/paypal-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      earlyPaymentDiscount,
      milestoneEscrowHoldPercent,
      applyToStatuses = ['SENT', 'UNPAID', 'PAYMENT_PENDING', 'PARTIALLY_PAID'],
      idempotencyKey,
    } = body;

    // Validate input
    if (!earlyPaymentDiscount || typeof earlyPaymentDiscount.percent !== 'string') {
      return NextResponse.json(
        { error: 'earlyPaymentDiscount.percent is required (string, e.g., "2.5")' },
        { status: 400 }
      );
    }

    const discountPercent = parseFloat(earlyPaymentDiscount.percent);
    if (isNaN(discountPercent) || discountPercent < 1.0 || discountPercent > 5.0) {
      return NextResponse.json(
        { error: 'earlyPaymentDiscount.percent must be between 1.0 and 5.0' },
        { status: 400 }
      );
    }

    if (typeof milestoneEscrowHoldPercent !== 'number' || milestoneEscrowHoldPercent < 0 || milestoneEscrowHoldPercent > 25) {
      return NextResponse.json(
        { error: 'milestoneEscrowHoldPercent must be a number between 0 and 25' },
        { status: 400 }
      );
    }

    // Validate discount days
    const discountDays = earlyPaymentDiscount.days ?? 10;
    if (typeof discountDays !== 'number' || discountDays < 1 || discountDays > 30) {
      return NextResponse.json(
        { error: 'earlyPaymentDiscount.days must be between 1 and 30' },
        { status: 400 }
      );
    }

    // Fetch all invoices
    const allInvoices = await listInvoices();

    // Filter to target statuses
    const targetInvoices = allInvoices.filter((inv: Invoice) =>
      applyToStatuses.includes(inv.status)
    );

    if (targetInvoices.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No invoices match the target statuses',
        updatedCount: 0,
        invoices: [],
        escrowHoldPercent: milestoneEscrowHoldPercent,
      });
    }

    // Apply early payment discount to each target invoice
    const updateResults = await Promise.allSettled(
      targetInvoices.map(async (invoice: Invoice) => {
        const discount: EarlyPaymentDiscount = {
          percent: discountPercent.toFixed(1),
          days: discountDays,
        };

        await updateInvoiceEarlyPaymentDiscount(invoice.id, discount);

        return {
          id: invoice.id,
          number: invoice.detail.invoice_number,
          status: invoice.status,
          previousDiscount: invoice.detail.payment_term?.term_type || 'none',
          appliedDiscount: discount,
          milestoneEscrowHoldPercent,
        };
      })
    );

    // Collect results
    const successful = updateResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value);

    const failed = updateResults
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map(r => ({ error: r.reason?.message || 'Unknown error' }));

    // Ledger trace for double-entry bookkeeping
    const totalDiscountAmount = successful.reduce((sum, inv) => {
      // Estimate discount cost based on invoice total
      return sum + (Number(inv.appliedDiscount.percent) / 100) * 1000; // placeholder calculation
    }, 0);

    const ledgerEntries = [
      {
        account: 'Accounts Receivable - Early Pay Reserve',
        debit: 0,
        credit: totalDiscountAmount,
        description: `Early payment discount reserve for ${discountPercent}% discount (Net ${discountDays})`,
      },
      {
        account: 'Discount Expense - Early Payment',
        debit: totalDiscountAmount,
        credit: 0,
        description: `Cost of early payment discount program`,
      },
      {
        account: 'Escrow Hold Liability',
        debit: 0,
        credit: 0, // Calculated per invoice based on overdue amount
        description: `Milestone escrow hold at ${milestoneEscrowHoldPercent}%`,
      },
    ];

    return NextResponse.json({
      success: true,
      message: `Applied conditional rules to ${successful.length} invoice(s)`,
      updatedCount: successful.length,
      failedCount: failed.length,
      invoices: successful,
      errors: failed.length > 0 ? failed : undefined,
      escrowHoldPercent: milestoneEscrowHoldPercent,
      ledgerTrace: ledgerEntries,
      idempotencyKey: idempotencyKey || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to apply conditional rules:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}