import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import { createTestRouter } from '../test/router'
import JobApplicantsPage from './JobApplicantsPage.vue'

vi.mock('../api', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const pendingApplicant = {
  id: 'application-1',
  workerId: 'candidate-1',
  workerName: 'Ravi Kumar',
  role: 'Cashier',
  area: 'Bandra',
  state: 'Maharashtra',
  pincode: '400050',
  status: 'Applied',
}

function page(items, current = 1, totalCount = items.length) {
  return { items, page: current, pageSize: 10, totalCount, totalPages: totalCount ? Math.ceil(totalCount / 10) : 0 }
}

let router

async function mountPage(filter = 'all') {
  router = createTestRouter()
  router.push(`/hiring/jobs/job-1/${filter === 'shortlisted' ? 'shortlisted' : 'applicants'}`)
  await router.isReady()
  return mount(JobApplicantsPage, {
    props: { filter },
    global: { plugins: [router], stubs: { BrandLogo: true } },
  })
}

describe('JobApplicantsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    api.get.mockReset()
    api.post.mockReset()
    api.post.mockResolvedValue({ data: { ...pendingApplicant, status: 'Shortlisted' } })
    api.get.mockImplementation((url, options = {}) => Promise.resolve({
      data: url.endsWith('/applications/paged')
        ? page([pendingApplicant], options.params.page)
        : { id: 'job-1', title: 'Cashier', workplaceName: 'Corner Shop' },
    }))
  })

  it('loads applicants and handles navigation and shortlisting', async () => {
    const wrapper = await mountPage()
    await flushPromises()
    const push = vi.spyOn(router, 'push').mockResolvedValue()

    expect(wrapper.text()).toContain('Cashier - Corner Shop')
    expect(wrapper.text()).toContain('Ravi Kumar')
    await wrapper.find('.candidate-card__select').trigger('click')
    await wrapper.find('.candidate-actions__ghost').trigger('click')
    await wrapper.find('.candidate-actions button').trigger('click')
    await wrapper.find('.dash-header button').trigger('click')
    await flushPromises()

    expect(push).toHaveBeenCalledWith({ name: 'candidate-detail', params: { id: 'candidate-1' } })
    expect(push).toHaveBeenCalledWith({
      name: 'candidate-detail',
      params: { id: 'candidate-1' },
      query: { contact: '1' },
    })
    expect(push).toHaveBeenCalledWith('/')
    expect(api.post).toHaveBeenCalledWith('/hiring/jobs/job-1/applications/application-1/shortlist')
  })

  it('filters the shortlisted view and reports load and shortlist failures', async () => {
    api.get.mockImplementation((url, options = {}) => Promise.resolve({
      data: url.endsWith('/applications/paged')
        ? page(options.params.status
          ? [{ ...pendingApplicant, id: 'application-2', status: 'Shortlisted' }]
          : [pendingApplicant, { ...pendingApplicant, id: 'application-2', status: 'Shortlisted' }], options.params.page)
        : null,
    }))
    const wrapper = await mountPage('shortlisted')
    await flushPromises()
    expect(wrapper.findAll('.candidate-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('Shortlisted candidates')

    api.post.mockRejectedValue(new Error('offline'))
    await wrapper.vm.shortlist(pendingApplicant)
    expect(wrapper.get('[role="alert"]').text()).toContain('Could not shortlist')

    api.post.mockResolvedValueOnce({ data: { ...pendingApplicant, status: 'Shortlisted' } })
    await wrapper.vm.shortlist(pendingApplicant)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)

    api.get.mockRejectedValue(new Error('offline'))
    await router.push('/hiring/jobs/job-2/shortlisted')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('could not load')
  })

  it('ignores an obsolete applicant response after the route changes', async () => {
    const applicationRequests = {}
    api.get.mockImplementation((url) => {
      if (url.endsWith('/applications/paged')) {
        const id = url.split('/')[3]
        return new Promise((resolve) => { applicationRequests[id] = resolve })
      }
      const id = url.split('/')[3]
      return Promise.resolve({ data: { id, title: `Role ${id}` } })
    })
    const wrapper = await mountPage()
    await flushPromises()

    await router.push('/hiring/jobs/job-2/applicants')
    await flushPromises()
    expect(wrapper.findAll('.candidate-card')).toHaveLength(0)

    applicationRequests['job-2']({ data: page([{ ...pendingApplicant, id: 'application-2', workerName: 'Latest Worker' }]) })
    await flushPromises()
    expect(wrapper.text()).toContain('Latest Worker')

    applicationRequests['job-1']({ data: page([pendingApplicant]) })
    await flushPromises()
    expect(wrapper.text()).toContain('Latest Worker')
    expect(wrapper.text()).not.toContain('Ravi Kumar')
  })

  it('blocks duplicate shortlist requests while one is pending', async () => {
    let resolveShortlist
    api.post.mockReturnValue(new Promise((resolve) => { resolveShortlist = resolve }))
    const wrapper = await mountPage()
    await flushPromises()
    const candidate = { ...pendingApplicant, applicationId: pendingApplicant.id }

    const first = wrapper.vm.shortlist(candidate)
    await wrapper.vm.shortlist(candidate)
    expect(api.post).toHaveBeenCalledTimes(1)

    resolveShortlist({ data: { ...candidate, status: 'Shortlisted' } })
    await first
  })

  it('hires shortlisted applicants and confirms terminal rejections without refetching', async () => {
    api.get.mockImplementation((url, options = {}) => Promise.resolve({
      data: url.endsWith('/applications/paged')
        ? page([
            pendingApplicant,
            {
              ...pendingApplicant,
              id: 'application-2',
              workerId: 'candidate-2',
              workerName: 'Asha Singh',
              status: 'Shortlisted',
            },
          ], options.params.page)
        : { id: 'job-1', title: 'Cashier' },
    }))
    api.post.mockImplementation((url) => Promise.resolve({
      data: {
        ...(url.includes('application-2')
          ? { ...pendingApplicant, id: 'application-2', workerId: 'candidate-2', workerName: 'Asha Singh' }
          : pendingApplicant),
        status: url.endsWith('/hire') ? 'Hired' : 'Rejected',
      },
    }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = await mountPage()
    await flushPromises()
    const applicationCallsBefore = api.get.mock.calls
      .filter(([url]) => url.endsWith('/applications/paged')).length

    await wrapper.findAll('.candidate-card').find((card) => card.text().includes('Asha Singh'))
      .findAll('button').find((button) => button.text() === 'Hire').trigger('click')
    await flushPromises()
    await wrapper.findAll('.candidate-card').find((card) => card.text().includes('Ravi Kumar'))
      .findAll('button').find((button) => button.text() === 'Reject').trigger('click')
    await flushPromises()

    expect(api.post).toHaveBeenCalledWith('/hiring/jobs/job-1/applications/application-2/hire')
    expect(api.post).toHaveBeenCalledWith('/hiring/jobs/job-1/applications/application-1/reject')
    expect(window.confirm).toHaveBeenCalledWith('Reject Ravi Kumar? This decision cannot be undone.')
    expect(api.get.mock.calls.filter(([url]) => url.endsWith('/applications/paged')).length)
      .toBeGreaterThan(applicationCallsBefore)
  })

  it('does not reject when confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = await mountPage()
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text() === 'Reject').trigger('click')

    expect(api.post).not.toHaveBeenCalled()
  })

  it('paginates applicants without reloading the role', async () => {
    const applicants = Array.from({ length: 11 }, (_, index) => ({
      ...pendingApplicant,
      id: `application-${index}`,
      workerId: `candidate-${index}`,
      workerName: `Worker ${index}`,
    }))
    api.get.mockImplementation((url, options = {}) => Promise.resolve({
      data: url.endsWith('/applications/paged')
        ? page(applicants.slice((options.params.page - 1) * 10, options.params.page * 10), options.params.page, 11)
        : { id: 'job-1', title: 'Cashier' },
    }))
    const wrapper = await mountPage()
    await flushPromises()
    const callsBeforePaging = api.get.mock.calls.length

    expect(wrapper.findAll('.candidate-card')).toHaveLength(10)
    await wrapper.find('[aria-label="Page 2 of 2"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.candidate-card')).toHaveLength(1)
    expect(api.get).toHaveBeenCalledTimes(callsBeforePaging + 1)
  })
})
