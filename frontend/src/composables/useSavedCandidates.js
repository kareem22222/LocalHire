import { ref } from 'vue'

// A lightweight, client-side "saved shortlist" of worker ids. Used for the
// talent browsing flows ("Talent near your business", the all-candidates page,
// and the candidate detail page) where there is no specific job/application to
// attach a server-side shortlist to. Persisted to localStorage so the employer's
// picks survive reloads. Per-job shortlisting (on a role's applicants page) is a
// separate, server-backed flow that changes an application's status.
const STORAGE_KEY = 'localhire.savedCandidates'

function readInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

// Module-level so every component shares the same reactive set.
const saved = ref(readInitial())

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...saved.value]))
  } catch {
    // Storage unavailable (private mode); keep the in-memory set only.
  }
}

export function clearSavedCandidates() {
  saved.value = new Set()
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable; the in-memory shortlist is already cleared.
  }
}

export function useSavedCandidates() {
  function isSaved(id) {
    return id != null && saved.value.has(id)
  }

  function add(id) {
    if (id == null || saved.value.has(id)) return
    const next = new Set(saved.value)
    next.add(id)
    saved.value = next
    persist()
  }

  function remove(id) {
    if (!saved.value.has(id)) return
    const next = new Set(saved.value)
    next.delete(id)
    saved.value = next
    persist()
  }

  return { saved, isSaved, add, remove }
}
