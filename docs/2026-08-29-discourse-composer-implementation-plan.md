# Discourse 式管理员 Composer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让管理员从公开帖子页或后台列表直接打开 Discourse 式底部 Composer，并通过可搜索的多选控件复用或创建标签。

**Architecture:** 用一个挂载在 `app.vue` 的 `AdminComposerHost` 承载跨布局的 Composer，并用 `useAdminComposer` 管理打开、收起、关闭和保存刷新信号。`TopicEditor` 只负责表单与保存，`TagChooser` 只负责标签交互；新增受保护的标签目录 API，公开标签 API 保持不变。

**Tech Stack:** Nuxt 4、Vue 3、Nitro/H3、TypeScript、SQLite/better-sqlite3、Vitest、Vue Test Utils、Playwright。

## Global Constraints

- 不引入 Ember、Rails、Discourse 运行时或新的前端依赖。
- 参考本地 `D:\Code\GitHub\discourse` 的 Composer 重设计结构，但使用本项目现有 Vue 与 CSS token 实现。
- 普通访客看不到编辑入口，所有读取和写入管理数据的 API 必须继续执行 `requireAdmin`。
- 标签最多 8 个；已有标签可搜索和多选，未知名称可直接创建。
- 已发布帖子和草稿使用过的标签对管理员可见；孤立标签和草稿标签不进入公开 `/api/tags`。
- 保留 `/studio/topics/new` 和 `/studio/topics/:id/edit` 的兼容行为。
- 不实现上传、@提及、私信、版本历史、富文本模式和跨设备自动草稿。
- 保留工作区中尚未提交的操作列修复，不覆盖 `app/assets/css/main.css`、`app/pages/studio/index.vue` 和 `tests/e2e/forum.spec.ts` 的现有改动。

---

## File Structure

### New files

- `server/api/studio/tags/index.get.ts`：返回管理员可见的已使用标签。
- `app/components/TagChooser.vue`：标签搜索、多选、移除和创建。
- `app/components/AdminComposerHost.vue`：加载 Composer 所需数据并管理关闭确认。
- `app/composables/useAdminComposer.ts`：跨页面共享的 Composer 状态和刷新版本号。
- `tests/tag-chooser.test.ts`：标签选择器组件行为。

### Modified files

- `server/utils/database.ts`：新增 `listStudioTags`。
- `tests/database.test.ts`：管理员标签目录数据测试。
- `app/components/TopicEditor.vue`：变为事件驱动的 Discourse 式 Composer 表单。
- `app/app.vue`：全局挂载 `AdminComposerHost`。
- `app/pages/studio/index.vue`：编辑和新建改为打开 Composer。
- `app/pages/t/[slug]/[id].vue`：管理员铅笔入口及保存后刷新。
- `app/pages/studio/topics/new.vue`：兼容路由改为打开全局 Composer。
- `app/pages/studio/topics/[id]/edit.vue`：兼容路由改为打开全局 Composer。
- `app/assets/css/main.css`：Composer、标签选择器和响应式样式。
- `tests/e2e/forum.spec.ts`：入口、保存、关闭确认和移动端验收。

---

### Task 1: 管理员标签目录 API

**Files:**
- Modify: `server/utils/database.ts`，紧接 `listPublicTags`。
- Create: `server/api/studio/tags/index.get.ts`。
- Modify: `tests/database.test.ts` 的 database imports 和标签测试区。
- Modify: `tests/e2e/forum.spec.ts` 的未授权 API 测试区。

**Interfaces:**
- Produces: `listStudioTags(db: Database.Database): ForumTag[]`。
- Produces: `GET /api/studio/tags -> ForumTag[]`，每项包含 `id`、`name`、`slug`、`topicCount`。
- Sorting: `topicCount` 降序，然后 `name.localeCompare(name, 'zh-CN')`。

- [ ] **Step 1: 写管理员标签目录的失败测试**

在 `tests/database.test.ts` 导入 `listStudioTags`，加入：

```ts
it('lists tags used by published topics and drafts for administrators', () => {
  saveTopic(db, {
    title: '公开标签帖', categorySlug: 'chatgpt', contentMarkdown: '正文',
    status: 'published', tags: ['Prompt', '共用标签'], isPinned: false, externalUrl: null,
  })
  saveTopic(db, {
    title: '草稿标签帖', categorySlug: 'chatgpt', contentMarkdown: '正文',
    status: 'draft', tags: ['草稿标签', '共用标签'], isPinned: false, externalUrl: null,
  })
  db.prepare("INSERT INTO tags (name, slug) VALUES ('孤立标签', 'orphan')").run()

  expect(listStudioTags(db)).toEqual([
    expect.objectContaining({ name: '共用标签', topicCount: 2 }),
    expect.objectContaining({ name: '草稿标签', topicCount: 1 }),
    expect.objectContaining({ name: 'Prompt', topicCount: 1 }),
  ])
  expect(listStudioTags(db).some(tag => tag.name === '孤立标签')).toBe(false)
})
```

- [ ] **Step 2: 运行数据库测试并确认因函数不存在而失败**

Run: `npm.cmd test -- tests/database.test.ts`

Expected: FAIL，提示 `listStudioTags` 未导出或不是函数。

- [ ] **Step 3: 实现最小数据库查询**

在 `server/utils/database.ts` 添加：

```ts
export function listStudioTags(db: Database.Database): ForumTag[] {
  const tags = db.prepare(`
    SELECT tags.id, tags.name, tags.slug, COUNT(DISTINCT topics.id) AS topic_count
    FROM tags
    JOIN topic_tags ON topic_tags.tag_id = tags.id
    JOIN topics ON topics.id = topic_tags.topic_id
    GROUP BY tags.id
  `).all().map((row: any) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    topicCount: row.topic_count,
  }))
  return tags.sort((a: ForumTag, b: ForumTag) =>
    b.topicCount - a.topicCount || a.name.localeCompare(b.name, 'zh-CN'))
}
```

- [ ] **Step 4: 运行数据库测试并确认通过**

Run: `npm.cmd test -- tests/database.test.ts`

Expected: database test file PASS。

- [ ] **Step 5: 写未登录访问标签 API 的失败浏览器测试**

在 `tests/e2e/forum.spec.ts` 的 API 权限测试旁加入：

```ts
test('studio tag API rejects public requests', async ({ request }) => {
  const response = await request.get('/api/studio/tags')
  expect(response.status()).toBe(401)
})
```

Run: `npm.cmd run build` 后运行 `node scripts/run-e2e.mjs --grep=studio.*tag.*API`

