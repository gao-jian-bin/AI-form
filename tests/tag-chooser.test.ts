// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TagChooser from '../app/components/TagChooser.vue'

const options = [
  { id: 1, name: 'Prompt', slug: 'prompt', topicCount: 5 },
  { id: 2, name: '工作流', slug: 'workflow', topicCount: 3 },
  { id: 3, name: '图片工具', slug: 'image-tools', topicCount: 1 },
]

describe('TagChooser', () => {
  it('lists known tags and adds a selected option without duplicating selected names', async () => {
    const wrapper = mount(TagChooser, { props: { modelValue: ['Prompt'], options } })

    await wrapper.get('[aria-label="选择标签"]').trigger('click')

    expect(wrapper.text()).toContain('工作流')
    expect(wrapper.find('[data-tag-option="Prompt"]').exists()).toBe(false)
    await wrapper.get('[aria-label="搜索或创建标签"]').setValue('prompt')
    expect(wrapper.find('[data-create-tag]').exists()).toBe(false)
    await wrapper.get('[aria-label="搜索或创建标签"]').setValue('')
    await wrapper.get('[data-tag-option="工作流"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual(['Prompt', '工作流'])
  })

  it('creates an unknown tag from the search value', async () => {
    const wrapper = mount(TagChooser, { props: { modelValue: ['Prompt'], options } })
    await wrapper.get('[aria-label="选择标签"]').trigger('click')
    await wrapper.get('[aria-label="搜索或创建标签"]').setValue('新标签')

    await wrapper.get('[data-create-tag]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual(['Prompt', '新标签'])
  })

  it('removes a selected tag without changing the others', async () => {
    const wrapper = mount(TagChooser, {
      props: { modelValue: ['Prompt', '工作流'], options },
    })

    await wrapper.get('[aria-label="移除标签：Prompt"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual(['工作流'])
  })

  it('keeps known tags viewable but blocks additions at the eight-tag limit', async () => {
    const wrapper = mount(TagChooser, {
      props: { modelValue: ['1', '2', '3', '4', '5', '6', '7', '8'], options, max: 8 },
    })
    const trigger = wrapper.get('[aria-label="选择标签"]')

    expect(trigger.attributes('aria-disabled')).toBe('true')
    await trigger.trigger('click')
    expect(wrapper.find('[data-tag-option="Prompt"]').exists()).toBe(true)
    await wrapper.get('[data-tag-option="Prompt"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await wrapper.get('[aria-label="搜索或创建标签"]').setValue('第九个标签')
    expect(wrapper.find('[data-create-tag]').exists()).toBe(false)
  })

  it('explains that manual tag creation still works when known tags fail to load', async () => {
    const wrapper = mount(TagChooser, {
      props: { modelValue: [], options: [], loadError: true },
    })

    await wrapper.get('[aria-label="选择标签"]').trigger('click')

    expect(wrapper.get('[role="alert"]').text()).toContain('已有标签暂时无法加载')
    await wrapper.get('[aria-label="搜索或创建标签"]').setValue('手动标签')
    expect(wrapper.find('[data-create-tag]').exists()).toBe(true)
  })

  it('moves through known tags with arrow keys, selects with Enter, and closes with Escape', async () => {
    const wrapper = mount(TagChooser, { props: { modelValue: ['Prompt'], options } })
    await wrapper.get('[aria-label="选择标签"]').trigger('click')
    const search = wrapper.get('[aria-label="搜索或创建标签"]')

    await search.trigger('keydown', { key: 'ArrowDown' })
    await search.trigger('keydown', { key: 'ArrowDown' })
    await search.trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.get('[data-tag-option="工作流"]').classes()).toContain('is-active')
    await search.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual(['Prompt', '工作流'])

    await search.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.tag-chooser__menu').exists()).toBe(false)
  })
})
