# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: payops.spec.ts >> PayOps Autonomous - E2E Test Suite >> Journey 1: Landing page loads and navigation works
- Location: tests\e2e\payops.spec.ts:113:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /.*\/procurement/
Received string:  "http://localhost:3001/"
Timeout: 10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    23 × locator resolved to <html lang="en">…</html>
       - unexpected value "http://localhost:3001/"

```

```yaml
- navigation "Scenario selector":
  - text: PAY
  - navigation "Scenario modes":
    - button "Safe Baseline - $100 cap - Press 1 to select" [pressed]: Safe Baseline $100 cap 1
    - button "Aggressive Growth - $1,000 cap - Press 2 to select": Aggressive Growth $1,000 cap 2
    - button "Crisis Recovery - $10 cap - Press 3 to select": Crisis Recovery $10 cap 3
- main:
  - main:
    - navigation:
      - heading "PayOps Autonomous" [level=1]
      - link "AG Studio":
        - /url: /ag-studio
      - link "Gantt":
        - /url: /gantt
      - link "Procurement":
        - /url: /procurement
      - link "Invoicing":
        - /url: /invoicing
      - link "Dashboard":
        - /url: /dashboard
    - heading "PayOps Autonomous Agentic Commerce Operations Platform" [level=2]
    - paragraph: Autonomous AI agents for PayPal commerce operations — invoicing, disputes, procurement, and working capital optimization.
    - paragraph: Total Receivables
    - paragraph: $3,171,731
    - paragraph: Overdue Amount
    - paragraph: $3,115,619
    - paragraph: Active Invoices
    - paragraph: "64"
    - paragraph: Collection Rate
    - paragraph: 19.8%
    - paragraph: Available Balance
    - paragraph: $7,680,353
    - paragraph: Dispute Exposure
    - paragraph: $1,069,616
    - link "AG Studio Relational analytics with AI harness — 5 agents, scenario modes, inspector drawer":
      - /url: /ag-studio
      - img
      - heading "AG Studio" [level=3]
      - paragraph: Relational analytics with AI harness — 5 agents, scenario modes, inspector drawer
    - link "Bryntum Gantt Payment-locked milestone scheduling with SSE live updates":
      - /url: /gantt
      - img
      - heading "Bryntum Gantt" [level=3]
      - paragraph: Payment-locked milestone scheduling with SSE live updates
    - link "Channel3 Procurement 100M+ product search with PayPal order creation":
      - /url: /procurement
      - img
      - heading "Channel3 Procurement" [level=3]
      - paragraph: 100M+ product search with PayPal order creation
    - link "Counterfactual Simulator Working capital optimization with early-pay discounts & escrow holds":
      - /url: /invoicing
      - img
      - heading "Counterfactual Simulator" [level=3]
      - paragraph: Working capital optimization with early-pay discounts & escrow holds
    - paragraph: "250"
    - paragraph: Transactions
    - paragraph: "25"
    - paragraph: Customers
    - paragraph: "8"
    - paragraph: Products
    - paragraph: "18"
    - paragraph: Planted Anomalies
    - link "Launch AG Studio":
      - /url: /ag-studio
    - link "Try Counterfactual Simulator":
      - /url: /invoicing
    - link "View Command Center":
      - /url: /dashboard
    - paragraph: PayOps Autonomous — PayPal AI Hackathon 2026
    - text: Powered by PayPal APIs AG Studio v3.1 Bryntum Gantt v7.3 Channel3 SDK v4 250-Tx Dataset
- status:
  - img
  - text: Static route
  - button "Hide static indicator":
    - img
