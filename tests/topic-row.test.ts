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
  it('renders the source-shaped topic, views, and activity table cells without a blog excerpt', () => {
    const wrapper = mount(TopicRow, {
      props: { topic },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })

    expect(wrapper.element.tagName).toBe('TR')
    expect(wrapper.get('td.main-link.topic-list-data').exists()).toBe(true)
    expect(wrapper.get('[data-topic-title]').text()).toBe(topic.title)
    expect(wrapper.get('[data-topic-title]').attributes('href')).toBe(`/t/${topic.id}`)
    expect(wrapper.text()).toContain('工具箱')
    expect(wrapper.get('td.views .number').text()).toBe('1.3k')
    expect(wrapper.get('td.activity time').text()).toBe('2026.08.20')
    expect(wrapper.text()).toContain('squoosh.app')
    expect(wrapper.text()).not.toContain(topic.excerpt)
    expect(wrapper.text()).not.toContain('回复')
  })
})
