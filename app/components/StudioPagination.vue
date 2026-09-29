<script setup lang="ts">
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@lucide/vue'
const props = withDefaults(defineProps<{ page: number, total: number, pageSize: number, label?: string }>(), { label: '列表分页' })
const emit = defineEmits<{ 'update:page': [page: number] }>()
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
</script>

<template>
  <nav class="admin-pagination" :aria-label="label">
    <p role="status">共 {{ total }} 条<span v-if="total">，显示 {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, total) }} 条</span></p>
    <div>
      <span>第 {{ page }} / {{ pages }} 页</span>
      <button class="admin-icon-button pagination-edge" type="button" aria-label="第一页" :disabled="page <= 1" @click="emit('update:page', 1)"><ChevronsLeft :size="16" /></button>
      <button class="admin-icon-button" type="button" aria-label="上一页" :disabled="page <= 1" @click="emit('update:page', page - 1)"><ChevronLeft :size="16" /></button>
      <button class="admin-icon-button" type="button" aria-label="下一页" :disabled="page >= pages" @click="emit('update:page', page + 1)"><ChevronRight :size="16" /></button>
      <button class="admin-icon-button pagination-edge" type="button" aria-label="最后一页" :disabled="page >= pages" @click="emit('update:page', pages)"><ChevronsRight :size="16" /></button>
    </div>
  </nav>
</template>
