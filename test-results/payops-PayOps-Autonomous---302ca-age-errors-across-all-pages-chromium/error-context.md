# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: payops.spec.ts >> PayOps Autonomous - E2E Test Suite >> Journey 10: Zero uncaught console/page errors across all pages
- Location: tests\e2e\payops.spec.ts:344:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 7
```

# Page snapshot

```yaml
- generic [active] [ref=f5e1]:
  - generic [ref=f5e2]:
    - navigation "Scenario selector" [ref=f5e3]:
      - generic [ref=f5e5]:
        - generic [ref=f5e6]: PAY
        - navigation "Scenario modes" [ref=f5e9]:
          - button "Safe Baseline - $100 cap - Press 1 to select" [pressed] [ref=f5e10] [cursor=pointer]:
            - generic [aria-hidden] [ref=f5e11]: 🛡️
            - generic [ref=f5e12]:
              - generic [ref=f5e13]: Safe Baseline
              - generic [ref=f5e14]: $100 cap
            - generic [ref=f5e16]: "1"
          - button "Aggressive Growth - $1,000 cap - Press 2 to select" [ref=f5e17] [cursor=pointer]:
            - generic [aria-hidden] [ref=f5e18]: 🚀
            - generic [ref=f5e19]:
              - generic [ref=f5e20]: Aggressive Growth
              - generic [ref=f5e21]: $1,000 cap
            - generic [ref=f5e22]: "2"
          - button "Crisis Recovery - $10 cap - Press 3 to select" [ref=f5e23] [cursor=pointer]:
            - generic [aria-hidden] [ref=f5e24]: 🔒
            - generic [ref=f5e25]:
              - generic [ref=f5e26]: Crisis Recovery
              - generic [ref=f5e27]: $10 cap
            - generic [ref=f5e28]: "3"
    - main [ref=f5e29]:
      - generic [ref=f5e30]:
        - navigation [ref=f5e31]:
          - generic [ref=f5e32]:
            - heading "PayOps Autonomous" [level=1] [ref=f5e33]
            - generic [ref=f5e34]:
              - link "Home" [ref=f5e35] [cursor=pointer]:
                - /url: /
              - link "AG Studio" [ref=f5e36] [cursor=pointer]:
                - /url: /ag-studio
              - link "Gantt" [ref=f5e37] [cursor=pointer]:
                - /url: /gantt
              - link "Procurement" [ref=f5e38] [cursor=pointer]:
                - /url: /procurement
              - link "Invoicing" [ref=f5e39] [cursor=pointer]:
                - /url: /invoicing
              - link "Dashboard" [ref=f5e40] [cursor=pointer]:
                - /url: /dashboard
        - main [ref=f5e41]:
          - generic [ref=f5e42]:
            - generic [ref=f5e43]:
              - heading "Command Center Dashboard" [level=1] [ref=f5e44]
              - paragraph [ref=f5e45]: Agentic Commerce, Procurement, Milestone Invoicing & Dispute Operations
            - generic [ref=f5e46]:
              - generic [ref=f5e47]: Live 250-Tx Dataset
              - generic [ref=f5e48]: As of 11/12/2026, 10:26:00 AM
          - generic [ref=f5e49]:
            - generic [ref=f5e50]:
              - generic [ref=f5e51]:
                - generic [ref=f5e52]:
                  - paragraph [ref=f5e53]: Total Receivables
                  - paragraph [ref=f5e54]: $3,171,730.5
                - generic [ref=f5e55]: 💰
              - generic [ref=f5e56]:
                - generic [ref=f5e57]: ↑ 12.5%
                - generic [ref=f5e58]: vs last period
            - generic [ref=f5e59]:
              - generic [ref=f5e60]:
                - generic [ref=f5e61]:
                  - paragraph [ref=f5e62]: Overdue Amount
                  - paragraph [ref=f5e63]: $3,115,618.78
                - generic [ref=f5e64]: ⚠️
              - generic [ref=f5e65]:
                - generic [ref=f5e66]: ↓ 8.2%
                - generic [ref=f5e67]: vs last period
            - generic [ref=f5e68]:
              - generic [ref=f5e69]:
                - generic [ref=f5e70]:
                  - paragraph [ref=f5e71]: Active Invoices
                  - paragraph [ref=f5e72]: "64"
                - generic [ref=f5e73]: 📄
              - generic [ref=f5e74]:
                - generic [ref=f5e75]: ↑ 5.0%
                - generic [ref=f5e76]: vs last period
            - generic [ref=f5e77]:
              - generic [ref=f5e78]:
                - generic [ref=f5e79]:
                  - paragraph [ref=f5e80]: Collection Rate
                  - paragraph [ref=f5e81]: 19.8%
                - generic [ref=f5e82]: 📈
              - generic [ref=f5e83]:
                - generic [ref=f5e84]: ↑ 3.1%
                - generic [ref=f5e85]: vs last period
          - generic [ref=f5e86]:
            - generic [ref=f5e87]:
              - generic [ref=f5e88]:
                - generic [ref=f5e89]:
                  - paragraph [ref=f5e90]: Total Balance
                  - paragraph [ref=f5e91]: $8,563,790.4
                - generic [ref=f5e92]: 💰
              - generic [ref=f5e93]:
                - generic [ref=f5e94]: ↑ 2.1%
                - generic [ref=f5e95]: vs last period
            - generic [ref=f5e96]:
              - generic [ref=f5e97]:
                - generic [ref=f5e98]:
                  - paragraph [ref=f5e99]: Available
                  - paragraph [ref=f5e100]: $7,680,353.4
                - generic [ref=f5e101]: ✅
              - generic [ref=f5e102]:
                - generic [ref=f5e103]: ↑ 1.8%
                - generic [ref=f5e104]: vs last period
            - generic [ref=f5e105]:
              - generic [ref=f5e106]:
                - generic [ref=f5e107]:
                  - paragraph [ref=f5e108]: Withheld
                  - paragraph [ref=f5e109]: $883,437
                - generic [ref=f5e110]: 🔒
              - generic [ref=f5e111]:
                - generic [ref=f5e112]: ↑ 5.4%
                - generic [ref=f5e113]: vs last period
            - generic [ref=f5e114]:
              - generic [ref=f5e115]:
                - generic [ref=f5e116]:
                  - paragraph [ref=f5e117]: Dispute Exposure
                  - paragraph [ref=f5e118]: $1,069,616.3
                - generic [ref=f5e119]: ⚖️
              - generic [ref=f5e120]:
                - generic [ref=f5e121]: ↑ 12.3%
                - generic [ref=f5e122]: vs last period
          - generic [ref=f5e123]:
            - navigation "Tabs" [ref=f5e125]:
              - button "📊 Overview" [ref=f5e126] [cursor=pointer]:
                - generic [ref=f5e127]: 📊
                - text: Overview
              - button "📄 Invoices" [ref=f5e128] [cursor=pointer]:
                - generic [ref=f5e129]: 📄
                - text: Invoices
              - button "👥 Customers" [ref=f5e130] [cursor=pointer]:
                - generic [ref=f5e131]: 👥
                - text: Customers
              - button "📦 Products" [ref=f5e132] [cursor=pointer]:
                - generic [ref=f5e133]: 📦
                - text: Products
              - button "💳 Transactions" [ref=f5e134] [cursor=pointer]:
                - generic [ref=f5e135]: 💳
                - text: Transactions
              - button "💸 Payouts" [ref=f5e136] [cursor=pointer]:
                - generic [ref=f5e137]: 💸
                - text: Payouts
              - button "💰 Balances" [ref=f5e138] [cursor=pointer]:
                - generic [ref=f5e139]: 💰
                - text: Balances
              - button "⚖️ Disputes" [ref=f5e140] [cursor=pointer]:
                - generic [ref=f5e141]: ⚖️
                - text: Disputes
            - generic [ref=f5e143]:
              - generic [ref=f5e144]:
                - generic [ref=f5e145]:
                  - heading "Top Invoices by Outstanding" [level=2] [ref=f5e146]
                  - paragraph [ref=f5e147]: 5 records
                - table [ref=f5e149]:
                  - rowgroup [ref=f5e150]:
                    - row [ref=f5e151]:
                      - 'columnheader "Invoice #" [ref=f5e152]'
                      - columnheader "Customer" [ref=f5e153]
                      - columnheader "Status" [ref=f5e154]
                      - columnheader "Ccy" [ref=f5e155]
                      - columnheader "Total" [ref=f5e156]
                      - columnheader "Outstanding" [ref=f5e157]
                      - columnheader "Due Date" [ref=f5e158]
                  - rowgroup [ref=f5e159]:
                    - row [ref=f5e160]:
                      - cell "INV-202610-2765" [ref=f5e161]
                      - cell [ref=f5e162]
                      - cell "Sent" [ref=f5e163]
                      - cell "JPY" [ref=f5e164]
                      - cell "¥966,518" [ref=f5e165]
                      - cell "¥966,518" [ref=f5e166]
                      - cell "10/22/2026" [ref=f5e167]
                    - row [ref=f5e168]:
                      - cell "INV-202601-2828" [ref=f5e169]
                      - cell [ref=f5e170]
                      - cell "Payment Pending" [ref=f5e171]
                      - cell "JPY" [ref=f5e172]
                      - cell "¥826,735" [ref=f5e173]
                      - cell "¥826,735" [ref=f5e174]
                      - cell "3/20/2026" [ref=f5e175]
                    - row [ref=f5e176]:
                      - cell "INV-202601-9787" [ref=f5e177]
                      - cell [ref=f5e178]
                      - cell "Sent" [ref=f5e179]
                      - cell "JPY" [ref=f5e180]
                      - cell "¥637,319" [ref=f5e181]
                      - cell "¥637,319" [ref=f5e182]
                      - cell "3/11/2026" [ref=f5e183]
                    - row [ref=f5e184]:
                      - cell "INV-202608-9953" [ref=f5e185]
                      - cell [ref=f5e186]
                      - cell "Sent" [ref=f5e187]
                      - cell "JPY" [ref=f5e188]
                      - cell "¥310,661" [ref=f5e189]
                      - cell "¥310,661" [ref=f5e190]
                      - cell "10/29/2026" [ref=f5e191]
                    - row [ref=f5e192]:
                      - cell "INV-202606-3601" [ref=f5e193]
                      - cell [ref=f5e194]
                      - cell "Partially Paid" [ref=f5e195]
                      - cell "JPY" [ref=f5e196]
                      - cell "¥696,521" [ref=f5e197]
                      - cell "¥278,608" [ref=f5e198]
                      - cell "7/8/2026" [ref=f5e199]
              - generic [ref=f5e200]:
                - generic [ref=f5e201]:
                  - heading "Recent Transactions" [level=2] [ref=f5e202]
                  - paragraph [ref=f5e203]: 5 records
                - table [ref=f5e205]:
                  - rowgroup [ref=f5e206]:
                    - row [ref=f5e207]:
                      - columnheader "Date" [ref=f5e208]
                      - columnheader "Type" [ref=f5e209]
                      - columnheader "Dir" [ref=f5e210]
                      - columnheader "Amount" [ref=f5e211]
                      - columnheader "Status" [ref=f5e212]
                  - rowgroup [ref=f5e213]:
                    - row [ref=f5e214]:
                      - cell "12/7/2026" [ref=f5e215]
                      - cell "Transfer" [ref=f5e216]
                      - cell "Credit" [ref=f5e217]
                      - cell "+¥247,273" [ref=f5e218]
                      - cell "Denied" [ref=f5e220]
                    - row [ref=f5e221]:
                      - cell "1/8/2025" [ref=f5e222]
                      - cell "Transfer" [ref=f5e223]
                      - cell "Debit" [ref=f5e224]
                      - cell "£59,250" [ref=f5e225]
                      - cell "Partially Refunded" [ref=f5e226]
                    - row [ref=f5e227]:
                      - cell "3/6/2025" [ref=f5e228]
                      - cell "Refund" [ref=f5e229]
                      - cell "Credit" [ref=f5e230]
                      - cell "+SGD 6,218" [ref=f5e231]
                      - cell "Partially Refunded" [ref=f5e233]
                    - row [ref=f5e234]:
                      - cell "8/5/2025" [ref=f5e235]
                      - cell "Hold Released" [ref=f5e236]
                      - cell "Credit" [ref=f5e237]
                      - cell "+€4,150" [ref=f5e238]
                      - cell "Pending" [ref=f5e240]
                    - row [ref=f5e241]:
                      - cell "5/4/2025" [ref=f5e242]
                      - cell "Payout Hold" [ref=f5e243]
                      - cell "Debit" [ref=f5e244]
                      - cell "€4,367" [ref=f5e245]
                      - cell "Partially Refunded" [ref=f5e246]
          - generic [ref=f5e248]:
            - paragraph [ref=f5e249]: PayOps Autonomous — PayPal AI Hackathon 2026 | 250-transaction multi-currency dataset with 18 planted anomalies
            - generic [ref=f5e250]:
              - generic [ref=f5e251]: Powered by PayPal APIs
              - generic [ref=f5e252]: AG Studio v3.1
              - generic [ref=f5e253]: Bryntum Gantt v7.3
              - generic [ref=f5e254]: Channel3 SDK v4
  - status [ref=f5e255]:
    - generic [ref=f5e260]:
      - text: Static route
      - button "Hide static indicator" [ref=f5e261] [cursor=pointer]
  - alert [ref=f5e265]
