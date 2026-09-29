<script setup lang="ts">
import { RefreshCw, Trash2, Search, Copy, Image, ShieldCheck, CircleDashed } from '@lucide/vue'
import type { UploadInventory, UploadInventoryItem } from '~/types/forum'
import { getErrorMessage } from '~/utils/error-message'

definePageMeta({ layout: 'studio', middleware: 'admin' })
useSeoMeta({ title: '图片管理', robots: 'noindex, nofollow' })

const actionError = ref('')
const actionMessage = ref('')
const deletingPaths = ref(new Set<string>())
const cleaning = ref(false)
const query = ref('')
const filter = ref('all')
const { data: inventory, status, error, refresh } = await useFetch<UploadInventory>('/api/studio/uploads', {
  default: () => ({ items: [], usedBytes: 0, quotaBytes: 1, cleanupGraceHours: 168 }),
})

const cleanupCandidates = computed(() => inventory.value.items.filter(item => item.cleanupEligible))
const usagePercent = computed(() => Math.min(100, inventory.value.usedBytes / Math.max(1, inventory.value.quotaBytes) * 100))
const loadErrorMessage = computed(() => error.value ? getErrorMessage(error.value, '图片列表加载失败') : '')
const visibleItems = computed(() => inventory.value.items.filter(item => item.path.toLowerCase().includes(query.value.trim().toLowerCase()) && (filter.value === 'all' || (filter.value === 'used' ? item.referenced : item.cleanupEligible))))
const { page, pageSize, pagedItems } = useStudioPagination(visibleItems, 12)
watch([query, filter], () => { page.value = 1 })
const summaryItems = computed(() => [
  { label: '图片资源', value: inventory.value.items.length, detail: '知识库的全部上传图片' },
  { label: '已被引用', value: inventory.value.items.filter(item => item.referenced).length, detail: '帖子与历史版本引用保护' },
  { label: '可清理', value: cleanupCandidates.value.length, detail: '超过暂存保护期的闲置资源' },
])
const statIcons = [Image, ShieldCheck, CircleDashed]

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

async function copyMarkdown(item: UploadInventoryItem) {
  actionError.value = ''
  actionMessage.value = ''
  try {
    await navigator.clipboard.writeText(`![图片](${item.url})`)
    actionMessage.value = 'Markdown 图片语法已复制'
  }
  catch {
    actionError.value = '浏览器不允许复制，请直接复制图片地址'
  }
}

async function deleteImage(item: UploadInventoryItem, ask = true): Promise<boolean> {
  if (!item.cleanupEligible || deletingPaths.value.has(item.path)) return false
  if (ask && !confirm('确定删除这张未被任何帖子引用的图片吗？删除后无法恢复。')) return false
  actionError.value = ''
  actionMessage.value = ''
  deletingPaths.value = new Set([...deletingPaths.value, item.path])
  try {
    await $fetch(`/api/studio/uploads/${item.path}`, { method: 'DELETE' })
    return true
  }
  catch (uploadError: unknown) {
    actionError.value = getErrorMessage(uploadError, '图片删除失败')
    return false
  }
  finally {
    const next = new Set(deletingPaths.value)
    next.delete(item.path)
    deletingPaths.value = next
  }
}

async function deleteAllUnused() {
  if (!cleanupCandidates.value.length || cleaning.value || deletingPaths.value.size) return
  if (!confirm(`确定删除 ${cleanupCandidates.value.length} 张未使用图片吗？此操作无法恢复。`)) return
  cleaning.value = true
  let removed = 0
  let failed = 0
  try {
    for (const item of [...cleanupCandidates.value]) {
      if (await deleteImage(item, false)) removed += 1
      else failed += 1
    }
    await refresh()
    actionMessage.value = removed ? `已删除 ${removed} 张未使用图片` : ''
    if (failed) actionError.value = `${failed} 张图片未能删除，请刷新后重试。`
  } finally {
    cleaning.value = false
  }
}

async function removeAndRefresh(item: UploadInventoryItem) {
  if (await deleteImage(item)) {
    await refresh()
    actionMessage.value = '图片已删除'
  }
}
</script>

