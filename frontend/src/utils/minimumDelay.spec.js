import { describe, expect, it, vi } from 'vitest'
import { withMinimumDelay } from './minimumDelay'

describe('withMinimumDelay', () => {
  it('settles successful and failed tasks only after the minimum time', async () => {
    vi.useFakeTimers()
    const error = new Error('failed')
    const success = withMinimumDelay(() => Promise.resolve('ready'))
    const failure = withMinimumDelay(() => Promise.reject(error))
    const successSettled = vi.fn()
    const failureSettled = vi.fn()
    success.then(successSettled)
    failure.catch(failureSettled)

    await vi.advanceTimersByTimeAsync(1499)
    expect(successSettled).not.toHaveBeenCalled()
    expect(failureSettled).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await expect(success).resolves.toBe('ready')
    await expect(failure).rejects.toBe(error)
    vi.useRealTimers()
  })
})
