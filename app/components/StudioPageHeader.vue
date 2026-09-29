<script setup lang="ts">
defineProps<{ title: string, description: string, eyebrow?: string }>()
</script>

<template>
  <header class="dashboard-heading">
    <div>
      <p v-if="eyebrow" class="stream-eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <div v-if="$slots.default" class="dashboard-actions"><slot /></div>
  </header>
</template>
