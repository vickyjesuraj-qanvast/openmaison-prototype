'use client'

import { useMemo } from 'react'
import type { MaisonSuggestion } from '@/lib/maison-ai'
import type { QuoteTextTemplate } from '@/lib/db/schema'
import type { TextContext, TextKind, TokenValues } from '@/lib/quotes/text'
import { isBlank } from '@/lib/writing/html'
import { proposeWriting, type WritingAction } from '@/lib/writing/propose'
import { quoteTextSources } from '@/lib/writing/sources'

const WORD: Record<TextKind, string> = { terms: 'terms', notes: 'notes' }

/**
 * (pending modules S29 — card api:ai-writing-help-quotes; the brief: the help appears where the words are written AND in the editor's
 * Maison AI sheet) The quote editor's sheet offers the writing help when it would do something here — worked out by rule, as the Terms /
 * Notes button's menu does: an empty section shown to the client is written from this quote; a section with fixes to make is improved; the
 * terms or notes that leave something out get it from the quote and the studio's templates; formal words get plain English. Each row opens
 * that section's proposal (never writes by itself). At most three, Terms first. *(invented copy: the rows' words)*
 */
export function useTextMaison(o: {
  texts: Record<TextKind, string>
  visible: Record<TextKind, boolean>
  context: TextContext
  templates: Record<TextKind, readonly QuoteTextTemplate[]>
  tokens: TokenValues
  onWrite: (kind: TextKind, action: WritingAction) => void
}): MaisonSuggestion[] {
  const { texts, visible, context, templates, tokens, onWrite } = o
  const rows = useMemo(() => {
    const first: { kind: TextKind; action: WritingAction; label: string }[] = []
    const more: typeof first = []
    for (const kind of ['terms', 'notes'] as const) {
      const html = texts[kind]
      const src = quoteTextSources(kind, context, templates[kind], tokens)
      const w = WORD[kind]
      if (isBlank(html)) { if (visible[kind]) first.push({ kind, action: 'rewrite', label: `Write the ${w} from this quote` }); continue }
      const fix = proposeWriting({ action: 'improve', html, kind, sources: src })
      if (!fix.none) first.push({ kind, action: 'improve', label: `Improve the ${w} — ${fix.short.replace(/ —.*$/, '')}` })
      const add = proposeWriting({ action: 'expand', html, kind, sources: src })
      /* one thing named; several counted (the proposal names each) */
      if (!add.none) more.push({ kind, action: 'expand', label: (add.added ?? 1) > 1 ? `Add what the ${w} leave out — ${add.added} points` : `Add what the ${w} leave out — ${add.short.replace(/^Adds /, '')}` })
      const plain = proposeWriting({ action: 'plain', html, kind, sources: src })
      if (!plain.none) more.push({ kind, action: 'plain', label: `Put the ${w} in plain English` })
    }
    return [...first, ...more].slice(0, 3)
  }, [texts, visible, context, templates, tokens])
  return rows.map((r) => ({ label: r.label, run: () => onWrite(r.kind, r.action) }))
}
