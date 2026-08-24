# Category Management and Topic CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add administrator-only category CRUD, make topic editing use database categories, and document how a beginner operates and maintains both systems.

**Architecture:** Keep SQLite and the existing Nuxt/Nitro layers. Add focused category functions in the database module, Zod request validation, protected `/api/studio/categories` routes, and a small reusable category form used by create/edit pages. Existing public category reads stay unchanged; topic writes accept any existing category and optional HTTP(S) links.

**Tech Stack:** Nuxt 4, Vue 3, Nitro/H3, TypeScript, better-sqlite3, Zod 4, Vitest, Playwright

## Global Constraints

- Category Slug is unique, lowercase kebab-case, and immutable after creation.
- A category containing any draft or published topic cannot be deleted.
- The final remaining category cannot be deleted.
- Default ChatGPT and toolbox categories are created only when the category table is empty.
- Any category may contain a topic with an optional HTTP or HTTPS external URL.
- Every studio write route requires an administrator session.
- Public pages expose no administrator controls.

---

### Task 1: Category validation and database CRUD

**Files:**
- Modify: `server/utils/database.ts`
- Modify: `server/utils/validation.ts`
- Modify: `server/utils/http.ts`
- Modify: `tests/database.test.ts`
- Modify: `tests/validation.test.ts`

**Interfaces:**
- Produces: `CategoryInput`, `StudioCategory`, `listStudioCategories(db)`, `getStudioCategory(db, id)`, `createCategory(db, input)`, `updateCategory(db, id, input)`, `deleteCategory(db, id)`, `parseCategoryPayload(value, mode)`.
- Keeps: `listCategories(db)` as the public published-count query.

- [ ] **Step 1: Write failing initialization and CRUD database tests**

Add tests that express these calls before the functions exist:

```ts
const created = createCategory(db, {
  name: 'AI 绘画', slug: 'ai-image', description: '绘画工具', color: '#7c3aed', position: 3,
})
expect(getStudioCategory(db, created.id)?.slug).toBe('ai-image')

const updated = updateCategory(db, created.id, {
  name: 'AI 图像', description: '图像知识', color: '#2563eb', position: 1,
})
expect(updated).toEqual(expect.objectContaining({ name: 'AI 图像', slug: 'ai-image', position: 1 }))
```

Also test: defaults do not overwrite an edited ChatGPT row; duplicate Slug is rejected; a category with a draft is not deleted; a category with a published topic is not deleted; the last category is not deleted; an empty non-final category is deleted.

- [ ] **Step 2: Run the focused database tests and confirm RED**

Run: `npm.cmd test -- tests/database.test.ts`

Expected: FAIL because the new category interfaces/functions are not exported and default initialization still overwrites edited rows.

- [ ] **Step 3: Implement minimal database category behavior**

Add these contracts and use transactions for writes:

```ts
export interface CategoryInput {
  name: string
  slug?: string
  description: string
  color: string
  position: number
}

export interface StudioCategory extends ForumCategory {
  draftTopicCount: number
  publishedTopicCount: number
}
```

Change `ensureBaseCategories` to return when any category exists and insert both defaults only for an empty table. Implement duplicate checks with friendly `Error` messages. `deleteCategory` must count every topic in the target category and count all categories inside one transaction before deleting.

- [ ] **Step 4: Run focused database tests and confirm GREEN**

Run: `npm.cmd test -- tests/database.test.ts`

Expected: all database tests pass.

- [ ] **Step 5: Write failing validation tests**

Add tests for valid create/update category payloads, invalid Slugs/colors/positions, arbitrary kebab-case topic category Slugs, and an external URL on a non-toolbox category.

```ts
expect(parseTopicPayload({
  title: 'AI 图像资源', categorySlug: 'ai-image', contentMarkdown: '正文', tags: [],
  status: 'published', isPinned: false, externalUrl: 'https://example.com/',
})).toEqual(expect.objectContaining({ categorySlug: 'ai-image', externalUrl: 'https://example.com/' }))
```

- [ ] **Step 6: Run validation tests and confirm RED**

Run: `npm.cmd test -- tests/validation.test.ts`

Expected: FAIL because arbitrary categories and non-toolbox external links are rejected and category payload parsing is missing.

- [ ] **Step 7: Implement validation and friendly request errors**

Use a category create schema requiring `^[a-z0-9]+(?:-[a-z0-9]+)*$`, a `^#[0-9a-fA-F]{6}$` color, trimmed name/description, and an integer position. Update `parseTopicPayload` to validate Slug shape without using a fixed allowlist and retain URL scheme validation. Add the database/category messages to `requestError`.

