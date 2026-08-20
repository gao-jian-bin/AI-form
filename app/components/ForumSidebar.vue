<script setup lang="ts">
import type { ForumCategory } from '~/types/forum'

defineProps<{
  categories: ForumCategory[]
  activeCategory?: string
}>()
</script>

<template>
  <aside class="forum-sidebar" aria-label="内容板块">
    <div class="sidebar-sticky">
      <p class="rail-label">浏览</p>
      <nav class="sidebar-nav">
        <NuxtLink to="/" :class="{ 'is-active': !activeCategory }">
          <span class="nav-symbol">⌁</span>
          <span>最新主题</span>
        </NuxtLink>
        <NuxtLink
          v-for="category in categories"
          :key="category.id"
          :to="`/c/${category.slug}`"
          :class="{ 'is-active': activeCategory === category.slug }"
        >
          <span class="category-dot" :style="{ backgroundColor: category.color }" />
          <span>{{ category.name }}</span>
          <small>{{ category.topicCount }}</small>
        </NuxtLink>
      </nav>

      <div class="sidebar-note">
        <span class="note-index">01</span>
        <p>这里不是信息瀑布，只记录值得再次找到的内容。</p>
      </div>
    </div>
  </aside>
</template>
