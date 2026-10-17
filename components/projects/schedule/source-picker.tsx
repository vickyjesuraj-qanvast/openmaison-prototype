'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { ChoiceCard } from '@/components/om/choice-card'
import { TextField } from '@/components/om/text-field'
import { Icon } from '@/components/om/icon'
import { UPLOAD_ACCEPT, unreadHelp } from '@/lib/quotes/upload'
import { readQuoteUpload } from '@/lib/quotes/read-upload'   // (S42 B·4 · D·2) the one reader
import { plural } from '@/lib/projects/schedule-model'
import { draftsFromQuote, draftsFromTemplate, type Draft } from '@/lib/projects/schedule-phases'
import { presetByKey } from '@/lib/projects/schedule-presets'
import { draftTimeline, type AiInput } from '@/lib/projects/schedule-ai'   // (gaps build I)
import type { AiContext } from './ai-draft'
import type { QuoteSource, ScheduleTemplateOption } from '@/lib/projects/schedule'
import type { ScheduleSource } from '@/app/projects/schedule-actions'
import { chargeAI, refundAIWork } from '@/components/credits/credits-client'
import { costOf } from '@/lib/credits/schedule'
import styles from './schedule.module.css'

/** (gaps build, package C — 2 · 3 · 4) Where a schedule's milestones come from — the Start card's and the Rebuild dialog's one control. */
export type SourcePick = 'quote' | 'template' | 'upload' | 'blank'
  | 'ai'   // (gaps build I, I-Q13) Drafted by Maison AI
export type UploadPick = { name: string; trades: string[]; sections: string[]; lines: number } | null
export type SourceState = { pick: SourcePick; quoteId: string; templateId: string; upload: UploadPick
  /** (gaps build I, I-Q14) Maison AI's milestones the studio unticked in the review */ aiSkip?: string[] }

/** The source as the server takes it: the signed quote by its old name, any other quote by id, an upload's trades and sections, a template. */
export function sourceOf(s: SourceState, signedId: string | null): ScheduleSource | null {
  if (s.pick === 'blank') return 'blank'
  if (s.pick === 'ai') return s.quoteId ? { ai: { quote: s.quoteId, skip: s.aiSkip ?? [] } } : null   // (gaps build I)
  if (s.pick === 'quote') return s.quoteId ? (s.quoteId === signedId ? 'quote' : { quote: s.quoteId }) : null
  if (s.pick === 'upload') return s.upload ? { upload: { name: s.upload.name, trades: s.upload.trades, sections: s.upload.sections } } : null
  return s.templateId ? { template: s.templateId } : null
}
/** What a source makes from works start — the same functions the server lays them out with. */
export function draftsOfSource(s: SourceState, start: number | null, quotes: QuoteSource[], templates: ScheduleTemplateOption[], ai?: AiContext): Draft[] {
  if (start === null) return []
  if (s.pick === 'ai') { const q = quotes.find((x) => x.id === s.quoteId); return q && ai ? draftTimeline(aiInputOf(q, ai), start, s.aiSkip ?? []).drafts : [] }   // (gaps build I)
  if (s.pick === 'quote') { const q = quotes.find((x) => x.id === s.quoteId); return q ? draftsFromQuote({ trades: q.trades, sections: q.sections }, start) : [] }
  if (s.pick === 'upload') return s.upload ? draftsFromQuote({ trades: s.upload.trades, sections: s.upload.sections }, start) : []
  if (s.pick === 'template') { const t = templates.find((x) => x.id === s.templateId); return t ? draftsFromTemplate(t.items, start) : [] }
  return []
}

