# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lead-integrity.spec.ts >> Lead Data Integrity Flow >> should prevent duplicate lead submissions with the same email
- Location: tests\lead-integrity.spec.ts:15:7

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('.property-card').first()

```

# Page snapshot

```yaml
- dialog "Unhandled Runtime Error" [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - navigation [ref=e7]:
          - button "previous" [disabled] [ref=e8]:
            - img "previous" [ref=e9]
          - button "next" [disabled] [ref=e11]:
            - img "next" [ref=e12]
          - generic [ref=e14]: 1 of 1 unhandled error
          - generic [ref=e15]:
            - text: Next.js (14.1.0) is outdated
            - link "(learn more)" [ref=e17] [cursor=pointer]:
              - /url: https://nextjs.org/docs/messages/version-staleness
        - button "Close" [ref=e18] [cursor=pointer]:
          - img [ref=e20]
      - heading "Unhandled Runtime Error" [level=1] [ref=e23]
      - paragraph [ref=e24]: "TypeError: Cannot read properties of undefined (reading 'length')"
    - generic [ref=e25]:
      - heading "Source" [level=2] [ref=e26]
      - generic [ref=e27]:
        - link "components\\Properties.jsx (66:20) @ length" [ref=e29] [cursor=pointer]:
          - generic [ref=e30]: components\Properties.jsx (66:20) @ length
          - img [ref=e31]
        - generic [ref=e35]: "64 | </div> 65 | > 66 | {properties.length === 0 ? ( | ^ 67 | <p>No properties found</p> 68 | ) : ( 69 | <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>"
      - button "Show collapsed frames" [ref=e36] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * E2E Test for Lead Data Integrity
  5  |  * Verifies unique constraint and validation logic for real estate leads.
  6  |  */
  7  | test.describe('Lead Data Integrity Flow', () => {
  8  |   
  9  |   test.beforeEach(async ({ page }) => {
  10 |     // Assuming there is a lead capture form on the property detail page
  11 |     await page.goto('/properties');
> 12 |     await page.locator('.property-card').first().click();
     |                                                  ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  13 |   });
  14 | 
  15 |   test('should prevent duplicate lead submissions with the same email', async ({ page }) => {
  16 |     const testEmail = `test_lead_${Date.now()}@example.com`;
  17 |     
  18 |     // First Submission
  19 |     await page.fill('input[name="leadName"]', 'Test Lead');
  20 |     await page.fill('input[name="leadEmail"]', testEmail);
  21 |     await page.click('button:has-text("Request Info")');
  22 |     
  23 |     await expect(page.locator('text=/Success|Thank you/i')).toBeVisible();
  24 | 
  25 |     // Second Submission (Duplicate Email)
  26 |     await page.goto(page.url()); // Reload
  27 |     await page.fill('input[name="leadName"]', 'Duplicate Lead');
  28 |     await page.fill('input[name="leadEmail"]', testEmail);
  29 |     await page.click('button:has-text("Request Info")');
  30 | 
  31 |     // Assert error message for duplicate constraint
  32 |     await expect(page.locator('text=/already registered|exists|duplicate/i')).toBeVisible();
  33 |   });
  34 | 
  35 |   test('should validate budget inputs for investment leads', async ({ page }) => {
  36 |     await page.fill('input[name="leadName"]', 'Budget Test');
  37 |     await page.fill('input[name="leadEmail"]', `budget_${Date.now()}@example.com`);
  38 |     
  39 |     // Test negative budget
  40 |     await page.fill('input[name="budget"]', '-5000');
  41 |     await page.click('button:has-text("Request Info")');
  42 |     
  43 |     await expect(page.locator('text=/must be positive|invalid budget/i')).toBeVisible();
  44 |   });
  45 | });
  46 | 
```