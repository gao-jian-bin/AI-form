<script setup lang="ts">
import type { StudioTopic } from '~/types/forum'

definePageMeta({ layout: 'studio', middleware: 'admin' })
const route = useRoute()
const { data: topic, error } = await useFetch<StudioTopic>(() => `/api/studio/topics/${route.params.id}`)
if (error.value || !topic.value) throw createError({ statusCode: 404, statusMessage: '主题不存在' })
useSeoMeta({ title: () => `编辑：${topic.value?.title || '主题'}`, robots: 'noindex, nofollow' })
</script>

<template><TopicEditor :topic="topic" /></template>
