<script setup lang="ts">
import type { StudioCategory } from '~/types/forum'

definePageMeta({ layout: 'studio', middleware: 'admin' })
useSeoMeta({ title: '编辑板块', robots: 'noindex, nofollow' })

const route = useRoute()
const { data: category, error } = await useFetch<StudioCategory>(() => `/api/studio/categories/${route.params.id}`)
if (error.value || !category.value) {
  throw createError({ statusCode: 404, message: '板块不存在' })
}
</script>

<template>
  <CategoryEditor :category="category" />
</template>
