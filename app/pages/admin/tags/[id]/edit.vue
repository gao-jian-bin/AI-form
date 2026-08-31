<script setup lang="ts">
import type { ForumTag } from '~/types/forum'

definePageMeta({ layout: 'studio', middleware: 'admin' })
useSeoMeta({ title: '编辑标签', robots: 'noindex, nofollow' })

const route = useRoute()
const { data: tag, error } = await useFetch<ForumTag>(() => `/api/studio/tags/${route.params.id}`)
if (error.value || !tag.value) {
  throw createError({ statusCode: 404, message: '标签不存在' })
}
</script>

<template>
  <TagEditor :tag="tag" />
</template>
