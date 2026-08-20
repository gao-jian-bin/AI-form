<script setup lang="ts">
import type { ForumCategory, TopicSummary } from '~/types/forum'

const props = defineProps<{
  title: string
  description: string
  topics: TopicSummary[]
  categories: ForumCategory[]
  pending?: boolean
  errorMessage?: string
  activeCategory?: string
  eyebrow?: string
}>()

const emit = defineEmits<{ retry: [] }>()
const route = useRoute()
const searchValue = ref(typeof route.query.q === 'string' ? route.query.q : '')
const activeCategoryData = computed(() => props.categories.find(category => category.slug === props.activeCategory))
const allTags = computed(() => [...new Set(props.topics.flatMap(topic => topic.tags))].sort((a, b) => a.localeCompare(b, 'zh-CN')))

function selectCategory(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  navigateTo(value ? `/c/${value}` : '/')
}

function selectTag(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value) navigateTo(`/tag/${encodeURIComponent(value)}`)
}

function submitFullPageSearch() {
  const value = searchValue.value.trim()
  if (value) navigateTo({ path: '/search', query: { q: value } })
}
</script>

<template>
  <div class="discourse-wrap">
    <div id="main-outlet-wrapper" class="has-sidebar-page">
      <ForumSidebar :categories="categories" :tags="allTags" :active-category="activeCategory" />

      <section id="main-outlet" class="discovery-list-container" aria-labelledby="discovery-heading">
        <h1 id="discovery-heading" class="sr-only">{{ title }}</h1>

        <section v-if="activeCategoryData" class="category-heading discovery-heading" :style="{ '--category-color': activeCategoryData.color }">
          <div class="category-heading-title">
            <span class="category-heading-bullet" />
            <strong>{{ activeCategoryData.name }}</strong>
          </div>
          <p>{{ activeCategoryData.description }}</p>
        </section>
        <section v-else-if="route.path.startsWith('/tag/') || route.path === '/search'" class="page-heading">
          <h2>{{ title }}</h2>
          <p>{{ description }}</p>
        </section>

        <form v-if="route.path === '/search'" class="full-page-search" role="search" @submit.prevent="submitFullPageSearch">
          <label class="sr-only" for="full-page-search-input">搜索主题和内容</label>
          <input id="full-page-search-input" v-model="searchValue" type="search" placeholder="搜索主题和内容" autofocus>
          <button class="btn btn-primary" type="submit">搜索</button>
        </form>

        <div class="list-controls">
          <div class="navigation-container">
            <div class="category-breadcrumb">
              <label class="select-kit">
                <span class="sr-only">选择分类</span>
                <select :value="activeCategory || ''" @change="selectCategory">
                  <option value="">所有分类</option>
                  <option v-for="category in categories" :key="category.id" :value="category.slug">{{ category.name }}</option>
                </select>
              </label>
              <label class="select-kit">
                <span class="sr-only">选择标签</span>
                <select value="" @change="selectTag">
                  <option value="">所有标签</option>
                  <option v-for="tag in allTags" :key="tag" :value="tag">{{ tag }}</option>
                </select>
              </label>
            </div>

            <ul id="navigation-bar" class="nav-pills">
              <li><NuxtLink :to="activeCategory ? `/c/${activeCategory}` : '/'" class="active">最新</NuxtLink></li>
            </ul>
          </div>
        </div>

        <div id="list-area">
          <div v-if="pending" class="topic-list-loading" aria-label="正在加载主题">
            <span v-for="index in 6" :key="index" />
          </div>

          <div v-else-if="errorMessage" class="empty-topic-list" role="alert">
            <strong>暂时无法加载主题</strong>
            <p>{{ errorMessage }}</p>
            <button class="btn btn-primary" type="button" @click="emit('retry')">重新加载</button>
          </div>

          <div v-else-if="!topics.length" class="empty-topic-list">
            <strong>没有找到主题</strong>
            <p>换个分类、标签或关键词再试。</p>
            <NuxtLink to="/" class="btn btn-primary">返回最新主题</NuxtLink>
          </div>

          <table v-else class="topic-list" aria-labelledby="discovery-heading">
            <thead class="topic-list-header">
              <tr>
                <th class="topic-list-data default">主题</th>
                <th class="topic-list-data num views">浏览</th>
                <th class="topic-list-data num activity">活动</th>
              </tr>
            </thead>
            <tbody class="topic-list-body">
              <TopicRow v-for="topic in topics" :key="topic.id" :topic="topic" />
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>
