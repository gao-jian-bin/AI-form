<script setup lang="ts">
import { watch } from 'vue'
import type { ForumCategory, ForumTag } from '~/types/forum'

defineProps<{
  categories: ForumCategory[]
  tags?: ForumTag[]
  activeCategory?: string
  activeTag?: string
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
          <h2 class="sidebar-section-header">帖子</h2>
          <ul class="sidebar-section-content">
            <li class="sidebar-section-link-wrapper">
              <NuxtLink to="/" class="sidebar-section-link" :class="{ active: route.path === '/' }" @click="sidebarOpen = false">
                <svg class="sidebar-section-link-prefix" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h16"/></svg>
                <span class="sidebar-section-link-content-text">最新帖子</span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <section class="sidebar-section">
          <h2 class="sidebar-section-header">分类</h2>
          <ul class="sidebar-section-content">
            <li v-for="category in categories" :key="category.id" class="sidebar-section-link-wrapper">
              <NuxtLink :to="`/c/${category.slug}`" class="sidebar-section-link" :class="{ active: activeCategory === category.slug }" @click="sidebarOpen = false">
                <span class="sidebar-category-bullet" :style="{ backgroundColor: category.color }" />
                <span class="sidebar-section-link-content-text">{{ category.name }}</span>
                <span class="sidebar-section-link-content-badge">{{ category.topicCount }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>

        <SidebarTagSection :tags="tags || []" :active-tag="activeTag" @navigate="sidebarOpen = false" />
      </div>
    </div>
  </aside>
</template>