- [ ] **Step 8: Run validation and database tests and confirm GREEN**

Run: `npm.cmd test -- tests/database.test.ts tests/validation.test.ts`

Expected: both suites pass.

- [ ] **Step 9: Commit Task 1**

```powershell
git add server/utils/database.ts server/utils/validation.ts server/utils/http.ts tests/database.test.ts tests/validation.test.ts
git commit -m "feat: add category data operations"
```

### Task 2: Protected category API

**Files:**
- Create: `server/api/studio/categories/index.get.ts`
- Create: `server/api/studio/categories/index.post.ts`
- Create: `server/api/studio/categories/[id].get.ts`
- Create: `server/api/studio/categories/[id].put.ts`
- Create: `server/api/studio/categories/[id].delete.ts`
- Modify: `server/utils/http.ts`
- Modify: `tests/e2e/forum.spec.ts`

**Interfaces:**
- Consumes: database CRUD and `parseCategoryPayload` from Task 1.
- Produces: administrator-only JSON routes used by the studio pages.

- [ ] **Step 1: Write a failing route protection test**

Add a real HTTP assertion through Playwright's request context. This tests the application's security boundary rather than inspecting handler internals:

```ts
test('category admin API rejects public requests', async ({ request }) => {
  const response = await request.get('/api/studio/categories')
  expect(response.status()).toBe(401)
})
```

- [ ] **Step 2: Run the auth test and confirm RED**

Run: `npm.cmd run test:e2e -- --grep "category admin API rejects"`

Expected: FAIL because the category route file does not exist and returns 404 rather than 401.

- [ ] **Step 3: Implement the five category handlers**

Follow the existing topic route shape:

```ts
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  try {
    return createCategory(getForumDatabase(), parseCategoryPayload(await readBody(event), 'create'))
  } catch (error) {
    return requestError(error)
  }
})
```

For update, pass mode `update` and the numeric route ID. For delete, return `{ ok: true }`. Make `numericRouteId` accept an entity label so category errors say `板块不存在` while topic routes continue to say `主题不存在`.

- [ ] **Step 4: Run route security and all unit tests and confirm GREEN**

Run: `npm.cmd run test:e2e -- --grep "category admin API rejects"`

Run: `npm.cmd test`

Expected: the unauthenticated request returns 401 and every Vitest suite passes.

- [ ] **Step 5: Commit Task 2**

```powershell
git add server/api/studio/categories server/utils/http.ts tests/e2e/forum.spec.ts
git commit -m "feat: expose protected category api"
```

### Task 3: Studio category UI and dynamic topic editor

**Files:**
- Create: `app/components/CategoryEditor.vue`
- Create: `app/pages/studio/categories/index.vue`
- Create: `app/pages/studio/categories/new.vue`
- Create: `app/pages/studio/categories/[id]/edit.vue`
- Modify: `app/layouts/studio.vue`
- Modify: `app/components/TopicEditor.vue`
- Modify: `app/types/forum.ts`
- Modify: `app/assets/css/main.css`
- Modify: `tests/e2e/forum.spec.ts`

**Interfaces:**
- Consumes: protected category API from Task 2 and `StudioCategory` JSON shape.
- Produces: board management screens and a category-driven topic composer.

- [ ] **Step 1: Add a failing Playwright administrator workflow**

After login, exercise this flow with a unique Slug:

```ts
await page.getByRole('link', { name: '板块管理' }).click()
await page.getByRole('link', { name: '＋ 新建板块' }).click()
await page.getByLabel('板块名称').fill('AI 绘画')
await page.getByLabel('网址标识').fill(uniqueSlug)
await page.getByRole('button', { name: '创建板块' }).click()
await page.getByRole('link', { name: '帖子管理' }).click()
await page.getByRole('link', { name: '＋ 新建帖子' }).click()
await page.getByLabel('分类').selectOption(uniqueSlug)
```

The scenario then saves a draft with an external URL, edits the category display name, verifies the Slug is read-only, creates and deletes a second empty category, and verifies deleting the category containing the draft produces the explanatory error.

- [ ] **Step 2: Run the focused Playwright test and confirm RED**

Run: `npm.cmd run test:e2e -- --grep "owner can manage categories"`

Expected: FAIL because the studio navigation and category pages do not exist.

- [ ] **Step 3: Add shared frontend types and studio navigation**

Add:

