<script setup lang="ts">
definePageMeta({ layout: 'studio', middleware: 'admin' })
useSeoMeta({ title: '编辑帖子', robots: 'noindex, nofollow' })

const route = useRoute()
const { openEdit } = useAdminComposer()

onMounted(async () => {
  openEdit(Number(route.params.id))
  await navigateTo('/admin', { replace: true })
})
</script>

<template>
  <p role="status">正在打开编辑器…</p>
</template>
