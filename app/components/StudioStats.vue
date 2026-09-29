<script setup lang="ts">
defineProps<{ items: Array<{ label: string, value: string | number, detail: string }> }>()
</script>

<template>
  <div class="admin-stats" aria-label="数据概览">
    <article v-for="(item, index) in items" :key="item.label" class="admin-stat">
      <div class="admin-stat-label"><span>{{ item.label }}</span><slot name="icon" :index="index" /></div>
      <strong>{{ typeof item.value === 'number' ? item.value.toLocaleString('zh-CN') : item.value }}</strong>
      <p>{{ item.detail }}</p>
    </article>
  </div>
</template>
