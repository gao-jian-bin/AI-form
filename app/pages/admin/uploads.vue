<script setup lang="ts">
import type { UploadInventory, UploadInventoryItem } from '~/types/forum'
import { getErrorMessage } from '~/utils/error-message'

definePageMeta({ layout: 'studio', middleware: 'admin' })
useSeoMeta({ title: '图片管理', robots: 'noindex, nofollow' })

const actionError = ref('')
const actionMessage = ref('')
const deletingPaths = ref(new Set<string>())
const { data: inventory, status, error, refresh } = await useFetch<UploadInventory>('/api/studio/uploads', {
  default: () => ({ items: [], usedBytes: 0, quotaBytes: 1, cleanupGraceHours: 168 }),
})

const cleanupCandidates = computed(() => inventory.value.items.filter(item => item.cleanupEligible))
const usagePercent = computed(() => Math.min(100, inventory.value.usedBytes / Math.max(1, inventory.value.quotaBytes) * 100))
const loadErrorMessage = computed(() => error.value ? getErrorMessage(error.value, '图片列表加载失败') : '')

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
  try {
    await navigator.clipboard.writeText(`![图片](${item.url})`)
    actionMessage.value = 'Markdown 图片语法已复制'
  }
  catch {
    actionError.value = '浏览器不允许复制，请直接复制图片地址'
  }
}

async function deleteImage(item: UploadInventoryItem, ask = true): Promise<boolean> {
  if (!item.cleanupEligible) return false
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
  if (!cleanupCandidates.value.length) return
  if (!confirm(`确定删除 ${cleanupCandidates.value.length} 张未使用图片吗？此操作无法恢复。`)) return
  let removed = 0
  for (const item of [...cleanupCandidates.value]) {
    if (await deleteImage(item, false)) removed += 1
  }
  await refresh()
  if (removed) actionMessage.value = `已删除 ${removed} 张未使用图片`
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
    <header class="dashboard-heading">
      <div>
        <p class="stream-eyebrow">MEDIA DESK</p>
        <h1>图片管理</h1>
        <p>帖子和历史版本引用的图片不能误删；新上传图片还会保护 {{ inventory.cleanupGraceHours }} 小时，避免本机草稿丢图。</p>
      </div>
      <div class="dashboard-actions">
        <button class="button button-quiet" type="button" :disabled="!cleanupCandidates.length" @click="deleteAllUnused">
          清理未使用图片（{{ cleanupCandidates.length }}）
        </button>
      </div>
    </header>

    <div class="media-usage" aria-label="图片存储空间">
      <div><strong>{{ formatBytes(inventory.usedBytes) }}</strong><span>/ {{ formatBytes(inventory.quotaBytes) }}</span></div>
      <div class="media-usage__track"><span :style="{ width: `${usagePercent}%` }" /></div>
    </div>

    <p v-if="actionError || loadErrorMessage" class="form-alert" role="alert">{{ actionError || loadErrorMessage }}</p>
    <p v-else-if="actionMessage" class="form-alert form-alert-success" role="status">{{ actionMessage }}</p>

    <div v-if="status === 'pending'" class="state-panel">正在读取图片…</div>
    <div v-else-if="inventory.items.length" class="media-grid">
      <article v-for="item in inventory.items" :key="item.path" class="media-card">
        <a :href="item.url" target="_blank" rel="noopener noreferrer" class="media-card__preview">
          <img :src="item.url" alt="" loading="lazy">
        </a>
        <div class="media-card__body">
          <div class="media-card__state" :class="{ used: item.referenced }">
            {{ item.referenced ? '帖子或历史版本正在使用' : item.cleanupEligible ? '未使用，可清理' : '本机草稿暂存保护中' }}
          </div>
          <code>{{ item.path }}</code>
          <p>{{ formatBytes(item.size) }} · {{ formatDate(item.modifiedAt) }}</p>
          <div class="media-card__actions">
            <button type="button" @click="copyMarkdown(item)">复制 Markdown</button>
            <button
              type="button"
              class="danger"
              :disabled="!item.cleanupEligible || deletingPaths.has(item.path)"
              @click="removeAndRefresh(item)"
            >{{ deletingPaths.has(item.path) ? '删除中…' : '删除' }}</button>
          </div>
        </div>
      </article>
    </div>
    <div v-else class="state-panel">
      <strong>还没有上传图片</strong><p>在帖子编辑器中粘贴、拖入或点击图片按钮后，这里会显示文件。</p>
    </div>
  </section>
</template>
