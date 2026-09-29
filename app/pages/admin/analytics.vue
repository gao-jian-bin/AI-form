<script setup lang="ts">
import { RefreshCw, Eye, Users, Activity, ChartNoAxesCombined, Search } from '@lucide/vue'
import type { AnalyticsReport } from '~/types/forum'
import { getErrorMessage } from '~/utils/error-message'

definePageMeta({ layout: 'studio', middleware: 'admin' })
useSeoMeta({ title: '访问统计', robots: 'noindex, nofollow' })

const days = ref<'1' | '7' | '30' | '90'>('7')
const query = ref('')
const sort = ref<'latest' | 'views'>('latest')
const requestQuery = computed(() => ({
  days: days.value,
  query: query.value.trim(),
  sort: sort.value,
}))
const emptyReport: AnalyticsReport = {
  summary: {
    todayViews: 0,
    todayVisitors: 0,
    sevenDayViews: 0,
    sevenDayVisitors: 0,
    thirtyDayViews: 0,
    thirtyDayVisitors: 0,
    totalViews: 0,
    totalVisitors: 0,
  },
  visitors: [],
  topPages: [],
  retentionDays: 90,
}
const { data: report, status, error, refresh } = await useFetch<AnalyticsReport>('/api/studio/analytics', {
  query: requestQuery,
  default: () => emptyReport,
})
const loadError = computed(() => error.value ? getErrorMessage(error.value, '访问统计加载失败') : '')

const summaryItems = computed(() => [
  { label: '今日浏览量', views: report.value.summary.todayViews, visitors: report.value.summary.todayVisitors },
  { label: '最近 7 天浏览量', views: report.value.summary.sevenDayViews, visitors: report.value.summary.sevenDayVisitors },
  { label: '最近 30 天浏览量', views: report.value.summary.thirtyDayViews, visitors: report.value.summary.thirtyDayVisitors },
  { label: '保留期内总浏览量', views: report.value.summary.totalViews, visitors: report.value.summary.totalVisitors },
])
const statIcons = [Eye, Users, Activity, ChartNoAxesCombined]
const cards = computed(() => summaryItems.value.map(item => ({ label: item.label, value: item.views, detail: `${item.visitors} 个独立 IP` })))
const visitors = computed(() => report.value.visitors)
const { page, pageSize, pagedItems } = useStudioPagination(visitors)
watch([days, query, sort], () => { page.value = 1 })
const maxPageViews = computed(() => Math.max(1, ...report.value.topPages.map(page => page.views)))

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(new Date(value))
}
</script>

<template>
  <section class="studio-dashboard analytics-dashboard">
    <StudioPageHeader title="访问统计" :description="`了解内容如何被发现。查看浏览量、独立 IP 与最近活动，记录保留 ${report.retentionDays} 天。`" eyebrow="ANALYTICS">
      <button class="button button-quiet" type="button" :disabled="status === 'pending'" @click="refresh()">
        <RefreshCw :size="16" />
        {{ status === 'pending' ? '刷新中…' : '刷新数据' }}
      </button>
    </StudioPageHeader>

    <p v-if="loadError" class="form-alert" role="alert">{{ loadError }}</p>

    <StudioStats :items="cards"><template #icon="{ index }"><component :is="statIcons[index]" :size="17" /></template></StudioStats>

    <div class="studio-toolbar analytics-toolbar">
      <div class="filter-tabs" aria-label="统计时间范围">
        <button v-for="option in [{ value: '1', label: '24 小时' }, { value: '7', label: '7 天' }, { value: '30', label: '30 天' }, { value: '90', label: '90 天' }]" :key="option.value" type="button" :aria-pressed="days === option.value" :class="{ 'is-active': days === option.value }" @click="days = option.value as typeof days">
          {{ option.label }}
        </button>
      </div>
      <div class="studio-toolbar__controls">
        <label class="studio-sort-control">
          <span class="sr-only">访客排序方式</span>
          <select v-model="sort" aria-label="访客排序方式">
            <option value="latest">最近访问优先</option>
            <option value="views">访问次数优先</option>
          </select>
        </label>
        <label class="admin-search-field"><Search :size="16" /><input v-model="query" type="search" placeholder="筛选 IP 或页面路径" aria-label="筛选 IP 或页面路径"></label>
      </div>
    </div>

    <div class="analytics-grid">
      <section class="analytics-section">
        <h2>热门页面</h2>
        <div class="studio-table-wrap">
          <table class="studio-table analytics-page-table">
            <thead><tr><th>页面</th><th>浏览</th><th>独立 IP</th></tr></thead>
            <tbody>
              <tr v-for="page in report.topPages" :key="page.path">
                <td><a :href="page.path" target="_blank" rel="noopener noreferrer">{{ page.path }}</a><div class="admin-traffic-bar" aria-hidden="true"><span :style="{ width: `${page.views / maxPageViews * 100}%` }" /></div></td>
                <td>{{ page.views }}</td>
                <td>{{ page.visitors }}</td>
              </tr>
            </tbody>
          </table>
          <StudioEmpty v-if="!report.topPages.length" :title="status === 'pending' ? '正在加载访问记录…' : '暂时没有访问记录'" description="所选时间范围内的热门页面会显示在这里。" />
        </div>
      </section>

      <section class="analytics-section analytics-section-visitors">
        <h2>访客明细</h2>
        <div class="studio-table-wrap">
          <table class="studio-table analytics-visitor-table">
            <thead><tr><th>IP 地址</th><th>次数</th><th>最近页面</th><th>首次访问</th><th>最后访问</th><th>浏览器</th></tr></thead>
            <tbody>
              <tr v-for="visitor in pagedItems" :key="visitor.ipAddress">
                <td><code>{{ visitor.ipAddress }}</code></td>
                <td>{{ visitor.views }}</td>
                <td><a :href="visitor.lastPath" target="_blank" rel="noopener noreferrer">{{ visitor.lastPath }}</a></td>
                <td><time :datetime="visitor.firstSeenAt">{{ formatDate(visitor.firstSeenAt) }}</time></td>
                <td><time :datetime="visitor.lastSeenAt">{{ formatDate(visitor.lastSeenAt) }}</time></td>
                <td class="analytics-user-agent" :title="visitor.userAgent">{{ visitor.userAgent }}</td>
              </tr>
            </tbody>
          </table>
          <StudioEmpty v-if="!report.visitors.length" title="没有匹配的访客" description="调整时间范围或清空筛选条件。" />
        </div>
        <StudioPagination v-model:page="page" :total="report.visitors.length" :page-size="pageSize" label="访客分页" />
      </section>
    </div>

    <p class="analytics-note">独立 IP 不等于独立用户：多人共用网络、移动网络和 VPN 都会影响结果。查询参数不会写入访问日志。</p>
  </section>
</template>
