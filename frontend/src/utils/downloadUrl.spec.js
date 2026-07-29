import { describe, expect, it } from 'vitest'
import { safeDownloadUrl } from './downloadUrl.js'

describe('safeDownloadUrl', () => {
  it('allows HTTPS, local development, and the mock download path', () => {
    expect(safeDownloadUrl('https://bucket.s3.amazonaws.com/resume.pdf')).toBe(
      'https://bucket.s3.amazonaws.com/resume.pdf',
    )
    expect(safeDownloadUrl('http://localhost:4566/resume.pdf')).toBe(
      'http://localhost:4566/resume.pdf',
    )
    expect(new URL(safeDownloadUrl('/api/test/resume.pdf')).pathname).toBe('/api/test/resume.pdf')
  })

  it.each(['javascript:alert(1)', 'data:text/html,unsafe', 'http://example.com/resume.pdf'])(
    'rejects unsafe URL %s',
    (url) => expect(() => safeDownloadUrl(url)).toThrow('Unsafe resume download URL'),
  )
})