```ts
export interface StudioCategory extends ForumCategory {
  draftTopicCount: number
  publishedTopicCount: number
}
```

Render “帖子管理” and “板块管理” links in the studio header with route-aware active state.

- [ ] **Step 4: Build category list and editor pages**

`CategoryEditor.vue` accepts `category?: StudioCategory`, submits POST or PUT, shows API errors, locks Slug during edit, and redirects to `/studio/categories` on success. The list confirms deletion, displays errors inline, and refreshes after a successful delete.

- [ ] **Step 5: Make TopicEditor dynamic**

Fetch `ForumCategory[]` from `/api/categories`, initialize new topics to the first category, preserve an existing topic category, render options with `v-for`, always show the optional external URL field, and submit `form.externalUrl` unchanged. Disable save and link to category management if no category exists.

- [ ] **Step 6: Add focused responsive styles**

Reuse existing studio table, buttons, alert and field styles. Add only category form/help, color preview, studio nav active state, and mobile stacking rules; do not change the public Discourse-style layout.

- [ ] **Step 7: Run the new browser test and confirm GREEN**

Run: `npm.cmd run test:e2e -- --grep "owner can manage categories"`

Expected: the complete administrator category workflow passes.

- [ ] **Step 8: Run typecheck and all browser tests**

Run: `npm.cmd run typecheck`

Run: `npm.cmd run test:e2e`

Expected: TypeScript reports no errors and all Playwright scenarios pass.

- [ ] **Step 9: Commit Task 3**

```powershell
git add app/components/CategoryEditor.vue app/components/TopicEditor.vue app/layouts/studio.vue app/pages/studio/categories app/types/forum.ts app/assets/css/main.css tests/e2e/forum.spec.ts
git commit -m "feat: add studio category management"
```

### Task 4: Beginner operations and source maintenance documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/customization-guide.md`
- Create: `docs/admin-crud-guide.md`

**Interfaces:**
- Documents: category/topic CRUD UI, SQLite backups, code ownership map, safe Git workflow, and SQLite/MySQL trade-offs.

- [ ] **Step 1: Write the administrator CRUD guide**

Document exact local URL, login, create/read/update/delete flows, draft behavior, category deletion rule, labels, Slug immutability, external links, and common errors in beginner-friendly Chinese.

- [ ] **Step 2: Update maintenance documentation**

Remove instructions that tell users to rename categories in `ensureBaseCategories`. Explain that routine category changes belong in `/studio/categories`, while source changes belong in the component/API/database files. Include `git switch -c`, `git status`, tests, typecheck and build commands, plus “do not edit” notes for `.nuxt`, `.output`, `node_modules`, and the SQLite binary.

- [ ] **Step 3: Document SQLite and MySQL accurately**

Explain that SQLite is an embedded database stored in `.data/ai-forum.db`, while MySQL is a separate database service accessed over a connection. State why SQLite is appropriate for one lightweight server, when write concurrency/multiple app nodes justify MySQL, and that changing requires a driver, schema/migration changes and data transfer rather than renaming a file.

- [ ] **Step 4: Verify documentation links and formatting**

Run: `rg -n "ensureBaseCategories|studio/categories|SQLite|MySQL|npm.cmd run typecheck" README.md docs`

Run: `git diff --check`

Expected: every referenced workflow is present and Git reports no whitespace errors.

- [ ] **Step 5: Commit Task 4**

```powershell
git add README.md docs/customization-guide.md docs/admin-crud-guide.md
git commit -m "docs: explain admin CRUD and maintenance"
```

### Task 5: Final verification

**Files:**
- Verify all files changed by Tasks 1-4.

**Interfaces:**
- Produces: evidence that unit behavior, types, production rendering and browser workflows all remain valid.

- [ ] **Step 1: Run all unit tests**

Run: `npm.cmd test`

Expected: every Vitest suite passes with zero failures.

- [ ] **Step 2: Run type checking**

Run: `npm.cmd run typecheck`

Expected: exit code 0 with no Vue or TypeScript errors.

- [ ] **Step 3: Run the production build**

Run: `npm.cmd run build`

Expected: Nuxt client, server and Nitro build complete with exit code 0.

- [ ] **Step 4: Run all browser tests**

Run: `npm.cmd run test:e2e`

Expected: every Playwright scenario passes.

- [ ] **Step 5: Inspect the final change set**

Run: `git status --short`

Run: `git diff --stat HEAD~4..HEAD`

Confirm only planned application, test and documentation files changed and no database, environment secret or generated output is tracked.
