import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestRouter } from '../test/router'
import { getPublicJob } from '../api/jobs'
import PublicJobPage from './PublicJobPage.vue'

vi.mock('../api', () => ({ authRole: vi.fn(() => ''), hasAuthToken: vi.fn(() => false) }))
vi.mock('../api/jobs', () => ({ getPublicJob: vi.fn() }))

describe('PublicJobPage', () => {
  beforeEach(() => {
    getPublicJob.mockResolvedValue({ data: {
      id: 'job-1', title: 'Cashier', description: 'Front desk work', workplaceName: 'Corner Shop',
      cityArea: 'Bandra', state: 'Maharashtra', employmentType: 'FullTime', requiredSkills: ['Billing'],
      languages: ['Hindi'], benefits: [], createdAt: '2026-09-17T00:00:00Z',
    } })
  })

  it('loads a restricted public vacancy and requests sign-in to apply', async () => {
    const wrapper = mount(PublicJobPage, {
      props: { id: 'job-1' },
      global: { plugins: [createTestRouter()], stubs: { BrandLogo: true } },
    })
    await flushPromises()

    expect(getPublicJob).toHaveBeenCalledWith('job-1')
    expect(wrapper.text()).toContain('Cashier')
    await wrapper.find('.worker-primary').trigger('click')
    expect(wrapper.emitted('request-auth')).toEqual([[{ role: 'LookingForWork', mode: 'login' }]])
    wrapper.unmount()
  })
})