<template>
  <section class="studio-dashboard media-dashboard">
    <StudioPageHeader title="图片管理" description="管理内容中的视觉资源，查看引用情况，安全释放存储空间。" eyebrow="MEDIA LIBRARY">
      <button class="button button-quiet" type="button" :disabled="status === 'pending' || cleaning" @click="refresh()"><RefreshCw :size="16" />刷新</button>
      <button class="button button-quiet" type="button" :disabled="!cleanupCandidates.length || cleaning || deletingPaths.size > 0" @click="deleteAllUnused"><Trash2 :size="16" />{{ cleaning ? '清理中…' : `清理未使用图片（${cleanupCandidates.length}）` }}</button>
    </StudioPageHeader>
    <StudioStats :items="summaryItems"><template #icon="{ index }"><component :is="statIcons[index]" :size="17" /></template></StudioStats>

    <div class="media-usage" aria-label="图片存储空间">
      <div><span>已用空间</span><strong>{{ formatBytes(inventory.usedBytes) }}</strong><span>/ {{ formatBytes(inventory.quotaBytes) }} · {{ usagePercent.toFixed(1) }}%</span></div>
      <div class="media-usage__track" role="progressbar" aria-label="图片空间使用率" :aria-valuenow="Math.round(usagePercent)" :aria-valuemin="0" :aria-valuemax="100"><span :style="{ width: `${usagePercent}%` }" /></div>
    </div>

    <p v-if="actionError || loadErrorMessage" class="form-alert" role="alert">{{ actionError || loadErrorMessage }}</p>
    <p v-if="actionMessage" class="form-alert form-alert-success" role="status">{{ actionMessage }}</p>

    <div class="studio-toolbar">
      <div class="filter-tabs" aria-label="图片引用筛选"><button v-for="item in [{ value: 'all', label: '全部图片' }, { value: 'used', label: '使用中' }, { value: 'unused', label: '可清理' }]" :key="item.value" type="button" :aria-pressed="filter === item.value" :class="{ 'is-active': filter === item.value }" @click="filter = item.value">{{ item.label }}</button></div>
      <label class="admin-search-field"><Search :size="16" /><input v-model="query" type="search" placeholder="搜索图片路径" aria-label="搜索图片路径"></label>
    </div>

    <div v-if="status === 'pending'" class="state-panel">正在读取图片…</div>
    <div v-else-if="visibleItems.length" class="media-grid">
      <article v-for="item in pagedItems" :key="item.path" class="media-card">
        <a :href="item.url" target="_blank" rel="noopener noreferrer" class="media-card__preview">
          <img :src="item.url" :alt="`查看图片 ${item.path}`" loading="lazy">
        </a>
        <div class="media-card__body">
          <div class="media-card__state" :class="{ used: item.referenced }">
            {{ item.referenced ? '帖子或历史版本正在使用' : item.cleanupEligible ? '未使用，可清理' : '本机草稿暂存保护中' }}
          </div>
          <code>{{ item.path }}</code>
          <p>{{ formatBytes(item.size) }} · {{ formatDate(item.modifiedAt) }}</p>
          <div class="media-card__actions">
            <button type="button" @click="copyMarkdown(item)"><Copy :size="14" />复制 Markdown</button>
            <button
              type="button"
              class="danger"
              :disabled="!item.cleanupEligible || cleaning || deletingPaths.has(item.path)"
              @click="removeAndRefresh(item)"
            ><Trash2 :size="14" />{{ deletingPaths.has(item.path) ? '删除中…' : '删除' }}</button>
          </div>
        </div>
      </article>
    </div>
    <StudioEmpty v-else :title="inventory.items.length ? '没有匹配的图片' : '还没有上传图片'" description="在帖子编辑器中粘贴、拖入或点击图片按钮即可上传。" />
    <StudioPagination v-model:page="page" :total="visibleItems.length" :page-size="pageSize" label="图片分页" />
    <p class="admin-hint">帖子和历史版本引用的图片不可删除。新上传图片有 {{ inventory.cleanupGraceHours }} 小时保护期，避免尚未发布的本机草稿丢失图片。</p>
  </section>
</template>
