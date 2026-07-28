import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import AnimatedList from './AnimatedList.vue'
import CountUp from './CountUp.vue'
import LineSidebar from './LineSidebar.vue'
import StaggeredMenu from './StaggeredMenu.vue'
import Stepper from './Stepper.vue'
import AnimatedCard from './ui/AnimatedCard.vue'
import MessageLoading from './ui/MessageLoading.vue'
import SkeletonShimmer from './ui/SkeletonShimmer.vue'

describe('shared interaction components', () => {
  it('supports keyboard list selection and step navigation', async () => {
    const list = mount(AnimatedList, {
      props: { items: [{ id: 1, label: 'Nearby role' }] },
      slots: { default: '<button class="list-focus">Details</button>' },
    })
    await list.get('.list-focus').trigger('keydown', { key: 'ArrowDown' })
    await list.get('.animated-list__scroller').trigger('keydown', { key: 'Enter' })
    expect(list.emitted('select')?.[0][0]).toEqual({ id: 1, label: 'Nearby role' })
    expect(list.get('.animated-list__scroller').element.tagName).toBe('UL')
    expect(list.get('.animated-list__item').element.tagName).toBe('LI')

    const stepper = mount(Stepper, { props: { steps: [{ title: 'One' }, { title: 'Two' }] } })
    await stepper.get('.stepper__next').trigger('click')
    expect(stepper.text()).toContain('Two')
    expect(stepper.emitted('change')?.[0]).toEqual([2])
    expect(stepper.get('[aria-current="step"]').attributes('aria-label')).toBe('Step 2')
  })

  it('keeps list and step selection inside current bounds', async () => {
    const list = mount(AnimatedList, { props: { items: [{ id: 1 }, { id: 2 }] } })
    await list.get('.animated-list__scroller').trigger('keydown', { key: 'ArrowDown' })
    await list.get('.animated-list__scroller').trigger('keydown', { key: 'ArrowDown' })
    await list.setProps({ items: [{ id: 1 }] })
    await list.get('.animated-list__scroller').trigger('keydown', { key: 'Enter' })
    expect(list.emitted('select')?.[0]).toEqual([{ id: 1 }, 0])
    expect(list.find('[role="option"]').exists()).toBe(false)

    await list.setProps({ items: [] })
    await list.get('.animated-list__scroller').trigger('keydown', { key: 'Enter' })
    expect(list.emitted('select')).toHaveLength(1)

    const stepper = mount(Stepper, { props: { steps: [{ title: 'One' }, { title: 'Two' }], initialStep: 99 } })
    expect(stepper.text()).toContain('Two')
    stepper.vm.back()
    stepper.vm.back()
    await stepper.vm.$nextTick()
    expect(stepper.text()).toContain('One')
    expect(stepper.emitted('change')).toEqual([[1]])

    const emptyStepper = mount(Stepper, { props: { steps: [] } })
    expect(emptyStepper.find('.stepper__content').exists()).toBe(false)
    expect(emptyStepper.find('footer').exists()).toBe(false)
  })

  it('tracks the latest sidebar selection when active is uncontrolled', async () => {
    const sidebar = mount(LineSidebar, { props: { items: ['Start', 'Join'] } })
    await sidebar.findAll('button')[1].trigger('click')

    expect(sidebar.findAll('button')[1].classes()).toContain('active')
    expect(sidebar.emitted('select')?.[0]).toEqual(['Join', 1])
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
    expect(loading.get('output').attributes('aria-label')).toBe('Searching roles')

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

  it('renders accessible shimmer placeholders for each dashboard list shape', () => {
    for (const variant of ['candidate', 'job', 'role']) {
      const shimmer = mount(SkeletonShimmer, { props: { variant, count: 2, label: `Loading ${variant}s` } })
      expect(shimmer.get('output').text()).toBe(`Loading ${variant}s`)
      expect(shimmer.findAll('.skeleton-card')).toHaveLength(2)
      expect(shimmer.get('.skeleton-list').classes()).toContain(`skeleton-list--${variant}`)
    }
  })

  it('starts an immediate count without waiting for visibility', async () => {
    const observer = vi.fn()
    vi.stubGlobal('IntersectionObserver', observer)
    let tick
    const frame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { tick = callback; return 1 })
    const count = mount(CountUp, { props: { from: 100, to: 95, immediate: true } })

    expect(observer).not.toHaveBeenCalled()
    expect(frame).toHaveBeenCalled()
    tick(performance.now() + 2000)
    await count.vm.$nextTick()
    expect(count.text()).toBe('95')
    count.unmount()
    frame.mockRestore()
    vi.unstubAllGlobals()
  })

  it('holds a delayed count at its starting value before animating', async () => {
    vi.useFakeTimers()
    let tick
    const frame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { tick = callback; return 1 })
    const count = mount(CountUp, { props: { from: 100, to: 95, delay: 0.5, immediate: true } })

    expect(count.text()).toBe('100')
    expect(frame).not.toHaveBeenCalled()
    vi.advanceTimersByTime(499)
    expect(frame).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(frame).toHaveBeenCalled()
    tick(performance.now() + 2000)
    await count.vm.$nextTick()
    expect(count.text()).toBe('95')

    count.unmount()
    frame.mockRestore()
    vi.useRealTimers()
  })

  it('restarts a count from its displayed value when the target changes', async () => {
    const ticks = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { ticks.push(callback); return ticks.length })
    const count = mount(CountUp, { props: { from: 0, to: 10, immediate: true } })

    ticks.shift()(performance.now() + 500)
    await count.vm.$nextTick()
    await count.setProps({ to: 20 })
    ticks.at(-1)(performance.now() + 2000)
    await count.vm.$nextTick()

    expect(count.text()).toBe('20')
    count.unmount()
    vi.restoreAllMocks()
  })
})
