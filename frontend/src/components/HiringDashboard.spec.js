import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HiringDashboard from './HiringDashboard.vue'

function mountHiringDashboard(props = {}) {
  return mount(HiringDashboard, {
    props: {
      myJobs: [],
      candidates: [],
      ...props,
    },
  })
}

describe('HiringDashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('does not render demo candidates when no real candidate data exists', async () => {
    const wrapper = mountHiringDashboard()

    await wrapper.find('input[aria-label="Search candidates"]').setValue('routes')
    expect(wrapper.findAll('.candidate-card')).toHaveLength(0)
    expect(wrapper.text()).toContain('No talent found')
  })

  it('filters candidates provided through props', async () => {
    const wrapper = mountHiringDashboard({
      candidates: [
        {
          id: 1,
          name: 'Ananya Rao',
          role: 'Store Associate',
          area: 'Indiranagar',
          city: 'Bengaluru',
          availability: 'Immediate',
          experience: '2 yrs',
          match: 96,
          rate: 'Rs 22k/mo',
          skills: ['Billing'],
        },
        {
          id: 2,
          name: 'Rahul Mehta',
          role: 'Delivery Partner',
          area: 'Madhapur',
          city: 'Hyderabad',
          availability: 'This week',
          experience: '3 yrs',
          match: 91,
          rate: 'Rs 28k/mo',
          skills: ['Routes'],
        },
      ],
    })

    await wrapper.find('input[aria-label="Search candidates"]').setValue('routes')

    expect(wrapper.findAll('.candidate-card h3').map((item) => item.text())).toEqual(['Rahul Mehta'])
    expect(wrapper.findAll('.hiring-search-panel select')[0].text()).toContain('Delivery Partner')
  })

  it('shows an empty state instead of fallback demo roles', () => {
    const wrapper = mountHiringDashboard()

    expect(wrapper.findAll('.hiring-role-card')).toHaveLength(0)
    expect(wrapper.text()).toContain('No open roles yet')
  })

  it('emits open-create-job when the quick action post new role is clicked', async () => {
    const wrapper = mountHiringDashboard()

    await wrapper.find('.hiring-quick .dash-btn').trigger('click')

    expect(wrapper.emitted('open-create-job')).toHaveLength(1)
  })

  it('does not render an inline job form on the dashboard', () => {
    const wrapper = mountHiringDashboard()

    expect(wrapper.find('.job-form').exists()).toBe(false)
  })

  it('does not render a redundant post new role button in the hiring desk header', () => {
    const wrapper = mountHiringDashboard()

    expect(wrapper.find('.hiring-roles__head button').exists()).toBe(false)
  })

  it('renders the hiring pipeline card with its health metric', () => {
    const wrapper = mountHiringDashboard()

    const pipeline = wrapper.find('.hiring-side-stack .hiring-sidebar')
    expect(pipeline.exists()).toBe(true)
    expect(pipeline.find('h2').text()).toBe('Hiring pipeline')
    expect(pipeline.find('.hiring-progress span').text()).toBe('Pipeline health')
    expect(pipeline.find('.hiring-progress strong').text()).toBe('88%')
  })

  it('renders the quick actions card with the available actions', () => {
    const wrapper = mountHiringDashboard()

    const quick = wrapper.find('.hiring-quick')
    expect(quick.exists()).toBe(true)
    expect(quick.find('h2').text()).toBe('Quick actions')
    const actionLabels = quick.findAll('button').map((button) => button.text())
    expect(actionLabels).toEqual(['Post new role', 'Review shortlists', 'Schedule interviews'])
  })

  it('emits view-applications for a backend role', async () => {
    const wrapper = mountHiringDashboard({
      myJobs: [
        {
          id: 7,
          title: 'Cashier',
          workplaceName: 'Corner Shop',
          cityArea: 'Bandra, Maharashtra - 400050',
          applicationCount: 3,
          isActive: true,
        },
      ],
    })

    await wrapper.find('.hiring-role-card__link').trigger('click')

    expect(wrapper.emitted('view-applications')).toEqual([[7]])
  })

  it('emits view-job from the role card eye icon', async () => {
    const wrapper = mountHiringDashboard({
      myJobs: [
        {
          id: 7,
          title: 'Cashier',
          workplaceName: 'Corner Shop',
          cityArea: 'Bandra, Maharashtra - 400050',
          applicationCount: 3,
          isActive: true,
        },
      ],
    })

    const icons = wrapper.findAll('.hiring-role-card__icon')
    expect(icons).toHaveLength(1)

    await icons[0].trigger('click')

    expect(wrapper.emitted('view-job')).toEqual([[7]])
    expect(wrapper.emitted('edit-job')).toBeUndefined()
  })

  it('emits shortlist without changing the search filter', async () => {
    const wrapper = mountHiringDashboard()
    const candidate = { id: 1, name: 'Worker', role: 'Cashier', skills: [] }

    wrapper.vm.shortlist(candidate)

    expect(wrapper.emitted('shortlist')).toEqual([[candidate]])
    expect(wrapper.find('input[aria-label="Search candidates"]').element.value).toBe('')
  })
})
