<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { ForumCategory, ForumTag, StudioTopic } from '~/types/forum'
import { applyMarkdownAction, COMPOSER_TOOLS, type MarkdownAction } from '~/utils/markdown-editor'

const props = withDefaults(defineProps<{
  topic?: StudioTopic | null
  categories?: ForumCategory[]
  knownTags?: ForumTag[]
  tagLoadError?: boolean
  collapsed?: boolean
}>(), {
  topic: null,
  categories: () => [],
  knownTags: () => [],
  tagLoadError: false,
  collapsed: false,
})

const emit = defineEmits<{
  saved: [topic: StudioTopic]
  'dirty-change': [dirty: boolean]
  'request-close': []
  'toggle-collapse': []
}>()

function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

const initialPublishedAt = toDateTimeLocal(props.topic?.publishedAt)
const maxPublishTime = toDateTimeLocal(new Date().toISOString())
const form = reactive({
  title: props.topic?.title || '',
  slug: props.topic?.slug || '',
  excerpt: props.topic?.excerpt || '',
  categorySlug: props.topic?.category.slug || props.categories[0]?.slug || '',
  tags: [...(props.topic?.tags || [])],
  contentMarkdown: props.topic?.contentMarkdown || '',
  externalUrl: props.topic?.externalUrl || '',
  isPinned: props.topic?.isPinned || false,
  publishedAt: initialPublishedAt,
})
const initialSnapshot = JSON.stringify(form)
const busy = ref(false)
const errorMessage = ref('')
const previewHtml = ref('')
const mobilePane = ref<'editor' | 'preview'>('editor')
const textarea = ref<HTMLTextAreaElement | null>(null)
const fullscreen = ref(false)
let previewTimer: ReturnType<typeof setTimeout> | undefined

watch(form, () => {
  emit('dirty-change', JSON.stringify(form) !== initialSnapshot)
}, { deep: true })

watch(() => props.collapsed, (collapsed) => {
  if (collapsed) setFullscreen(false)
})

async function updatePreview() {
  try {
    const result = await $fetch<{ html: string }>('/api/studio/preview', {
      method: 'POST',
      body: { markdown: form.contentMarkdown },
    })
    previewHtml.value = result.html
  }
  catch {
    previewHtml.value = '<p>预览暂时不可用。</p>'
  }
}

function schedulePreview() {
  clearTimeout(previewTimer)
  previewTimer = setTimeout(updatePreview, 220)
}

async function applyTool(action: MarkdownAction) {
  const input = textarea.value
  if (!input) return
  const edit = applyMarkdownAction(
    form.contentMarkdown,
    input.selectionStart,
    input.selectionEnd,
    action,
  )
  form.contentMarkdown = edit.value
  schedulePreview()
  await nextTick()
  input.focus()
  input.setSelectionRange(edit.selectionStart, edit.selectionEnd)
}

function handleEditorShortcut(event: KeyboardEvent) {
  if (!(event.metaKey || event.ctrlKey)) return
  const key = event.key.toLocaleLowerCase()
  const action = key === 'b' ? 'bold' : key === 'i' ? 'italic' : key === 'k' ? 'link' : null
  if (action) {
    event.preventDefault()
    applyTool(action)
  }
  else if (key === 'enter') {
    event.preventDefault()
    save('published')
  }
}

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

async function save(status: 'draft' | 'published') {
  busy.value = true
  errorMessage.value = ''
  try {
    const endpoint = props.topic ? `/api/studio/topics/${props.topic.id}` : '/api/studio/topics'
    const publishedAt = form.publishedAt
      ? form.publishedAt === initialPublishedAt && props.topic?.publishedAt
        ? props.topic.publishedAt
        : new Date(form.publishedAt).toISOString()
      : null
    const saved = await $fetch<StudioTopic>(endpoint, {
      method: props.topic ? 'PUT' : 'POST',
      body: { ...form, publishedAt, status },
    })
    emit('dirty-change', false)
    emit('saved', saved)
  }
  catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.statusMessage || '保存失败，请检查输入后重试'
  }
  finally {
    busy.value = false
  }
}

