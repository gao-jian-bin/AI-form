<script setup lang="ts">
definePageMeta({ layout: 'studio', middleware: 'admin' })
useSeoMeta({ title: '新建帖子', robots: 'noindex, nofollow' })

const { openNew } = useAdminComposer()

onMounted(async () => {
  openNew()
  await navigateTo('/studio', { replace: true })
})
</script>

<template>
  <p role="status">正在打开编辑器…</p>
</template>
