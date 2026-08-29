# Composer Usability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Discourse-style topic composer render block Markdown correctly, support in-page fullscreen, expose draggable scrollbars, and allow the docked composer height to be resized.

**Architecture:** Keep the current global `TopicEditor` and add only local layout state; no route, API, or database changes are needed. Markdown block insertion remains a pure utility, while fullscreen and pointer-resize behavior live in the editor component and CSS controls viewport locking and independent pane scrolling.

**Tech Stack:** Nuxt 4, Vue 3 Composition API, TypeScript, CSS, Vitest, Playwright with Microsoft Edge on Windows.

## Global Constraints

- Do not add a frontend dependency or copy Discourse's Ember runtime.
- Preserve the current docked, no-navigation editing workflow and all save/draft behavior.
- Fullscreen means filling the current webpage viewport, not invoking browser F11 or the Fullscreen API.
- Editing and preview panes must scroll independently on desktop; mobile keeps the existing edit/preview tabs.
- Use tests before implementation and keep every intermediate commit runnable.

---

### Task 1: Correct Markdown block insertion and quote rendering

**Files:**
- Modify: `tests/markdown-editor.test.ts:13-30`
- Modify: `tests/content.test.ts:28-38`
- Modify: `app/utils/markdown-editor.ts:70-114`

**Interfaces:**
- Consumes: existing `applyMarkdownAction(value, start, end, action): MarkdownEditResult`.
- Produces: unchanged public interface; block actions insert valid blank-line boundaries and return cursor positions inside generated placeholders.

- [ ] **Step 1: Add failing unit tests for a quote inserted after ordinary text**

```ts
it('starts placeholder block actions on a valid Markdown block boundary', () => {
  expect(applyMarkdownAction('正文', 2, 2, 'quote')).toEqual({
    value: '正文\n\n> 引用内容',
    selectionStart: 6,
    selectionEnd: 10,
  })
  expect(applyMarkdownAction('正文', 2, 2, 'bullet-list').value)
    .toBe('正文\n\n- 列表项')
  expect(applyMarkdownAction('正文', 2, 2, 'heading').value)
    .toBe('正文\n\n## 标题')
})
```

- [ ] **Step 2: Add a failing renderer assertion for blockquotes**

```ts
it('renders Markdown blockquotes for the composer preview', () => {
  expect(renderSafeMarkdown('正文\n\n> 引用内容'))
    .toContain('<blockquote>')
})
```

- [ ] **Step 3: Run the focused tests and confirm the toolbar test fails for the diagnosed reason**

Run: `npm.cmd test -- tests/markdown-editor.test.ts tests/content.test.ts`

Expected: the quote value is currently `正文> 引用内容`; the new blockquote renderer assertion may already pass, proving the renderer is not the bug.

- [ ] **Step 4: Add a block-aware replacement helper and use it for quote, list, heading, and multiline code**

Add this helper beside `replaceSelection`:

```ts
function replaceBlock(
  value: string,
  start: number,
  end: number,
  block: string,
  innerStart = 0,
  innerLength = block.length,
): MarkdownEditResult {
  const before = value.slice(0, start)
  const after = value.slice(end)
  const leading = !before
    ? ''
    : before.endsWith('\n\n')
      ? ''
      : before.endsWith('\n') ? '\n' : '\n\n'
  const trailing = !after
    ? ''
    : after.startsWith('\n\n')
      ? ''
      : after.startsWith('\n') ? '\n' : '\n\n'

  return replaceSelection(
    value,
    start,
    end,
    `${leading}${block}${trailing}`,
    leading.length + innerStart,
    innerLength,
  )
}
```

Replace `prefixLines` with block-aware placeholder selection:

