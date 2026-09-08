<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import type { ForumCategory, ForumTag, StudioTopic, TopicRevision } from '~/types/forum'
import { clampComposerHeight } from '~/utils/composer-layout'
import { getErrorMessage } from '~/utils/error-message'
import {
  composerDraftKey,
  parseComposerDraft,
  serializeComposerDraft,
  type ComposerDraft,
  type ComposerDraftFields,
} from '~/utils/composer-draft'
import {
  applyMarkdownAction,
  COMPOSER_TOOLS,
  continueOrderedList,
  insertMarkdownBlock,
  type MarkdownAction,
} from '~/utils/markdown-editor'

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'
const ALLOWED_IMAGE_TYPES = new Set(IMAGE_ACCEPT.split(','))
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_IMAGES_PER_BATCH = 10

type UploadedImage = {
  url: string
  alt: string
  mimeType: string
  size: number
}

type PendingImageUpload = {
  file: File
  marker: string
}

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
  viewCount: '',
})
const initialSnapshot = JSON.stringify(form)
const hasUnsavedChanges = computed(() => JSON.stringify(form) !== initialSnapshot)
const localDraftKey = composerDraftKey(props.topic?.id)
const busy = ref(false)
const errorMessage = ref('')
const previewHtml = ref('')
const mobilePane = ref<'editor' | 'preview'>('editor')
const textarea = ref<HTMLTextAreaElement | null>(null)
const previewPane = ref<HTMLElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const composerRoot = ref<HTMLFormElement | null>(null)
const fullscreen = ref(false)
const composerHeight = ref<number | null>(null)
const resizing = ref(false)
const imageDragActive = ref(false)
const uploadingImages = ref(0)
const uploadMessage = ref('')
const recoveryDraft = ref<ComposerDraft | null>(null)
const localDraftSavedAt = ref('')
const revisions = ref<TopicRevision[]>([])
const revisionsOpen = ref(false)
const revisionsLoading = ref(false)
const revisionsError = ref('')
const restoringRevisionId = ref<number | null>(null)
let resizeStartY = 0
let resizeStartHeight = 0
let previewTimer: ReturnType<typeof setTimeout> | undefined
let localDraftTimer: ReturnType<typeof setTimeout> | undefined
let uploadSequence = 0
let skipDraftOnUnmount = false

const composerStyle = computed(() => composerHeight.value === null
  ? undefined
  : { '--composer-height': `${composerHeight.value}px` })
const draftStatus = computed(() => {
  if (uploadingImages.value > 0) return `正在上传 ${uploadingImages.value} 张图片…`
  if (busy.value) return '正在保存…'
  if (localDraftSavedAt.value) return `已在本机暂存 ${localDraftSavedAt.value}`
  return uploadMessage.value || '可保存为草稿'
})

