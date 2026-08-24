<script setup lang="ts">
const route = useRoute()

const isCategoryRoute = computed(() => route.path.startsWith('/studio/categories'))
</script>

<template>
  <div class="studio-shell">
    <header class="studio-header">
      <div class="studio-header__primary">
        <NuxtLink to="/studio" class="studio-brand">
          <span class="brand-mark brand-mark-small" aria-hidden="true">AI</span>
          <span>内容工作台</span>
        </NuxtLink>
        <nav class="studio-nav" aria-label="工作台导航">
          <NuxtLink to="/studio" :class="{ active: !isCategoryRoute && route.path !== '/studio/sign-in' }">帖子管理</NuxtLink>
          <NuxtLink to="/studio/categories" :class="{ active: isCategoryRoute }">板块管理</NuxtLink>
        </nav>
      </div>
      <NuxtLink to="/" class="button button-quiet">查看网站 ↗</NuxtLink>
    </header>
    <main class="studio-main">
      <slot />
    </main>
  </div>
</template>
