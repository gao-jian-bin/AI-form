<script setup lang="ts">
import { onMounted, ref } from 'vue'

const route = useRoute()
const sidebarOpen = useState<boolean>('public-sidebar-open', () => false)
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const searchOpen = ref(false)
const isDark = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const ready = ref(false)

function applyTheme(dark: boolean) {
  isDark.value = dark
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  localStorage.setItem('ai-forum-theme', dark ? 'dark' : 'light')
}

async function toggleSearch() {
  if (window.matchMedia('(max-width: 700px)').matches) {
    await navigateTo('/search')
    return
  }
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) requestAnimationFrame(() => searchInput.value?.focus())
}

async function submitSearch() {
  const value = query.value.trim()
  if (!value) return
  searchOpen.value = false
  await navigateTo({ path: '/search', query: { q: value } })
}

onMounted(() => {
  const saved = localStorage.getItem('ai-forum-theme')
  applyTheme(saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches)
  ready.value = true
})
</script>

<template>
  <div class="d-header-wrap">
    <header class="d-header">
      <div class="wrap">
        <div class="contents">
          <button
            class="header-icon-button header-sidebar-toggle"
            type="button"
            aria-label="打开导航菜单"
            :aria-expanded="sidebarOpen"
            :disabled="!ready"
            @click="sidebarOpen = !sidebarOpen"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          <div class="title">
            <NuxtLink id="site-logo" to="/" aria-label="首页">
              <img class="site-logo-image" src="/fused_logo_exact.svg" alt="">
            </NuxtLink>
          </div>

          <div class="panel">
            <button
              id="search-button"
              class="header-icon-button"
              type="button"
              aria-label="搜索"
              :aria-expanded="searchOpen"
              :disabled="!ready"
              @click="toggleSearch"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
            </button>
            <button class="header-icon-button" type="button" :disabled="!ready" :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'" @click="applyTheme(!isDark)">
              <svg v-if="isDark" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>
              <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/></svg>
            </button>

            <form v-if="searchOpen" class="search-menu-panel" role="search" @submit.prevent="submitSearch">
              <label class="sr-only" for="header-search-input">搜索主题</label>
              <input id="header-search-input" ref="searchInput" v-model="query" type="search" placeholder="搜索主题和内容" autocomplete="off" @keydown.esc="searchOpen = false">
              <button class="btn btn-primary" type="submit">搜索</button>
            </form>
          </div>
        </div>
      </div>
    </header>
  </div>
</template>