- alert
```

# Test source

```ts
  35  |   await page.waitForTimeout(500);
  36  |   if (errors.length > 0) {
  37  |     throw new Error(`Console errors detected:\n${errors.join('\n')}`);
  38  |   }
  39  | }
  40  | 
  41  | // Wait for AG Studio to fully load (data fetched and components rendered)
  42  | async function waitForAgStudioReady(page: Page) {
  43  |   await page.waitForSelector('[data-testid="ag-studio-container"]', { timeout: 30000 });
  44  |   try {
  45  |     await expect(page.locator('[data-testid="studio-status"]').first()).toContainText('Studio Ready', { timeout: 15000 });
  46  |   } catch {
  47  |     await expect(page.locator('[data-testid="studio-status"]').first()).toBeVisible({ timeout: 5000 });
  48  |   }
  49  |   await expect(page.locator('[data-testid="ag-studio-title"]').first()).toBeVisible({ timeout: 10000 });
  50  |   // Root can be present but hidden on small viewports/overflow; attached is sufficient
  51  |   await expect(page.locator('[data-testid="ag-studio-root"]').first()).toBeAttached({ timeout: 10000 });
  52  |   await page.waitForTimeout(2000);
  53  | }
  54  | 
  55  | // Wait for Gantt to fully load (data fetched and canvas rendered)
  56  | async function waitForGanttReady(page: Page, isMobileOrTablet = false) {
  57  |   // Wait for page wrapper - longer timeout for dynamic import
  58  |   await page.waitForSelector('[data-testid="gantt-container"]', { timeout: 90000 });
  59  |   // Wait for dynamic component to load - check title visible
  60  |   await expect(page.locator('[data-testid="gantt-title"]').first()).toBeVisible({ timeout: 90000 });
  61  |   // Wait for payment lock badge (optional - might not always be visible)
  62  |   try {
  63  |     await expect(page.locator('[data-testid="payment-lock-badge"]').first()).toBeVisible({ timeout: 15000 });
  64  |   } catch {
  65  |     // Badge might not be present, continue
  66  |   }
  67  |   // On mobile/tablet, just wait for canvas; on desktop check more carefully
  68  |   if (isMobileOrTablet) {
  69  |     await expect(page.locator('canvas').first()).toBeAttached({ timeout: 90000 });
  70  |   } else {
  71  |     // Wait for canvas (Bryntum Gantt renders to canvas, or fallback canvas while initializing)
  72  |     await expect(page.locator('canvas').first()).toBeVisible({ timeout: 90000 });
  73  |   }
  74  | }
  75  | 
  76  | async function seedSandboxData(page: Page) {
  77  |   // Click seed sandbox button if available
  78  |   const seedButton = page.locator('button:has-text("Seed Sandbox Data"), button:has-text("Seed"), [data-testid="seed-sandbox"]');
  79  |   if (await seedButton.count() > 0) {
  80  |     await seedButton.first().click();
  81  |     await page.waitForTimeout(3000);
  82  |   }
  83  | }
  84  | 
  85  | async function navigateTo(page: Page, path: string) {
  86  |   const heavyPages = ['/gantt', '/ag-studio'];
  87  |   const timeout = heavyPages.includes(path) ? 90000 : 45000;
  88  |   await page.goto(path, { waitUntil: 'domcontentloaded', timeout });
  89  |   // Don't wait for networkidle - SSE connections keep network busy
  90  |   // Instead wait for main content to render
  91  |   await page.waitForTimeout(2000);
  92  |   if (path !== '/gantt') {
  93  |     await waitForNoConsoleErrors(page);
  94  |   }
  95  | }
  96  | 
  97  | test.describe.configure({ retries: 2 });
  98  | 
  99  | test.describe('PayOps Autonomous - E2E Test Suite', () => {
  100 |   test.beforeEach(async ({ page }) => {
  101 |     // Clear any existing console errors
  102 |     page.on('console', msg => {
  103 |       if (msg.type() === 'error' && !msg.text().includes('favicon')) {
  104 |         console.log(`Console error: ${msg.text()}`);
  105 |       }
  106 |     });
  107 |     page.on('pageerror', error => {
  108 |       console.log(`Page error: ${error.message}`);
  109 |     });
  110 |   });
  111 | 
  112 |   // Journey 1: Landing Page Load & Navigation
  113 |   test('Journey 1: Landing page loads and navigation works', async ({ page }) => {
  114 |     await navigateTo(page, '/');
  115 | 
  116 |     // Verify page loads - h2 is the main heading on landing page
  117 |     await expect(page.locator('h2').first()).toContainText(/PayOps|Autonomous|Agentic Commerce/i);
  118 | 
  119 |     // Check navigation links exist (use first to avoid strict mode)
  120 |     await expect(page.locator('a[href="/ag-studio"]').first()).toBeVisible();
  121 |     await expect(page.locator('a[href="/gantt"]').first()).toBeVisible();
  122 |     await expect(page.locator('a[href="/procurement"]').first()).toBeVisible();
  123 |     await expect(page.locator('a[href="/invoicing"]').first()).toBeVisible();
  124 | 
  125 |     // Click each navigation link from landing page
  126 |     const routes = ['/ag-studio', '/gantt', '/procurement', '/invoicing'];
  127 |     for (const route of routes) {
  128 |       await page.goto('/');
  129 |       await page.waitForLoadState('networkidle');
  130 |       await waitForNoConsoleErrors(page);
  131 | 
  132 |       await page.click(`a[href="${route}"]`);
  133 |       await page.waitForLoadState('networkidle');
  134 |       await waitForNoConsoleErrors(page);
> 135 |       await expect(page).toHaveURL(new RegExp(`.*${route.replace('/', '\\/')}`));
      |                          ^ Error: expect(page).toHaveURL(expected) failed
  136 |     }
  137 |   });
  138 | 
  139 |   // Journey 2: AG Studio Loads with Data & Scenario Buttons
  140 |   test('Journey 2: AG Studio loads with data sources and scenario buttons', async ({ page }) => {
  141 |     await navigateTo(page, '/ag-studio');
  142 |     await waitForAgStudioReady(page);
  143 | 
  144 |     // Check for Counterfactual Simulator (shared component)
  145 |     await expect(page.locator('text=Counterfactual Working Capital Simulator').first()).toBeVisible({ timeout: 10000 });
  146 |   });
  147 | 
  148 |   // Journey 3: AG Studio Loads and is Ready (No Inspector Drawer - AG Studio doesn't have built-in Cmd+I)
  149 |   test('Journey 3: AG Studio loads with data and AI harness initialized', async ({ page }) => {
  150 |     await navigateTo(page, '/ag-studio');
  151 |     await waitForAgStudioReady(page);
  152 | 
  153 |     // Verify studio status shows ready or component loaded
  154 |     const status = page.locator('[data-testid="studio-status"]').first();
  155 |     await expect(status).toBeVisible({ timeout: 10000 });
  156 |     const statusText = await status.textContent();
  157 |     console.log('Studio status:', statusText);
  158 | 
  159 |     // Verify data sources loaded
  160 |     await expect(page.locator('[data-testid="studio-data-count"]').first()).toBeVisible({ timeout: 10000 });
  161 | 
  162 |     // Check AI harness is initialized - the AI panel may be collapsed,
  163 |     // verify through data count showing relationships/expressions
  164 |     const dataCount = page.locator('[data-testid="studio-data-count"]').first();
  165 |     const dataCountText = await dataCount.textContent();
  166 |     console.log('Data count:', dataCountText);
  167 |     // Should show 11 sources and relationships
  168 |     expect(dataCountText).toContain('sources');
  169 |   });
  170 | 
  171 |   // Journey 4: Bryntum Gantt Loads with Payment-Locked Milestones
  172 |   test('Journey 4: Bryntum Gantt loads with dispute timeline and payment-locked milestones', async ({ page }) => {
  173 |     await navigateTo(page, '/gantt');
  174 |     await waitForGanttReady(page);
  175 | 
  176 |     // Verify SSE status (optional - might not always be visible)
  177 |     try {
  178 |       await expect(page.locator('[data-testid="sse-status"]').first()).toBeVisible({ timeout: 5000 });
  179 |     } catch {
  180 |       // SSE status might not be present, continue
  181 |     }
  182 |   });
  183 | 
  184 |   // Journey 5: Channel3 Procurement Search & PayPal Order Creation
  185 |   test('Journey 5: Procurement page - Channel3 search and PayPal order creation', async ({ page }) => {
  186 |     await navigateTo(page, '/procurement');
  187 | 
  188 |     // Wait for page load - the procurement page uses input fields for each item
  189 |     await page.waitForSelector('input[placeholder*="e.g., wireless noise-cancelling headphones"]', { timeout: 15000 });
  190 | 
  191 |     // Fill in the first procurement item query (it's already filled with default)
  192 |     const queryInput = page.locator('input[placeholder*="e.g., wireless noise-cancelling headphones"]').first();
  193 |     await queryInput.fill('wireless noise-cancelling headphones');
  194 |     await page.waitForTimeout(500);
  195 | 
  196 |     // Click the "Find Products" button
  197 |     const findProductsBtn = page.locator('button:has-text("Find Products")').first();
  198 |     await expect(findProductsBtn).toBeVisible({ timeout: 5000 });
  199 |     await findProductsBtn.click();
  200 | 
  201 |     // Wait for results (demo mode returns mock data)
  202 |     await page.waitForTimeout(10000);
  203 |     await waitForNoConsoleErrors(page);
  204 | 
  205 |     // Verify results appear (product cards with titles) - in demo mode shows mock results
  206 |     const resultsHeading = page.getByRole('heading', { name: /Search Results/i }).first();
  207 |     await expect(resultsHeading).toBeVisible({ timeout: 20000 });
  208 |     await expect(
  209 |       page.getByText(/Sony WH-1000XM5|WH-1000XM5|Headphones|wireless noise-cancelling headphones/i).first()
  210 |     ).toBeVisible({ timeout: 20000 });
  211 | 
  212 |     // Click create order / checkout button if available
  213 |     const createOrderBtn = page.locator('button:has-text("Create PayPal Order")').first();
  214 |     if (await createOrderBtn.count() > 0) {
  215 |       await createOrderBtn.click();
  216 |       await page.waitForTimeout(2000);
  217 |       await waitForNoConsoleErrors(page);
  218 |     }
  219 |   });
  220 | 
  221 |   // Journey 6: Invoicing Page - Counterfactual Simulator Sliders
  222 |   test('Journey 6: Invoicing page - Counterfactual Simulator with sliders and live outputs', async ({ page }) => {
  223 |     await navigateTo(page, '/invoicing');
  224 | 
  225 |     // Wait for simulator to load
  226 |     await page.waitForSelector('text=Counterfactual Working Capital Simulator', { timeout: 10000 });
  227 | 
  228 |     // Verify Early-Payment Discount slider (1.0%-5.0%, step 0.5%)
  229 |     const discountSlider = page.locator('input[type="range"][min="1.0"][max="5.0"][step="0.5"]').first();
  230 |     await expect(discountSlider).toBeVisible({ timeout: 5000 });
  231 | 
  232 |     // Verify Milestone Escrow Hold slider (0%-25%, step 5%)
  233 |     const escrowSlider = page.locator('input[type="range"][min="0"][max="25"][step="5"]').first();
  234 |     await expect(escrowSlider).toBeVisible({ timeout: 5000 });
  235 | 
```