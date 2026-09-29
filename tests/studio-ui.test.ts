import { describe, expect, it } from 'vitest'
import { computed, nextTick, ref } from 'vue'
import { isStudioRouteActive, studioNavigation } from '../app/utils/studio-navigation'
import { useStudioPagination } from '../app/composables/useStudioPagination'

describe('studio navigation', () => {
  it('highlights exactly one section for each administrative route', () => {
    for (const path of ['/admin', '/admin/overview', '/admin/categories/new', '/admin/categories/1/edit', '/admin/tags/1/edit', '/admin/uploads', '/admin/analytics', '/admin/topics/new', '/admin/topics/1/edit']) {
      expect(studioNavigation.filter(item => isStudioRouteActive(path, item.to))).toHaveLength(1)
    }
    expect(studioNavigation.filter(item => isStudioRouteActive('/admin/sign-in', item.to))).toHaveLength(0)
    expect(isStudioRouteActive('/admin/categories-other', '/admin/categories')).toBe(false)
  })
})

describe('studio pagination', () => {
  it('paginates without modifying source items and clamps after deletion', async () => {
    const source = ref(Array.from({ length: 41 }, (_, index) => index + 1))
    const { page, totalPages, pagedItems } = useStudioPagination(computed(() => source.value))
    expect(totalPages.value).toBe(3)
    expect(pagedItems.value).toHaveLength(20)
    page.value = 3
    expect(pagedItems.value).toEqual([41])
    source.value = source.value.slice(0, 19)
    await nextTick()
    expect(page.value).toBe(1)
    expect(pagedItems.value).toHaveLength(19)
  })

  it('has a usable first page for empty and filtered collections', async () => {
    const source = ref<number[]>([])
    const { page, totalPages, pagedItems } = useStudioPagination(source, 12)
    expect(totalPages.value).toBe(1)
    expect(pagedItems.value).toEqual([])
    source.value = Array.from({ length: 13 }, (_, index) => index)
    await nextTick()
    page.value = 2
    expect(pagedItems.value).toEqual([12])
    source.value = []
    await nextTick()
    expect(page.value).toBe(1)
  })
})
