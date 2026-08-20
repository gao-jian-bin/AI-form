// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SidebarTagSection from '../app/components/SidebarTagSection.vue'

const NuxtLinkStub = {
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
}

describe('SidebarTagSection', () => {
  it('starts collapsed and keeps every global tag when one tag is active', async () => {
    const wrapper = mount(SidebarTagSection, {
      props: {
        tags: [
          { id: 1, name: 'Prompt', slug: 'prompt', topicCount: 3 },
          { id: 2, name: 'Base64', slug: 'base64', topicCount: 1 },
          { id: 3, name: '图片处理', slug: '图片处理', topicCount: 2 },
        ],
        activeTag: 'Prompt',
      },
      global: { stubs: { NuxtLink: NuxtLinkStub } },
    })

    const toggle = wrapper.get('button')
    expect(toggle.text()).toContain('标签')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-tag-list]').exists()).toBe(false)

    await toggle.trigger('click')

    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('[data-tag-list]').text()).toContain('Prompt')
    expect(wrapper.get('[data-tag-list]').text()).toContain('Base64')
    expect(wrapper.get('[data-tag-list]').text()).toContain('图片处理')
    expect(wrapper.get('a[href="/tag/Prompt"]').classes()).toContain('active')

    await wrapper.get('a[href="/tag/Base64"]').trigger('click')
    expect(wrapper.emitted('navigate')).toHaveLength(1)
  })
})
