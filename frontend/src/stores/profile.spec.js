import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as profileApi from '../api/profile.js'
import { useProfileStore } from './profile.js'

vi.mock('../api/profile.js', () => ({
  getMe: vi.fn(),
  updateProfile: vi.fn(),
  updateLocation: vi.fn(),
}))

describe('profile store cache', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('reuses a fresh profile instead of requesting it again', async () => {
    profileApi.getMe.mockResolvedValue({ data: { id: 'user-1', name: 'Asha' } })
    const store = useProfileStore()

    const first = await store.fetchProfile()
    const second = await store.fetchProfile()

    expect(second).toEqual(first)
    expect(profileApi.getMe).toHaveBeenCalledTimes(1)
  })

  it('deduplicates concurrent profile requests', async () => {
    let resolveRequest
    profileApi.getMe.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    const store = useProfileStore()

    const first = store.fetchProfile()
    const second = store.fetchProfile()
    resolveRequest({ data: { id: 'user-1', name: 'Asha' } })

    await expect(first).resolves.toEqual({ id: 'user-1', name: 'Asha' })
    await expect(second).resolves.toEqual({ id: 'user-1', name: 'Asha' })
    expect(profileApi.getMe).toHaveBeenCalledTimes(1)
  })

  it('writes profile updates into the cache', async () => {
    profileApi.updateProfile.mockResolvedValue({ data: { id: 'user-1', name: 'Asha Rao' } })
    const store = useProfileStore()

    await store.updateProfile({ name: 'Asha Rao' })
    const cached = await store.fetchProfile()

    expect(cached.name).toBe('Asha Rao')
    expect(profileApi.getMe).not.toHaveBeenCalled()
  })

  it('does not repopulate the profile when clear() runs during an in-flight fetch', async () => {
    let resolveRequest
    profileApi.getMe.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    const store = useProfileStore()

    const pending = store.fetchProfile()
    store.clear()
    resolveRequest({ data: { id: 'user-1', name: 'Asha' } })
    await pending

    expect(store.profile).toBeNull()
  })
})