Expected: FAIL，当前路由返回 404。

- [ ] **Step 6: 创建受保护的标签路由**

创建 `server/api/studio/tags/index.get.ts`：

```ts
import { listStudioTags } from '../../../utils/database'
import { getForumDatabase } from '../../../utils/forum'
import { requireAdmin } from '../../../utils/http'

export default defineEventHandler((event) => {
  requireAdmin(event)
  return listStudioTags(getForumDatabase())
})
```

- [ ] **Step 7: 验证 API 权限和数据库测试**

Run:

```powershell
npm.cmd test -- tests/database.test.ts
npm.cmd run build
node scripts/run-e2e.mjs --grep=studio.*tag.*API
```

Expected: 两组测试 PASS，生产构建退出码 0。

- [ ] **Step 8: 提交标签目录**

```powershell
git add server/utils/database.ts server/api/studio/tags/index.get.ts tests/database.test.ts tests/e2e/forum.spec.ts
git commit -m "feat: expose administrator tag catalog"
```

---

### Task 2: 可搜索的多选标签选择器

**Files:**
- Create: `app/components/TagChooser.vue`。
- Create: `tests/tag-chooser.test.ts`。

**Interfaces:**
- Props: `modelValue: string[]`、`options: ForumTag[]`、`max?: number`、`loadError?: boolean`。
- Emits: `update:modelValue` with `string[]`。
- Visible contract: trigger accessible name `选择标签`，搜索框 accessible name `搜索或创建标签`。

- [ ] **Step 1: 写组件失败测试**

创建 `tests/tag-chooser.test.ts`：

```ts
// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TagChooser from '../app/components/TagChooser.vue'

const options = [
  { id: 1, name: 'Prompt', slug: 'prompt', topicCount: 5 },
  { id: 2, name: '工作流', slug: 'workflow', topicCount: 3 },
  { id: 3, name: '图片工具', slug: 'image-tools', topicCount: 1 },
]

describe('TagChooser', () => {
  it('lists known tags and adds a selected option', async () => {
    const wrapper = mount(TagChooser, { props: { modelValue: ['Prompt'], options } })
    await wrapper.get('[aria-label="选择标签"]').trigger('click')
    expect(wrapper.text()).toContain('工作流')
    expect(wrapper.find('[data-tag-option="Prompt"]').exists()).toBe(false)
    await wrapper.get('[aria-label="搜索或创建标签"]').setValue('prompt')
    expect(wrapper.find('[data-create-tag]').exists()).toBe(false)
    await wrapper.get('[aria-label="搜索或创建标签"]').setValue('')
    await wrapper.get('[data-tag-option="工作流"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual(['Prompt', '工作流'])
  })

  it('searches, creates, removes, deduplicates, and enforces the eight-tag limit', async () => {
    const wrapper = mount(TagChooser, {
      props: { modelValue: ['Prompt'], options, max: 8 },
    })
    await wrapper.get('[aria-label="选择标签"]').trigger('click')
    await wrapper.get('[aria-label="搜索或创建标签"]').setValue('新标签')
    await wrapper.get('[data-create-tag]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual(['Prompt', '新标签'])

    await wrapper.setProps({ modelValue: ['Prompt', '新标签'] })
    await wrapper.get('[aria-label="移除标签：Prompt"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual(['新标签'])

    await wrapper.setProps({ modelValue: ['1', '2', '3', '4', '5', '6', '7', '8'] })
    expect(wrapper.get('[aria-label="选择标签"]').attributes('aria-disabled')).toBe('true')
  })
})
```

- [ ] **Step 2: 运行测试并确认组件不存在**

Run: `npm.cmd test -- tests/tag-chooser.test.ts`

Expected: FAIL，无法解析 `TagChooser.vue`。

- [ ] **Step 3: 实现 TagChooser 的选择状态和过滤逻辑**

创建 `app/components/TagChooser.vue`。脚本核心保持为：

```vue
<script setup lang="ts">
import type { ForumTag } from '~/types/forum'

const props = withDefaults(defineProps<{
  modelValue: string[]
  options: ForumTag[]
  max?: number
  loadError?: boolean
}>(), { max: 8, loadError: false })
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const open = ref(false)
const query = ref('')
const normalizedSelected = computed(() => props.modelValue.map(tag => tag.toLocaleLowerCase()))
const filteredOptions = computed(() => props.options.filter(tag =>
  !normalizedSelected.value.includes(tag.name.toLocaleLowerCase())
  && tag.name.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase()),
))
const createCandidate = computed(() => query.value.trim())
const canCreate = computed(() => Boolean(createCandidate.value)
  && !props.options.some(tag => tag.name.toLocaleLowerCase() === createCandidate.value.toLocaleLowerCase())
  && !normalizedSelected.value.includes(createCandidate.value.toLocaleLowerCase())
  && props.modelValue.length < props.max)

function add(name: string) {
  if (props.modelValue.length >= props.max) return
  if (normalizedSelected.value.includes(name.toLocaleLowerCase())) return
  emit('update:modelValue', [...props.modelValue, name.trim()])
  query.value = ''
}

function remove(name: string) {
  emit('update:modelValue', props.modelValue.filter(tag => tag !== name))
}
</script>
```

模板必须包含选中标签块、触发按钮、搜索输入、`data-tag-option`、`data-create-tag`、使用次数和加载错误文案。达到上限时触发按钮保留可查看能力，但带 `aria-disabled="true"`，下拉中不再允许新增。

使用下面的完整模板，避免把标签退化成逗号字符串输入框：

```vue
<template>
  <div class="tag-chooser">
    <div class="tag-chooser__selected">
      <span v-for="tag in modelValue" :key="tag" class="tag-chooser__chip">
        {{ tag }}
        <button type="button" :aria-label="`移除标签：${tag}`" @click="remove(tag)">×</button>
      </span>
      <button
        type="button"
        class="tag-chooser__trigger"
        aria-label="选择标签"
        :aria-expanded="open"
        :aria-disabled="modelValue.length >= max ? 'true' : 'false'"
        @click="open = !open"
      >
        {{ modelValue.length ? '添加标签' : '选择标签' }}
      </button>
    </div>

    <div v-if="open" class="tag-chooser__menu">
      <input
        v-model="query"
        type="search"
        aria-label="搜索或创建标签"
        placeholder="搜索或创建标签"
      >
      <p v-if="loadError" class="tag-chooser__message" role="alert">已有标签暂时无法加载，仍可输入新标签。</p>
      <button
        v-for="tag in filteredOptions"
        :key="tag.id"
        type="button"
        class="tag-chooser__option"
        :data-tag-option="tag.name"
        @click="add(tag.name)"
      >
        <span>{{ tag.name }}</span><small>{{ tag.topicCount }} 篇帖子</small>
      </button>
      <button
        v-if="canCreate"
        type="button"
        class="tag-chooser__option tag-chooser__create"
        data-create-tag
        @click="add(createCandidate)"
      >
        创建“{{ createCandidate }}”
      </button>
      <p v-if="!filteredOptions.length && !canCreate" class="tag-chooser__message">
        {{ modelValue.length >= max ? `最多选择 ${max} 个标签` : '没有匹配标签' }}
      </p>
    </div>
  </div>
</template>
```

