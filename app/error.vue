<script setup lang="ts">
defineProps<{ error: { statusCode?: number; statusMessage?: string } }>()

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="error-page">
    <span class="brand-mark">AI</span>
    <p>{{ error.statusCode || 500 }}</p>
    <h1>{{ error.statusCode === 404 ? '这个页面不存在' : '页面暂时无法打开' }}</h1>
    <p>{{ error.statusMessage || '请稍后再试。' }}</p>
    <button class="button button-primary" type="button" @click="goHome">返回最新主题</button>
  </div>
</template>
