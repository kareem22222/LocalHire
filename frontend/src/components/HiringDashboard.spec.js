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

    await wrapper.find('input[aria-label="Search candidates by address or role"]').setValue('routes')
    expect(wrapper.findAll('.candidate-card')).toHaveLength(0)
    expect(wrapper.text()).toContain('No talent found')
  })

  it('shows shaped shimmer lists while roles and candidates load', () => {
    const wrapper = mountHiringDashboard({ rolesLoading: true, candidatesLoading: true })

    expect(wrapper.find('.hiring-roles').attributes('aria-busy')).toBe('true')
    expect(wrapper.find('.candidate-list').attributes('aria-busy')).toBe('true')
    expect(wrapper.find('.hiring-roles .skeleton-list--role').exists()).toBe(true)
    expect(wrapper.find('.candidate-list .skeleton-list--candidate').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('No open roles yet')
    expect(wrapper.text()).not.toContain('No talent found')
  })

  it.each([1, 6])('matches the role skeleton count to %i cached role(s)', (count) => {
    const myJobs = Array.from({ length: count }, (_, index) => ({
      id: `job-${index}`,
      title: `Role ${index}`,
      isActive: true,
    }))
    const wrapper = mountHiringDashboard({ myJobs, rolesLoading: true })

    expect(wrapper.findAll('.hiring-roles .skeleton-card--role')).toHaveLength(count)
  })

  it('renders a candidate with no name without throwing', () => {
    const wrapper = mountHiringDashboard({ candidates: [{ id: 1, name: null, matchScore: 70 }] })

    expect(wrapper.find('.candidate-card__avatar').text()).toBe('')
  })

  it('filters candidates provided through props', async () => {
    const wrapper = mountHiringDashboard({
      candidates: [
        {
          id: 1,
          name: 'Ananya Rao',
          role: 'Store Associate',
          area: 'Indiranagar',
          state: 'Karnataka',
          pincode: '560038',
          distanceKm: 2.1,
          matchScore: 96,
        },
        {
          id: 2,
          name: 'Rahul Mehta',
          role: 'Delivery Partner',
          area: 'Madhapur',
          state: 'Telangana',
          pincode: '500081',
          distanceKm: 5.4,
          matchScore: 91,
        },
      ],
    })

    await wrapper.find('input[aria-label="Search candidates by address or role"]').setValue('madhapur')

    expect(wrapper.findAll('.candidate-card h3').map((item) => item.text())).toEqual(['Rahul Mehta'])
    expect(wrapper.find('.talent-search__role select').text()).toContain('Delivery Partner')
  })

  it('emits use-my-location when the location button is clicked', async () => {
    const wrapper = mountHiringDashboard()

    await wrapper.find('.talent-search__location').trigger('click')

    expect(wrapper.emitted('use-my-location')).toHaveLength(1)
  })

  it('emits search-candidates with the selected role', async () => {
    const wrapper = mountHiringDashboard()

    await wrapper.find('.talent-search__role select').setValue('Driver')

    const events = wrapper.emitted('search-candidates')
    expect(events).toBeTruthy()
    expect(events[events.length - 1][0]).toEqual({ search: '', role: 'Driver' })
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
    expect(wrapper.find('input[aria-label="Search candidates by address or role"]').element.value).toBe('')
  })

  it('shows only six roles and a show-more button when there are more', async () => {
    const myJobs = Array.from({ length: 8 }, (_, index) => ({
      id: `job-${index}`,
      title: `Role ${index}`,
      workplaceName: 'Shop',
      cityArea: 'Bandra',
      applicationCount: 0,
      isActive: true,
    }))
    const wrapper = mountHiringDashboard({ myJobs })

    expect(wrapper.findAll('.hiring-role-card')).toHaveLength(6)

    const showMore = wrapper.find('.hiring-show-more__btn')
    expect(showMore.exists()).toBe(true)
    expect(showMore.text()).toContain('8 total')

    await showMore.trigger('click')
    expect(wrapper.emitted('view-all-roles')).toHaveLength(1)
  })

  it('does not show the roles show-more button at six roles or fewer', () => {
    const myJobs = Array.from({ length: 6 }, (_, index) => ({
      id: `job-${index}`,
      title: `Role ${index}`,
      workplaceName: 'Shop',
      cityArea: 'Bandra',
      applicationCount: 0,
      isActive: true,
    }))
    const wrapper = mountHiringDashboard({ myJobs })

    expect(wrapper.findAll('.hiring-role-card')).toHaveLength(6)
    expect(wrapper.find('.hiring-show-more__btn').exists()).toBe(false)
  })

  it('shows only ten candidates and a show-more button that carries the search filters', async () => {
    const candidates = Array.from({ length: 12 }, (_, index) => ({
      id: index,
      name: `Worker ${index}`,
      role: 'Cashier',
      area: 'Indiranagar',
      state: 'Karnataka',
      pincode: '560038',
      matchScore: 90,
    }))
    const wrapper = mountHiringDashboard({ candidates })

    expect(wrapper.findAll('.candidate-card')).toHaveLength(10)

    await wrapper.find('.talent-search__role select').setValue('Cashier')

    const showMore = wrapper.find('.candidate-list .hiring-show-more__btn')
    expect(showMore.exists()).toBe(true)
    expect(showMore.text()).toContain('12 total')

    await showMore.trigger('click')

    const events = wrapper.emitted('view-all-candidates')
    expect(events).toBeTruthy()
    expect(events[events.length - 1][0]).toEqual({ search: '', role: 'Cashier' })
  })

  it('forwards role, candidate, and shortlist actions', async () => {
    const candidate = { id: 'candidate-1', name: 'Ravi', role: 'Cashier' }
    const wrapper = mountHiringDashboard({
      myJobs: [{
        id: 'job-1',
        title: 'Cashier',
        workplaceName: 'Corner Shop',
        applicationCount: 3,
        shortlistedCount: 2,
        isActive: true,
      }],
      candidates: [candidate],
    })

    const stats = wrapper.findAll('.hiring-role-card__stat')
    await stats[0].trigger('click')
    await stats[1].trigger('click')
    await wrapper.find('.candidate-card__select').trigger('click')
    await wrapper.find('.candidate-actions__ghost').trigger('click')
    await wrapper.find('.candidate-actions button').trigger('click')
    await wrapper.findAll('.hiring-quick__link')[0].trigger('click')

    expect(wrapper.emitted('view-applicants')).toEqual([['job-1']])
    expect(wrapper.emitted('view-shortlisted')).toEqual([['job-1']])
    expect(wrapper.emitted('open-candidate')).toEqual([[candidate]])
    expect(wrapper.emitted('contact')).toEqual([[candidate]])
    expect(wrapper.emitted('shortlist')).toEqual([[candidate]])
    expect(wrapper.emitted('review-shortlists')).toHaveLength(1)
    expect(wrapper.find('.candidate-actions button').attributes('disabled')).toBeDefined()
  })
})
