import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ScrambleText from './ScrambleText.vue'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('ScrambleText', () => {
  it('scrambles visually, then resolves to the accessible text', async () => {
    vi.useFakeTimers()
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(); return 1 })
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((values) => {
      values[0] = 0
      return values
    })

    const wrapper = mount(ScrambleText, { props: { text: 'Pat Rao' } })
    await wrapper.vm.$nextTick()
    expect(wrapper.attributes('aria-label')).toBe('Pat Rao')
    expect(wrapper.text()).not.toBe('Pat Rao')

    vi.runAllTimers()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toBe('Pat Rao')

    await wrapper.setProps({ text: 'Ravi Shah' })
    expect(wrapper.attributes('aria-label')).toBe('Ravi Shah')
    vi.runAllTimers()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toBe('Ravi Shah')
  })
})