```

# Test source

```ts
  279 | 
  280 |     // Wait for API call and inspector drawer
  281 |     await page.waitForTimeout(5000);
  282 |     await waitForNoConsoleErrors(page);
  283 | 
  284 |     // Verify Inspector Drawer opens (380px)
  285 |     const drawer = page.locator('[class*="inspector"], [class*="drawer"], aside:has-text("Inspector")').first();
  286 |     await expect(drawer).toBeVisible({ timeout: 10000 });
  287 | 
  288 |     // Verify 3 sections/tabs in drawer: Payload, Ledger Trace, API Response
  289 |     await expect(page.locator('text=API Payload').first()).toBeVisible({ timeout: 5000 });
  290 |     await expect(page.locator('text=Ledger Trace').first()).toBeVisible({ timeout: 5000 });
  291 |     await expect(page.locator('text=API Response').first()).toBeVisible({ timeout: 5000 });
  292 |     await expect(page.getByText('1/3').first()).toBeVisible({ timeout: 5000 });
  293 |     await expect(page.getByText('2/3').first()).toBeVisible({ timeout: 5000 });
  294 |     await expect(page.getByText('3/3').first()).toBeVisible({ timeout: 5000 });
  295 | 
  296 |     // Check ledger trace shows double-entry/action entries
  297 |     await expect(page.locator('text=FETCH_UNPAID_INVOICES').first()).toBeVisible({ timeout: 5000 });
  298 | 
  299 |     // Close drawer
  300 |     await page.keyboard.press('Escape');
  301 |     await page.waitForTimeout(300);
  302 |   });
  303 | 
  304 |   // Journey 8: Dashboard / Health Check Endpoint
  305 |   test('Journey 8: Health endpoint returns 200 and dashboard loads', async ({ page }) => {
  306 |     // Test health endpoint directly
  307 |     const healthResponse = await page.request.get('/api/health');
  308 |     expect(healthResponse.status()).toBe(200);
  309 |     const healthData = await healthResponse.json();
  310 |     expect(healthData.status).toBe('ok');
  311 | 
  312 |     // Test dashboard page
  313 |     await navigateTo(page, '/dashboard');
  314 |     await page.waitForTimeout(2000);
  315 |     await waitForNoConsoleErrors(page);
  316 | 
  317 |     // Verify dashboard loads with key content
  318 |     await expect(page.locator('h1:has-text("PayOps Autonomous")').first()).toBeVisible({ timeout: 10000 });
  319 |     await expect(page.getByText('Invoices').first()).toBeVisible({ timeout: 10000 });
  320 |   });
  321 | 
  322 |   // Journey 9: Sandbox Seeding Works
  323 |   test('Journey 9: Sandbox seeding creates test data', async ({ page }) => {
  324 |     await navigateTo(page, '/');
  325 | 
  326 |     // Look for seed button
  327 |     const seedBtn = page.locator('button:has-text("Seed"), button:has-text("Sandbox")').first();
  328 |     if (await seedBtn.count() > 0) {
  329 |       await seedBtn.click();
  330 |       await page.waitForTimeout(5000);
  331 |       await waitForNoConsoleErrors(page);
  332 | 
  333 |       // Verify data loaded by checking AG Studio
  334 |       await navigateTo(page, '/ag-studio');
  335 |       await waitForAgStudioReady(page);
  336 |     } else {
  337 |       // If no seed button, verify data already exists
  338 |       await navigateTo(page, '/ag-studio');
  339 |       await waitForAgStudioReady(page);
  340 |     }
  341 |   });
  342 | 
  343 |   // Journey 10: No Uncaught Console/Page Errors Across All Pages
  344 |   test('Journey 10: Zero uncaught console/page errors across all pages', async ({ page }) => {
  345 |     const pages = ['/', '/ag-studio', '/gantt', '/procurement', '/invoicing', '/dashboard'];
  346 |     const allErrors: string[] = [];
  347 | 
  348 |     for (const path of pages) {
  349 |       const errors: string[] = [];
  350 |       page.on('console', msg => {
  351 |         if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('Failed to load resource')) {
  352 |           errors.push(`${path}: ${msg.text()}`);
  353 |         }
  354 |       });
  355 |       page.on('pageerror', error => {
  356 |         errors.push(`${path}: ${error.message}`);
  357 |       });
  358 | 
  359 |       await navigateTo(page, path);
  360 |       await page.waitForTimeout(1000);
  361 | 
  362 |       allErrors.push(...errors);
  363 |     }
  364 | 
  365 |     // Report any errors found
  366 |     if (allErrors.length > 0) {
  367 |       console.log('Errors found:', allErrors);
  368 |     }
  369 | 
  370 |     // Assert zero errors (excluding known benign ones)
  371 |     const criticalErrors = allErrors.filter(e =>
  372 |       !e.includes('favicon') &&
  373 |       !e.includes('Failed to load resource') &&
  374 |       !e.includes('net::ERR_BLOCKED_BY_CLIENT') &&
  375 |       !e.includes('Extension') &&
  376 |       !e.includes('chrome-extension')
  377 |     );
  378 | 
> 379 |     expect(criticalErrors.length).toBe(0);
      |                                   ^ Error: expect(received).toBe(expected) // Object.is equality
  380 |   });
  381 | });
  382 | 
  383 | // Additional helper tests
  384 | test.describe('API Endpoints', () => {
  385 |   test('API: /api/ag-studio/transactions returns data', async ({ request }) => {
  386 |     const response = await request.get('/api/ag-studio/transactions');
  387 |     expect(response.status()).toBe(200);
  388 |     const data = await response.json();
  389 |     expect(data).toHaveProperty('invoices');
  390 |     expect(Array.isArray(data.invoices)).toBe(true);
  391 |   });
  392 | 
  393 |   test('API: /api/ag-studio/balances returns data', async ({ request }) => {
  394 |     const response = await request.get('/api/ag-studio/balances');
  395 |     expect(response.status()).toBe(200);
  396 |     const data = await response.json();
  397 |     expect(data).toHaveProperty('balances');
  398 |   });
  399 | 
  400 |   test('API: /api/ag-studio/anomalies returns data', async ({ request }) => {
  401 |     const response = await request.get('/api/ag-studio/anomalies');
  402 |     expect(response.status()).toBe(200);
  403 |     const data = await response.json();
  404 |     expect(data).toHaveProperty('anomalies');
  405 |   });
  406 | 
  407 |   test('API: /api/invoices/conditional-rules accepts POST', async ({ request }) => {
  408 |     const response = await request.post('/api/invoices/conditional-rules', {
  409 |       data: {
  410 |         earlyPaymentDiscount: { percent: '2.5', days: 10 },
  411 |         milestoneEscrowHoldPercent: 10,
  412 |         applyToStatuses: ['SENT', 'UNPAID'],
  413 |         idempotencyKey: 'test-' + Date.now(),
  414 |       },
  415 |     });
  416 |     // Should not be 404 or 500
  417 |     expect(response.status()).not.toBe(404);
  418 |     expect(response.status()).not.toBe(500);
  419 |   });
  420 | 
  421 |   test('API: /api/sandbox/seed triggers seeding', async ({ request }) => {
  422 |     const response = await request.post('/api/sandbox/seed');
  423 |     expect(response.status()).toBe(200);
  424 |   });
  425 | });
  426 | 
  427 | test.describe('Keyboard Shortcuts', () => {
  428 |   test('Cmd+I opens inspector on AG Studio', async ({ page }) => {
  429 |     await navigateTo(page, '/ag-studio');
  430 |     await waitForAgStudioReady(page);
  431 |     await page.keyboard.press('Meta+i');
  432 |     await page.waitForTimeout(1000);
  433 |     await expect(page.locator('[class*="inspector"], [class*="drawer"], aside:has-text("Inspector")').first()).toBeVisible({ timeout: 5000 });
  434 |     await page.keyboard.press('Escape');
  435 |   });
  436 | 
  437 |   test('Number keys 1/2/3 switch inspector tabs', async ({ page }) => {
  438 |     await navigateTo(page, '/ag-studio');
  439 |     await waitForAgStudioReady(page);
  440 |     await page.keyboard.press('Meta+i');
  441 |     await page.waitForTimeout(1000);
  442 | 
  443 |     // Press 1, 2, 3
  444 |     await page.keyboard.press('1');
  445 |     await page.waitForTimeout(200);
  446 |     await page.keyboard.press('2');
  447 |     await page.waitForTimeout(200);
  448 |     await page.keyboard.press('3');
  449 |     await page.waitForTimeout(200);
  450 |     await waitForNoConsoleErrors(page);
  451 |     await page.keyboard.press('Escape');
  452 |   });
  453 | });
  454 | 
  455 | test.describe('Responsive Design', () => {
  456 |   test('Pages work on mobile viewport', async ({ page }) => {
  457 |     test.setTimeout(300000);
  458 |     await page.setViewportSize({ width: 375, height: 667 });
  459 |     const pages = ['/', '/procurement', '/invoicing', '/ag-studio', '/gantt'];
  460 | 
  461 |     for (const path of pages) {
  462 |       await navigateTo(page, path);
  463 |       if (path === '/ag-studio') {
  464 |         await page.waitForSelector('[data-testid="ag-studio-container"]', { timeout: 90000, state: 'attached' });
  465 |         await expect(page.locator('[data-testid="ag-studio-title"]').first()).toBeAttached({ timeout: 30000 });
  466 |       } else if (path === '/gantt') {
  467 |         await waitForGanttReady(page, true);
  468 |       } else {
  469 |         await page.waitForTimeout(1000);
  470 |       }
  471 |     }
  472 |   });
  473 | 
  474 |   test('Pages work on tablet viewport', async ({ page }) => {
  475 |     test.setTimeout(300000);
  476 |     await page.setViewportSize({ width: 768, height: 1024 });
  477 |     const pages = ['/', '/procurement', '/invoicing', '/ag-studio', '/gantt'];
  478 | 
  479 |     for (const path of pages) {
```