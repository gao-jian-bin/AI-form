<script setup lang="ts">
import { LayoutDashboard, Files, FolderOpen, Tags, Image, ChartNoAxesCombined, ArrowUpRight } from '@lucide/vue'
import { isStudioRouteActive, studioNavigation } from '~/utils/studio-navigation'

defineProps<{ collapsed?: boolean }>()
const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()
const icons = { overview: LayoutDashboard, topics: Files, categories: FolderOpen, tags: Tags, uploads: Image, analytics: ChartNoAxesCombined }
const groups = [...new Set(studioNavigation.map(item => item.group))]
</script>

<template>
  <nav class="admin-nav" aria-label="工作台导航" :class="{ 'is-collapsed': collapsed }">
    <div v-for="group in groups" :key="group" class="admin-nav-group">
      <p class="admin-nav-label">{{ group }}</p>
      <NuxtLink v-for="item in studioNavigation.filter(item => item.group === group)" :key="item.to"
        :to="item.to" :class="{ active: isStudioRouteActive(route.path, item.to) }"
        :aria-current="isStudioRouteActive(route.path, item.to) ? 'page' : undefined"
        :title="collapsed ? item.label : undefined" @click="emit('navigate')">
        <component :is="icons[item.icon]" :size="18" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </NuxtLink>
    </div>
    <div class="admin-nav-group admin-nav-site">
      <p class="admin-nav-label">站点</p>
      <NuxtLink to="/" :title="collapsed ? '查看网站' : undefined" @click="emit('navigate')">
        <ArrowUpRight :size="18" aria-hidden="true" /><span>查看网站</span>
      </NuxtLink>
    </div>
  </nav>
</template>
