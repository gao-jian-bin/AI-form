<script setup lang="ts">
const props = defineProps<{
  page: number
  totalPages: number
  total: number
}>()

const route = useRoute()

const visiblePages = computed(() => {
  if (props.totalPages <= 7) return Array.from({ length: props.totalPages }, (_, index) => index + 1)
  const pages = new Set([1, props.totalPages])
  for (let page = props.page - 2; page <= props.page + 2; page += 1) {
    if (page > 1 && page < props.totalPages) pages.add(page)
  }
  return [...pages].sort((first, second) => first - second)
})

function pageLocation(page: number) {
  const query = { ...route.query }
  if (page <= 1) delete query.page
  else query.page = String(page)
  return { path: route.path, query }
}
</script>

<template>
  <nav v-if="totalPages > 1" class="topic-pagination" aria-label="帖子分页">
    <NuxtLink
      v-if="page > 1"
      :to="pageLocation(page - 1)"
      class="topic-pagination__direction"
      rel="prev"
    >上一页</NuxtLink>
    <span v-else class="topic-pagination__direction disabled" aria-disabled="true">上一页</span>

    <template v-for="(item, index) in visiblePages" :key="item">
      <span v-if="index > 0 && item - visiblePages[index - 1]! > 1" class="topic-pagination__gap" aria-hidden="true">…</span>
      <NuxtLink
        :to="pageLocation(item)"
        class="topic-pagination__page"
        :class="{ active: item === page }"
        :aria-current="item === page ? 'page' : undefined"
        :aria-label="`第 ${item} 页`"
      >{{ item }}</NuxtLink>
    </template>

    <NuxtLink
      v-if="page < totalPages"
      :to="pageLocation(page + 1)"
      class="topic-pagination__direction"
      rel="next"
    >下一页</NuxtLink>
    <span v-else class="topic-pagination__direction disabled" aria-disabled="true">下一页</span>
    <span class="topic-pagination__total">共 {{ total }} 篇</span>
  </nav>
</template>
