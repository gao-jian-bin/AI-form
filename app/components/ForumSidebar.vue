<script setup lang="ts">
import { watch } from 'vue'
import type { ForumCategory } from '~/types/forum'

defineProps<{
  categories: ForumCategory[]
  tags?: string[]
  activeCategory?: string
}>()

const route = useRoute()
const sidebarOpen = useState<boolean>('public-sidebar-open', () => false)
watch(() => route.fullPath, () => { sidebarOpen.value = false })
</script>

<template>
  <div v-if="sidebarOpen" class="sidebar-backdrop" aria-hidden="true" @click="sidebarOpen = false" />
  <aside class="sidebar-wrapper" :class="{ 'is-open': sidebarOpen }" aria-label="论坛导航">
    <div class="sidebar-container">
      <div class="sidebar-mobile-header">
        <strong>导航</strong>
        <button type="button" aria-label="关闭导航菜单" @click="sidebarOpen = false">×</button>
      </div>

      <div class="sidebar-sections">
        <section class="sidebar-section">
          <h2 class="sidebar-section-header">社区</h2>
          <ul class="sidebar-section-content">
            <li class="sidebar-section-link-wrapper">
              <NuxtLink to="/" class="sidebar-section-link" :class="{ active: route.path === '/' }">
                <svg class="sidebar-section-link-prefix" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h16"/></svg>
                <span class="sidebar-section-link-content-text">最新主题</span>
              </NuxtLink>
            </li>
            <li class="sidebar-section-link-wrapper">
              <NuxtLink to="/search" class="sidebar-section-link" :class="{ active: route.path === '/search' }">
                <svg class="sidebar-section-link-prefix" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
                <span class="sidebar-section-link-content-text">搜索</span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <section class="sidebar-section">
          <h2 class="sidebar-section-header">分类</h2>
          <ul class="sidebar-section-content">
            <li v-for="category in categories" :key="category.id" class="sidebar-section-link-wrapper">
              <NuxtLink :to="`/c/${category.slug}`" class="sidebar-section-link" :class="{ active: activeCategory === category.slug }">
                <span class="sidebar-category-bullet" :style="{ backgroundColor: category.color }" />
                <span class="sidebar-section-link-content-text">{{ category.name }}</span>
                <span class="sidebar-section-link-content-badge">{{ category.topicCount }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <section v-if="tags?.length" class="sidebar-section">
          <h2 class="sidebar-section-header">标签</h2>
          <ul class="sidebar-section-content">
            <li v-for="tag in tags.slice(0, 8)" :key="tag" class="sidebar-section-link-wrapper">
              <NuxtLink :to="`/tag/${encodeURIComponent(tag)}`" class="sidebar-section-link">
                <span class="sidebar-tag-prefix">#</span>
                <span class="sidebar-section-link-content-text">{{ tag }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </aside>
</template>
