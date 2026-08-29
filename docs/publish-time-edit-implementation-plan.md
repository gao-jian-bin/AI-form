# 帖子发布时间手动修改 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 保留自动生成发布时间的默认行为，同时允许管理员在 Composer 中手动覆盖已发布帖子的发布时间。

**Architecture:** 复用 `topics.published_at`，把可选的 ISO 时间沿 TopicEditor → 管理 API → validation → database 传递。公共列表已经按 `published_at` 排序，只需保证保存后的字段正确且未来时间在服务端被拒绝。

**Tech Stack:** Nuxt 4、Vue 3、TypeScript、SQLite/better-sqlite3、Zod、Vitest、Playwright。

## Global Constraints

- 不新增数据库列或第三方依赖。
- 未手动指定时继续使用当前时间，已有发布时间继续保持。
- 不允许未来时间，不实现定时发布。
- 公共列表按发布时间排序，后台列表仍按最后更新时间排序。

---

### Task 1: 服务端接受并保存手动发布时间

**Files:**
- Modify: `server/utils/database.ts`
- Modify: `server/utils/validation.ts`
- Test: `tests/database.test.ts`
- Test: `tests/validation.test.ts`

**Interfaces:**
- Consumes: `TopicInput` 与现有 `saveTopic()`。
- Produces: `TopicInput.publishedAt?: string | null`，管理员 API 可选接收 ISO 发布时间。

- [ ] **Step 1: 写数据库失败测试**

在 `tests/database.test.ts` 增加测试：

```ts
it('lets administrators override publish time and uses it for public ordering', () => {
  const older = saveTopic(db, {
    title: '较早帖子', categorySlug: 'chatgpt', contentMarkdown: '正文',
    status: 'published', tags: [], isPinned: false, externalUrl: null,
    publishedAt: '2024-01-01T08:00:00.000Z',
  })
  const newer = saveTopic(db, {
    title: '较新帖子', categorySlug: 'chatgpt', contentMarkdown: '正文',
    status: 'published', tags: [], isPinned: false, externalUrl: null,
    publishedAt: '2024-02-01T08:00:00.000Z',
  })

  expect(older.publishedAt).toBe('2024-01-01T08:00:00.000Z')
  expect(listPublicTopics(db, {}).slice(0, 2).map(topic => topic.id)).toEqual([newer.id, older.id])
})

it('rejects a manual publish time in the future', () => {
  expect(() => saveTopic(db, {
    title: '未来帖子', categorySlug: 'chatgpt', contentMarkdown: '正文',
    status: 'published', tags: [], isPinned: false, externalUrl: null,
    publishedAt: '2999-01-01T00:00:00.000Z',
  })).toThrow('发布时间不能晚于当前时间')
})
```

- [ ] **Step 2: 运行数据库测试并确认失败**

Run: `npm.cmd test -- tests/database.test.ts`

Expected: FAIL，因为 `TopicInput` 尚未接受 `publishedAt` 或保存值仍为当前时间。

- [ ] **Step 3: 实现数据库时间解析和保存**

在 `TopicInput` 加入：

```ts
publishedAt?: string | null
```

在 `saveTopic()` 计算：

```ts
const requestedPublishedAt = input.publishedAt
  ? new Date(input.publishedAt).toISOString()
  : null
if (requestedPublishedAt && new Date(requestedPublishedAt).getTime() > new Date(timestamp).getTime()) {
  throw new Error('发布时间不能晚于当前时间')
}
const nextPublishedAt = input.status === 'published'
  ? requestedPublishedAt || existing?.published_at || timestamp
  : existing?.published_at || null
```

更新和新增 SQL 都直接写入 `nextPublishedAt`。这样新发布且留空时使用当前时间，编辑且留空时保留原时间，草稿不产生发布时间。

- [ ] **Step 4: 写 payload 校验失败测试**

在 `tests/validation.test.ts` 增加：

```ts
it('accepts a past publish time and rejects a future one', () => {
  expect(parseTopicPayload({
    title: '旧帖', categorySlug: 'chatgpt', contentMarkdown: '正文', tags: [],
    status: 'published', isPinned: false, publishedAt: '2024-01-01T08:00:00.000Z',
  })).toEqual(expect.objectContaining({ publishedAt: '2024-01-01T08:00:00.000Z' }))

  expect(() => parseTopicPayload({
    title: '未来帖', categorySlug: 'chatgpt', contentMarkdown: '正文', tags: [],
    status: 'published', isPinned: false, publishedAt: '2999-01-01T00:00:00.000Z',
  })).toThrow('发布时间不能晚于当前时间')
})
```

- [ ] **Step 5: 实现 Zod 校验**

在 `rawTopicSchema` 加入可选 ISO 字段，并在 `parseTopicPayload()` 复制到结果：

