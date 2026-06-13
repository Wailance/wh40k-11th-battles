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
    <footer className="mt-8 border-t border-white/[0.06] pt-5 pb-2 text-center">
      <p className="font-display text-[10px] uppercase tracking-widest text-muted">{copy.support.title}</p>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 font-mono text-sm tracking-wider text-accent transition-colors active:bg-white/[0.06]"
        data-allow-copy
        aria-label={copy.support.copyAria}
      >
        <span>{CARD_NUMBER}</span>
        <span className="text-[10px] font-sans uppercase tracking-wide text-muted">
          {copied ? copy.support.copied : copy.support.copy}
        </span>
      </button>
      <p className="mt-2 text-[10px] text-muted/70">{copy.support.hint}</p>
      <p className="mt-5 text-[11px] leading-relaxed text-muted/80">
        {copy.support.feedback}{' '}
        <a href={`mailto:${copy.support.email}`} className="text-accent underline-offset-2 hover:underline">
          {copy.support.email}
        </a>
      </p>
    </footer>
  )
}
