<script setup lang="ts">
import { ref } from 'vue'
import type { ForumTag } from '~/types/forum'

defineProps<{
  tags: ForumTag[]
  activeTag?: string
}>()

const emit = defineEmits<{ navigate: [] }>()

const expanded = ref(false)
</script>

<template>
  <section v-if="tags.length" class="sidebar-section sidebar-tag-section">
    <button class="sidebar-section-header sidebar-section-toggle" type="button" :aria-expanded="expanded" @click="expanded = !expanded">
      <span>标签</span>
      <svg viewBox="0 0 24 24" aria-hidden="true" :class="{ 'is-expanded': expanded }"><path d="m8 10 4 4 4-4" /></svg>
    </button>
    <ul v-if="expanded" class="sidebar-section-content" data-tag-list>
      <li v-for="tag in tags" :key="tag.id" class="sidebar-section-link-wrapper">
        <NuxtLink
          :to="`/tag/${encodeURIComponent(tag.name)}`"
          class="sidebar-section-link"
          :class="{ active: activeTag?.toLocaleLowerCase() === tag.name.toLocaleLowerCase() }"
          @click="emit('navigate')"
        >
          <span class="sidebar-tag-prefix">#</span>
          <span class="sidebar-section-link-content-text">{{ tag.name }}</span>
          <span class="sidebar-section-link-content-badge">{{ tag.topicCount }}</span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
