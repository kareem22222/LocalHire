// Normalizes the many shapes a user role can arrive in (numeric backend enum,
// numeric string, or various text spellings) into 'hiring' | 'worker' | ''.
export function normalizeRole(role) {
  if (role === 1 || role === '1') return 'hiring'
  if (role === 0 || role === '0') return 'worker'

  const value = String(role || '').trim().toLowerCase()
  if (['hiring', 'employer'].includes(value)) return 'hiring'
  if (['lookingforwork', 'looking_for_work', 'worker'].includes(value)) return 'worker'
  return ''
}
