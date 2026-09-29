<script setup lang="ts">
import { PanelLeft, Search, Sun, Moon, ChevronRight, LogOut, X, ArrowUpRight, Command } from '@lucide/vue'
import { DialogRoot, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose } from 'reka-ui'
import { studioNavigation, isStudioRouteActive } from '~/utils/studio-navigation'
import { getErrorMessage } from '~/utils/error-message'

const route = useRoute()
const { isDark, ready, toggleTheme } = useStudioTheme()
const collapsed = ref(false)
const mobileOpen = ref(false)
const mobileViewport = ref(false)
let mediaQuery: MediaQueryList | undefined
function syncViewport() {
  mobileViewport.value = mediaQuery?.matches ?? false
  if (!mobileViewport.value) mobileOpen.value = false
}
const searchOpen = ref(false)
const sidebarTrigger = ref<HTMLButtonElement | null>(null)
const searchTrigger = ref<HTMLButtonElement | null>(null)
const query = ref('')
const signingOut = ref(false)
const signOutError = ref('')
const composer = useAdminComposer()
const current = computed(() => studioNavigation.find(item => isStudioRouteActive(route.path, item.to)))
const isSignIn = computed(() => route.path === '/admin/sign-in')
const searchItems = computed(() => studioNavigation.filter(item => `${item.label} ${item.description}`.includes(query.value.trim())))

useHead({ bodyAttrs: { 'data-studio': 'true' } })

function toggleSidebar() {
  if (window.matchMedia('(max-width: 900px)').matches) mobileOpen.value = !mobileOpen.value
  else {
    collapsed.value = !collapsed.value
    try { localStorage.setItem('ai-forum-sidebar-collapsed', String(collapsed.value)) } catch { /* Optional preference. */ }
  }
}

function handleShortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !isSignIn.value) {
    event.preventDefault()
    searchOpen.value = !searchOpen.value
  }
}

async function searchTopics() {
  searchOpen.value = false
  await navigateTo({ path: '/admin', query: query.value.trim() ? { q: query.value.trim() } : {} })
}

async function signOut() {
  if (signingOut.value) return
  if (composer.request.value && composer.dirty.value && !confirm('有尚未保存的修改，确定退出登录吗？')) return
  signingOut.value = true
  signOutError.value = ''
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    composer.close()
    await navigateTo('/admin/sign-in')
  } catch (error) { signOutError.value = getErrorMessage(error, '退出失败，请重试') }
  finally { signingOut.value = false }
}

watch(() => route.fullPath, () => { mobileOpen.value = false; searchOpen.value = false })
watch(searchOpen, open => { if (open) query.value = '' })
onMounted(() => {
  try { collapsed.value = localStorage.getItem('ai-forum-sidebar-collapsed') === 'true' } catch { /* Optional preference. */ }
  window.addEventListener('keydown', handleShortcut)
  mediaQuery = window.matchMedia('(max-width: 900px)')
  syncViewport()
  mediaQuery.addEventListener('change', syncViewport)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleShortcut)
  mediaQuery?.removeEventListener('change', syncViewport)
})
</script>

<template>
  <div class="studio-shell" :class="{ 'sidebar-collapsed': collapsed, 'studio-auth': isSignIn }">
    <template v-if="!isSignIn">
      <aside class="admin-sidebar">
        <NuxtLink class="admin-brand" to="/admin/overview" aria-label="内容工作台首页">
          <span class="admin-brand-logo"><img src="/fused_logo_exact.svg" alt=""></span>
          <span class="admin-brand-copy"><strong>内容工作台</strong><small>个人知识管理</small></span>
        </NuxtLink>
        <StudioNavigation :collapsed="collapsed" />
        <div class="admin-sidebar-footer">
          <span class="admin-avatar">E</span><span class="admin-user"><strong>站长</strong><small>管理员工作空间</small></span>
          <button class="admin-icon-button" type="button" aria-label="退出登录" title="退出登录" :disabled="signingOut" @click="signOut"><LogOut :size="17" /></button>
        </div>
      </aside>

      <div class="admin-workspace">
        <header class="admin-topbar">
          <button ref="sidebarTrigger" class="admin-icon-button" type="button" aria-label="切换侧边栏" :aria-expanded="mobileViewport ? mobileOpen : !collapsed" :disabled="!ready" @click="toggleSidebar"><PanelLeft :size="19" /></button>
          <div class="admin-breadcrumb"><span>工作空间</span><ChevronRight :size="14" /><strong>{{ current?.label || '内容管理' }}</strong></div>
          <div class="admin-topbar-actions">
            <button ref="searchTrigger" class="admin-search-trigger" type="button" aria-label="搜索后台" :disabled="!ready" @click="searchOpen = true"><Search :size="16" /><span>搜索或快速跳转…</span><kbd>Ctrl K</kbd></button>
            <button class="admin-icon-button" type="button" :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'" :disabled="!ready" @click="toggleTheme"><Sun v-if="isDark" :size="19" /><Moon v-else :size="19" /></button>
            <NuxtLink to="/" class="admin-topbar-site" title="查看网站"><ArrowUpRight :size="17" /><span>查看网站</span></NuxtLink>
          </div>
        </header>
        <main id="main-content" class="studio-main">
          <p v-if="signOutError" class="form-alert" role="alert">{{ signOutError }}</p>
          <slot />
        </main>
        <footer class="admin-footer"><span>内容工作台</span><span>专注内容，持续积累。</span></footer>
      </div>

      <DialogRoot v-model:open="mobileOpen">
        <DialogPortal>
          <DialogOverlay class="admin-dialog-overlay" />
          <DialogContent class="admin-mobile-sidebar" @close-auto-focus="event => { event.preventDefault(); sidebarTrigger?.focus() }">
            <DialogTitle class="admin-mobile-title">内容工作台</DialogTitle>
            <DialogDescription class="sr-only">选择工作台页面</DialogDescription>
            <DialogClose class="admin-icon-button admin-dialog-close" aria-label="关闭导航"><X :size="20" /></DialogClose>
            <StudioNavigation @navigate="mobileOpen = false" />
            <button class="button button-quiet" type="button" :disabled="signingOut" @click="signOut"><LogOut :size="16" />退出登录</button>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>

      <DialogRoot v-model:open="searchOpen">
        <DialogPortal>
          <DialogOverlay class="admin-dialog-overlay" />
          <DialogContent class="admin-command" @close-auto-focus="event => { event.preventDefault(); searchTrigger?.focus() }">
            <DialogTitle class="sr-only">搜索后台</DialogTitle>
            <DialogDescription class="sr-only">搜索管理页面，或按回车搜索帖子标题。</DialogDescription>
            <form class="admin-command-input" @submit.prevent="searchTopics"><Search :size="20" /><input v-model="query" aria-label="搜索页面或帖子" placeholder="搜索管理页面或帖子标题…" autocomplete="off"><DialogClose class="admin-icon-button" aria-label="关闭搜索"><X :size="18" /></DialogClose></form>
            <p class="admin-command-label">快速跳转</p>
            <NuxtLink v-for="item in searchItems" :key="item.to" :to="item.to" class="admin-command-item" @click="searchOpen = false"><Command :size="17" /><span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span><ChevronRight :size="15" /></NuxtLink>
            <button class="admin-command-item admin-command-search" type="button" @click="searchTopics"><Search :size="17" /><span>{{ query.trim() ? `搜索帖子「${query.trim()}」` : '浏览所有帖子' }}</span><kbd>Enter</kbd></button>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
    </template>
    <main v-else id="main-content"><slot /></main>
  </div>
</template>
