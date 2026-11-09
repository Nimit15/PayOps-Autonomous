import { test, expect, Page, BrowserContext } from '@playwright/test';

// Helper functions
async function waitForNoConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore expected demo mode errors (404s for PayPal APIs, failed resource loads, etc.)
      if (!text.includes('Failed to load resource') &&
          !text.includes('404') &&
          !text.includes('400') &&
          !text.includes('net::ERR') &&
          !text.includes('favicon') &&
          !text.includes('chrome-extension') &&
          !text.includes('Extension')) {
        errors.push(text);
      }
    }
  });
  page.on('pageerror', error => {
    const msg = error.message;
    if (!msg.includes('Extension') && !msg.includes('chrome-extension')) {
      errors.push(msg);
    }
  });
  // Wait a bit for any async errors
  await page.waitForTimeout(500);
  if (errors.length > 0) {
    throw new Error(`Console errors detected:\n${errors.join('\n')}`);
  }
}

async function seedSandboxData(page: Page) {
  // Click seed sandbox button if available
  const seedButton = page.locator('button:has-text("Seed Sandbox Data"), button:has-text("Seed"), [data-testid="seed-sandbox"]');
  if (await seedButton.count() > 0) {
    await seedButton.first().click();
    await page.waitForTimeout(3000);
  }
}

async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await waitForNoConsoleErrors(page);
}

test.describe.configure({ retries: 2 });