/** (gaps build I) What Maison AI's draft reads from a quote and the project. */
export const aiInputOf = (q: QuoteSource, ai: AiContext): AiInput => ({ ...ai, lines: q.items ?? [], quoteNumber: q.number })
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(16).padStart(8, '0')}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`)
/** (pending modules S19) What reading an uploaded quote costs — one price for every quote read (1.0's `quote_digitize`). */
const READ = costOf('quote_digitize')
const quoteLabel = (q: QuoteSource) => `${q.number} · ${q.signed ? 'Signed' : q.status} · ${plural(q.lines, 'line')}`
const templateLabel = (t: ScheduleTemplateOption, all: ScheduleTemplateOption[]) => {
  const same = all.filter((x) => x.name === t.name)
  return `${t.name}${t.presetKey ? ' (ready-made)' : ''}${same.length > 1 ? ` (${same.indexOf(t) + 1})` : ''}`
}

/**
 * The radio cards and the pick under each: a quote (the lead's, signed first — its stages of work, or its sections when no line names a trade),
 * a schedule template (the ready-made ones marked), an uploaded quote (read here by Upload a quote's reader — a spreadsheet for real, (S42 D·2) a PDF from its own words; formerly a PDF or a
 * photo the reference quotes' way; a quote read, 5 AI credits — pending modules S19), and — on the Start card — nothing yet. A way that can't be used says why.
 */
export function SourcePicker({ value, onChange, quotes, templates, disabled = false, blank = false, templateHelp, testId, ai, blankLabel, compact = false }: {
  value: SourceState
  onChange: (s: SourceState) => void
  quotes: QuoteSource[]
  templates: ScheduleTemplateOption[]
  disabled?: boolean
  /** Offer "Nothing yet" (the Start card). */
  blank?: boolean
  /** Why the template was picked first, under its select. */
  templateHelp?: string | null
  testId?: string
  /** (gaps build I, I-Q13) Offer Drafted by Maison AI — the scope, the kind of home and the project type it reads besides the quote. */
  ai?: AiContext
  /** (simplify S-17) The blank way's words — the Start sheet's "Not now" (its Start card stays on the Schedule tab). */
  blankLabel?: { title: string; help: string }
  /** (simplify S-17) On a phone the ways are one select, the pick's own control under it — the cards don't fit a sheet. */
  compact?: boolean
}) {
  const file = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const [readErr, setReadErr] = useState<string | null>(null)
  const set = (p: Partial<SourceState>) => onChange({ ...value, ...p })
  /* (pending modules S19 — card held:ai-credits "one price table") reading an uploaded quote is a quote read, as Upload a quote's is (1.0's
     project quote upload went through the same `quote_digitize`): taken at the read, keyed by the project and the read
     (`schedule:<project>:<read>` — Usage › Activity links the project's Schedule), a refusal opens its moment, a file that can't be read
     gives it back. The project is the page's (/projects/<id>/…), as the Start sheet finds it. */
  const params = useParams<{ id?: string | string[] }>()
  const projectId = typeof params?.id === 'string' && /^[0-9a-f-]{36}$/.test(params.id) ? params.id : null
  const again = useRef<(f: File) => void>(() => {})
  const read = async (f: File) => {
    const ref = `schedule:${projectId ?? newId()}:${newId()}`
    const charged = await chargeAI({ action: 'quote_digitize', ref, what: 'quote', needed: READ, retry: () => again.current(f) })
    if (charged === false) return
    const back = async () => (charged > 0 ? refundAIWork(ref) : 0)
    const backWords = (n: number) => (n > 0 ? ` — your ${n} AI credits are back` : '')
    setReading(true); setReadErr(null)
    try {
      const r = await readQuoteUpload(f)   // (S42 D·2) a sheet for real, a PDF from its own words — never its name
      if (!r.ok) { const n = await back(); setReadErr(`${r.reason === 'unreadable' ? 'We couldn’t read that file — try a spreadsheet (XLSX or CSV) or a PDF of the quote' : r.reason === 'empty' ? 'That file has no lines we could read' : unreadHelp(r, '').replace(/\.$/, '')}${backWords(n)}`); set({ upload: null }); return }
      const lines = r.groups.flatMap((g) => g.lines)
      const trades = lines.map((l) => (l.category ?? '').trim()).filter(Boolean)
      const sec: string[] = []
      for (const l of lines) { const t = (l.section ?? '').trim(); if (t && !sec.includes(t)) sec.push(t) }
      const sections = sec.length ? sec : r.groups.map((g) => g.name ?? '').filter(Boolean)
      set({ pick: 'upload', upload: { name: f.name, trades, sections, lines: lines.length } })
    } catch { const n = await back(); setReadErr(`We couldn’t read that file — try a spreadsheet (XLSX or CSV) or a PDF of the quote${backWords(n)}`); set({ upload: null }) }
    finally { setReading(false) }
  }
  useEffect(() => { again.current = (f) => { void read(f) } })
  const q = quotes.find((x) => x.id === value.quoteId) ?? null
  const t = templates.find((x) => x.id === value.templateId) ?? null
  /* (simplify S-17) the compact picker: the ways as one select (a way that can't be used is left out), then the same control each way
     brings — the quote, the template, the file — and the way's own help line */
  if (compact) {
    const ways: { pick: SourcePick; title: string; help: string }[] = [
      ...(quotes.length ? [{ pick: 'quote' as const, title: 'A quote', help: `One milestone for each stage of work in ${(q ?? quotes[0]!).number}, in the order it runs on site.` }] : []),
      ...(ai && quotes.some((x) => x.lines > 0) ? [{ pick: 'ai' as const, title: 'Drafted by Maison AI', help: 'From the quote and the scope — reviewed before anything changes. It costs no AI credits.' }] : []),
      ...(templates.length ? [{ pick: 'template' as const, title: 'A schedule template', help: 'From Company › Templates › Schedules.' }] : []),
      { pick: 'upload' as const, title: 'An uploaded quote', help: value.upload ? `${value.upload.name} — ${plural(value.upload.lines, 'line')} read.` : `A spreadsheet of its lines (XLSX or CSV) or a PDF · reading it uses ${READ} AI credits.` },
      ...(blank ? [{ pick: 'blank' as const, title: blankLabel?.title ?? 'Nothing yet', help: blankLabel?.help ?? 'Start blank and add milestones one at a time.' }] : []),
    ]
    const now = ways.find((w) => w.pick === value.pick) ?? ways[0]!
    const choose = (title: string) => {
      const w = ways.find((x) => x.title === title)
      if (!w) return
      if (w.pick === 'quote' || w.pick === 'ai') set({ pick: w.pick, quoteId: value.quoteId || quotes[0]?.id || '', ...(w.pick === 'ai' ? { aiSkip: [] } : {}) })
      else if (w.pick === 'template') set({ pick: 'template', templateId: value.templateId || templates[0]?.id || '' })
      else if (w.pick === 'upload') { set({ pick: 'upload' }); if (!value.upload) file.current?.click() }
      else set({ pick: 'blank' })
    }
    return (
      <div className={styles.sources} data-testid={testId}>
        <TextField label="Milestones come from" mode="select" value={now.title} options={ways.map((w) => w.title)} disabled={disabled} onChange={choose} helper={now.help} />
        {(value.pick === 'quote' || value.pick === 'ai') && quotes.length > 1 ? (
          <TextField label="Quote" mode="select" value={q ? quoteLabel(q) : ''} options={quotes.map(quoteLabel)} disabled={disabled} onChange={(v) => set({ quoteId: quotes.find((x) => quoteLabel(x) === v)?.id ?? '', aiSkip: [] })} />
        ) : null}
        {value.pick === 'template' && templates.length ? (
          <TextField label="Template" mode="select" value={t ? templateLabel(t, templates) : ''} options={templates.map((x) => templateLabel(x, templates))} disabled={disabled}
                     onChange={(v) => set({ templateId: templates.find((x) => templateLabel(x, templates) === v)?.id ?? '' })} helper={templateHelp ?? undefined} />
        ) : null}
        {value.pick === 'upload' ? (
          <span className={styles.uploadRow}>
            <Button variant="secondary" appearance="outlined" size="sm" iconStart={<Icon name="upload_file" size={20} />} onPress={() => file.current?.click()} isDisabled={disabled || reading} data-testid="source-upload">{reading ? 'Reading…' : value.upload ? 'Choose another file' : 'Choose a file'}</Button>
            {readErr ? <span className={styles.uploadErr} role="alert">{readErr}</span> : null}
          </span>
        ) : null}
        <input ref={file} type="file" accept={UPLOAD_ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void read(f) }} data-testid="source-file" />
      </div>
    )
  }
  return (
    <div className={styles.sources} role="radiogroup" aria-label="Milestones come from" data-testid={testId}>
      <span className={styles.legendLabel}>Milestones come from</span>
      <ChoiceCard title="A quote" selected={value.pick === 'quote'} onSelect={() => set({ pick: 'quote', quoteId: value.quoteId || quotes[0]?.id || '' })} disabled={disabled || !quotes.length}
                  help={quotes.length ? `One milestone for each stage of work in ${(q ?? quotes[0]!).number}, in the order it runs on site — or its sections, when no line names a trade.` : 'No quote on this project yet — make one, or upload a contractor’s quote below.'} />
      {value.pick === 'quote' && quotes.length ? (
        <TextField label="Quote" mode="select" value={q ? quoteLabel(q) : ''} options={quotes.map(quoteLabel)} disabled={disabled} onChange={(v) => set({ quoteId: quotes.find((x) => quoteLabel(x) === v)?.id ?? '' })} />
      ) : null}
      {ai ? (   /* (gaps build I, I-Q13) curated and free (Q-30) — reviewed in "What you will get" before it lands */
        <ChoiceCard title="Drafted by Maison AI" selected={value.pick === 'ai'} onSelect={() => set({ pick: 'ai', quoteId: value.quoteId || quotes[0]?.id || '', aiSkip: [] })} disabled={disabled || !quotes.some((x) => x.lines > 0)}
                    help={quotes.some((x) => x.lines > 0) ? `From ${(q ?? quotes[0]!).number} and the scope: the permits ${ai.propertyType ? 'this home' : 'the home'} needs first, each stage sized by its lines, and what to watch — you review it before anything changes. It costs no AI credits.` : 'Maison AI drafts from a quote’s lines — make a quote for this project first.'} />
      ) : null}
      {value.pick === 'ai' && quotes.length > 1 ? (
        <TextField label="Quote" mode="select" value={q ? quoteLabel(q) : ''} options={quotes.map(quoteLabel)} disabled={disabled} onChange={(v) => set({ quoteId: quotes.find((x) => quoteLabel(x) === v)?.id ?? '', aiSkip: [] })} />
      ) : null}
      <ChoiceCard title="A schedule template" help={templates.length ? 'From Company › Templates › Schedules — the ready-made ones for each kind of home are there too.' : 'None yet — make one in Company › Templates › Schedules.'}
                  selected={value.pick === 'template'} onSelect={() => set({ pick: 'template', templateId: value.templateId || templates[0]?.id || '' })} disabled={disabled || !templates.length} />
      {value.pick === 'template' && templates.length ? (
        <TextField label="Template" mode="select" value={t ? templateLabel(t, templates) : ''} options={templates.map((x) => templateLabel(x, templates))} disabled={disabled}
                   onChange={(v) => set({ templateId: templates.find((x) => templateLabel(x, templates) === v)?.id ?? '' })} helper={templateHelp ?? (t?.presetKey ? `${presetByKey(t.presetKey)?.name ?? t.name}: a ready-made schedule, as such a job usually runs.` : undefined)} />
      ) : null}
      <ChoiceCard title="An uploaded quote" selected={value.pick === 'upload'} onSelect={() => { set({ pick: 'upload' }); if (!value.upload) file.current?.click() }} disabled={disabled}
                  help={value.upload ? `${value.upload.name} — ${plural(value.upload.lines, 'line')} read${value.upload.sections.length ? `, ${plural(value.upload.sections.length, 'section')}` : ''}.` : `A contractor’s quote or your own from before — a spreadsheet of its lines (XLSX or CSV) or a PDF of it. Reading it uses ${READ} AI credits, given back if it can’t be read.`} />
      {value.pick === 'upload' ? (
        <span className={styles.uploadRow}>
          <Button variant="secondary" appearance="outlined" size="sm" iconStart={<Icon name="upload_file" size={20} />} onPress={() => file.current?.click()} isDisabled={disabled || reading} data-testid="source-upload">{reading ? 'Reading…' : value.upload ? 'Choose another file' : 'Choose a file'}</Button>
          {readErr ? <span className={styles.uploadErr} role="alert">{readErr}</span> : null}
        </span>
      ) : null}
      <input ref={file} type="file" accept={UPLOAD_ACCEPT} hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void read(f) }} data-testid="source-file" />
      {blank ? <ChoiceCard title={blankLabel?.title ?? 'Nothing yet'} help={blankLabel?.help ?? 'Start blank and add milestones one at a time.'} selected={value.pick === 'blank'} onSelect={() => set({ pick: 'blank' })} disabled={disabled} /> : null}
    </div>
  )
}
