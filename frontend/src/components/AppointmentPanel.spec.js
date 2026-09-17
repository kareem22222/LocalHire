import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api'
import { useProfileStore } from '../stores/profile'
import AppointmentPanel from './AppointmentPanel.vue'

vi.mock('../api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))

describe('AppointmentPanel', () => {
  beforeEach(() => {
    useProfileStore().profile = { id: 'worker-1' }
    api.get.mockResolvedValue({ data: { id: 'appointment-1', applicationId: 'application-1', proposedById: 'employer-1', startsAt: '2026-10-01T10:00:00Z', timeZone: 'UTC', venue: 'Local Mart', status: 'Proposed' } })
    api.post.mockResolvedValue({ data: { id: 'appointment-1', status: 'Confirmed' } })
  })

  it('loads lazily and lets the other participant confirm', async () => {
    const wrapper = mount(AppointmentPanel, { props: { applicationId: 'application-1', role: 'work' } })
    expect(api.get).not.toHaveBeenCalled()

    wrapper.get('details').element.open = true
    await wrapper.get('details').trigger('toggle')
    await flushPromises()
    expect(api.get).toHaveBeenCalledWith('/work/applications/application-1/appointment')

    await wrapper.findAll('button').find((button) => button.text() === 'Confirm').trigger('click')
    await flushPromises()
    expect(api.post).toHaveBeenCalledWith('/work/applications/application-1/appointment/confirm')
    expect(wrapper.text()).toContain('Confirmed')
  })
})