```ts
function prefixBlockLines(
  value: string,
  start: number,
  end: number,
  prefix: (index: number) => string,
  placeholder: string,
): MarkdownEditResult {
  const hasSelection = end > start
  const selected = hasSelection ? value.slice(start, end) : placeholder
  const replacement = selected
    .split('\n')
    .map((line, index) => `${prefix(index)}${line}`)
    .join('\n')

  return replaceBlock(
    value,
    start,
    end,
    replacement,
    hasSelection ? 0 : prefix(0).length,
    hasSelection ? replacement.length : placeholder.length,
  )
}
```

Use `prefixBlockLines` for quote, both lists, and heading. Use `replaceBlock(value, start, end, fencedCode, 4, selected.length)` for multiline code while preserving inline-code behavior for a one-line selection.

- [ ] **Step 5: Run the focused tests and confirm they pass**

Run: `npm.cmd test -- tests/markdown-editor.test.ts tests/content.test.ts`

Expected: all focused tests pass, including the pre-existing multiline selection assertions.

- [ ] **Step 6: Commit the Markdown fix**

```powershell
git add app/utils/markdown-editor.ts tests/markdown-editor.test.ts tests/content.test.ts
git commit -m "fix: insert valid markdown blocks in composer"
```

---

### Task 2: Add webpage fullscreen and explicit independent scrolling

**Files:**
- Modify: `tests/e2e/forum.spec.ts:123-185`
- Modify: `app/components/TopicEditor.vue:1-265`
- Modify: `app/assets/css/main.css:986-1263,2223-2303`

**Interfaces:**
- Consumes: existing controlled `collapsed` prop and `toggle-collapse` / `request-close` events.
- Produces: local `fullscreen: Ref<boolean>`, `toggleFullscreen()`, and the root classes `fullscreen` and `composer-fullscreen`; no parent API changes.

- [ ] **Step 1: Add a failing browser test for quote preview, long-pane scrolling, and visible scrollbar allocation**

```ts
test('composer renders quotes and keeps long editor panes independently scrollable', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await page.getByRole('button', { name: /编辑帖子/ }).first().click()

  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  const editor = composer.getByLabel('正文 · Markdown')
  await editor.fill('正文')
  await editor.press('End')
  await composer.getByRole('button', { name: '引用' }).click()
  await expect(editor).toHaveValue('正文\n\n> 引用内容')
  await expect(composer.locator('.d-editor-preview blockquote')).toContainText('引用内容')

  const longText = Array.from({ length: 220 }, (_, index) => `第 ${index + 1} 行`).join('\n')
  await editor.fill(longText)
  await expect.poll(() => editor.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true)
  await expect.poll(() => composer.locator('.d-editor-preview-wrapper').evaluate(
    element => element.scrollHeight > element.clientHeight,
  )).toBe(true)
  await expect(editor).toHaveCSS('overflow-y', 'scroll')
  await expect(editor).toHaveCSS('scrollbar-gutter', 'stable')
})
```

- [ ] **Step 2: Add a failing browser test for fullscreen entry, Escape exit, and background scroll locking**

```ts
test('composer fills the webpage viewport and exits fullscreen with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await page.getByRole('button', { name: /编辑帖子/ }).first().click()

  const root = page.locator('#reply-control')
  await page.getByRole('button', { name: '全屏编辑' }).click()
  await expect(root).toHaveClass(/fullscreen/)
  await expect(page.locator('html')).toHaveClass(/composer-fullscreen/)
  const box = await root.boundingBox()
  expect(box).toMatchObject({ x: 0, y: 0, width: 1280, height: 900 })
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden')

  await page.keyboard.press('Escape')
  await expect(root).not.toHaveClass(/fullscreen/)
  await expect(page.locator('html')).not.toHaveClass(/composer-fullscreen/)
})
```

- [ ] **Step 3: Run the two new browser tests and confirm they fail**

Run: `npm.cmd run build` then `node scripts/run-e2e.mjs -g "composer renders quotes|composer fills"`

Expected: the quote assertion, fullscreen button lookup, and explicit scrollbar CSS assertions fail before implementation.

- [ ] **Step 4: Implement local fullscreen state with complete cleanup**

