<script setup lang="ts">
import { ref, watch } from 'vue'
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
  }
  catch (error: any) {
    loadError.value = error?.data?.statusMessage || '编辑器加载失败'
  }
  finally {
    loading.value = false
  }
}, { immediate: true })

function requestClose() {
  dirty.value = false
  close()
}

function handleSaved() {
  dirty.value = false
  markSaved()
  close()
}
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
