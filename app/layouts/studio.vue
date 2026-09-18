<script setup lang="ts">
const route = useRoute()

const isCategoryRoute = computed(() => route.path.startsWith('/admin/categories'))
const isTagRoute = computed(() => route.path.startsWith('/admin/tags'))
const isUploadRoute = computed(() => route.path.startsWith('/admin/uploads'))
const isAnalyticsRoute = computed(() => route.path.startsWith('/admin/analytics'))
</script>

<template>
  <div class="studio-shell">
    <header class="studio-header">
      <div class="studio-header__primary">
        <NuxtLink to="/admin" class="studio-brand">
          <img class="brand-logo brand-logo-small" src="/logo.svg" alt="">
          <span>内容工作台</span>
        </NuxtLink>
        <nav class="studio-nav" aria-label="工作台导航">
          <NuxtLink to="/admin" :class="{ active: !isCategoryRoute && !isTagRoute && !isUploadRoute && !isAnalyticsRoute && route.path !== '/admin/sign-in' }">帖子管理</NuxtLink>
          <NuxtLink to="/admin/categories" :class="{ active: isCategoryRoute }">板块管理</NuxtLink>
          <NuxtLink to="/admin/tags" :class="{ active: isTagRoute }">标签管理</NuxtLink>
          <NuxtLink to="/admin/uploads" :class="{ active: isUploadRoute }">图片管理</NuxtLink>
          <NuxtLink to="/admin/analytics" :class="{ active: isAnalyticsRoute }">访问统计</NuxtLink>
        </nav>
      </div>
      <NuxtLink to="/" class="button button-quiet">查看网站 ↗</NuxtLink>
    </header>
    <main id="main-content" class="studio-main">
      <slot />
    </main>
  </div>
</template>