Add to `TopicEditor.vue`:

```ts
const fullscreen = ref(false)

function setFullscreen(value: boolean) {
  fullscreen.value = value
  if (import.meta.client) {
    document.documentElement.classList.toggle('composer-fullscreen', value)
  }
}

function toggleFullscreen() {
  setFullscreen(!fullscreen.value)
}

function requestToggleCollapse() {
  setFullscreen(false)
  emit('toggle-collapse')
}

function handleWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && fullscreen.value) setFullscreen(false)
}

watch(() => props.collapsed, collapsed => {
  if (collapsed) setFullscreen(false)
})

onMounted(() => {
  updatePreview()
  window.addEventListener('keydown', handleWindowKeydown)
})

onBeforeUnmount(() => {
  clearTimeout(previewTimer)
  window.removeEventListener('keydown', handleWindowKeydown)
  document.documentElement.classList.remove('composer-fullscreen')
})
```

Bind `:class="{ collapsed, fullscreen }"` and route the existing collapse button through `requestToggleCollapse`. Keep the close button emitting `request-close` directly: `AdminComposerHost` may cancel closing when there are unsaved changes, so fullscreen must remain active until the component actually unmounts. Add this control before collapse:

```vue
<button
  v-if="!collapsed"
  class="composer-control composer-fullscreen-toggle"
  type="button"
  :aria-label="fullscreen ? '退出全屏' : '全屏编辑'"
  :title="fullscreen ? '退出全屏（Esc）' : '全屏编辑'"
  :aria-pressed="fullscreen"
  @click="toggleFullscreen"
>⛶</button>
```

- [ ] **Step 5: Implement fullscreen and stable scrolling CSS**

Add the following rules near the composer styles, keeping mobile overrides below them:

```css
html.composer-fullscreen,
html.composer-fullscreen body {
  overflow: hidden;
}

.discourse-composer.fullscreen {
  inset: 0;
  width: 100%;
  height: 100dvh;
  max-height: none;
  border: 0;
  border-radius: 0;
}

.discourse-composer.fullscreen .grippie {
  display: none;
}

.reply-area,
.d-editor-container,
.d-editor-textarea-column,
.d-editor-textarea-wrapper {
  overflow: hidden;
}

.d-editor-input,
.d-editor-preview-wrapper {
  overflow-y: scroll;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: var(--primary-low-mid) var(--primary-very-low);
}

.d-editor-input::-webkit-scrollbar,
.d-editor-preview-wrapper::-webkit-scrollbar {
  width: 11px;
}

.d-editor-input::-webkit-scrollbar-track,
.d-editor-preview-wrapper::-webkit-scrollbar-track {
  background: var(--primary-very-low);
}

.d-editor-input::-webkit-scrollbar-thumb,
.d-editor-preview-wrapper::-webkit-scrollbar-thumb {
  border: 3px solid var(--primary-very-low);
  border-radius: 999px;
  background: var(--primary-low-mid);
}
```

Change `.d-editor-input` from `min-height: 220px` to `min-height: 0` so the textarea stays within the grid row instead of forcing an outer overflow.

- [ ] **Step 6: Rebuild and run the new browser tests**

Run: `npm.cmd run build` then `node scripts/run-e2e.mjs -g "composer renders quotes|composer fills"`

Expected: both tests pass and the HTML scroll lock is removed after Escape.

- [ ] **Step 7: Commit fullscreen and scrolling**

```powershell
git add app/components/TopicEditor.vue app/assets/css/main.css tests/e2e/forum.spec.ts
git commit -m "feat: add fullscreen composer and pane scrolling"
```

---

### Task 3: Make the Discourse-style grippie resize the docked composer

**Files:**
- Create: `app/utils/composer-layout.ts`
- Create: `tests/composer-layout.test.ts`
- Modify: `app/components/TopicEditor.vue`
- Modify: `app/assets/css/main.css`
- Modify: `tests/e2e/forum.spec.ts`

