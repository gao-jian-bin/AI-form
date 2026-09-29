<script setup lang="ts">
import { Plus, Search, Pencil, Trash2, Tags, Link2, CircleDashed, RefreshCw, Hash } from '@lucide/vue'
import type { ForumTag } from '~/types/forum'
import { getErrorMessage } from '~/utils/error-message'

definePageMeta({ layout: 'studio', middleware: 'admin' })
useSeoMeta({ title: '标签管理 · 内容工作台', robots: 'noindex, nofollow' })
const query = ref('')
const filter = ref('all')
const errorMessage = ref('')
const deleting = ref<number | null>(null)
const { data: tags, refresh, status, error } = await useFetch<ForumTag[]>('/api/studio/tags', { default: () => [] })
const loadError = computed(() => error.value ? getErrorMessage(error.value, '标签加载失败，请重试') : '')
const visibleTags = computed(() => tags.value.filter(item => `${item.name} ${item.slug}`.toLowerCase().includes(query.value.trim().toLowerCase()) && (filter.value === 'all' || (filter.value === 'used' ? item.topicCount > 0 : item.topicCount === 0))))
const { page, pageSize, pagedItems } = useStudioPagination(visibleTags)
watch([query, filter], () => { page.value = 1 })
const summaryItems = computed(() => [
  { label: '全部标签', value: tags.value.length, detail: '连接不同主题的关键词' },
  { label: '使用中', value: tags.value.filter(item => item.topicCount > 0).length, detail: '已关联至少一篇帖子' },
  { label: '未使用', value: tags.value.filter(item => item.topicCount === 0).length, detail: '可在编辑器中随时选择' },
])
const statIcons = [Tags, Link2, CircleDashed]
async function removeTag(tag: ForumTag) {
  const impact = tag.topicCount ? `它会从 ${tag.topicCount} 篇帖子中移除，但不会删除帖子。` : '这个标签还没有被帖子使用。'
  if (deleting.value !== null || !confirm(`确定删除“${tag.name}”吗？${impact}`)) return
  errorMessage.value = ''
  deleting.value = tag.id
  try { await $fetch(`/api/studio/tags/${tag.id}`, { method: 'DELETE' }); await refresh() }
  catch (error) { errorMessage.value = getErrorMessage(error, '删除失败，请稍后重试') }
  finally { deleting.value = null }
}
</script>

<template>
  <section class="studio-dashboard">
    <StudioPageHeader title="标签管理" description="用关键词串联内容，让每一条知识都更容易被发现。" eyebrow="TAGS"><NuxtLink to="/admin/tags/new" class="button button-primary"><Plus :size="17" />新建标签</NuxtLink></StudioPageHeader>
    <StudioStats :items="summaryItems"><template #icon="{ index }"><component :is="statIcons[index]" :size="17" /></template></StudioStats>
    <p v-if="errorMessage || loadError" class="form-alert" role="alert">{{ errorMessage || loadError }} <button v-if="loadError" type="button" @click="refresh()">重新加载</button></p>
    <div class="studio-toolbar">
      <div class="filter-tabs" aria-label="标签使用状态"><button v-for="item in [{ value: 'all', label: '全部' }, { value: 'used', label: '使用中' }, { value: 'unused', label: '未使用' }]" :key="item.value" type="button" :aria-pressed="filter === item.value" :class="{ 'is-active': filter === item.value }" @click="filter = item.value">{{ item.label }}</button></div>
      <div class="studio-toolbar__controls"><label class="admin-search-field"><Search :size="16" /><input v-model="query" type="search" placeholder="搜索标签" aria-label="搜索标签"></label><button class="button button-quiet" type="button" :disabled="status === 'pending'" @click="refresh()"><RefreshCw :size="15" />刷新</button></div>
    </div>
    <div class="studio-table-wrap" :aria-busy="status === 'pending'">
      <table class="studio-table tag-table"><thead><tr><th>标签名称</th><th>关联帖子</th><th>使用状态</th><th>操作</th></tr></thead>
        <tbody><tr v-for="tag in pagedItems" :key="tag.id">
          <td><div class="admin-category-name"><span class="admin-tag-icon"><Hash :size="18" /></span><div><strong>#{{ tag.name }}</strong><small>内部标识：{{ tag.slug }}</small></div></div></td>
          <td class="admin-numeric">{{ tag.topicCount }} 篇</td><td><span class="status-chip" :class="tag.topicCount ? 'status-published' : 'status-draft'"><span class="status-dot" />{{ tag.topicCount ? '使用中' : '未使用' }}</span></td>
          <td class="row-actions"><NuxtLink :to="`/admin/tags/${tag.id}/edit`"><Pencil :size="14" />编辑</NuxtLink><button type="button" :disabled="deleting !== null" @click="removeTag(tag)"><Trash2 :size="14" />删除</button></td>
        </tr></tbody>
      </table>
      <StudioEmpty v-if="!visibleTags.length && !loadError" :title="status === 'pending' ? '正在加载标签…' : '没有匹配的标签'" description="调整筛选条件，或为内容添加一个新的关键词。" />
    </div>
    <StudioPagination v-model:page="page" :total="visibleTags.length" :page-size="pageSize" label="标签分页" />
    <p class="admin-hint">标签改名会同步更新关联帖子；删除标签只解除关联，不会删除帖子。</p>
  </section>
</template>