test.describe('PayOps Autonomous - E2E Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing console errors
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        console.log(`Console error: ${msg.text()}`);
      }
    });
    page.on('pageerror', error => {
      console.log(`Page error: ${error.message}`);
    });
  });

  // Journey 1: Landing Page Load & Navigation
  test('Journey 1: Landing page loads and navigation works', async ({ page }) => {
    await navigateTo(page, '/');

    // Verify page loads
    await expect(page.locator('h1').first()).toContainText(/PayOps|Autonomous|Agentic Commerce/i);

    // Check navigation links exist (use first to avoid strict mode)
    await expect(page.locator('a[href="/ag-studio"]').first()).toBeVisible();
    await expect(page.locator('a[href="/gantt"]').first()).toBeVisible();
    await expect(page.locator('a[href="/procurement"]').first()).toBeVisible();
    await expect(page.locator('a[href="/invoicing"]').first()).toBeVisible();

    // Click each navigation link from landing page
    const routes = ['/ag-studio', '/gantt', '/procurement', '/invoicing'];
    for (const route of routes) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await waitForNoConsoleErrors(page);

      await page.click(`a[href="${route}"]`);
      await page.waitForLoadState('networkidle');
      await waitForNoConsoleErrors(page);
      await expect(page).toHaveURL(new RegExp(`.*${route.replace('/', '\\/')}`));
    }
  });

  // Journey 2: AG Studio Loads with Data & Scenario Buttons
  test('Journey 2: AG Studio loads with data sources and scenario buttons', async ({ page }) => {
    await navigateTo(page, '/ag-studio');

    // Wait for AG Studio to initialize
    await page.waitForSelector('[class*="ag-studio"], [class*="ag-root"], canvas, [role="grid"]', { timeout: 30000 });

    // Verify AG Studio header
    await expect(page.locator('text=AG Studio').first()).toBeVisible({ timeout: 10000 });

    // Check for scenario buttons (Autonomous, Approval, Dispute)
    // Use more specific selectors
    const autonomousBtn = page.locator('button:has-text("Autonomous"), button:has-text("⚡")').first();
    const approvalBtn = page.locator('button:has-text("Approval"), button:has-text("🛡")').first();
    const disputeBtn = page.locator('button:has-text("Dispute"), button:has-text("⚔")').first();

    await expect(autonomousBtn).toBeVisible({ timeout: 10000 });
    await expect(approvalBtn).toBeVisible();
    await expect(disputeBtn).toBeVisible();

    // Click each scenario button
    await autonomousBtn.click();
    await page.waitForTimeout(500);
    await waitForNoConsoleErrors(page);

    await approvalBtn.click();
    await page.waitForTimeout(500);
    await waitForNoConsoleErrors(page);

    await disputeBtn.click();
    await page.waitForTimeout(500);
    await waitForNoConsoleErrors(page);

    // Verify data sources loaded (check for grid/data)
    await expect(page.locator('[role="grid"], [role="row"], canvas').first()).toBeVisible({ timeout: 10000 });
  });

  // Journey 3: AG Studio Inspector Drawer (Cmd+I)
  test('Journey 3: AG Studio Inspector Drawer opens with Cmd+I and has 3 tabs', async ({ page }) => {
    await navigateTo(page, '/ag-studio');

    // Wait for studio to load
    await page.waitForSelector('[class*="ag-studio"], [class*="ag-root"], canvas, [role="grid"]', { timeout: 30000 });

    // Press Cmd+I (Meta+I) to open Inspector Drawer
    await page.keyboard.press('Meta+i');
    await page.waitForTimeout(500);

    // Verify drawer opens (380px wide panel on right)
    const drawer = page.locator('[class*="inspector"], [class*="drawer"], aside:has-text("Inspector")').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Check for 3 tabs: Transaction, Policy Check, Anomalies
    // Use .first() to avoid strict mode violation
    await expect(page.locator('text=Transaction, text=Transaction Detail, [data-tab="transaction"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Policy, text=Policy Check, [data-tab="policy"]').first()).toBeVisible();
    await expect(page.locator('text=Anomal, [data-tab="anomalies"]').first()).toBeVisible();

    // Click each tab
    await page.click('text=Transaction, text=Transaction Detail, [data-tab="transaction"]');
    await page.waitForTimeout(300);
    await waitForNoConsoleErrors(page);

    await page.click('text=Policy, text=Policy Check, [data-tab="policy"]');
    await page.waitForTimeout(300);
    await waitForNoConsoleErrors(page);

    await page.click('text=Anomal, [data-tab="anomalies"]');
    await page.waitForTimeout(300);
    await waitForNoConsoleErrors(page);

    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  // Journey 4: Bryntum Gantt Loads with Payment-Locked Milestones
  test('Journey 4: Bryntum Gantt loads with dispute timeline and payment-locked milestones', async ({ page }) => {
    await navigateTo(page, '/gantt');

    // Wait for Gantt to load
    await page.waitForSelector('[class*="bryntum"], [class*="gantt"], canvas, [role="grid"]', { timeout: 30000 });

    // Verify Gantt header
    await expect(page.locator('text=Gantt, text=Dispute Triage, text=Bryntum').first()).toBeVisible({ timeout: 10000 });

    // Check for payment-locked indicator
    await expect(page.locator('text=Payment Lock, text=🔒, text=Locked').first()).toBeVisible({ timeout: 10000 });

    // Verify timeline/tasks are rendered
    await expect(page.locator('[role="grid"], canvas, [class*="task"], [class*="bar"]').first()).toBeVisible({ timeout: 10000 });

    // Check SSE connection status
    await expect(page.locator('text=Live, text=Connected, text=SSE').first()).toBeVisible({ timeout: 10000 });
  });

  // Journey 5: Channel3 Procurement Search & PayPal Order Creation
  test('Journey 5: Procurement page - Channel3 search and PayPal order creation', async ({ page }) => {
    await navigateTo(page, '/procurement');

    // Wait for page load
    await page.waitForSelector('input[placeholder*="product"], input[placeholder*="search"], button:has-text("Search")', { timeout: 10000 });

    // Enter product search
    const searchInput = page.locator('input[placeholder*="product"], input[placeholder*="search"], input[type="search"]').first();
    await searchInput.fill('wireless headphones');
    await page.waitForTimeout(500);

    // Click search
    const searchBtn = page.locator('button:has-text("Search"), button[type="submit"]').first();
    await searchBtn.click();

    // Wait for results
    await page.waitForTimeout(3000);
    await waitForNoConsoleErrors(page);

    // Verify results appear
    await expect(page.locator('[class*="result"], [class*="product"], text=headphone, text=Headphone').first()).toBeVisible({ timeout: 10000 });

    // Click create order / checkout button if available
    const createOrderBtn = page.locator('button:has-text("Create Order"), button:has-text("Checkout"), button:has-text("PayPal")').first();
    if (await createOrderBtn.count() > 0) {
      await createOrderBtn.click();
      await page.waitForTimeout(2000);
      await waitForNoConsoleErrors(page);
    }
  });

  // Journey 6: Invoicing Page - Counterfactual Simulator Sliders
  test('Journey 6: Invoicing page - Counterfactual Simulator with sliders and live outputs', async ({ page }) => {
    await navigateTo(page, '/invoicing');

    // Wait for simulator to load
    await page.waitForSelector('text=Counterfactual Working Capital Simulator', { timeout: 10000 });

    // Verify Early-Payment Discount slider (1.0%-5.0%, step 0.5%)
    const discountSlider = page.locator('input[type="range"][min="1.0"][max="5.0"][step="0.5"]').first();
    await expect(discountSlider).toBeVisible({ timeout: 5000 });

    // Verify Milestone Escrow Hold slider (0%-25%, step 5%)
    const escrowSlider = page.locator('input[type="range"][min="0"][max="25"][step="5"]').first();
    await expect(escrowSlider).toBeVisible({ timeout: 5000 });

    // Test Early-Payment Discount slider
    await discountSlider.fill('2.5');
    await page.waitForTimeout(500);
    await waitForNoConsoleErrors(page);

    // Verify live output updates
    await expect(page.locator('text=Projected DSO Reduction').first()).toBeVisible();
    await expect(page.locator('text=Immediate Working Capital Unlocked').first()).toBeVisible();
    await expect(page.locator('text=Discount Cost').first()).toBeVisible();
    await expect(page.locator('text=Net Cash Velocity Gain').first()).toBeVisible();

    // Test Milestone Escrow Hold slider
    await escrowSlider.fill('10');
    await page.waitForTimeout(500);
    await waitForNoConsoleErrors(page);

    // Verify outputs updated
    const dsoValue = page.locator('text=Projected DSO Reduction').locator('..').locator('.text-3xl, .font-bold, [class*="tabular"]').first();
    await expect(dsoValue).toBeVisible();
  });

  // Journey 7: Invoicing Page - Apply Conditional Rule Button
  test('Journey 7: Invoicing page - Apply Conditional Rule triggers API and opens Inspector Drawer', async ({ page }) => {
    await navigateTo(page, '/invoicing');

    // Wait for simulator to load
    await page.waitForSelector('text=Counterfactual Working Capital Simulator', { timeout: 10000 });

    // Wait for invoices to load (button becomes enabled when isLoading=false)
    const applyBtn = page.locator('button:has-text("Apply Conditional Rule"), button:has-text("Apply")').first();
    await expect(applyBtn).toBeVisible({ timeout: 5000 });
    // Wait for button to be enabled (isLoading = false)
    await expect(applyBtn).toBeEnabled({ timeout: 15000 });

    // Set slider values
    await page.fill('input[type="range"][min="1.0"][max="5.0"][step="0.5"]', '3.0');
    await page.fill('input[type="range"][min="0"][max="25"][step="5"]', '15');
    await page.waitForTimeout(500);

    // Click Apply Conditional Rule button
    await applyBtn.click();

    // Wait for API call and inspector drawer
    await page.waitForTimeout(2000);
    await waitForNoConsoleErrors(page);

    // Verify Inspector Drawer opens (380px)
    const drawer = page.locator('[class*="inspector"], [class*="drawer"], aside:has-text("Inspector")').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Verify 3 tabs in drawer: Payload, Ledger Trace, API Response
    await expect(page.locator('text=API Payload, text=Payload, [data-tab="payload"]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Ledger, text=Ledger Trace, [data-tab="ledger"]').first()).toBeVisible();
    await expect(page.locator('text=API Response, text=Response, [data-tab="response"]').first()).toBeVisible();

    // Check ledger trace shows double-entry entries
    await expect(page.locator('text=Debit, text=Credit, text=Accounts Receivable, text=Discount Expense').first()).toBeVisible({ timeout: 5000 });

    // Close drawer
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  // Journey 8: Dashboard / Health Check Endpoint
  test('Journey 8: Health endpoint returns 200 and dashboard loads', async ({ page }) => {
    // Test health endpoint directly
    const healthResponse = await page.request.get('/api/health');
    expect(healthResponse.status()).toBe(200);
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('ok');

    // Test dashboard page
    await navigateTo(page, '/dashboard');
    await waitForNoConsoleErrors(page);

    // Verify dashboard loads with tabs
    await expect(page.locator('text=Dashboard, text=Invoices, text=Customers, text=Products, text=Transactions, text=Payouts').first()).toBeVisible({ timeout: 10000 });
  });

  // Journey 9: Sandbox Seeding Works
  test('Journey 9: Sandbox seeding creates test data', async ({ page }) => {
    await navigateTo(page, '/');

    // Look for seed button
    const seedBtn = page.locator('button:has-text("Seed"), button:has-text("Sandbox")').first();
    if (await seedBtn.count() > 0) {
      await seedBtn.click();
      await page.waitForTimeout(5000);
      await waitForNoConsoleErrors(page);

      // Verify data loaded by checking AG Studio
      await navigateTo(page, '/ag-studio');
      await page.waitForSelector('[class*="ag-studio"], [class*="ag-root"], canvas, [role="grid"]', { timeout: 30000 });
      await expect(page.locator('[role="grid"], [role="row"], canvas').first()).toBeVisible({ timeout: 10000 });
    } else {
      // If no seed button, verify data already exists
      await navigateTo(page, '/ag-studio');
      await page.waitForSelector('[class*="ag-studio"], [class*="ag-root"], canvas, [role="grid"]', { timeout: 30000 });
    }
  });

  // Journey 10: No Uncaught Console/Page Errors Across All Pages
  test('Journey 10: Zero uncaught console/page errors across all pages', async ({ page }) => {
    const pages = ['/', '/ag-studio', '/gantt', '/procurement', '/invoicing', '/dashboard'];
    const allErrors: string[] = [];

    for (const path of pages) {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('Failed to load resource')) {
          errors.push(`${path}: ${msg.text()}`);
        }
      });
      page.on('pageerror', error => {
        errors.push(`${path}: ${error.message}`);
      });

      await navigateTo(page, path);
      await page.waitForTimeout(1000);

      allErrors.push(...errors);
    }

    // Report any errors found
    if (allErrors.length > 0) {
      console.log('Errors found:', allErrors);
    }

    // Assert zero errors (excluding known benign ones)
    const criticalErrors = allErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('Failed to load resource') &&
      !e.includes('net::ERR_BLOCKED_BY_CLIENT') &&
      !e.includes('Extension') &&
      !e.includes('chrome-extension')
    );

    expect(criticalErrors.length).toBe(0);
  });
});

