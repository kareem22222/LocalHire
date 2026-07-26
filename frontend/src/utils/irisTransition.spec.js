import { afterEach, describe, expect, it, vi } from 'vitest'
import { installIrisTransition } from './irisTransition'

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('installIrisTransition', () => {
  it('covers before button navigation, then reveals the rendered page', async () => {
    let beforeNavigate
    let afterNavigate
    const router = {
      beforeEach: vi.fn((handler) => { beforeNavigate = handler; return vi.fn() }),
      afterEach: vi.fn((handler) => { afterNavigate = handler; return vi.fn() }),
    }
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(); return 1 })
    const cleanup = installIrisTransition(router, () => true)
    const button = document.createElement('button')
    document.body.append(button)

    button.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 42, clientY: 64 }))
    const curtain = document.querySelector('.iris-curtain')
    expect(curtain.classList).not.toContain('iris-curtain--cover')

    const navigation = beforeNavigate()
    expect(curtain.classList).toContain('iris-curtain--cover')
    expect(curtain.style.getPropertyValue('--iris-x')).toBe('42px')
    curtain.dispatchEvent(new Event('animationend'))
    await navigation

    afterNavigate()
    expect(curtain.classList).toContain('iris-curtain--reveal')
    curtain.dispatchEvent(new Event('animationend'))
    expect(curtain.classList).not.toContain('iris-curtain--reveal')
    cleanup()
  })

  it('does not animate a button that performs no navigation', () => {
    const router = { beforeEach: vi.fn(() => vi.fn()), afterEach: vi.fn(() => vi.fn()) }
    const cleanup = installIrisTransition(router, () => true)
    const button = document.createElement('button')
    document.body.append(button)

    button.click()
    expect(document.querySelector('.iris-curtain').className).toBe('iris-curtain')
    cleanup()
  })
})
