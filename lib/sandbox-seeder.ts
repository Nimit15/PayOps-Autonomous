// Sandbox Data Seeder - Populates PayPal Sandbox with realistic test data
// Includes 1-click "Seed Sandbox Data" button for judges

import {
  createInvoice,
  sendInvoice,
  createOrder,
  createSubscription,
  createProduct,
  createPlan,
  type Invoice,
  type Product,
  type Plan,
} from './paypal-client';

interface SeedResult {
  success: boolean;
  message: string;
  data?: {
    products: number;
    plans: number;
    invoices: number;
    orders: number;
    subscriptions: number;
  };
}

const SAMPLE_PRODUCTS: Partial<Product>[] = [
  {
    name: 'AI-Powered Procurement Platform',
    description: 'Autonomous procurement with Channel3 integration and PayPal guarded checkout',
    type: 'SERVICE',
    category: 'SOFTWARE',
  },
  {
    name: 'Milestone Invoicing Suite',
    description: 'Payment-locked milestones with automated nudge-bot and dispute triage',
    type: 'SERVICE',
    category: 'SOFTWARE',
  },
  {
    name: 'Analytics Command Center',
    description: 'AG Studio dashboard with self-serve AI analytics and relational data model',
    type: 'DIGITAL',
    category: 'SOFTWARE',
  },
  {
    name: 'Gantt Scheduler Pro',
    description: 'Bryntum-powered project scheduling tied to PayPal payment states',
    type: 'DIGITAL',
    category: 'SOFTWARE',
  },
];

const SAMPLE_PLANS = [
  {
    name: 'Starter Monthly',
    billing_cycles: [{
      frequency: { interval_unit: 'MONTH', interval_count: 1 },
      tenure_type: 'REGULAR',
      sequence: 1,
      total_cycles: 0,
      pricing_scheme: { fixed_price: { value: '49.00', currency_code: 'USD' } },
    }],
    payment_preferences: { auto_bill_outstanding: true },
  },
  {
    name: 'Professional Monthly',
    billing_cycles: [{
      frequency: { interval_unit: 'MONTH', interval_count: 1 },
      tenure_type: 'REGULAR',
      sequence: 1,
      total_cycles: 0,
      pricing_scheme: { fixed_price: { value: '199.00', currency_code: 'USD' } },
    }],
    payment_preferences: { auto_bill_outstanding: true },
  },
  {
    name: 'Enterprise Annual',
    billing_cycles: [
      {
        frequency: { interval_unit: 'MONTH', interval_count: 1 },
        tenure_type: 'TRIAL',
        sequence: 1,
        total_cycles: 1,
        pricing_scheme: { fixed_price: { value: '0.00', currency_code: 'USD' } },
      },
      {
        frequency: { interval_unit: 'YEAR', interval_count: 1 },
        tenure_type: 'REGULAR',
        sequence: 2,
        total_cycles: 0,
        pricing_scheme: { fixed_price: { value: '1999.00', currency_code: 'USD' } },
      },
    ],
    payment_preferences: { auto_bill_outstanding: true },
  },
];

const SAMPLE_CUSTOMERS = [
  { email: 'acme-corp@example.com', name: 'Acme Corporation', company: 'Acme Corp' },
  { email: 'globex-inc@example.com', name: 'Globex Inc', company: 'Globex Inc' },
  { email: 'wayne-enterprises@example.com', name: 'Wayne Enterprises', company: 'Wayne Enterprises' },
  { email: 'stark-industries@example.com', name: 'Stark Industries', company: 'Stark Industries' },
  { email: 'umbrella-corp@example.com', name: 'Umbrella Corporation', company: 'Umbrella Corp' },
];

function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

function randomDate(daysAgo: number, daysForward: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo + Math.floor(Math.random() * (daysAgo + daysForward)));
  return date.toISOString().slice(0, 10);
}

function randomAmount(min: number, max: number): { value: string; currency_code: 'USD' } {
  const amount = (Math.random() * (max - min) + min).toFixed(2);
  return { value: amount, currency_code: 'USD' };
}

