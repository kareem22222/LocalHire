export function apiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  const data = error?.response?.data
  const validation = Object.values(data?.errors || {}).flat().find(Boolean)
  return validation || data?.detail || data?.message || data?.error || data?.title || error?.message || fallback
}
