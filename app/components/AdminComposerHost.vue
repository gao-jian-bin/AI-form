<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ForumCategory, ForumTag, StudioTopic } from '~/types/forum'
import { getErrorMessage } from '~/utils/error-message'

const { request, collapsed, close, toggleCollapsed, markSaved } = useAdminComposer()
const router = useRouter()
const categories = ref<ForumCategory[]>([])
const knownTags = ref<ForumTag[]>([])
const topic = ref<StudioTopic | null>(null)
const loading = ref(false)
const loadError = ref('')
const tagLoadError = ref(false)
const dirty = ref(false)
let removeNavigationGuard: (() => void) | undefined

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
  }
  catch (error: unknown) {
    loadError.value = getErrorMessage(error, '编辑器加载失败')
  }
  finally {
    loading.value = false
  }
}, { immediate: true })

function requestClose() {
  if (dirty.value && !window.confirm('有尚未保存的修改，确定关闭吗？')) return
  dirty.value = false
  close()
}

function handleSaved() {
  dirty.value = false
  markSaved()
  close()
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (!request.value || !dirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

onMounted(() => {
  removeNavigationGuard = router.beforeEach(() => {
    if (!request.value || !dirty.value) return true
    if (!window.confirm('有尚未保存的修改，确定离开当前页面吗？')) return false
    dirty.value = false
    close()
    return true
  })
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  removeNavigationGuard?.()
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

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
  </section>
</template>
