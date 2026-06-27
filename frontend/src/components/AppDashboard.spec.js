import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppDashboard from './AppDashboard.vue'
import api from '../api'

vi.mock('../api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))

function mountDashboard() {
  return mount(AppDashboard, {
    global: {
      stubs: { BrandLogo: true },
    },
  })
}

describe('AppDashboard', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: [] })
    api.post.mockResolvedValue({ data: {} })
    api.put.mockResolvedValue({ data: {} })
  })

  it('loads hiring jobs after profile fetch', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 'Hiring' } : [],
    }))

    mountDashboard()
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/hiring/jobs')
  })

  it('loads worker applications and jobs after profile fetch', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 'LookingForWork' } : [],
    }))

    mountDashboard()
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/work/applications')
    expect(api.get).toHaveBeenCalledWith('/work/jobs/nearby', { params: {} })
  })

  it('location success saves coordinates and reloads nearby jobs with coordinates', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 'LookingForWork' } : [],
    }))
    vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementation((success) => {
      success({ coords: { latitude: 12.3456, longitude: 78.9012 } })
    })

    const wrapper = mountDashboard()
    await flushPromises()
    await wrapper.find('.location-prompt button').trigger('click')
    await flushPromises()

    expect(api.put).toHaveBeenCalledWith('/me/location', { latitude: 12.346, longitude: 78.901 })
    expect(api.get).toHaveBeenCalledWith('/work/jobs/nearby', { params: { lat: 12.346, lng: 78.901 } })
  })

  it('location denied loads jobs without coordinates', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 'LookingForWork' } : [],
    }))
    vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementation((_, error) => {
      error()
    })

    const wrapper = mountDashboard()
    await flushPromises()
    await wrapper.find('.location-prompt button').trigger('click')
    await flushPromises()

    expect(api.get).toHaveBeenCalledWith('/work/jobs/nearby', { params: {} })
  })

  it('creating a job preserves zero coordinates', async () => {
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/auth/me' ? { name: 'Pat', role: 'Hiring' } : [],
    }))

    const wrapper = mountDashboard()
    await flushPromises()
    await wrapper.find('.dash-btn--primary').trigger('click')

    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('Cashier')
    await wrapper.find('textarea').setValue('Front desk')
    await inputs[1].setValue('Corner Shop')
    await inputs[2].setValue('Bandra')
    await inputs[3].setValue(0)
    await inputs[4].setValue(0)
    await wrapper.find('.job-form > .dash-btn').trigger('click')

    expect(api.post).toHaveBeenCalledWith('/hiring/jobs', {
      title: 'Cashier',
      description: 'Front desk',
      workplaceName: 'Corner Shop',
      cityArea: 'Bandra',
      latitude: 0,
      longitude: 0,
    })
  })
})