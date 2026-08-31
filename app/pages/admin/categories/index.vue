<script setup lang="ts">
import type { StudioCategory } from '~/types/forum'
import { getErrorMessage } from '~/utils/error-message'

definePageMeta({ layout: 'studio', middleware: 'admin' })
useSeoMeta({ title: '板块管理', robots: 'noindex, nofollow' })

const errorMessage = ref('')
const { data: categories, refresh } = await useFetch<StudioCategory[]>('/api/studio/categories', { default: () => [] })

async function removeCategory(category: StudioCategory) {
  if (!confirm(`确定删除“${category.name}”吗？`)) return
  errorMessage.value = ''
  try {
    await $fetch(`/api/studio/categories/${category.id}`, { method: 'DELETE' })
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
        <p class="stream-eyebrow">CATEGORY DESK</p>
        <h1>板块管理</h1>
        <p>管理左侧分类导航。板块中还有帖子时，需要先移动帖子才能删除。</p>
      </div>
      <div class="dashboard-actions">
        <NuxtLink to="/admin/categories/new" class="button button-primary">＋ 新建板块</NuxtLink>
      </div>
    </header>

    <p v-if="errorMessage" class="form-alert" role="alert">{{ errorMessage }}</p>

    <div class="studio-table-wrap">
      <table class="studio-table category-table">
        <thead>
          <tr><th>板块</th><th>网址标识</th><th>颜色</th><th>排序</th><th>帖子</th><th><span class="sr-only">操作</span></th></tr>
        </thead>
        <tbody>
          <tr v-for="category in categories" :key="category.id">
            <td><strong>{{ category.name }}</strong><small>{{ category.description || '暂无说明' }}</small></td>
            <td><code>{{ category.slug }}</code></td>
            <td><span class="category-chip" :style="{ '--category-color': category.color }">{{ category.color }}</span></td>
            <td>{{ category.position }}</td>
            <td>
              <strong class="category-topic-total">{{ category.topicCount }}</strong>
              <small>{{ category.publishedTopicCount }} 已发布 · {{ category.draftTopicCount }} 草稿</small>
            </td>
            <td class="row-actions">
              <NuxtLink :to="`/admin/categories/${category.id}/edit`">编辑</NuxtLink>
              <button type="button" @click="removeCategory(category)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!categories.length" class="state-panel">
        <strong>还没有板块</strong><p>创建第一个板块后才能发布帖子。</p>
      </div>
    </div>
  </section>
</template>
