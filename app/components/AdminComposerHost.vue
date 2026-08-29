<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ForumCategory, ForumTag, StudioTopic } from '~/types/forum'

const { request, collapsed, close, toggleCollapsed } = useAdminComposer()
const categories = ref<ForumCategory[]>([])
const knownTags = ref<ForumTag[]>([])
const topic = ref<StudioTopic | null>(null)
const loading = ref(false)
const loadError = ref('')
const tagLoadError = ref(false)

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
</script>

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
        <button type="button" aria-label="关闭编辑器" @click="close">×</button>
      </div>
    </header>
    <p v-if="loading" data-composer-loading role="status">正在加载编辑器</p>
    <p v-else-if="loadError" class="form-alert" role="alert">{{ loadError }}</p>
    <p v-else data-composer-ready role="status">
      帖子数据已载入，共 {{ categories.length }} 个板块、{{ knownTags.length }} 个已知标签。
    </p>
  </section>
</template>