在同一组件加入 scoped 样式，保证菜单锚定在 Composer 字段下方且不会撑宽页面：

```vue
<style scoped>
.tag-chooser {
  position: relative;
  min-width: 0;
  flex: 1;
}

.tag-chooser__selected {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding: 5px 8px;
  border-left: 1px solid var(--primary-low);
}

.tag-chooser__chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  border-radius: 3px;
  background: var(--primary-very-low);
  white-space: nowrap;
}

.tag-chooser__chip button,
.tag-chooser__trigger,
.tag-chooser__option {
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.tag-chooser__trigger {
  color: var(--primary-medium);
  white-space: nowrap;
}

.tag-chooser__menu {
  position: absolute;
  z-index: 4;
  top: calc(100% + 4px);
  right: 0;
  left: 0;
  max-height: 240px;
  overflow-y: auto;
  padding: 6px;
  border: 1px solid var(--primary-low);
  background: var(--secondary);
  box-shadow: 0 8px 18px rgb(0 0 0 / 16%);
}

.tag-chooser__menu input {
  width: 100%;
  margin-bottom: 4px;
}

.tag-chooser__option {
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 8px;
  text-align: left;
}

.tag-chooser__option:hover,
.tag-chooser__option:focus-visible {
  background: var(--hover);
}

.tag-chooser__message {
  margin: 6px 8px;
  color: var(--primary-medium);
  font-size: 12px;
}
</style>
```

- [ ] **Step 4: 运行标签选择器测试**

Run: `npm.cmd test -- tests/tag-chooser.test.ts`

Expected: 2 tests PASS。

- [ ] **Step 5: 添加键盘操作并补测试**

在组件脚本加入活动索引和键盘处理：

```ts
const activeIndex = ref(-1)
watch(query, () => {
  activeIndex.value = filteredOptions.value.length ? 0 : -1
})

function handleKeydown(event: KeyboardEvent) {
  const choices = filteredOptions.value
  if (event.key === 'Escape') {
    open.value = false
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, Math.max(choices.length - 1, 0))
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = activeIndex.value < 0
      ? Math.max(choices.length - 1, 0)
      : Math.max(activeIndex.value - 1, 0)
    return
  }
  if (event.key !== 'Enter') return
  event.preventDefault()
  const activeOption = choices[activeIndex.value]
  if (activeOption) add(activeOption.name)
  else if (canCreate.value) add(createCandidate.value)
}
```

把搜索输入改为 `<input v-model="query" type="search" aria-label="搜索或创建标签" placeholder="搜索或创建标签" @keydown="handleKeydown">`，并追加可直接运行的测试：

已知标签按钮同时增加 `:class="{ 'is-active': filteredOptions.indexOf(tag) === activeIndex }"`。在 scoped CSS 的 hover/focus 规则中加入 `.tag-chooser__option.is-active`，使键盘上下移动时有与鼠标悬停一致的背景色。

```ts
it('supports keyboard selection and escape', async () => {
  const wrapper = mount(TagChooser, { props: { modelValue: ['Prompt'], options } })
  await wrapper.get('[aria-label="选择标签"]').trigger('click')
  const search = wrapper.get('[aria-label="搜索或创建标签"]')
  await search.trigger('keydown', { key: 'ArrowDown' })
  await search.trigger('keydown', { key: 'ArrowDown' })
  await search.trigger('keydown', { key: 'ArrowUp' })
  await search.trigger('keydown', { key: 'Enter' })
  expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual(['Prompt', '工作流'])

  await search.trigger('keydown', { key: 'Escape' })
  expect(wrapper.find('.tag-chooser__menu').exists()).toBe(false)
})
```

Run: `npm.cmd test -- tests/tag-chooser.test.ts`

Expected: 新增断言先失败；实现键盘索引后全部 PASS。

- [ ] **Step 6: 提交标签选择器**

```powershell
git add app/components/TagChooser.vue tests/tag-chooser.test.ts
git commit -m "feat: add searchable tag chooser"
```

---

### Task 3: 全局 Composer 状态与 Host

**Files:**
- Create: `app/composables/useAdminComposer.ts`。
- Create: `app/components/AdminComposerHost.vue`。
- Modify: `app/app.vue`。
- Modify: `tests/e2e/forum.spec.ts`。

**Interfaces:**
- Produces: `openEdit(topicId: number)`、`openNew()`、`toggleCollapsed()`、`close()`、`markSaved()`。
- State: `request: Ref<{ key: number; mode: 'new' | 'edit'; topicId: number | null } | null>`。
- State: `revision: Ref<number>`，保存后递增，背景页面据此刷新。
- Host consumes: `TopicEditor` events `saved`、`dirty-change`、`request-close`、`toggle-collapse`。

- [ ] **Step 1: 写“后台编辑不跳页”的失败浏览器测试**

在 `tests/e2e/forum.spec.ts` 添加：

```ts
test('studio edit opens a docked composer without leaving the topic list', async ({ page }) => {
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  const urlBefore = page.url()
  await page.getByRole('link', { name: /编辑帖子/ }).first().click()

  await expect(page.getByRole('dialog', { name: '编辑帖子' })).toBeVisible()
  await expect(page).toHaveURL(urlBefore)
})
```

Run after current build: `node scripts/run-e2e.mjs --grep=docked.*composer`

Expected: FAIL，因为当前编辑链接导航到独立路由。

- [ ] **Step 2: 创建全局状态 composable**

创建 `app/composables/useAdminComposer.ts`：