watch(form, () => {
  const dirty = hasUnsavedChanges.value
  emit('dirty-change', dirty)
  clearTimeout(localDraftTimer)
  if (!dirty || !import.meta.client) return
  localDraftTimer = setTimeout(persistLocalDraft, 700)
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

function syncPreviewScroll() {
  const input = textarea.value
  const preview = previewPane.value
  if (!input || !preview) return

  const inputRange = input.scrollHeight - input.clientHeight
  const previewRange = preview.scrollHeight - preview.clientHeight
  preview.scrollTop = inputRange > 0 && previewRange > 0
    ? (input.scrollTop / inputRange) * previewRange
    : 0
}

function draftFields(): ComposerDraftFields {
  return {
    title: form.title,
    slug: form.slug,
    excerpt: form.excerpt,
    categorySlug: form.categorySlug,
    tags: [...form.tags],
    contentMarkdown: form.contentMarkdown,
    externalUrl: form.externalUrl,
    isPinned: form.isPinned,
    publishedAt: form.publishedAt,
    viewCount: form.viewCount,
  }
}

function persistLocalDraft() {
  if (!import.meta.client || JSON.stringify(form) === initialSnapshot) return
  const savedAt = new Date()
  localStorage.setItem(localDraftKey, serializeComposerDraft(draftFields(), savedAt))
  localDraftSavedAt.value = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(savedAt)
}

function preserveDraftBeforeRevisionRestore(): boolean {
  if (!import.meta.client) return false
  const fields = hasUnsavedChanges.value
    ? draftFields()
    : recoveryDraft.value?.fields
  if (!fields) return true

  try {
    const savedAt = new Date()
    const serialized = serializeComposerDraft(fields, savedAt, {
      preserveAcrossServerUpdate: true,
    })
    localStorage.setItem(localDraftKey, serialized)
    if (localStorage.getItem(localDraftKey) !== serialized) {
      throw new Error('Draft storage verification failed')
    }
    localDraftSavedAt.value = new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(savedAt)
    return true
  }
  catch {
    revisionsError.value = '浏览器无法保存本机草稿，已取消恢复历史版本；服务器内容没有改变。'
    return false
  }
}

function clearLocalDraft(afterSuccessfulSave = false) {
  clearTimeout(localDraftTimer)
  if (afterSuccessfulSave) skipDraftOnUnmount = true
  if (import.meta.client) localStorage.removeItem(localDraftKey)
  localDraftSavedAt.value = ''
  recoveryDraft.value = null
}

function restoreLocalDraft() {
  if (!recoveryDraft.value) return
  Object.assign(form, recoveryDraft.value.fields)
  localDraftSavedAt.value = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(recoveryDraft.value.savedAt))
  recoveryDraft.value = null
  schedulePreview()
}

function discardLocalDraft() {
  clearLocalDraft()
}

function formatRevisionDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function revisionSummary(revision: TopicRevision): string {
  return revision.contentMarkdown.replace(/\s+/g, ' ').trim().slice(0, 88) || '空正文'
}

async function openRevisions() {
  if (!props.topic) return
  revisionsOpen.value = true
  revisionsLoading.value = true
  revisionsError.value = ''
  try {
    revisions.value = await $fetch<TopicRevision[]>(`/api/studio/topics/${props.topic.id}/revisions`)
  }
  catch (error: unknown) {
    revisionsError.value = getErrorMessage(error, '历史版本加载失败')
  }
  finally {
    revisionsLoading.value = false
  }
}

async function restoreRevision(revision: TopicRevision) {
  if (!props.topic) return
  const preserveLocalDraft = hasUnsavedChanges.value || Boolean(recoveryDraft.value)
  const confirmation = preserveLocalDraft
    ? `你有尚未恢复或尚未保存的本机修改。恢复“${revision.title}”后，这些修改会继续保留为本机草稿，下次打开帖子时可以恢复。是否继续？`
    : `确定恢复“${revision.title}”这个版本吗？当前已保存版本会自动保留在历史记录中；如果原板块已删除，帖子会保留在当前板块。`
  if (!window.confirm(confirmation)) return
  if (preserveLocalDraft && !preserveDraftBeforeRevisionRestore()) return
  restoringRevisionId.value = revision.id
  revisionsError.value = ''
  try {
    const restored = await $fetch<StudioTopic>(
      `/api/studio/topics/${props.topic.id}/revisions/${revision.id}`,
      { method: 'POST' },
    )
    if (!preserveLocalDraft) {
      clearLocalDraft(true)
    }
    emit('dirty-change', false)
    emit('saved', restored)
  }
  catch (error: unknown) {
    revisionsError.value = getErrorMessage(error, '恢复历史版本失败')
  }
  finally {
    restoringRevisionId.value = null
  }
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

function imageAltFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[\r\n\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || '图片'
}

function imageFilesFromTransfer(transfer: DataTransfer | null): File[] {
  if (!transfer) return []
  const itemFiles = Array.from(transfer.items || [])
    .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
    .map(item => item.getAsFile())
    .filter((file): file is File => Boolean(file))
  if (itemFiles.length) return itemFiles
  return Array.from(transfer.files || []).filter(file => file.type.startsWith('image/'))
}

function validateImageFiles(files: File[]): string | null {
  if (files.length > MAX_IMAGES_PER_BATCH) return '一次最多上传 10 张图片'
  for (const file of files) {
    if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type)) {
      return `${file.name || '这张图片'}不是支持的 PNG、JPEG、WebP 或 GIF 图片`
    }
    if (file.size > MAX_IMAGE_BYTES) return `${file.name || '这张图片'}超过了 10 MB`
    if (file.size === 0) return `${file.name || '这张图片'}没有内容`
  }
  return null
}

function uploadErrorText(error: unknown): string {
  return getErrorMessage(error, '图片上传失败，请重试')
}

async function uploadOneImage(job: PendingImageUpload): Promise<boolean> {
  const body = new FormData()
  body.append('file', job.file, job.file.name || 'pasted-image.png')
  try {
    const uploaded = await $fetch<UploadedImage>('/api/studio/uploads', {
      method: 'POST',
      body,
    })
    const markdown = `![${uploaded.alt}](${uploaded.url})`
    form.contentMarkdown = form.contentMarkdown.replace(job.marker, markdown)
    schedulePreview()
    return true
  }
  catch (error) {
    form.contentMarkdown = form.contentMarkdown.replace(job.marker, '')
    errorMessage.value = uploadErrorText(error)
    schedulePreview()
    return false
  }
}

