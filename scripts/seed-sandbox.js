// PayPal Sandbox Seeder Script
// Seeds sandbox with realistic test data for demo
// Run with: npm run seed:sandbox

import 'dotenv/config';
import { seedSandboxData } from '../lib/sandbox-seeder';

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

async function main() {
  console.log(`${BOLD}${CYAN}`);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║              PAYOPS SANDBOX SEEDER                           ║');
  console.log('║              PayPal AI Hackathon 2026                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`${RESET}`);

  // Check required env vars
  const required = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'];
  for (const key of required) {
    if (!process.env[key]) {
      log(key, 'MISSING - Set in .env file', 'error');
      process.exit(1);
    } else {
      log(key, `${process.env[key].slice(0, 8)}...${process.env[key].slice(-4)}`, 'ok');
    }
  }

  section('Seeding Sandbox Data');
  log('Products', '4 products (SaaS, Consulting, Support, Training)', 'info');
  log('Plans', '3 plans (Starter, Professional, Enterprise)', 'info');
  log('Invoices', '15 invoices (various statuses + milestones)', 'info');
  log('Orders', '5 orders (completed, pending, failed)', 'info');
  log('Subscriptions', '3 subscriptions (active, cancelled, past_due)', 'info');

  try {
    const result = await seedSandboxData();
    section('Seeding Complete');
    log('Products Created', `${result.products.length}`, 'ok');
    log('Plans Created', `${result.plans.length}`, 'ok');
    log('Invoices Created', `${result.invoices.length}`, 'ok');
    log('Orders Created', `${result.orders.length}`, 'ok');
    log('Subscriptions Created', `${result.subscriptions.length}`, 'ok');

    console.log(`\n${GREEN}${BOLD}✓ Sandbox seeded successfully!${RESET}\n`);
    console.log('Next steps:');
    console.log('  1. Run npm run paypal:doctor to verify');
    console.log('  2. Run npm run dev to start the dashboard');
    console.log('  3. Visit http://localhost:3000/dashboard');
    console.log('  4. Visit http://localhost:3000/gantt');
    console.log('  5. Visit http://localhost:3000/procurement');
    process.exit(0);
  } catch (error) {
    log('Seeding Failed', `${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

main();