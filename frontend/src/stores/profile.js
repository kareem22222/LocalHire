import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as profileApi from '../api/profile.js'

const PROFILE_TTL_MS = 5 * 60 * 1000

export const useProfileStore = defineStore('profile', () => {
  const profile = ref(null)
  const fetchedAt = ref(0)
  let pendingRequest = null

  async function fetchProfile({ force = false } = {}) {
    const isFresh = profile.value && Date.now() - fetchedAt.value < PROFILE_TTL_MS
    if (!force && isFresh) return profile.value
    if (pendingRequest) return pendingRequest

    const request = profileApi.getMe()
      .then(({ data }) => {
        if (pendingRequest === request) {
          profile.value = data
          fetchedAt.value = Date.now()
        }
        return data
      })
      .finally(() => {
        if (pendingRequest === request) {
          pendingRequest = null
        }
      })

    pendingRequest = request
    return pendingRequest
  }

  async function updateProfile(details) {
    const { data } = await profileApi.updateProfile(details)
    profile.value = data
    fetchedAt.value = Date.now()
    return data
  }

  async function updateLocation(coords) {
    const { data } = await profileApi.updateLocation(coords)
    profile.value = data
    fetchedAt.value = Date.now()
    return data
  }

  function invalidate() {
    fetchedAt.value = 0
  }

  function clear() {
    profile.value = null
    fetchedAt.value = 0
    pendingRequest = null
  }

  return { profile, fetchedAt, fetchProfile, updateProfile, updateLocation, invalidate, clear }
})