async function uploadImages(files: File[]) {
  if (!files.length || uploadingImages.value > 0) return
  errorMessage.value = ''
  uploadMessage.value = ''
  const validationError = validateImageFiles(files)
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  const input = textarea.value
  const start = input?.selectionStart ?? form.contentMarkdown.length
  const end = input?.selectionEnd ?? start
  const jobs = files.map((file) => {
    uploadSequence += 1
    const marker = `[正在上传图片：${imageAltFromFilename(file.name)}…]<!--upload:${Date.now()}-${uploadSequence}-->`
    return { file, marker }
  })
  const edit = insertMarkdownBlock(
    form.contentMarkdown,
    start,
    end,
    jobs.map(job => job.marker).join('\n\n'),
  )
  form.contentMarkdown = edit.value
  uploadingImages.value = jobs.length
  schedulePreview()
  await nextTick()
  input?.focus()
  input?.setSelectionRange(edit.selectionStart, edit.selectionEnd)

  const results = await Promise.all(jobs.map(uploadOneImage))
  uploadingImages.value = 0
  const successCount = results.filter(Boolean).length
  if (successCount === jobs.length) {
    uploadMessage.value = successCount === 1 ? '图片已插入正文' : `${successCount} 张图片已插入正文`
  }
  else if (successCount > 0) {
    uploadMessage.value = `${successCount} 张图片已插入正文`
  }
}

function chooseImages() {
  imageInput.value?.click()
}

function handleImageSelection(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  void uploadImages(Array.from(input.files || []))
  input.value = ''
}

function handleImagePaste(event: ClipboardEvent) {
  const files = imageFilesFromTransfer(event.clipboardData)
  if (!files.length) return
  event.preventDefault()
  void uploadImages(files)
}

function handleImageDragOver(event: DragEvent) {
  if (!event.dataTransfer?.types.includes('Files')) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
  imageDragActive.value = true
}

function handleImageDragLeave(event: DragEvent) {
  const wrapper = event.currentTarget as HTMLElement
  if (event.relatedTarget instanceof Node && wrapper.contains(event.relatedTarget)) return
  imageDragActive.value = false
}

function handleImageDrop(event: DragEvent) {
  const files = imageFilesFromTransfer(event.dataTransfer)
  imageDragActive.value = false
  if (!files.length) return
  event.preventDefault()
  void uploadImages(files)
}

async function handleEditorShortcut(event: KeyboardEvent) {
  if (event.isComposing) return
  if (
    event.key === 'Enter'
    && !event.ctrlKey
    && !event.metaKey
    && !event.altKey
    && !event.shiftKey
  ) {
    const input = textarea.value
    if (!input) return
    const edit = continueOrderedList(
      form.contentMarkdown,
      input.selectionStart,
      input.selectionEnd,
    )
    if (!edit) return
    event.preventDefault()
    form.contentMarkdown = edit.value
    schedulePreview()
    await nextTick()
    input.focus()
    input.setSelectionRange(edit.selectionStart, edit.selectionEnd)
    return
  }

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

async function save(status: 'draft' | 'published') {
  if (uploadingImages.value > 0) return
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
      body: { ...form, viewCount: form.viewCount.trim() === '' ? undefined : Number(form.viewCount), publishedAt, status },
    })
    clearLocalDraft(true)
    emit('dirty-change', false)
    emit('saved', saved)
  }
  catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, '保存失败，请检查输入后重试')
  }
  finally {
    busy.value = false
  }
}

onMounted(() => {
  const storedDraft = localStorage.getItem(localDraftKey)
  const parsedDraft = parseComposerDraft(storedDraft, props.topic?.updatedAt)
  if (parsedDraft && JSON.stringify(parsedDraft.fields) !== initialSnapshot) {
    recoveryDraft.value = parsedDraft
  }
  else if (storedDraft) {
    localStorage.removeItem(localDraftKey)
  }
  updatePreview()
  window.addEventListener('keydown', handleWindowKeydown)
})

onBeforeUnmount(() => {
  clearTimeout(previewTimer)
  clearTimeout(localDraftTimer)
  if (!skipDraftOnUnmount) persistLocalDraft()
  window.removeEventListener('keydown', handleWindowKeydown)
  document.documentElement.classList.remove('composer-fullscreen')
})
</script>