```ts
publishedAt: z.string().datetime({ offset: true }).nullish()
  .refine(value => !value || new Date(value).getTime() <= Date.now(), '发布时间不能晚于当前时间'),
```

```ts
if (parsed.publishedAt) result.publishedAt = parsed.publishedAt
```

- [ ] **Step 6: 运行后端测试并提交**

Run: `npm.cmd test -- tests/database.test.ts tests/validation.test.ts`

Expected: 两个测试文件全部 PASS。

```powershell
git add server/utils/database.ts server/utils/validation.ts tests/database.test.ts tests/validation.test.ts
git commit -m "feat: support manual topic publish time"
```

---

### Task 2: Composer 时间输入与端到端验收

**Files:**
- Modify: `app/components/TopicEditor.vue`
- Modify: `tests/e2e/forum.spec.ts`
- Modify: `docs/admin-crud-guide.md`

**Interfaces:**
- Consumes: `StudioTopic.publishedAt` 与 Task 1 的 `publishedAt` payload。
- Produces: 标签为“发布时间”的 `datetime-local` 管理员输入。

- [ ] **Step 1: 写 Composer 失败测试**

在 `tests/e2e/forum.spec.ts` 增加：

```ts
test('administrator can override a topic publish time in the composer', async ({ page }) => {
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page).toHaveURL(/\/studio$/)

  const publishedRow = page.getByRole('row').filter({ has: page.locator('.status-published') }).first()
  await publishedRow.getByRole('button', { name: /编辑帖子/ }).click()
  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  await composer.getByText('更多设置').click()
  const publishTime = composer.getByLabel('发布时间')
  await expect(publishTime).toHaveValue(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
  await publishTime.fill('2024-01-02T03:04')

  const saveResponse = page.waitForResponse(response =>
    response.request().method() === 'PUT' && /\/api\/studio\/topics\/\d+$/.test(new URL(response.url()).pathname))
  await composer.getByRole('button', { name: '保存修改' }).click()
  const saved = await (await saveResponse).json() as { publishedAt: string }
  expect(saved.publishedAt).toBe(new Date('2024-01-02T03:04').toISOString())
})
```

- [ ] **Step 2: 构建并运行浏览器测试确认失败**

Run:

```powershell
npm.cmd run build
node scripts/run-e2e.mjs --grep="override a topic publish time"
```

Expected: FAIL，因为找不到“发布时间”输入。

- [ ] **Step 3: 在 TopicEditor 增加本地时间输入**

在 Vue import 中加入 `computed`，再增加转换函数，并把表单初始化改为：

```ts
function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

const form = reactive({
  title: props.topic?.title || '',
  slug: props.topic?.slug || '',
  excerpt: props.topic?.excerpt || '',
  categorySlug: props.topic?.category.slug || props.categories[0]?.slug || '',
  tags: [...(props.topic?.tags || [])],
  contentMarkdown: props.topic?.contentMarkdown || '',
  externalUrl: props.topic?.externalUrl || '',
  isPinned: props.topic?.isPinned || false,
  publishedAt: toDateTimeLocal(props.topic?.publishedAt),
})

const maxPublishTime = computed(() => toDateTimeLocal(new Date().toISOString()))
```

保存时单独生成 body：

```ts
body: {
  ...form,
  publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
  status,
},
```

在“更多设置”网格加入：

```vue
<label class="field">
  <span>发布时间 <small>留空自动生成</small></span>
  <input v-model="form.publishedAt" type="datetime-local" :max="maxPublishTime" step="60">
</label>
```

- [ ] **Step 4: 运行目标浏览器测试**

Run:

```powershell
npm.cmd run build
node scripts/run-e2e.mjs --grep="override a topic publish time"
```

Expected: PASS，保存响应中的 ISO 时间等于管理员选择的本地时间。

- [ ] **Step 5: 更新管理员说明并完整验证**

在 `docs/admin-crud-guide.md` 的帖子修改部分说明：发布时间默认自动生成；管理员可在“更多设置”中修改历史时间；不能选择未来时间。

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run test:e2e
```

Expected: Vitest、类型检查、Nuxt production build、全部 Playwright 流程均通过。

- [ ] **Step 6: 提交 Composer 与验收**

```powershell
git add app/components/TopicEditor.vue tests/e2e/forum.spec.ts docs/admin-crud-guide.md
git commit -m "feat: edit topic publish time in composer"
```

---

## Final Review Checklist

- [ ] 不手动设置时发布时间仍自动生成。
- [ ] 已发布帖子回填原发布时间。
- [ ] 管理员可覆盖为过去时间。
- [ ] 服务端拒绝未来时间。
- [ ] 公共列表按修改后的发布时间排序。
- [ ] 后台列表仍按最后更新时间排序。
- [ ] 所有测试、类型检查和生产构建通过。
