<script setup lang="ts">
import type { TopicDetail } from '~/types/forum'
import { pageErrorDetails } from '~/utils/error-message'

definePageMeta({
  validate: route => /^[1-9]\d*$/.test(String(route.params.id)) && Number.isSafeInteger(Number(route.params.id)),
})

const route = useRoute()
const { data: topic, error } = await useFetch<TopicDetail>(`/api/topics/${route.params.id}`)
if (error.value) throw createError(pageErrorDetails(error.value, '主题不存在'))
if (!topic.value) throw createError({ statusCode: 404, message: '主题不存在' })

await navigateTo({ path: `/t/${topic.value.id}`, query: route.query, hash: route.hash }, { redirectCode: 301, replace: true })
</script>

<template>
  <div />
</template>