onMounted(() => {
  updatePreview()
  window.addEventListener('keydown', handleWindowKeydown)
})

onBeforeUnmount(() => {
  clearTimeout(previewTimer)
  window.removeEventListener('keydown', handleWindowKeydown)
  document.documentElement.classList.remove('composer-fullscreen')
})
</script>

<template>
  <form id="reply-control" class="discourse-composer open" :class="{ collapsed, fullscreen }" @submit.prevent="save('published')">
    <div class="grippie" aria-hidden="true"><span /></div>
    <div class="reply-area" role="dialog" :aria-label="topic ? '编辑帖子' : '创建新帖子'">
      <header class="reply-to" @click.self="collapsed && requestToggleCollapse()">
        <div class="composer-action-title">
          <strong>{{ topic ? '编辑帖子' : '创建新帖子' }}</strong>
          <span>{{ topic ? `#${topic.id}` : '新帖子' }}</span>
        </div>
        <div class="composer-controls">
          <button
            v-if="!collapsed"
            class="composer-control composer-fullscreen-toggle"
            type="button"
            :title="fullscreen ? '退出全屏（Esc）' : '全屏编辑'"
            :aria-label="fullscreen ? '退出全屏' : '全屏编辑'"
            :aria-pressed="fullscreen"
            @click="toggleFullscreen"
          >⛶</button>
          <button
            class="composer-control"
            type="button"
            :title="collapsed ? '展开编辑器' : '收起编辑器'"
            :aria-label="collapsed ? '展开编辑器' : '收起编辑器'"
            @click="requestToggleCollapse"
          >{{ collapsed ? '□' : '—' }}</button>
          <button class="composer-control" type="button" title="关闭编辑器" aria-label="关闭编辑器" @click="emit('request-close')">×</button>
        </div>
      </header>

      <div v-if="errorMessage" class="form-alert composer-alert" role="alert">{{ errorMessage }}</div>
      <div v-else-if="!categories.length" class="form-alert composer-alert" role="alert">
        还没有可用板块，请先前往板块管理创建一个板块。
      </div>

      <div
        v-show="!collapsed"
        class="d-editor-container"
        :class="{ 'show-mobile-preview': mobilePane === 'preview' }"
      >
        <section class="composer-fields">
          <label class="title-input" for="reply-title">
            <span class="sr-only">标题</span>
            <input id="reply-title" v-model="form.title" required maxlength="140" placeholder="帖子标题">
          </label>

          <div class="title-and-category">
            <label class="composer-select category-input">
              <span class="sr-only">分类</span>
              <select v-model="form.categorySlug" required>
                <option v-for="category in categories" :key="category.id" :value="category.slug">
                  {{ category.name }}
                </option>
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
                <span>发布时间 <small>留空自动生成</small></span>
                <input v-model="form.publishedAt" type="datetime-local" :max="maxPublishTime" step="60">
              </label>
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

        <section class="d-editor-textarea-column">
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

        <section class="d-editor-preview-wrapper">
          <div v-if="previewHtml" class="d-editor-preview markdown-body" v-html="previewHtml" />
          <div v-else class="preview-empty">输入正文后，这里会显示安全预览。</div>
        </section>
      </div>

      <footer v-show="!collapsed" class="composer-footer">
        <div class="composer-mobile-tabs" role="tablist" aria-label="编辑模式">
          <button
            type="button"
            role="tab"
            :aria-selected="mobilePane === 'editor'"
            :class="{ active: mobilePane === 'editor' }"
            @click="mobilePane = 'editor'"
          >编辑</button>
          <button
            type="button"
            role="tab"
            :aria-selected="mobilePane === 'preview'"
            :class="{ active: mobilePane === 'preview' }"
            @click="mobilePane = 'preview'; updatePreview()"
          >预览</button>
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
          <button class="btn" type="button" :disabled="busy || !categories.length" @click="save('draft')">
            保存草稿
          </button>
          <button class="btn btn-primary create" type="submit" :disabled="busy || !categories.length" title="Ctrl+Enter">
            {{ topic?.status === 'published' ? '保存修改' : '发布帖子' }}
          </button>
        </div>
      </footer>
    </div>
  </form>
</template>