```ts
export interface AdminComposerRequest {
  key: number
  mode: 'new' | 'edit'
  topicId: number | null
}

export function useAdminComposer() {
  const request = useState<AdminComposerRequest | null>('admin-composer-request', () => null)
  const collapsed = useState('admin-composer-collapsed', () => false)
  const revision = useState('admin-composer-revision', () => 0)

  function openEdit(topicId: number) {
    request.value = { key: Date.now(), mode: 'edit', topicId }
    collapsed.value = false
  }
  function openNew() {
    request.value = { key: Date.now(), mode: 'new', topicId: null }
    collapsed.value = false
  }
  function close() {
    request.value = null
    collapsed.value = false
  }
  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }
  function markSaved() {
    revision.value += 1
  }

  return { request, collapsed, revision, openEdit, openNew, close, toggleCollapsed, markSaved }
}
```

- [ ] **Step 3: 创建 Host 并挂载到 app.vue**

`AdminComposerHost.vue` 仅在 `request` 存在时使用 `$fetch`，这样未登录访问普通页面不会触发受保护 API。先创建下面的脚本和可测试外壳；Task 4 会把加载成功分支接到真实 `TopicEditor`：

```vue
<script setup lang="ts">
import type { ForumCategory, ForumTag, StudioTopic } from '~/types/forum'

const { request, collapsed, close, toggleCollapsed, markSaved } = useAdminComposer()
const categories = ref<ForumCategory[]>([])
const knownTags = ref<ForumTag[]>([])
const topic = ref<StudioTopic | null>(null)
const loading = ref(false)
const loadError = ref('')
const tagLoadError = ref(false)
const dirty = ref(false)

watch(request, async (next) => {
  if (!next) return
  loading.value = true
  loadError.value = ''
  tagLoadError.value = false
  try {
    const jobs: [Promise<ForumCategory[]>, Promise<ForumTag[]>, Promise<StudioTopic | null>] = [
      $fetch<ForumCategory[]>('/api/categories'),
      $fetch<ForumTag[]>('/api/studio/tags').catch(() => {
        tagLoadError.value = true
        return []
      }),
      next.mode === 'edit' && next.topicId
        ? $fetch<StudioTopic>(`/api/studio/topics/${next.topicId}`)
        : Promise.resolve(null),
    ]
    ;[categories.value, knownTags.value, topic.value] = await Promise.all(jobs)
  } catch (error: any) {
    loadError.value = error?.data?.statusMessage || '编辑器加载失败'
  } finally {
    loading.value = false
  }
}, { immediate: true })

function requestClose() {
  if (dirty.value && !confirm('有尚未保存的修改，确定关闭吗？')) return
  dirty.value = false
  close()
}

function handleSaved() {
  dirty.value = false
  markSaved()
  close()
}
</script>
```

Task 3 的模板使用确定的加载与错误状态，不渲染假的编辑字段：

```vue
<template>
  <section
    v-if="request"
    id="reply-control"
    class="discourse-composer open"
    :class="{ collapsed }"
    role="dialog"
    :aria-label="request.mode === 'edit' ? '编辑帖子' : '创建新帖子'"
  >
    <header class="reply-to">
      <strong>{{ request.mode === 'edit' ? '编辑帖子' : '创建新帖子' }}</strong>
      <div class="composer-controls">
        <button type="button" aria-label="收起编辑器" @click="toggleCollapsed">—</button>
        <button type="button" aria-label="关闭编辑器" @click="requestClose">×</button>
      </div>
    </header>
    <p v-if="loading" data-composer-loading role="status">正在加载编辑器</p>
    <p v-else-if="loadError" class="form-alert" role="alert">{{ loadError }}</p>
    <p v-else data-composer-ready role="status">帖子数据已载入</p>
  </section>
</template>
```

在 `app/app.vue` 中挂载：

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <AdminComposerHost />
</template>
```

- [ ] **Step 4: 暂时让后台列表调用全局入口**

在 `app/pages/studio/index.vue` 导入 composable 自动导出的 `openEdit`、`openNew`，把新建链接换成按钮，把编辑链接换成按钮。保留当前铅笔 SVG：

```ts
const { openEdit, openNew, revision } = useAdminComposer()
watch(revision, () => refresh())
```

```vue
<button class="button button-primary" type="button" @click="openNew">＋ 新建帖子</button>
<button type="button" :aria-label="`编辑帖子：${topic.title}`" @click="openEdit(topic.id)">
  <svg class="row-action-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </svg>
  <span>编辑</span>
</button>
```

同步修改现有 E2E 中帖子入口的角色定位：两处 `getByRole('link', { name: '＋ 新建帖子' })` 改为 `getByRole('button', { name: '＋ 新建帖子' })`；帖子操作列的 `getByRole('link', { name: '编辑' })` 改为 `getByRole('button', { name: /编辑帖子/ })`。板块管理的编辑链接保持不变。

- [ ] **Step 5: 运行测试并确认 Host 打开且 URL 不变**

Run:

```powershell
npm.cmd run typecheck
npm.cmd run build
node scripts/run-e2e.mjs --grep=docked.*composer
```

Expected: 测试进入 dialog，URL 仍为 `/studio`，并且 `[data-composer-ready]` 在三个请求完成后出现。Task 4 随后用真实表单替换这个明确的就绪状态。

- [ ] **Step 6: 提交全局 Host**

```powershell
git add app/composables/useAdminComposer.ts app/components/AdminComposerHost.vue app/app.vue app/pages/studio/index.vue tests/e2e/forum.spec.ts
git commit -m "feat: add global docked composer host"
```

---

### Task 4: 把 TopicEditor 改造成真实的 Discourse 式表单

**Files:**
- Modify: `app/components/TopicEditor.vue`。
- Modify: `app/components/AdminComposerHost.vue`。
- Modify: `app/assets/css/main.css` 的 `/* Discourse-style composer */` 区段。
- Modify: `tests/e2e/forum.spec.ts`。

**Interfaces:**
- Props: `topic?: StudioTopic | null`、`categories: ForumCategory[]`、`knownTags: ForumTag[]`、`tagLoadError?: boolean`、`collapsed?: boolean`。
- Emits: `saved: [topic: StudioTopic]`、`dirty-change: [dirty: boolean]`、`request-close: []`、`toggle-collapse: []`。
- Uses: `TagChooser v-model="form.tags"`。

- [ ] **Step 1: 扩展 docked composer 测试以要求真实字段和标签目录**

在已有 docked composer 测试中追加：

```ts
const composer = page.getByRole('dialog', { name: '编辑帖子' })
await expect(composer.getByRole('textbox', { name: '标题', exact: true })).toHaveValue(/.+/)
await composer.getByRole('button', { name: '选择标签' }).click()
await expect(composer.locator('[data-tag-option="Base64"]')).toBeVisible()
await expect(composer.getByRole('toolbar', { name: 'Markdown 工具栏' })).toBeVisible()
await expect(composer.getByRole('button', { name: '保存修改' })).toBeVisible()
await composer.getByRole('button', { name: '收起编辑器' }).click()
await expect(composer.getByRole('textbox', { name: '标题', exact: true })).toBeHidden()
await composer.getByRole('button', { name: '展开编辑器' }).click()
await expect(composer.getByRole('textbox', { name: '标题', exact: true })).toBeVisible()
```

Run: `node scripts/run-e2e.mjs --grep=docked.*composer`

Expected: FAIL，因为 Host 还没有满足完整表单契约。

- [ ] **Step 2: 改造 TopicEditor 的数据与事件**

删除组件内部的 `/api/categories` 请求和保存后的 `navigateTo('/studio')`。表单标签改为数组：

```ts
const props = withDefaults(defineProps<{
  topic?: StudioTopic | null
  categories: ForumCategory[]
  knownTags: ForumTag[]
  tagLoadError?: boolean
  collapsed?: boolean
}>(), { topic: null, tagLoadError: false, collapsed: false })

