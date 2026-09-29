<script setup lang="ts">
import { Inbox } from '@lucide/vue'
defineProps<{ title: string, description?: string }>()
</script>

<template>
  <div class="admin-empty" role="status">
    <span class="admin-empty-icon"><Inbox :size="24" aria-hidden="true" /></span>
    <strong>{{ title }}</strong><p v-if="description">{{ description }}</p><slot />
  </div>
</template>
