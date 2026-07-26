import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import AnimatedList from './AnimatedList.vue'
import CountUp from './CountUp.vue'
import StaggeredMenu from './StaggeredMenu.vue'
import Stepper from './Stepper.vue'
import AnimatedCard from './ui/AnimatedCard.vue'
import MessageLoading from './ui/MessageLoading.vue'

describe('shared interaction components', () => {
  it('supports keyboard list selection and step navigation', async () => {
    const list = mount(AnimatedList, { props: { items: [{ id: 1, label: 'Nearby role' }] } })
    await list.trigger('keydown', { key: 'ArrowDown' })
    await list.trigger('keydown', { key: 'Enter' })
    expect(list.emitted('select')?.[0][0]).toEqual({ id: 1, label: 'Nearby role' })

    const stepper = mount(Stepper, { props: { steps: [{ title: 'One' }, { title: 'Two' }] } })
    await stepper.get('.stepper__next').trigger('click')
    expect(stepper.text()).toContain('Two')
    expect(stepper.emitted('change')?.[0]).toEqual([2])
  })

  it('emits profile and sign-out actions from the account menu', async () => {
    const menu = mount(StaggeredMenu, {
      props: { items: [{ label: 'Dashboard', path: '/' }], account: { name: 'Pat Rao', detail: 'Hiring workspace' } },
    })

    expect(menu.text()).toContain('Pat Rao')
    await menu.get('.staggered-menu__toggle').trigger('click')
    expect(menu.classes()).toContain('open')
    expect(menu.get('.staggered-menu__panel').attributes('aria-hidden')).toBe('false')
    await menu.get('.staggered-menu__account').trigger('click')
    expect(menu.classes()).not.toContain('open')
    await menu.get('.staggered-menu__toggle').trigger('click')
    await menu.get('.staggered-menu__footer button').trigger('click')

    expect(menu.emitted('select')).toEqual([[{ action: 'profile' }], [{ action: 'logout' }]])
  })

  it('renders dashboard loading and animated card primitives', async () => {
    const loading = mount(MessageLoading, { props: { label: 'Searching roles' } })
    expect(loading.get('[role="status"]').attributes('aria-label')).toBe('Searching roles')

    const card = mount(AnimatedCard, {
      props: { title: 'Quick actions', description: 'Keep work moving.', withArrow: true },
      slots: { default: '<button>Open profile</button>' },
    })
    expect(card.text()).toContain('Quick actions')
    expect(card.text()).toContain('Open profile')
    expect(card.find('.animated-card__arrow').exists()).toBe(true)
    card.element.dispatchEvent(new MouseEvent('pointermove', { clientX: 20, clientY: 30 }))
    await card.vm.$nextTick()
    expect(card.get('.animated-card__glow').classes()).toContain('animated-card__glow--visible')
    card.element.dispatchEvent(new MouseEvent('pointerleave'))
    await card.vm.$nextTick()
    expect(card.get('.animated-card__glow').classes()).not.toContain('animated-card__glow--visible')
  })

  it('starts an immediate count without waiting for visibility', () => {
    const observer = vi.fn()
    vi.stubGlobal('IntersectionObserver', observer)
    const frame = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    const count = mount(CountUp, { props: { from: 100, to: 95, immediate: true } })

    expect(observer).not.toHaveBeenCalled()
    expect(frame).toHaveBeenCalled()
    count.unmount()
    frame.mockRestore()
    vi.unstubAllGlobals()
  })

  it('holds a delayed count at its starting value before animating', () => {
    vi.useFakeTimers()
    const frame = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    const count = mount(CountUp, { props: { from: 100, to: 95, delay: 0.5, immediate: true } })

    expect(count.text()).toBe('100')
    expect(frame).not.toHaveBeenCalled()
    vi.advanceTimersByTime(499)
    expect(frame).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(frame).toHaveBeenCalled()

    count.unmount()
    frame.mockRestore()
    vi.useRealTimers()
  })
})