const emit = defineEmits<{
  saved: [topic: StudioTopic]
  'dirty-change': [dirty: boolean]
  'request-close': []
  'toggle-collapse': []
}>()

const form = reactive({
  title: props.topic?.title || '',
  slug: props.topic?.slug || '',
  excerpt: props.topic?.excerpt || '',
  categorySlug: props.topic?.category.slug || props.categories[0]?.slug || '',
  tags: [...(props.topic?.tags || [])],
  contentMarkdown: props.topic?.contentMarkdown || '',
  externalUrl: props.topic?.externalUrl || '',
  isPinned: props.topic?.isPinned || false,
})
const initialSnapshot = JSON.stringify(form)
watch(form, () => emit('dirty-change', JSON.stringify(form) !== initialSnapshot), { deep: true })
```

保存成功接收并上抛服务端返回值：

```ts
const saved = await $fetch<StudioTopic>(endpoint, { method, body: { ...form, status } })
emit('dirty-change', false)
emit('saved', saved)
```

- [ ] **Step 3: 用 TagChooser 替换逗号输入框**

```vue
<TagChooser
  v-model="form.tags"
  :options="knownTags"
  :load-error="tagLoadError"
  :max="8"
/>
```

标签选择器放在 `.title-and-category` 内；板块、标签和外部地址保持在同一字段行，中等宽度下允许字段行换行。

- [ ] **Step 4: 对齐 Discourse Composer 结构**

用下面的完整模板替换 `TopicEditor.vue` 的现有模板。继续复用脚本中的 `COMPOSER_TOOLS`、`applyTool`、`schedulePreview`、`updatePreview` 和 `handleEditorShortcut`，但所有导航按钮改为发事件：

```vue
<form id="reply-control" class="discourse-composer open" :class="{ collapsed }" @submit.prevent="save('published')">
  <div class="grippie" aria-hidden="true"><span /></div>
  <div class="reply-area" role="dialog" :aria-label="topic ? '编辑帖子' : '创建新帖子'">
    <header class="reply-to" @click.self="collapsed && emit('toggle-collapse')">
      <div class="composer-action-title">
        <strong>{{ topic ? '编辑帖子' : '创建新帖子' }}</strong>
        <span>{{ topic ? `#${topic.id}` : '新帖子' }}</span>
      </div>
      <div class="composer-controls">
        <button
          class="composer-control"
          type="button"
          :title="collapsed ? '展开编辑器' : '收起编辑器'"
          :aria-label="collapsed ? '展开编辑器' : '收起编辑器'"
          @click="emit('toggle-collapse')"
        >{{ collapsed ? '□' : '—' }}</button>
        <button class="composer-control" type="button" title="关闭编辑器" aria-label="关闭编辑器" @click="emit('request-close')">×</button>
      </div>
    </header>

    <div v-if="errorMessage" class="form-alert composer-alert" role="alert">{{ errorMessage }}</div>
    <div v-else-if="!categories.length" class="form-alert composer-alert" role="alert">
      还没有可用板块，请先前往板块管理创建一个板块。
    </div>

    <div v-show="!collapsed" class="d-editor-container" :class="{ 'show-mobile-preview': mobilePane === 'preview' }">
      <section class="composer-fields">
        <label class="title-input" for="reply-title">
          <span class="sr-only">标题</span>
          <input id="reply-title" v-model="form.title" required maxlength="140" placeholder="帖子标题">
        </label>

        <div class="title-and-category">
          <label class="composer-select category-input">
            <span class="sr-only">分类</span>
            <select v-model="form.categorySlug" required>
              <option v-for="category in categories" :key="category.id" :value="category.slug">{{ category.name }}</option>
            </select>
          </label>
          <TagChooser v-model="form.tags" :options="knownTags" :load-error="tagLoadError" :max="8" />
          <label class="composer-inline-input external-url-input">
            <span class="composer-field-icon" aria-hidden="true">↗</span>
            <span class="sr-only">外部网站地址</span>
            <input v-model="form.externalUrl" type="url" placeholder="可选外部网站地址">
          </label>
        </div>

        <details class="composer-more-fields">
          <summary>更多设置</summary>
          <div class="composer-more-fields__grid">
            <label class="field">
              <span>Slug <small>仅创建时生效</small></span>
              <input v-model="form.slug" maxlength="160" placeholder="留空自动生成">
            </label>
            <label class="field">
              <span>摘要 <small>留空从正文提取</small></span>
              <input v-model="form.excerpt" maxlength="280" placeholder="列表摘要">
            </label>
            <label class="check-field composer-pin-field">
              <input v-model="form.isPinned" type="checkbox">
              <span><strong>置顶帖子</strong><small>在帖子列表顶部显示</small></span>
            </label>
          </div>
        </details>
      </section>

      <section class="d-editor-textarea-column" :aria-hidden="mobilePane === 'preview'">
        <label class="sr-only" for="composer-editor">正文 · Markdown</label>
        <div class="d-editor-textarea-wrapper">
          <textarea
            id="composer-editor"
            ref="textarea"
            v-model="form.contentMarkdown"
            class="d-editor-input"
            required
            placeholder="在这里编写帖子内容…"
            @input="schedulePreview"
            @keydown="handleEditorShortcut"
          />
        </div>
      </section>

      <section class="d-editor-preview-wrapper" :aria-hidden="mobilePane !== 'preview'">
        <div v-if="previewHtml" class="d-editor-preview markdown-body" v-html="previewHtml" />
        <div v-else class="preview-empty">输入正文后，这里会显示安全预览。</div>
      </section>
    </div>

    <footer v-show="!collapsed" class="composer-footer">
      <div class="composer-mobile-tabs" role="tablist" aria-label="编辑模式">
        <button type="button" role="tab" :aria-selected="mobilePane === 'editor'" :class="{ active: mobilePane === 'editor' }" @click="mobilePane = 'editor'">编辑</button>
        <button type="button" role="tab" :aria-selected="mobilePane === 'preview'" :class="{ active: mobilePane === 'preview' }" @click="mobilePane = 'preview'; updatePreview()">预览</button>
      </div>
      <div class="composer-footer__toolbar" role="toolbar" aria-label="Markdown 工具栏">
        <button
          v-for="tool in COMPOSER_TOOLS"
          :key="tool.id"
          class="toolbar__button"
          type="button"
          :aria-label="tool.label"
          :title="tool.shortcut ? `${tool.label}（${tool.shortcut}）` : tool.label"
          @click="applyTool(tool.id)"
        >
          <span :class="{ 'is-italic': tool.id === 'italic' }">{{ tool.text }}</span>
        </button>
      </div>
      <div class="submit-panel">
        <span class="draft-status">{{ busy ? '正在保存…' : '可保存为草稿' }}</span>
        <button class="btn" type="button" :disabled="busy || !categories.length" @click="save('draft')">保存草稿</button>
        <button class="btn btn-primary create" type="submit" :disabled="busy || !categories.length" title="Ctrl+Enter">
          {{ topic?.status === 'published' ? '保存修改' : '发布帖子' }}
        </button>
      </div>
    </footer>
  </div>