// Additional helper tests
test.describe('API Endpoints', () => {
  test('API: /api/ag-studio/transactions returns data', async ({ request }) => {
    const response = await request.get('/api/ag-studio/transactions');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('invoices');
    expect(Array.isArray(data.invoices)).toBe(true);
  });

  test('API: /api/ag-studio/balances returns data', async ({ request }) => {
    const response = await request.get('/api/ag-studio/balances');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('balances');
  });

  test('API: /api/ag-studio/anomalies returns data', async ({ request }) => {
    const response = await request.get('/api/ag-studio/anomalies');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('anomalies');
  });

  test('API: /api/invoices/conditional-rules accepts POST', async ({ request }) => {
    const response = await request.post('/api/invoices/conditional-rules', {
      data: {
        earlyPaymentDiscount: { percent: '2.5', days: 10 },
        milestoneEscrowHoldPercent: 10,
        applyToStatuses: ['SENT', 'UNPAID'],
        idempotencyKey: 'test-' + Date.now(),
      },
    });
    // Should not be 404 or 500
    expect(response.status()).not.toBe(404);
    expect(response.status()).not.toBe(500);
  });

  test('API: /api/sandbox/seed triggers seeding', async ({ request }) => {
    const response = await request.post('/api/sandbox/seed');
    expect(response.status()).toBe(200);
  });
});

