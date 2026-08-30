<script setup lang="ts">
import type { ForumTag } from '~/types/forum'
import { getErrorMessage } from '~/utils/error-message'

definePageMeta({ layout: 'studio', middleware: 'admin' })
useSeoMeta({ title: '标签管理', robots: 'noindex, nofollow' })

const errorMessage = ref('')
const { data: tags, refresh } = await useFetch<ForumTag[]>('/api/studio/tags', { default: () => [] })

async function removeTag(tag: ForumTag) {
  const impact = tag.topicCount
    ? `它会从 ${tag.topicCount} 篇帖子中移除，但不会删除帖子。`
    : '这个标签还没有被帖子使用。'
  if (!confirm(`确定删除“${tag.name}”吗？${impact}`)) return
  errorMessage.value = ''
  try {
    await $fetch(`/api/studio/tags/${tag.id}`, { method: 'DELETE' })
    await refresh()
  } catch (error: unknown) {
    errorMessage.value = getErrorMessage(error, '删除失败，请稍后重试')
  }
}
</script>

<template>
  <section class="studio-dashboard">
    <header class="dashboard-heading">
      <div>
        <p class="stream-eyebrow">TAG DESK</p>
        <h1>标签管理</h1>
        <p>创建、改名或删除帖子标签。删除标签不会删除帖子。</p>
      </div>
      <div class="dashboard-actions">
        <NuxtLink to="/studio/tags/new" class="button button-primary">＋ 新建标签</NuxtLink>
      </div>
    </header>

    <p v-if="errorMessage" class="form-alert" role="alert">{{ errorMessage }}</p>

    <div class="studio-table-wrap">
      <table class="studio-table tag-table">
        <thead>
          <tr><th>标签</th><th>帖子</th><th><span class="sr-only">操作</span></th></tr>
        </thead>
        <tbody>
          <tr v-for="tag in tags" :key="tag.id">
            <td><strong>#{{ tag.name }}</strong><small>内部标识：{{ tag.slug }}</small></td>
            <td><strong class="category-topic-total">{{ tag.topicCount }}</strong></td>
            <td class="row-actions">
              <NuxtLink :to="`/studio/tags/${tag.id}/edit`">编辑</NuxtLink>
              <button type="button" @click="removeTag(tag)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!tags.length" class="state-panel">
        <strong>还没有标签</strong><p>创建第一个标签后，就能在帖子编辑器中选择。</p>
      </div>
    </div>
  </section>
</template>