</form>
```

在 `AdminComposerHost.vue` 中用下面的完整模板替换 Task 3 外壳，避免嵌套两个 `#reply-control`：

```vue
<template>
  <TopicEditor
    v-if="request && !loading && !loadError"
    :key="request.key"
    :topic="topic"
    :categories="categories"
    :known-tags="knownTags"
    :collapsed="collapsed"
    :tag-load-error="tagLoadError"
    @dirty-change="dirty = $event"
    @toggle-collapse="toggleCollapsed"
    @request-close="requestClose"
    @saved="handleSaved"
  />
  <section
    v-else-if="request"
    id="reply-control"
    class="discourse-composer open"
    role="dialog"
    :aria-label="request.mode === 'edit' ? '编辑帖子' : '创建新帖子'"
  >
    <header class="reply-to">
      <strong>{{ request.mode === 'edit' ? '编辑帖子' : '创建新帖子' }}</strong>
      <button type="button" aria-label="关闭编辑器" @click="requestClose">×</button>
    </header>
    <p v-if="loading" role="status">正在加载编辑器</p>
    <p v-else class="form-alert" role="alert">{{ loadError }}</p>
  </section>
</template>
```

加载成功后页面只保留 `TopicEditor` 一个 `#reply-control`。移除当前整页灰色 `.composer-page-backdrop`，让背景页面像 Discourse 一样保持可见。

- [ ] **Step 5: 重写 Composer CSS**

在现有 token 下实现：

```css
.discourse-composer {
  position: fixed;
  z-index: 1250;
  right: max(18px, calc((100vw - 1240px) / 2));
  bottom: 0;
  left: max(18px, calc((100vw - 1240px) / 2));
  width: auto;
  height: min(66vh, 680px);
  min-height: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--primary-low);
  border-bottom: 0;
  border-radius: 8px 8px 0 0;
  background: var(--secondary);
  box-shadow: 0 -8px 28px rgb(0 0 0 / 18%);
}

.discourse-composer.collapsed {
  height: 55px;
}

.d-editor-container {
  min-height: 0;
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr);
  grid-template-areas: "fields fields" "editor preview";
}
```

在 `@media (max-width: 700px)` 下 Composer 占满宽度，编辑/预览二选一，footer 不溢出，关闭和保存按钮保持可见。

- [ ] **Step 6: 验证真实表单测试**

Run:

```powershell
npm.cmd test -- tests/tag-chooser.test.ts tests/markdown-editor.test.ts
npm.cmd run typecheck
npm.cmd run build
node scripts/run-e2e.mjs --grep=docked.*composer
```

Expected: 全部 PASS。

- [ ] **Step 7: 提交 Composer 表单**

```powershell
git add app/components/TopicEditor.vue app/components/AdminComposerHost.vue app/assets/css/main.css tests/e2e/forum.spec.ts
git commit -m "feat: rebuild topic editor as Discourse composer"
```

---

### Task 5: 公开帖子铅笔入口与兼容路由

**Files:**
- Modify: `app/pages/t/[slug]/[id].vue`。
- Modify: `app/pages/studio/topics/new.vue`。
- Modify: `app/pages/studio/topics/[id]/edit.vue`。
- Modify: `app/assets/css/main.css` 的帖子操作区。
- Modify: `tests/e2e/forum.spec.ts`。

**Interfaces:**
- Consumes: `openEdit(id)`、`openNew()`、`revision` from `useAdminComposer`。
- Public session endpoint: `GET /api/auth/session -> { authenticated: boolean }`。

- [ ] **Step 1: 写公开帖子铅笔入口的失败测试**

在 `tests/e2e/forum.spec.ts` 添加：

```ts
test('administrator edits a public topic from its Discourse pencil action', async ({ page }) => {
  await page.goto('/studio/sign-in')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await page.goto('/')
  await page.getByRole('link', { name: '欢迎来到 AI 知识论坛' }).click()
  const topicUrl = page.url()

  await page.getByRole('button', { name: '编辑帖子' }).click()
  await expect(page.getByRole('dialog', { name: '编辑帖子' })).toBeVisible()
  await expect(page).toHaveURL(topicUrl)
})

test('public visitors never see the topic edit pencil', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: '欢迎来到 AI 知识论坛' }).click()
  await expect(page.getByRole('button', { name: '编辑帖子' })).toHaveCount(0)
})
```

Run: `node scripts/run-e2e.mjs --grep=Discourse.*pencil`

Expected: FAIL，公开帖子页不存在按钮。

- [ ] **Step 2: 在公开帖子页读取会话并显示铅笔**

在 `app/pages/t/[slug]/[id].vue`：

```ts
const { data: adminSession } = await useFetch<{ authenticated: boolean }>('/api/auth/session', {
  default: () => ({ authenticated: false }),
})
const { openEdit, revision } = useAdminComposer()
watch(revision, () => refresh())
```

