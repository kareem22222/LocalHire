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
  status: 'Pending',
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
    api.get.mockReset()
    api.post.mockReset()
    api.post.mockResolvedValue({ data: { ...pendingApplicant, status: 'Shortlisted' } })
    api.get.mockImplementation((url) => Promise.resolve({
      data: url.endsWith('/applications')
        ? [pendingApplicant]
        : { id: 'job-1', title: 'Cashier', workplaceName: 'Corner Shop' },
    }))
  })

  it('loads applicants and handles navigation and shortlisting', async () => {
    const wrapper = await mountPage()
    await flushPromises()
    const push = vi.spyOn(router, 'push').mockResolvedValue()

    expect(wrapper.text()).toContain('Cashier - Corner Shop')
    expect(wrapper.text()).toContain('Ravi Kumar')
    await wrapper.find('.candidate-card').trigger('click')
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
    api.get.mockImplementation((url) => Promise.resolve({
      data: url.endsWith('/applications')
        ? [pendingApplicant, { ...pendingApplicant, id: 'application-2', status: 'Shortlisted' }]
        : null,
    }))
    const wrapper = await mountPage('shortlisted')
    await flushPromises()
    expect(wrapper.findAll('.candidate-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('Shortlisted candidates')

    api.post.mockRejectedValue(new Error('offline'))
    await wrapper.vm.shortlist(pendingApplicant)
    expect(wrapper.get('[role="alert"]').text()).toContain('Could not shortlist')

    api.get.mockRejectedValue(new Error('offline'))
    await router.push('/hiring/jobs/job-2/shortlisted')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('could not load')
  })
})
