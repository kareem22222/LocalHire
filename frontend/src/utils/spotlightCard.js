const TILT = 9

export function moveSpotlight(event) {
  const card = event.currentTarget
  const rect = card.getBoundingClientRect()
  const x = rect.width ? Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) : 0.5
  const y = rect.height ? Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)) : 0.5

  card.style.setProperty('--spotlight-x', `${Math.round(x * 100)}%`)
  card.style.setProperty('--spotlight-y', `${Math.round(y * 100)}%`)
  card.style.setProperty('--spotlight-rx', `${((0.5 - y) * TILT * 2).toFixed(2)}deg`)
  card.style.setProperty('--spotlight-ry', `${((x - 0.5) * TILT * 2).toFixed(2)}deg`)
}

export function resetSpotlight(event) {
  const card = event.currentTarget
  card.style.setProperty('--spotlight-x', '50%')
  card.style.setProperty('--spotlight-y', '50%')
  card.style.setProperty('--spotlight-rx', '0deg')
  card.style.setProperty('--spotlight-ry', '0deg')
}