<template>
  <form
    id="reply-control"
    ref="composerRoot"
    class="discourse-composer open"
    :class="{ collapsed, fullscreen, resizing }"
    :style="composerStyle"
    @submit.prevent="save('published')"
  >
    <div
      class="grippie"
      role="separator"
      aria-label="调整编辑器高度"
      aria-orientation="horizontal"
      :aria-disabled="collapsed || fullscreen"
      :tabindex="collapsed || fullscreen ? -1 : 0"
      @pointerdown="startResize"
      @pointermove="continueResize"
      @pointerup="stopResize"
      @pointercancel="stopResize"
      @keydown="handleResizeKeydown"
    ><span /></div>
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
      <div v-if="recoveryDraft" class="composer-recovery" role="status">
        <div>
          <strong>发现未保存的本机草稿</strong>
          <span>暂存于 {{ formatRevisionDate(recoveryDraft.savedAt) }}，不会自动覆盖当前内容。</span>
        </div>
        <button class="btn btn-primary" type="button" @click="restoreLocalDraft">恢复</button>
        <button class="btn" type="button" @click="discardLocalDraft">丢弃</button>
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
                <span>设置浏览量 <small>当前 {{ props.topic?.viewCount ?? 0 }}，留空不修改</small></span>
                <input v-model="form.viewCount" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="16" placeholder="填写非负整数，后续访问继续累加">
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

        <div class="composer-format-bar" role="toolbar" aria-label="Markdown 工具栏">
          <span class="composer-format-bar__label" aria-hidden="true">格式</span>
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
          <span class="composer-format-bar__separator" aria-hidden="true" />
          <input
            ref="imageInput"
            class="composer-image-input"
            type="file"
            :accept="IMAGE_ACCEPT"
            multiple
            tabindex="-1"
            @change="handleImageSelection"
          >
          <button
            class="toolbar__button"
            type="button"
            aria-label="上传图片"
            title="上传图片（也可以直接粘贴或拖入）"
            :disabled="uploadingImages > 0"
            @click="chooseImages"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Zm2 12.5h12v-2.4l-3.1-3.1-2.4 2.4-4-4L6 13.4V18Zm9.5-8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
            </svg>
          </button>
        </div>

        <section class="d-editor-textarea-column">
          <label class="sr-only" for="composer-editor">正文 · Markdown</label>
          <div
            class="d-editor-textarea-wrapper"
            :class="{ 'is-image-dragging': imageDragActive }"
            @dragover="handleImageDragOver"
            @dragleave="handleImageDragLeave"
            @drop="handleImageDrop"
          >
            <textarea
              id="composer-editor"
              ref="textarea"
              v-model="form.contentMarkdown"
              class="d-editor-input"
              required
              placeholder="在这里编写帖子内容…"
              @input="schedulePreview"
              @scroll="syncPreviewScroll"
              @keydown="handleEditorShortcut"
              @paste="handleImagePaste"
            />
            <div v-if="imageDragActive" class="image-drop-message">松开即可上传图片</div>
          </div>
        </section>

        <section ref="previewPane" class="d-editor-preview-wrapper">
          <MarkdownContent v-if="previewHtml" class="d-editor-preview" :html="previewHtml" />
          <div v-else class="preview-empty">输入正文后，这里会显示安全预览。</div>
        </section>
      </div>

      <aside v-if="revisionsOpen" class="composer-revisions" aria-label="帖子历史版本">
        <header>
          <div><strong>历史版本</strong><span>恢复前会保留当前版本</span></div>
          <button type="button" aria-label="关闭历史版本" @click="revisionsOpen = false">×</button>
        </header>
        <div v-if="revisionsLoading" class="composer-revisions__empty">正在加载…</div>
        <div v-else-if="revisionsError" class="composer-revisions__empty" role="alert">{{ revisionsError }}</div>
        <div v-else-if="!revisions.length" class="composer-revisions__empty">还没有历史版本。第一次修改并保存后会自动出现。</div>
        <ol v-else class="composer-revisions__list">
          <li v-for="revision in revisions" :key="revision.id">
            <div class="composer-revisions__meta">
              <strong>{{ revision.title }}</strong>
              <span>{{ formatRevisionDate(revision.createdAt) }} · {{ revision.status === 'published' ? '已发布' : '草稿' }}</span>
            </div>
            <p>{{ revisionSummary(revision) }}</p>
            <div class="composer-revisions__tags">
              <span>{{ revision.categorySlug }}</span>
              <span v-for="tag in revision.tags" :key="tag">#{{ tag }}</span>
            </div>
            <button
              class="btn"
              type="button"
              :disabled="restoringRevisionId !== null"
              @click="restoreRevision(revision)"
            >{{ restoringRevisionId === revision.id ? '正在恢复…' : '恢复此版本' }}</button>
          </li>
        </ol>
      </aside>

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

        <div class="submit-panel">
          <span class="draft-status" aria-live="polite">{{ draftStatus }}</span>
          <button v-if="topic" class="btn" type="button" :disabled="busy" @click="openRevisions">
            历史版本
          </button>
          <button class="btn" type="button" :disabled="busy || uploadingImages > 0 || !categories.length" @click="save('draft')">
            保存草稿
          </button>
          <button class="btn btn-primary create" type="submit" :disabled="busy || uploadingImages > 0 || !categories.length" title="Ctrl+Enter">
            {{ topic?.status === 'published' ? '保存修改' : '发布帖子' }}
          </button>
        </div>
      </footer>
    </div>
  </form>
</template>
