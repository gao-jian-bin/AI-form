# Global Route Loading Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a thin global progress bar that gives immediate feedback during every Nuxt-managed route change.

**Architecture:** Render Nuxt's built-in `NuxtLoadingIndicator` once in the root application component so it follows router lifecycle events automatically. Keep presentation in the existing global stylesheet, with a reduced-motion override, and verify the behavior through the public-site Playwright suite.

**Tech Stack:** Nuxt 4.5, Vue 3, TypeScript, CSS, Playwright

## Global Constraints

- Use Nuxt's built-in loading indicator and add no third-party dependency.
- Show the indicator for every Nuxt-managed internal route, including public and admin pages.
- Use a 3px bar, `var(--tertiary)` for normal loading, and `var(--danger)` for route errors.
- Wait 80ms before showing the bar so fast navigations do not flash unnecessarily.
- Keep the bar fixed at the top without taking up layout space or receiving pointer or keyboard input.
- Disable its transition animation when the operating system requests reduced motion.
- Do not add percentage text or cover ordinary API requests that do not cause navigation.

---

### Task 1: Add and verify the global route indicator

**Files:**
- Modify: `tests/e2e/forum.spec.ts:169`
- Modify: `app/app.vue:1`
- Modify: `app/assets/css/main.css:75`

**Interfaces:**
- Consumes: Nuxt's globally registered `NuxtLoadingIndicator` component and existing CSS variables `--tertiary` and `--danger`.
- Produces: One `.nuxt-loading-indicator` element at the root of the application, driven by Nuxt route lifecycle events.

- [ ] **Step 1: Write the failing navigation test**

Add this test near the existing public browsing tests in `tests/e2e/forum.spec.ts`:

```ts
test('shows the global route progress bar while a topic loads', async ({ page, request }) => {
  const response = await request.get('/api/topics?pageSize=1')
  const topicPage = await response.json() as {
    items: Array<{ id: number, slug: string, title: string }>
  }
  const topic = topicPage.items[0]!

  await page.goto('/')
  await page.route(`**/api/topics/${topic.id}`, async (route) => {
    if (route.request().method() === 'GET') {
      await new Promise(resolveDelay => setTimeout(resolveDelay, 700))
    }
    await route.continue()
  })

  const indicator = page.locator('.nuxt-loading-indicator')
  const navigation = page.locator(`[data-topic-id="${topic.id}"] [data-topic-title]`).click()

  await expect(indicator).toHaveCSS('opacity', '1')
  await expect(indicator).toHaveCSS('height', '3px')
  await expect(indicator).toHaveCSS('background-color', 'rgb(0, 136, 204)')
  await navigation
  await expect(page).toHaveURL(`/t/${encodeURIComponent(topic.slug)}/${topic.id}`)
  await expect(indicator).toHaveCSS('opacity', '0')
})
```

- [ ] **Step 2: Run the focused end-to-end test and verify RED**

Run:

```powershell
npm run test:e2e -- --grep "global route progress bar"
```

Expected: FAIL because `.nuxt-loading-indicator` does not exist.

- [ ] **Step 3: Render the minimal loading indicator**

Add the component immediately after the skip link in `app/app.vue`:

```vue
<NuxtLoadingIndicator
  :height="3"
  :throttle="80"
  color="var(--tertiary)"
  error-color="var(--danger)"
/>
```

- [ ] **Step 4: Re-run the focused test and verify GREEN**

Run:

```powershell
npm run test:e2e -- --grep "global route progress bar"
```

Expected: PASS. The bar becomes opaque during the delayed topic request, uses the site accent color, and returns to zero opacity after navigation.

- [ ] **Step 5: Write the failing reduced-motion test**

Add this test directly after the navigation test:

```ts
test('removes route progress animation when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')

  await expect(page.locator('.nuxt-loading-indicator')).toHaveCSS('transition-duration', '0s')
})
```

- [ ] **Step 6: Run the reduced-motion test and verify RED**

Run:

```powershell
npm run test:e2e -- --grep "reduced motion"
```

Expected: FAIL because Nuxt's inline loading-indicator transition is still active.

- [ ] **Step 7: Add the reduced-motion override**

Add this rule near the global motion and accessibility styles in `app/assets/css/main.css`:

```css
@media (prefers-reduced-motion: reduce) {
  .nuxt-loading-indicator {
    transition: none !important;
  }
}
```

- [ ] **Step 8: Re-run both focused tests and verify GREEN**

Run:

```powershell
npm run test:e2e -- --grep "global route progress bar|reduced motion"
```

Expected: 2 tests pass with no failures.

- [ ] **Step 9: Run the full verification suite**

Run:

```powershell
npm test
npm run typecheck
npm run build
npm run test:e2e
```

Expected: all unit tests, type checking, production build, and end-to-end tests finish with exit code 0.

- [ ] **Step 10: Review and commit the implementation**

Review only the intended files:

```powershell
git diff --check
git diff -- app/app.vue app/assets/css/main.css tests/e2e/forum.spec.ts
```

Commit them:

```powershell
git add app/app.vue app/assets/css/main.css tests/e2e/forum.spec.ts
git commit -m "feat: show progress during route navigation"
```
