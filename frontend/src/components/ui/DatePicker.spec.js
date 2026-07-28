import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DatePicker from './DatePicker.vue'

describe('DatePicker', () => {
  it('opens on the selected month, supports arrow keys, and selects an ISO date', async () => {
    const wrapper = mount(DatePicker, {
      props: { modelValue: '2026-05-06', 'onUpdate:modelValue': (value) => wrapper.setProps({ modelValue: value }) },
      attachTo: document.body,
    })

    await wrapper.find('input').trigger('click')
    const selected = wrapper.find('[data-date="2026-05-06"]')
    expect(selected.attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[role="gridcell"]').exists()).toBe(false)

    await selected.trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement.dataset.date).toBe('2026-05-07')

    await wrapper.find('[data-date="2026-05-10"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['2026-05-10'])
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
