<script setup lang="ts">
import type { StudioTopic } from '~/types/forum'

definePageMeta({ layout: 'studio', middleware: 'admin' })
useSeoMeta({ title: '内容工作台', robots: 'noindex, nofollow' })

const filter = ref<'all' | 'published' | 'draft'>('all')
const query = ref('')
const { data: topics, refresh } = await useFetch<StudioTopic[]>('/api/studio/topics', { default: () => [] })
const visibleTopics = computed(() => topics.value.filter((topic) => {
  const matchesStatus = filter.value === 'all' || topic.status === filter.value
  const matchesQuery = !query.value.trim() || topic.title.toLowerCase().includes(query.value.trim().toLowerCase())
  return matchesStatus && matchesQuery
}))

async function removeTopic(topic: StudioTopic) {
  if (!confirm(`确定删除“${topic.title}”吗？这个操作不能撤销。`)) return
  await $fetch(`/api/studio/topics/${topic.id}`, { method: 'DELETE' })
  await refresh()
}

async function signOut() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/studio/sign-in')
}
</script>

<template>
  <section class="studio-dashboard">
    <header class="dashboard-heading">
      <div>
        <p class="stream-eyebrow">PUBLISHING DESK</p>
        <h1>主题管理</h1>
        <p>创建、修改和整理公共知识轨道上的内容。</p>
      </div>
      <div class="dashboard-actions">
        <button class="button button-quiet" type="button" @click="signOut">退出</button>
        <NuxtLink to="/studio/topics/new" class="button button-primary">＋ 新建主题</NuxtLink>
      </div>
    </header>

    <div class="studio-toolbar">
      <div class="filter-tabs">
        <button v-for="item in [{ key: 'all', label: '全部' }, { key: 'published', label: '已发布' }, { key: 'draft', label: '草稿' }]" :key="item.key" type="button" :class="{ 'is-active': filter === item.key }" @click="filter = item.key as typeof filter">
          {{ item.label }}
        </button>
      </div>
      <input v-model="query" type="search" placeholder="搜索标题">
    </div>

    <div class="studio-table-wrap">
      <table class="studio-table">
        <thead><tr><th>主题</th><th>板块</th><th>状态</th><th>浏览</th><th>更新</th><th><span class="sr-only">操作</span></th></tr></thead>
        <tbody>
          <tr v-for="topic in visibleTopics" :key="topic.id">
            <td><strong>{{ topic.title }}</strong><small>{{ topic.excerpt }}</small></td>
            <td><span class="category-chip" :style="{ '--category-color': topic.category.color }">{{ topic.category.name }}</span></td>
            <td><span :class="['status-chip', `status-${topic.status}`]">{{ topic.status === 'published' ? '已发布' : '草稿' }}</span></td>
            <td>{{ topic.viewCount }}</td>
            <td>{{ new Date(topic.updatedAt).toLocaleDateString('zh-CN') }}</td>
            <td class="row-actions"><NuxtLink :to="`/studio/topics/${topic.id}/edit`">编辑</NuxtLink><button type="button" @click="removeTopic(topic)">删除</button></td>
          </tr>
        </tbody>
      </table>
      <div v-if="!visibleTopics.length" class="state-panel"><strong>没有匹配的主题</strong><p>调整筛选条件或创建一个新主题。</p></div>
    </div>
  </section>
</template>