把帖子操作区改为在外链或管理员操作任一存在时显示：

```vue
<div v-if="topic.externalUrl || adminSession.authenticated" class="post-actions">
  <a
    v-if="topic.externalUrl"
    :href="topic.externalUrl"
    class="btn btn-primary"
    target="_blank"
    rel="noopener noreferrer"
  >
    访问工具 <span aria-hidden="true">↗</span>
  </a>
  <button
    v-if="adminSession.authenticated"
    class="btn btn-flat post-action-menu__edit"
    type="button"
    aria-label="编辑帖子"
    title="编辑帖子"
    @click="openEdit(topic.id)"
  >
    <svg class="row-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
    <span>编辑</span>
  </button>
</div>
```

铅笔复用后台已存在的两条 path，不复制外部图标包。

- [ ] **Step 3: 让兼容路由打开全局 Composer 后回到后台列表**

`app/pages/studio/topics/new.vue`：

```vue
<script setup lang="ts">
definePageMeta({ layout: 'studio', middleware: 'admin' })
const { openNew } = useAdminComposer()
onMounted(async () => {
  openNew()
  await navigateTo('/studio', { replace: true })
})
</script>

<template>
  <p role="status">正在打开编辑器…</p>
</template>
```

`app/pages/studio/topics/[id]/edit.vue`：

```vue
<script setup lang="ts">
definePageMeta({ layout: 'studio', middleware: 'admin' })
const route = useRoute()
const { openEdit } = useAdminComposer()
onMounted(async () => {
  openEdit(Number(route.params.id))
  await navigateTo('/studio', { replace: true })
})
</script>

<template>
  <p role="status">正在打开编辑器…</p>
</template>
```

- [ ] **Step 4: 验证公开入口和旧路由**

加入兼容路由 E2E：

```ts
test('legacy compatible composer routes open the global composer', async ({ page }) => {
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()

  await page.goto('/studio/topics/1/edit')
  await expect(page).toHaveURL(/\/studio$/)
  await expect(page.getByRole('dialog', { name: '编辑帖子' })).toBeVisible()
  await page.getByRole('button', { name: '关闭编辑器' }).click()

  await page.goto('/studio/topics/new')
  await expect(page).toHaveURL(/\/studio$/)
  await expect(page.getByRole('dialog', { name: '创建新帖子' })).toBeVisible()
})
```

Run:

```powershell
npm.cmd run build
node scripts/run-e2e.mjs --grep="pencil|compatible composer route"
```

Expected: 所有入口测试 PASS。

- [ ] **Step 5: 提交入口接线**

```powershell
git add app/pages/t/[slug]/[id].vue app/pages/studio/topics/new.vue app/pages/studio/topics/[id]/edit.vue app/assets/css/main.css tests/e2e/forum.spec.ts
git commit -m "feat: open composer from administrator edit actions"
```

---

### Task 6: 保存刷新、关闭确认与响应式验收

**Files:**
- Modify: `app/components/AdminComposerHost.vue`。
- Modify: `app/components/TopicEditor.vue`。
- Modify: `app/pages/studio/index.vue`。
- Modify: `app/pages/t/[slug]/[id].vue`。
- Modify: `app/assets/css/main.css`。
- Modify: `tests/e2e/forum.spec.ts`。

**Interfaces:**
- `saved` increments `revision` exactly once and closes Composer。
- Dirty close invokes one browser confirmation and preserves input when cancelled。
- Desktop and 390px viewport keep Composer controls inside the viewport。

- [ ] **Step 1: 写保存后背景刷新的失败测试**

在 E2E 文件加入完整测试，通过已认证的 API 创建唯一帖子，再从公开页原地编辑：

```ts
test('saving the composer refreshes the background topic without navigation', async ({ page }) => {
  const title = `Composer 刷新 ${Date.now()}`
  const updatedTitle = `${title}（已更新）`
  await page.goto('/studio/sign-in')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()

  const response = await page.request.post('/api/studio/topics', {
    data: {
      title,
      categorySlug: 'chatgpt',
      contentMarkdown: '用于验证 Composer 保存后的背景刷新。',
      tags: ['Prompt'],
      status: 'published',
      isPinned: false,
      externalUrl: null,
    },
  })
  expect(response.ok()).toBe(true)
  const created = await response.json() as { id: number; category: { slug: string } }
  await page.goto(`/t/${created.category.slug}/${created.id}`)
  const topicUrl = page.url()

  await page.getByRole('button', { name: '编辑帖子' }).click()
  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  await composer.getByRole('textbox', { name: '标题', exact: true }).fill(updatedTitle)
  await composer.getByRole('button', { name: '保存修改' }).click()
  await expect(composer).toBeHidden()
  await expect(page).toHaveURL(topicUrl)
  await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible()
})
```

Run: `node scripts/run-e2e.mjs --grep=background.*refresh`

Expected: 若页面未 watch `revision`，标题仍为旧值并失败。

- [ ] **Step 2: 写关闭确认的失败测试**

```ts
test('unsaved composer changes require confirmation before closing', async ({ page }) => {
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await page.getByRole('button', { name: /编辑帖子/ }).first().click()
  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  await composer.getByRole('textbox', { name: '标题', exact: true }).fill('尚未保存的标题')

  page.once('dialog', dialog => dialog.dismiss())
  await composer.getByRole('button', { name: '关闭编辑器' }).click()
  await expect(composer).toBeVisible()
  await expect(composer.getByRole('textbox', { name: '标题', exact: true })).toHaveValue('尚未保存的标题')

  page.once('dialog', dialog => dialog.accept())
  await composer.getByRole('button', { name: '关闭编辑器' }).click()
  await expect(composer).toBeHidden()
})
```

追加保存失败测试，确认服务端错误不会销毁表单：

```ts
test('failed composer saves preserve the current input', async ({ page }) => {
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await page.getByRole('button', { name: /编辑帖子/ }).first().click()
  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  const changedTitle = `保存失败保留输入 ${Date.now()}`
  await composer.getByRole('textbox', { name: '标题', exact: true }).fill(changedTitle)
  await page.route('**/api/studio/topics/*', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ statusMessage: '故意制造的保存失败' }),
      })
      return
    }
    await route.continue()
  })

  await composer.getByRole('button', { name: '保存修改' }).click()
  await expect(composer.getByRole('alert')).toContainText('故意制造的保存失败')
  await expect(composer.getByRole('textbox', { name: '标题', exact: true })).toHaveValue(changedTitle)
  await expect(composer).toBeVisible()
})
```

