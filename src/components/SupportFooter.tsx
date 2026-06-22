import { useState } from 'react'
import { copy } from '../lib/copy'

const CARD_NUMBER = '2204 1201 3562 7889'

export function SupportFooter() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(CARD_NUMBER.replace(/\s/g, ''))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <footer className="mt-8 border-t border-white/[0.06] pt-5 pb-6 text-center">
      <p className="font-display text-micro uppercase tracking-widest text-muted">{copy.support.title}</p>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-body tracking-wider text-accent transition-colors active:bg-white/[0.06]"
        data-allow-copy
        aria-label={copy.support.copyAria}
      >
        <span>{CARD_NUMBER}</span>
        <span className="text-micro font-sans uppercase tracking-wide text-muted">
          {copied ? copy.support.copied : copy.support.copy}
        </span>
      </button>
      <p className="mt-2 text-caption text-muted">{copy.support.hint}</p>
      <p className="mt-5 text-caption leading-relaxed text-muted">
        {copy.support.feedback}{' '}
        <a href={`mailto:${copy.support.email}`} className="text-accent underline-offset-2 hover:underline">
          {copy.support.email}
        </a>
      </p>
    </footer>
  )
}
