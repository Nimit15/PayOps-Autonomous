// PayPal Setup Wizard
// Guides user through initial configuration
// Run with: npm run paypal:setup

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  console.log('║              PAYOPS SETUP WIZARD                             ║');
  console.log('║              PayPal AI Hackathon 2026                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`${RESET}`);

  section('Step 1: Environment File');
  const envPath = path.join(__dirname, '..', '.env');
  const examplePath = path.join(__dirname, '..', '.env.example');

  if (fs.existsSync(envPath)) {
    log('.env', 'Already exists', 'ok');
  } else if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    log('.env', 'Created from .env.example', 'ok');
    log('Action', 'Edit .env with your credentials', 'warn');
  } else {
    log('.env.example', 'Not found', 'error');
  }

  section('Step 2: Required Credentials');
  console.log('You need the following from PayPal Developer Dashboard:');
  console.log('');
  console.log('1. PAYPAL_CLIENT_ID');
  console.log('   → https://developer.paypal.com/dashboard/applications/sandbox');
  console.log('   → Create App → Sandbox → Copy Client ID');
  console.log('');
  console.log('2. PAYPAL_CLIENT_SECRET');
  console.log('   → Same page → Copy Secret');
  console.log('');
  console.log('3. PAYPAL_WEBHOOK_ID');
  console.log('   → https://developer.paypal.com/dashboard/applications/sandbox');
  console.log('   → Your App → Webhooks → Add Webhook');
  console.log('   → URL: https://your-app.onrender.com/api/webhooks/paypal');
  console.log('   → Select: INVOICING.*, CUSTOMER.DISPUTE.*, PAYMENT.*, BILLING.*');
  console.log('   → Copy Webhook ID');
  console.log('');
  console.log('4. CHANNEL3_API_KEY');
  console.log('   → https://trychannel3.com → Get API Key');
  console.log('');

  section('Step 3: Quick Start Commands');
  console.log('After filling .env, run:');
  console.log('');
  console.log('  npm run seed:sandbox    # Seed sandbox with demo data');
  console.log('  npm run paypal:doctor   # Verify all connections');
  console.log('  npm run dev             # Start development server');
  console.log('');

  section('Step 4: Deploy to Render');
  console.log('1. Push to GitHub');
  console.log('2. Connect repo to Render');
  console.log('3. Render auto-detects render.yaml');
  console.log('4. Add secrets in Render Dashboard → Environment Groups');
  console.log('   payops-secrets: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID, CHANNEL3_API_KEY');
  console.log('5. Deploy!');
  console.log('');

  section('Step 5: Hackathon Demo URLs');
  console.log('Local:');
  console.log('  http://localhost:3000/dashboard  - AG Studio Analytics');
  console.log('  http://localhost:3000/gantt      - Bryntum Gantt + Webhooks');
  console.log('  http://localhost:3000/procurement - Channel3 Agentic Procurement');
  console.log('');
  console.log('Production (after Render deploy):');
  console.log('  https://payops-autonomous.onrender.com/dashboard');
  console.log('  https://payops-autonomous.onrender.com/gantt');
  console.log('  https://payops-autonomous.onrender.com/procurement');
  console.log('');

  // Check current .env status
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const required = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID', 'CHANNEL3_API_KEY'];
    section('Current .env Status');
    for (const key of required) {
      const match = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'));
      if (match && match[1] && !match[1].includes('your_')) {
        log(key, 'Configured', 'ok');
      } else {
        log(key, 'Missing or placeholder', 'warn');
      }
    }
  }

  console.log(`\n${BOLD}${CYAN}Ready to build! Run npm run seed:sandbox to continue.${RESET}\n`);
}

main();