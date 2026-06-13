/** Deter casual copying from the live site (not a security boundary). */
function isCopyAllowed(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(
    target.closest(
      'input, textarea, select, [data-allow-copy], [data-allow-select], a[href^="mailto:"]',
    ),
  )
}

export function initCopyProtection(): void {
  document.addEventListener('contextmenu', (e) => {
    if (!isCopyAllowed(e.target)) e.preventDefault()
  })

  document.addEventListener('copy', (e) => {
    if (!isCopyAllowed(e.target)) e.preventDefault()
  })

  document.addEventListener('cut', (e) => {
    if (!isCopyAllowed(e.target)) e.preventDefault()
  })

  document.addEventListener('selectstart', (e) => {
    if (!isCopyAllowed(e.target)) e.preventDefault()
  })

  document.addEventListener('dragstart', (e) => {
    if (e.target instanceof HTMLImageElement && !isCopyAllowed(e.target)) {
      e.preventDefault()
    }
  })
}
