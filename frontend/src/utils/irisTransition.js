function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
}

export function installIrisTransition(router, isEnabled) {
  const curtain = document.createElement('div')
  curtain.className = 'iris-curtain'
  curtain.setAttribute('aria-hidden', 'true')
  document.body.append(curtain)

  let pendingOrigin = null
  let pendingTimer
  let coverTimer
  let resolveCover

  function rememberOrigin(event) {
    const button = event.target.closest?.('button')
    if (!button || button.disabled || !isEnabled() || prefersReducedMotion()) return

    const rect = button.getBoundingClientRect()
    const keyboardClick = event.detail === 0 && event.clientX === 0 && event.clientY === 0
    pendingOrigin = {
      x: keyboardClick ? rect.left + rect.width / 2 : event.clientX,
      y: keyboardClick ? rect.top + rect.height / 2 : event.clientY,
    }
    clearTimeout(pendingTimer)
    pendingTimer = setTimeout(() => { pendingOrigin = null }, 0)
  }

  function finishCover() {
    if (!resolveCover) return
    clearTimeout(coverTimer)
    const resolve = resolveCover
    resolveCover = null
    resolve()
  }

  function finishAnimation() {
    if (curtain.classList.contains('iris-curtain--cover')) finishCover()
    if (curtain.classList.contains('iris-curtain--reveal')) curtain.classList.remove('iris-curtain--reveal')
  }

  function coverBeforeNavigation() {
    if (!pendingOrigin || !isEnabled() || prefersReducedMotion()) return

    clearTimeout(pendingTimer)
    curtain.style.setProperty('--iris-x', `${pendingOrigin.x}px`)
    curtain.style.setProperty('--iris-y', `${pendingOrigin.y}px`)
    pendingOrigin = null
    curtain.classList.remove('iris-curtain--reveal')
    curtain.getBoundingClientRect()
    curtain.classList.add('iris-curtain--cover')

    return new Promise((resolve) => {
      resolveCover = resolve
      coverTimer = setTimeout(finishCover, 520)
    })
  }

  function revealAfterNavigation() {
    if (!curtain.classList.contains('iris-curtain--cover')) return
    requestAnimationFrame(() => {
      curtain.classList.remove('iris-curtain--cover')
      curtain.getBoundingClientRect()
      curtain.classList.add('iris-curtain--reveal')
    })
  }

  document.addEventListener('click', rememberOrigin, true)
  curtain.addEventListener('animationend', finishAnimation)
  const removeBeforeGuard = router.beforeEach(coverBeforeNavigation)
  const removeAfterHook = router.afterEach(revealAfterNavigation)

  return () => {
    clearTimeout(pendingTimer)
    clearTimeout(coverTimer)
    document.removeEventListener('click', rememberOrigin, true)
    curtain.removeEventListener('animationend', finishAnimation)
    removeBeforeGuard()
    removeAfterHook()
    curtain.remove()
  }
}