Run: `node scripts/run-e2e.mjs --grep="unsaved composer|failed composer"`

Expected: 关闭确认未实现时第一个测试失败；保存错误未被保留时第二个测试失败。

- [ ] **Step 3: 完成 Host 的刷新和关闭状态机**

先追加导航守卫测试：

```ts
test('dirty composer blocks route changes until confirmed', async ({ page }) => {
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await page.getByRole('button', { name: /编辑帖子/ }).first().click()
  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  await composer.getByRole('textbox', { name: '标题', exact: true }).fill('阻止导航的未保存标题')

  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('link', { name: /查看网站/ }).click()
  await expect(page).toHaveURL(/\/studio$/)
  await expect(composer.getByRole('textbox', { name: '标题', exact: true })).toHaveValue('阻止导航的未保存标题')

  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('link', { name: /查看网站/ }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(composer).toBeHidden()
})
```

Run: `node scripts/run-e2e.mjs --grep="blocks route"`

Expected: FAIL，当前脏表单不会阻止路由变化。

然后固定 `handleSaved()` 的更新顺序：

```ts
function handleSaved() {
  dirty.value = false
  markSaved()
  close()
}
```

实现关闭入口；用户取消时不改变 `request`，因此表单输入仍在：

```ts
function requestClose() {
  if (dirty.value && !confirm('有尚未保存的修改，确定关闭吗？')) return
  dirty.value = false
  close()
}
```

最后在 Host 中注册并清理导航守卫：

```ts
const router = useRouter()
let removeNavigationGuard: (() => void) | undefined

onMounted(() => {
  removeNavigationGuard = router.beforeEach(() => {
    if (!request.value || !dirty.value) return true
    if (!confirm('有尚未保存的修改，确定离开吗？')) return false
    dirty.value = false
    close()
    return true
  })
})

onBeforeUnmount(() => removeNavigationGuard?.())
```

Run: `node scripts/run-e2e.mjs --grep="unsaved composer|failed composer|blocks route|background.*refresh"`

Expected: 保存刷新、失败保留、关闭确认和导航守卫测试全部 PASS。

- [ ] **Step 4: 添加移动端失败验收**

加入完整的 390×844 视口测试：

```ts
test('mobile composer keeps tabs and save controls in the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/studio')
  await page.getByLabel('管理员密码').fill('ai-forum-local-admin')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await page.getByRole('button', { name: /编辑帖子/ }).first().click()

  const composer = page.getByRole('dialog', { name: '编辑帖子' })
  await expect(composer.getByRole('tab', { name: '编辑' })).toBeVisible()
  await expect(composer.getByRole('tab', { name: '预览' })).toBeVisible()
  await expect(composer.getByRole('button', { name: /保存修改|发布帖子/ })).toBeVisible()
  const composerBox = await page.locator('#reply-control').boundingBox()
  expect(composerBox).not.toBeNull()
  expect(composerBox!.height).toBeLessThanOrEqual(Math.ceil(844 * 0.78))
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
```

Run: `node scripts/run-e2e.mjs --grep=mobile.*composer`

Expected: 在最终响应式 CSS 完成前至少一项失败。

- [ ] **Step 5: 完成 700px 以下布局**

把下面的确定样式合并进现有 `@media (max-width: 700px)` Composer 规则，同时删除 `.composer-page-backdrop` 的移动端规则；保留现有字段行换行、外部地址独占一行和 submit panel 宽度规则。`show-mobile-preview` 由 `mobilePane` 控制：

```css
@media (max-width: 700px) {
  .discourse-composer {
    inset-inline: 0;
    width: 100%;
    height: min(78dvh, 680px);
    max-height: 78dvh;
    border-radius: 8px 8px 0 0;
  }

  .d-editor-container {
    min-width: 0;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-areas: "fields" "editor";
  }

  .d-editor-preview-wrapper {
    display: none;
    grid-area: editor;
  }

  .d-editor-container.show-mobile-preview .d-editor-textarea-column {
    display: none;
  }

  .d-editor-container.show-mobile-preview .d-editor-preview-wrapper {
    display: block;
  }

  .composer-footer {
    min-width: 0;
    flex-wrap: wrap;
  }

  .composer-mobile-tabs {
    width: 100%;
    display: flex;
  }

  .composer-footer__toolbar {
    min-width: 0;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
  }

  .submit-panel {
    flex: none;
    margin-left: auto;
  }
}
```

- [ ] **Step 6: 运行完整验证**

Run:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
node scripts/run-e2e.mjs
```

Expected:

- Vitest 所有测试通过。
- Nuxt typecheck 退出码 0。
- Nuxt production build 退出码 0。
- Playwright 所有测试通过，包括管理员标签、公开铅笔、列表原地编辑、保存刷新、关闭确认和移动端 Composer。

- [ ] **Step 7: 视觉检查**

在移动端测试后增加 `await page.screenshot({ path: 'test-results/composer-mobile.png', fullPage: true })`；在桌面 docked composer 测试将视口设为 1280×900，并增加 `await page.screenshot({ path: 'test-results/composer-desktop.png', fullPage: true })`。运行对应测试后检查标题、板块、标签块、编辑区、预览区、工具栏和保存按钮；确认没有灰色整页遮罩，没有截断操作，没有页面级横向滚动。截图只作为本地验收产物，不加入 Git。

- [ ] **Step 8: 更新维护文档**

修改 `docs/admin-crud-guide.md` 和 `docs/customization-guide.md`：说明管理员现在可以从公开帖子铅笔或后台列表打开 Composer；标签通过已知标签下拉选择，也允许创建新标签；列出 `TagChooser.vue`、`AdminComposerHost.vue` 和 `useAdminComposer.ts` 的维护位置。

- [ ] **Step 9: 提交最终验收与文档**

```powershell
git add app server tests docs/admin-crud-guide.md docs/customization-guide.md
git commit -m "test: verify Discourse composer workflow"
```

---

## Final Review Checklist

- [ ] 公开帖子页只有管理员能看到铅笔。
- [ ] 后台列表点击编辑时 URL 不变。
- [ ] Composer 可收起、恢复和关闭。
- [ ] 未保存内容关闭前确认。
- [ ] 已知标签包含草稿标签，不暴露给公共 API。
- [ ] 标签支持搜索、多选、移除、新建、去重和 8 个上限。
- [ ] 保存成功刷新背景且不改变当前页面。
- [ ] 旧新建和编辑 URL 仍能工作。
- [ ] 桌面和手机布局通过真实浏览器验收。
- [ ] 所有测试、类型检查和生产构建通过。
