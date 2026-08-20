// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TopicRow from '../app/components/TopicRow.vue'

const topic = {
  id: 12,
  title: 'Squoosh：在浏览器里压缩图片',
  slug: 'squoosh-在浏览器里压缩图片',
  excerpt: '直观比较压缩前后的画质和体积。',
  status: 'published',
  isPinned: true,
  externalUrl: 'https://squoosh.app/',
  viewCount: 1280,
  publishedAt: '2026-08-20T08:00:00.000Z',
  createdAt: '2026-08-20T08:00:00.000Z',
  updatedAt: '2026-08-20T08:00:00.000Z',
  category: { id: 2, name: '工具箱', slug: 'toolbox', color: '#d97706' },
  tags: ['图片处理', '压缩'],
}

const NuxtLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

describe('TopicRow', () => {
  it('presents real forum metadata and keeps the title linked to the local topic', () => {
    const wrapper = mount(TopicRow, {
      props: { topic },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })

    expect(wrapper.get('[data-topic-title]').text()).toBe(topic.title)
    expect(wrapper.get('[data-topic-title]').attributes('href')).toBe(`/t/${topic.slug}/${topic.id}`)
    expect(wrapper.text()).toContain('工具箱')
    expect(wrapper.text()).toContain('1.3k 浏览')
    expect(wrapper.text()).toContain('squoosh.app')
    expect(wrapper.text()).not.toContain('回复')
  })
})
