import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BorderGlow from './BorderGlow.vue'
import CardNav from './CardNav.vue'
import Dock from './Dock.vue'
import LineSidebar from './LineSidebar.vue'

const gsapHarness = vi.hoisted(() => {
  const timeline = {
    to: vi.fn(),
    fromTo: vi.fn(),
    kill: vi.fn(),
  }
  timeline.to.mockReturnValue(timeline)
  timeline.fromTo.mockReturnValue(timeline)
  return { timeline }
})

vi.mock('gsap', () => ({
  gsap: { timeline: vi.fn(() => gsapHarness.timeline) },
}))

describe('navigation interaction primitives', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens CardNav, emits its controls, and closes cleanly', async () => {
    const link = { label: 'Open roles', path: '/roles' }
    const wrapper = mount(CardNav, {
      props: { items: [{ label: 'Hire', links: [link] }], ctaLabel: 'Join' },
      global: { stubs: { BrandLogo: true } },
    })

    await wrapper.get('.card-nav__menu').trigger('click')
    expect(wrapper.get('.card-nav').classes()).toContain('open')
    expect(gsapHarness.timeline.to).toHaveBeenCalledWith(wrapper.get('.card-nav').element, expect.objectContaining({ height: 270 }))
    expect(gsapHarness.timeline.fromTo).toHaveBeenCalled()

    await wrapper.get('.card-nav__card button').trigger('click')
    await wrapper.get('.card-nav__cta').trigger('click')
    await wrapper.get('.card-nav__menu').trigger('click')
    expect(wrapper.emitted('select')).toEqual([[link]])
    expect(wrapper.emitted('cta')).toHaveLength(1)
    expect(wrapper.get('.card-nav').classes()).not.toContain('open')

    wrapper.unmount()
    expect(gsapHarness.timeline.kill).toHaveBeenCalled()
  })

  it('magnifies, resets, and selects Dock items', async () => {
    const item = { label: 'Profile', icon: 'P' }
    const wrapper = mount(Dock, { props: { items: [item] } })
    const button = wrapper.get('.dock-item')
    vi.spyOn(button.element, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 40 })

    wrapper.get('.dock-panel').element.dispatchEvent(new MouseEvent('pointermove', { clientX: 20 }))
    await wrapper.vm.$nextTick()
    expect(button.element.style.getPropertyValue('--dock-scale')).toBe('1.28')
    await wrapper.get('.dock-panel').trigger('pointerleave')
    expect(button.element.style.getPropertyValue('--dock-scale')).toBe('')
    await button.trigger('click')
    expect(wrapper.emitted('select')).toEqual([[item, 0]])
  })

  it('tracks pointer proximity for glow and sidebar effects', async () => {
    const glow = mount(BorderGlow, { props: { tag: 'section' }, slots: { default: 'Content' } })
    vi.spyOn(glow.element, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 100, height: 100 })
    glow.element.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 50 }))
    await glow.vm.$nextTick()
    expect(glow.element.style.getPropertyValue('--edge-proximity')).toBe('1.000')
    await glow.trigger('pointerleave')
    expect(glow.element.style.getPropertyValue('--edge-proximity')).toBe('0')

    const sidebar = mount(LineSidebar, { props: { items: ['Start'] } })
    const button = sidebar.get('button')
    vi.spyOn(button.element, 'getBoundingClientRect').mockReturnValue({ top: 0, height: 40 })
    sidebar.get('nav').element.dispatchEvent(new MouseEvent('pointermove', { clientY: 20 }))
    await sidebar.vm.$nextTick()
    expect(button.element.style.getPropertyValue('--effect')).toBe('1.000')
    await sidebar.get('nav').trigger('pointerleave')
    expect(button.element.style.getPropertyValue('--effect')).toBe('0')
  })
})