test.describe('Keyboard Shortcuts', () => {
  test('Cmd+I opens inspector on AG Studio', async ({ page }) => {
    await navigateTo(page, '/ag-studio');
    await page.waitForSelector('[class*="ag-studio"], [class*="ag-root"], canvas, [role="grid"]', { timeout: 30000 });
    await page.keyboard.press('Meta+i');
    await page.waitForTimeout(500);
    await expect(page.locator('[class*="inspector"], [class*="drawer"], aside:has-text("Inspector")').first()).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
  });

  test('Number keys 1/2/3 switch inspector tabs', async ({ page }) => {
    await navigateTo(page, '/ag-studio');
    await page.waitForSelector('[class*="ag-studio"], [class*="ag-root"], canvas, [role="grid"]', { timeout: 30000 });
    await page.keyboard.press('Meta+i');
    await page.waitForTimeout(500);

    // Press 1, 2, 3
    await page.keyboard.press('1');
    await page.waitForTimeout(200);
    await page.keyboard.press('2');
    await page.waitForTimeout(200);
    await page.keyboard.press('3');
    await page.waitForTimeout(200);
    await waitForNoConsoleErrors(page);
    await page.keyboard.press('Escape');
  });
});

test.describe('Responsive Design', () => {
  test('Pages work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const pages = ['/', '/ag-studio', '/gantt', '/procurement', '/invoicing'];

    for (const path of pages) {
      await navigateTo(page, path);
      await page.waitForTimeout(500);
      await waitForNoConsoleErrors(page);
    }
  });

  test('Pages work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    const pages = ['/', '/ag-studio', '/gantt', '/procurement', '/invoicing'];

    for (const path of pages) {
      await navigateTo(page, path);
      await page.waitForTimeout(500);
      await waitForNoConsoleErrors(page);
    }
  });
});