**Interfaces:**
- Produces: `clampComposerHeight(proposedHeight: number, viewportHeight: number): number`.
- Consumes: root form ref and pointer coordinates; stores height only in the mounted editor instance via CSS variable `--composer-height`.

- [ ] **Step 1: Add failing unit tests for height bounds**

```ts
import { describe, expect, it } from 'vitest'
import { clampComposerHeight } from '../app/utils/composer-layout'

describe('clampComposerHeight', () => {
  it('keeps the composer usable and inside the viewport', () => {
    expect(clampComposerHeight(200, 900)).toBe(320)
    expect(clampComposerHeight(540, 900)).toBe(540)
    expect(clampComposerHeight(1000, 900)).toBe(884)
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails because the helper does not exist**

Run: `npm.cmd test -- tests/composer-layout.test.ts`

Expected: FAIL resolving `app/utils/composer-layout`.

- [ ] **Step 3: Implement the pure height clamp**

```ts
const MIN_COMPOSER_HEIGHT = 320
const VIEWPORT_GAP = 16

export function clampComposerHeight(proposedHeight: number, viewportHeight: number) {
  const maximumHeight = Math.max(MIN_COMPOSER_HEIGHT, viewportHeight - VIEWPORT_GAP)
  return Math.min(Math.max(proposedHeight, MIN_COMPOSER_HEIGHT), maximumHeight)
}
```

- [ ] **Step 4: Run the unit test and confirm it passes**

Run: `npm.cmd test -- tests/composer-layout.test.ts`

Expected: PASS.

- [ ] **Step 5: Add a failing browser test for pointer and keyboard resizing**

```ts
test('composer grippie resizes the docked editor within viewport bounds', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await page.getByRole('button', { name: /编辑帖子/ }).first().click()

  const root = page.locator('#reply-control')
  const grippie = page.getByRole('separator', { name: '调整编辑器高度' })
  const before = await root.boundingBox()
  const handle = await grippie.boundingBox()
  expect(before).not.toBeNull()
  expect(handle).not.toBeNull()

  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2)
  await page.mouse.down()
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y - 120)
  await page.mouse.up()
  const afterPointer = await root.boundingBox()
  expect(afterPointer!.height).toBeGreaterThan(before!.height + 80)

  await grippie.focus()
  await grippie.press('ArrowDown')
  const afterKeyboard = await root.boundingBox()
  expect(afterKeyboard!.height).toBeLessThan(afterPointer!.height)
})
```

- [ ] **Step 6: Add resize state and pointer capture to `TopicEditor.vue`**

Import `computed` and `clampComposerHeight`, then add:

```ts
const composerRoot = ref<HTMLFormElement | null>(null)
const composerHeight = ref<number | null>(null)
const resizing = ref(false)
let resizeStartY = 0
let resizeStartHeight = 0

const composerStyle = computed(() => composerHeight.value
  ? { '--composer-height': `${composerHeight.value}px` }
  : undefined)

function setComposerHeight(height: number) {
  composerHeight.value = clampComposerHeight(height, window.innerHeight)
}

function startResize(event: PointerEvent) {
  if (props.collapsed || fullscreen.value || !composerRoot.value) return
  event.preventDefault()
  resizing.value = true
  resizeStartY = event.clientY
  resizeStartHeight = composerRoot.value.getBoundingClientRect().height
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function continueResize(event: PointerEvent) {
  if (!resizing.value) return
  setComposerHeight(resizeStartHeight + resizeStartY - event.clientY)
}

function stopResize(event: PointerEvent) {
  if (!resizing.value) return
  resizing.value = false
  const handle = event.currentTarget as HTMLElement
  if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)
}

