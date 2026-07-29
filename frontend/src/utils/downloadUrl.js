export function safeDownloadUrl(value) {
  const url = new URL(value, window.location.origin)
  const isLocalHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
  const isMockPath = typeof value === 'string' && value.startsWith('/api/test/')
  if (url.protocol !== 'https:' && !isLocalHttp && !isMockPath) {
    throw new TypeError('Unsafe resume download URL')
  }
  return url.href
}
