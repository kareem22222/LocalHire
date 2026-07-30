import { ref } from 'vue'
import { getSavedCandidates, removeSavedCandidate, saveCandidate } from '../api/jobs.js'

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
  loadPromise = getSavedCandidates()
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

export function clearSavedCandidates() {
  generation += 1
  loaded = false
  loadPromise = null
  mutations.clear()
  saved.value = new Set()
}

export function useSavedCandidates() {
  void load().catch(() => {})

  function isSaved(id) {
    return id != null && saved.value.has(id)
  }

  async function add(id) {
    if (id == null) return
    const currentGeneration = generation
    return enqueue(id, async () => {
      await load().catch(() => {})
      if (currentGeneration !== generation || saved.value.has(id)) return
      saved.value = new Set([...saved.value, id])
      try {
        await saveCandidate(id)
      } catch {
        if (currentGeneration === generation)
          saved.value = new Set([...saved.value].filter((savedId) => savedId !== id))
      }
    })
  }

  async function remove(id) {
    const currentGeneration = generation
    return enqueue(id, async () => {
      await load().catch(() => {})
      if (currentGeneration !== generation || !saved.value.has(id)) return
      saved.value = new Set([...saved.value].filter((savedId) => savedId !== id))
      try {
        await removeSavedCandidate(id)
      } catch {
        if (currentGeneration === generation)
          saved.value = new Set([...saved.value, id])
      }
    })
  }

  return { saved, isSaved, add, remove, load }
}
