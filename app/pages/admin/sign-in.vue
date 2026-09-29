<script setup lang="ts">
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck, Sun, Moon, BookOpen, FolderOpen, ChartNoAxesCombined } from '@lucide/vue'
import { getErrorMessage } from '~/utils/error-message'

definePageMeta({ layout: 'studio' })
useSeoMeta({ title: '站长登录 · 内容工作台', robots: 'noindex, nofollow' })
const password = ref('')
const showPassword = ref(false)
const busy = ref(false)
const errorMessage = ref('')
const { isDark, ready, toggleTheme } = useStudioTheme()
async function signIn() {
  if (busy.value) return
  busy.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { password: password.value } })
    await navigateTo('/admin')
  } catch (error: unknown) { errorMessage.value = getErrorMessage(error, '无法登录，请稍后再试') }
  finally { busy.value = false }
}
</script>

<template>
  <div class="admin-login">
    <aside class="admin-login-story">
      <NuxtLink class="admin-login-brand" to="/"><img src="/fused_logo_exact.svg" alt=""><span>内容工作台</span></NuxtLink>
      <div class="admin-login-message"><span class="admin-login-pill"><span />个人知识管理空间</span><h2>把灵感写下来，<br>让知识生长。</h2><p>从一篇草稿开始，到一个有序的知识库。<br>你的内容，值得一个专注的工作空间。</p>
        <div class="admin-login-features"><span><BookOpen :size="18" />记录与发布</span><span><FolderOpen :size="18" />分类与整理</span><span><ChartNoAxesCombined :size="18" />洞察与回顾</span></div>
      </div>
      <p class="admin-login-footnote">一个安静的地方，积累有价值的内容。</p>
    </aside>
    <section class="admin-login-main">
      <div class="admin-login-top"><NuxtLink to="/"><ArrowLeft :size="16" />返回网站</NuxtLink><button class="admin-icon-button" type="button" :disabled="!ready" :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'" @click="toggleTheme"><Sun v-if="isDark" :size="19" /><Moon v-else :size="19" /></button></div>
      <form class="sign-in-panel" @submit.prevent="signIn">
        <span class="admin-login-lock"><ShieldCheck :size="24" /></span>
        <p class="stream-eyebrow">WELCOME BACK</p><h1>回到内容工作台</h1><p>输入管理员密码，继续你的创作与管理。</p>
        <label class="field field-wide" for="admin-password"><span>管理员密码</span></label>
        <div class="admin-password-field"><input id="admin-password" v-model="password" :type="showPassword ? 'text' : 'password'" required autocomplete="current-password" placeholder="请输入管理员密码" autofocus :disabled="!ready" :aria-invalid="Boolean(errorMessage)" :aria-describedby="errorMessage ? 'login-error' : undefined"><button class="admin-icon-button" type="button" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" :size="17" /><Eye v-else :size="17" /></button></div>
        <p v-if="errorMessage" id="login-error" class="form-alert" role="alert">{{ errorMessage }}</p>
        <button class="button button-primary button-block" type="submit" :disabled="busy || !ready">{{ busy ? '正在验证…' : '进入工作台' }}<ArrowRight :size="17" /></button>
        <div class="admin-login-security"><ShieldCheck :size="14" /><span>仅限管理员访问 · 安全会话验证</span></div>
      </form>
      <p class="admin-login-bottom">公开阅读，私享创作。</p>
    </section>
  </div>
</template>