function handleResizeKeydown(event: KeyboardEvent) {
  if (!composerRoot.value || fullscreen.value || props.collapsed) return
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
  event.preventDefault()
  const change = event.key === 'ArrowUp' ? 32 : -32
  setComposerHeight(composerRoot.value.getBoundingClientRect().height + change)
}
```

Bind `ref="composerRoot"`, `:style="composerStyle"`, and replace the decorative grippie with:

```vue
<div
  class="grippie"
  role="separator"
  aria-label="调整编辑器高度"
  aria-orientation="horizontal"
  tabindex="0"
  @pointerdown="startResize"
  @pointermove="continueResize"
  @pointerup="stopResize"
  @pointercancel="stopResize"
  @keydown="handleResizeKeydown"
><span /></div>
```

- [ ] **Step 7: Connect the height variable and resize affordance in CSS**

Change the normal height declaration to `height: var(--composer-height, min(66vh, 680px));`. Add `cursor: row-resize`, `touch-action: none`, a hover/focus color, and ensure `.collapsed .grippie` does not start a resize. Keep the fullscreen rule authoritative with `height: 100dvh`.

- [ ] **Step 8: Build and run the resize browser test**

Run: `npm.cmd run build` then `node scripts/run-e2e.mjs -g "composer grippie"`

Expected: the pointer drag increases height, ArrowDown decreases it, and the composer remains within the 900px viewport.

- [ ] **Step 9: Commit resize support**

```powershell
git add app/utils/composer-layout.ts tests/composer-layout.test.ts app/components/TopicEditor.vue app/assets/css/main.css tests/e2e/forum.spec.ts
git commit -m "feat: resize docked composer with grippie"
```

---

### Task 4: Verify mobile fullscreen, cleanup, and the whole application

**Files:**
- Modify: `tests/e2e/forum.spec.ts:160-185`
- Modify only if a failure proves it necessary: `app/components/TopicEditor.vue`, `app/assets/css/main.css`

**Interfaces:**
- Consumes: the fullscreen button and existing mobile edit/preview tabs.
- Produces: regression coverage that fullscreen uses the complete dynamic viewport without horizontal overflow.

- [ ] **Step 1: Extend the existing mobile composer test with fullscreen assertions**

```ts
await composer.getByRole('button', { name: '全屏编辑' }).click()
const fullscreenBox = await page.locator('#reply-control').boundingBox()
expect(fullscreenBox).not.toBeNull()
expect(fullscreenBox!.x).toBe(0)
expect(fullscreenBox!.y).toBe(0)
expect(fullscreenBox!.width).toBe(390)
expect(fullscreenBox!.height).toBe(844)
await expect.poll(() => page.evaluate(
  () => document.documentElement.scrollWidth <= window.innerWidth,
)).toBe(true)
await composer.getByRole('button', { name: '退出全屏' }).click()
```

- [ ] **Step 2: Build and run the focused desktop and mobile composer tests**

Run: `npm.cmd run build` then `node scripts/run-e2e.mjs -g "composer|mobile composer"`

Expected: all composer-focused browser tests pass. If the mobile browser reports a one-pixel dynamic viewport rounding difference, assert within one pixel rather than weakening width or overflow checks.

- [ ] **Step 3: Run all unit tests**

Run: `npm.cmd test`

Expected: every Vitest test passes.

- [ ] **Step 4: Run type checking**

Run: `npm.cmd run typecheck`

Expected: exit code 0 with no TypeScript or Vue template errors.

- [ ] **Step 5: Run the full end-to-end suite**

Run: `npm.cmd run test:e2e`

Expected: every Playwright test passes using the configured Microsoft Edge channel on Windows.

- [ ] **Step 6: Run a clean production build and inspect the final diff**

Run: `npm.cmd run build`

Then run: `git diff --check` and `git status --short`.

Expected: production build succeeds, `git diff --check` has no output, and only intentional files are changed.

- [ ] **Step 7: Commit any final mobile-only test or CSS adjustment**

```powershell
git add tests/e2e/forum.spec.ts app/components/TopicEditor.vue app/assets/css/main.css
git commit -m "test: verify composer usability across viewports"
```
