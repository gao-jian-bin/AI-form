<script setup lang="ts">
import { getErrorMessage } from '~/utils/error-message'

definePageMeta({ layout: 'studio' })
useSeoMeta({ title: '站长登录', robots: 'noindex, nofollow' })

const password = ref('')
const busy = ref(false)
const errorMessage = ref('')
const ready = ref(false)

async function signIn() {
  busy.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { password: password.value } })
    await navigateTo('/admin')
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, '无法登录，请稍后再试')
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  ready.value = true
})
</script>

<template>
  <div class="sign-in-page">
    <form class="sign-in-panel" @submit.prevent="signIn">
      <p class="stream-eyebrow">PRIVATE STUDIO</p>
      <h1>回到内容工作台</h1>
      <p>这个入口仅供站长维护主题，公共网站不会显示它。</p>
      <label class="field field-wide">
        <span>管理员密码</span>
        <input v-model="password" type="password" required autocomplete="current-password" autofocus :disabled="!ready">
      </label>
      <p v-if="errorMessage" class="form-alert" role="alert">{{ errorMessage }}</p>
      <button class="button button-primary button-block" type="submit" :disabled="busy || !ready">{{ busy ? '正在验证…' : '进入工作台' }}</button>
      <NuxtLink to="/" class="sign-in-back">← 返回公共网站</NuxtLink>
    </form>
  </div>
</template>
