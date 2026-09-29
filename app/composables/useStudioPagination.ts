import { computed, ref, watch, type Ref } from 'vue'

export function useStudioPagination<T>(items: Ref<T[]>, pageSize = 20) {
  const page = ref(1)
  const totalPages = computed(() => Math.max(1, Math.ceil(items.value.length / pageSize)))
  const pagedItems = computed(() => items.value.slice((page.value - 1) * pageSize, page.value * pageSize))
  watch(items, () => { page.value = Math.min(page.value, totalPages.value) })
  return { page, pageSize, totalPages, pagedItems }
}