export async function seedSandboxData(): Promise<SeedResult> {
  try {
    console.log('🌱 Starting sandbox data seeding...');

    // 1. Create Products
    console.log('📦 Creating products...');
    const products: Product[] = [];
    for (const product of SAMPLE_PRODUCTS) {
      try {
        const created = await createProduct(product as Product);
        products.push(created);
        console.log(`  ✅ Created product: ${created.name} (${created.id})`);
      } catch (error) {
        console.error(`  ❌ Failed to create product ${product.name}:`, error);
      }
    }

    // 2. Create Plans (linked to products)
    console.log('📋 Creating billing plans...');
    const plans: Plan[] = [];
    for (let i = 0; i < SAMPLE_PLANS.length && i < products.length; i++) {
      try {
        const planData = {
          ...SAMPLE_PLANS[i],
          product_id: products[i].id,
        };
        const created = await createPlan(planData as Plan);
        plans.push(created);
        console.log(`  ✅ Created plan: ${created.name} (${created.id}) for product ${products[i].name}`);
      } catch (error) {
        console.error(`  ❌ Failed to create plan ${SAMPLE_PLANS[i].name}:`, error);
      }
    }

    // 3. Create Invoices with various statuses
    console.log('📄 Creating invoices...');
    const invoiceStatuses = [
      'DRAFT', 'SENT', 'SCHEDULED', 'UNPAID', 'PAYMENT_PENDING',
      'PAID', 'PARTIALLY_PAID', 'REFUNDED', 'CANCELLED'
    ] as const;

    let invoicesCreated = 0;
    for (let i = 0; i < 15; i++) {
      const customer = SAMPLE_CUSTOMERS[i % SAMPLE_CUSTOMERS.length];
      const status = invoiceStatuses[i % invoiceStatuses.length];
      const daysAgo = Math.floor(Math.random() * 60);
      const invoiceDate = randomDate(daysAgo);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const itemCount = Math.floor(Math.random() * 3) + 1;
      const items = [];
      let total = 0;

      for (let j = 0; j < itemCount; j++) {
        const product = products[j % products.length];
        const quantity = Math.floor(Math.random() * 5) + 1;
        const unitPrice = randomAmount(50, 500);
        const lineTotal = Number(unitPrice.value) * quantity;
        total += lineTotal;

        items.push({
          name: product.name,
          quantity: String(quantity),
          unit_amount: unitPrice,
          unit_of_measure: 'EA',
        });
      }

      const invoice: Partial<Invoice> = {
        detail: {
          invoice_number: generateInvoiceNumber(),
          currency_code: 'USD',
          invoice_date: invoiceDate,
          payment_term: {
            term_type: 'NET_30',
            due_date: dueDate.toISOString().slice(0, 10),
          },
          note: `Invoice for ${customer.company} - ${status}`,
        },
        primary_recipients: [{
          billing_info: {
            name: { full_name: customer.name },
            business_name: customer.company,
            email_address: customer.email,
          },
        }],
        items,
        amount: { value: total.toFixed(2), currency_code: 'USD' },
        status,
      };

      try {
        const created = await createInvoice(invoice);
        invoicesCreated++;

        // Send some invoices to create realistic states
        if (status !== 'DRAFT' && status !== 'CANCELLED' && Math.random() > 0.3) {
          try {
            await sendInvoice(created.id);
            console.log(`  ✅ Created & sent invoice: ${created.detail.invoice_number} (${status})`);
          } catch {
            console.log(`  ✅ Created invoice: ${created.detail.invoice_number} (${status})`);
          }
        } else {
          console.log(`  ✅ Created invoice: ${created.detail.invoice_number} (${status})`);
        }
      } catch (error) {
        console.error(`  ❌ Failed to create invoice:`, error);
      }
    }

    // 4. Create Test Orders
    console.log('🛒 Creating test orders...');
    let ordersCreated = 0;
    for (let i = 0; i < 5; i++) {
      const customer = SAMPLE_CUSTOMERS[i % SAMPLE_CUSTOMERS.length];
      const product = products[i % products.length];

      try {
        const order = await createOrder({
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: `PU-${i + 1}`,
            amount: {
              value: randomAmount(100, 1000).value,
              currency_code: 'USD',
              breakdown: {
                item_total: { value: randomAmount(80, 900).value, currency_code: 'USD' },
                tax_total: { value: '20.00', currency_code: 'USD' },
              },
            },
            items: [{
              name: product.name,
              quantity: '1',
              unit_amount: { value: randomAmount(80, 900).value, currency_code: 'USD' },
              category: 'DIGITAL_GOODS',
            }],
          }],
          payer: {
            email_address: customer.email,
            name: { given_name: customer.name.split(' ')[0], surname: customer.name.split(' ')[1] },
          },
        });
        ordersCreated++;
        console.log(`  ✅ Created order: ${order.id}`);
      } catch (error) {
        console.error(`  ❌ Failed to create order:`, error);
      }
    }

    // 5. Create Test Subscriptions
    console.log('🔄 Creating test subscriptions...');
    let subscriptionsCreated = 0;
    for (let i = 0; i < 3 && i < plans.length; i++) {
      const customer = SAMPLE_CUSTOMERS[i % SAMPLE_CUSTOMERS.length];
      const plan = plans[i];

      try {
        const subscription = await createSubscription({
          plan_id: plan.id,
          start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Start tomorrow
          quantity: '1',
          subscriber: {
            email_address: customer.email,
            name: { given_name: customer.name.split(' ')[0], surname: customer.name.split(' ')[1] },
          },
        });
        subscriptionsCreated++;
        console.log(`  ✅ Created subscription: ${subscription.id} for ${customer.company}`);
      } catch (error) {
        console.error(`  ❌ Failed to create subscription:`, error);
      }
    }

    console.log('🎉 Sandbox data seeding complete!');

    return {
      success: true,
      message: `Successfully seeded sandbox with ${products.length} products, ${plans.length} plans, ${invoicesCreated} invoices, ${ordersCreated} orders, ${subscriptionsCreated} subscriptions`,
      data: {
        products: products.length,
        plans: plans.length,
        invoices: invoicesCreated,
        orders: ordersCreated,
        subscriptions: subscriptionsCreated,
      },
    };
  } catch (error) {
    console.error('💥 Sandbox seeding failed:', error);
    return {
      success: false,
      message: `Seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// CLI entry point
if (require.main === module) {
  seedSandboxData()
    .then(result => {
      console.log('\n📊 Seeding Result:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}