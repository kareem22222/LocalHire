import { ref } from 'vue'
import { getSavedJobs, removeSavedJob, saveJob } from '../api/jobs.js'

const saved = ref(new Set())
let loaded = false
let loadPromise = null
let generation = 0
const mutations = new Map()

function enqueue(id, operation) {
  const current = (mutations.get(id) || Promise.resolve()).catch(() => {}).then(operation)
  mutations.set(id, current)
  return current.finally(() => {
    if (mutations.get(id) === current) mutations.delete(id)
  })
}

async function load() {
  if (loaded) return
  if (loadPromise) return loadPromise

  const currentGeneration = generation
  loadPromise = getSavedJobs()
    .then(({ data }) => {
      if (currentGeneration !== generation) return
      saved.value = new Set(data)
      loaded = true
    })
    .finally(() => {
      if (currentGeneration === generation) loadPromise = null
    })
  return loadPromise
}

export function clearSavedJobs() {
  generation += 1
  loaded = false
  loadPromise = null
  mutations.clear()
  saved.value = new Set()
}

export function useSavedJobs() {
  void load().catch(() => {})

  function isSaved(id) {
    return id != null && saved.value.has(id)
  }

  async function toggle(id) {
    if (id == null) return
    const currentGeneration = generation
    return enqueue(id, async () => {
      await load().catch(() => {})
      if (currentGeneration !== generation) return
      const wasSaved = saved.value.has(id)
      saved.value = wasSaved
        ? new Set([...saved.value].filter((savedId) => savedId !== id))
        : new Set([...saved.value, id])
      try {
        await (wasSaved ? removeSavedJob(id) : saveJob(id))
      } catch {
        if (currentGeneration !== generation) return
        saved.value = wasSaved
          ? new Set([...saved.value, id])
          : new Set([...saved.value].filter((savedId) => savedId !== id))
      }
    })
  }

  return { saved, isSaved, toggle, load }
}
