<script setup lang="ts">
import { onMounted, ref } from 'vue'

const route = useRoute()
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const isDark = ref(false)

function applyTheme(dark: boolean) {
  isDark.value = dark
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  localStorage.setItem('ai-forum-theme', dark ? 'dark' : 'light')
}

function submitSearch() {
  const value = query.value.trim()
  if (value) navigateTo({ path: '/search', query: { q: value } })
}

onMounted(() => {
  const saved = localStorage.getItem('ai-forum-theme')
  applyTheme(saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches)
})
</script>

<template>
  <header class="site-header">
    <div class="header-inner">
      <NuxtLink to="/" class="site-brand" aria-label="AI 知识轨道首页">
        <span class="brand-mark" aria-hidden="true">AI</span>
        <span class="brand-copy">
          <strong>知识轨道</strong>
          <small>AI FIELD NOTES</small>
        </span>
      </NuxtLink>

      <nav class="primary-nav" aria-label="主要导航">
        <NuxtLink to="/" exact-active-class="is-active">最新</NuxtLink>
        <NuxtLink to="/c/chatgpt" active-class="is-active">ChatGPT</NuxtLink>
        <NuxtLink to="/c/toolbox" active-class="is-active">工具箱</NuxtLink>
      </nav>

      <form class="header-search" role="search" @submit.prevent="submitSearch">
        <label class="search-icon-label" for="site-search">
          <span class="sr-only">搜索主题</span>
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" /></svg>
        </label>
        <input id="site-search" v-model="query" type="search" placeholder="搜索主题" autocomplete="off">
        <kbd>⌘ K</kbd>
      </form>

      <button class="icon-button" type="button" :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'" @click="applyTheme(!isDark)">
        <svg v-if="isDark" aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>
        <svg v-else aria-hidden="true" viewBox="0 0 24 24"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/></svg>
      </button>
    </div>
  </header>
</template>
