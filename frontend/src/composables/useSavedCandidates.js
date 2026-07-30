import { ref } from 'vue'
import { getSavedCandidates, removeSavedCandidate, saveCandidate } from '../api/jobs.js'

const saved = ref(new Set())
let loaded = false
let loadPromise = null
let generation = 0

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
    await load().catch(() => {})
    if (currentGeneration !== generation || saved.value.has(id)) return
    saved.value = new Set([...saved.value, id])
    try {
      await saveCandidate(id)
    } catch {
      saved.value = new Set([...saved.value].filter((savedId) => savedId !== id))
    }
  }

  async function remove(id) {
    const currentGeneration = generation
    await load().catch(() => {})
    if (currentGeneration !== generation || !saved.value.has(id)) return
    saved.value = new Set([...saved.value].filter((savedId) => savedId !== id))
    try {
      await removeSavedCandidate(id)
    } catch {
      saved.value = new Set([...saved.value, id])
    }
  }

  return { saved, isSaved, add, remove, load }
}
