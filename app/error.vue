<script setup lang="ts">
import { getErrorMessage } from '~/utils/error-message'

defineProps<{ error: { statusCode?: number; message?: string; statusMessage?: string } }>()

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="error-page">
    <img class="brand-logo" src="/logo.svg" alt="AI 知识论坛">
    <p>{{ error.statusCode || 500 }}</p>
    <h1>{{ error.statusCode === 404 ? '这个页面不存在' : '页面暂时无法打开' }}</h1>
    <p>{{ getErrorMessage(error, '请稍后再试。') }}</p>
    <button class="button button-primary" type="button" @click="goHome">返回最新主题</button>
  </div>
</template>
