'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { DateField } from '@/components/om/date-field'
import { MetaChip } from '@/components/om/meta-chip'
import { inputDate, parseInputDate } from '@/lib/format'
import { dateOfDay, dayOf, listWords, plural, rangeLabel, rebuildPlan, type Milestone } from '@/lib/projects/schedule-model'
import type { QuoteSource, ScheduleTemplateOption } from '@/lib/projects/schedule'
import type { ScheduleSource } from '@/app/projects/schedule-actions'
import { SourcePicker, aiInputOf, draftsOfSource, sourceOf, type SourceState } from './source-picker'
import { AiDraftReview, type AiContext } from './ai-draft'   // (gaps build I)
import type { AiDraft } from '@/lib/projects/schedule-ai'
import styles from './schedule.module.css'

/**
 * (gaps build, package C — 2; the report 26-… §3 "Rebuild a schedule, or apply a template to one that exists", 1.0's Generate timeline · Reset to
 * a template — which made new ids and lost what was shared) Rebuild the schedule from a quote, a template or an uploaded quote, over the one
 * there is: a milestone the new list names (case and spaces aside) is KEPT — its dates, status, tasks, payment and the client's answers stay —
 * a new one comes in after the one before it, and the rest go. The plan says which before anything changes; when some go, a confirm names how
 * many and which, and the answer offers Undo. The house Dialog (l 800).
 */
export function RebuildDialog({ open, onClose, onRebuild, list, quotes, templates, signedId, today, ai, draftAi = false }: {
  open: boolean
  onClose: () => void
  /** Resolves true once the rebuild lands — the dialog closes only then. */
  onRebuild: (start: string, source: ScheduleSource) => Promise<boolean>
  list: Milestone[]
  quotes: QuoteSource[]
  templates: ScheduleTemplateOption[]
  signedId: string | null
  today: number
  /** (gaps build I, I-Q13) Offer Drafted by Maison AI — what it reads besides the quote; `draftAi` opens on it (Maison AI's own suggestion) */
  ai?: AiContext
  draftAi?: boolean
}) {
  const first = list.length ? Math.min(...list.map((m) => m.start)) : today
  const [date, setDate] = useState(inputDate(dateOfDay(first)))
  const [src, setSrc] = useState<SourceState>({ pick: templates.length ? 'template' : 'quote', quoteId: signedId ?? quotes[0]?.id ?? '', templateId: templates[0]?.id ?? '', upload: null })
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [was, setWas] = useState(false)
  if (open !== was) { setWas(open); if (open) { setDate(inputDate(dateOfDay(first))); setConfirm(false); if (draftAi && ai && quotes.some((x) => x.lines > 0)) setSrc((x) => ({ ...x, pick: 'ai', quoteId: x.quoteId || quotes[0]!.id, aiSkip: [] })) } }
  const day = parseInputDate(date)
  const start = day ? dayOf(day) : null
  const drafts = draftsOfSource(src, start, quotes, templates, ai)
  const aiQuote = src.pick === 'ai' ? quotes.find((x) => x.id === src.quoteId) ?? null : null
  const plan = rebuildPlan(list, drafts)
  const source = src.pick === 'blank' ? null : sourceOf(src, signedId)
  const kept = plan.rows.filter((r) => r.keep).length, added = plan.rows.length - kept
  const gone = plan.drop.map((id) => list.find((m) => m.id === id)?.title ?? '').filter(Boolean)
  const go = async () => {
    if (start === null || !source) return
    setBusy(true)
    const ok = await onRebuild(new Date(start * 86_400_000).toISOString().slice(0, 10), source)
    setBusy(false)
    setConfirm(false)
    if (ok) onClose()
  }
  const press = () => { if (gone.length) setConfirm(true); else void go() }
  return (
    <>
      <Dialog open={open} onClose={onClose} title="Rebuild the schedule" width={800} size="modal" closeOnScrim={false}
              footer={<><Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button><Button onPress={press} isDisabled={busy || !source || !drafts.length || start === null} data-testid="rebuild-go">Rebuild</Button></>}>
        <div className={styles.share} data-testid="rebuild-dialog">
          <div className={styles.shareCol}>
            <p className={styles.note}>Milestones with the same name stay as they are — their dates, status, tasks, payments and what the client said. New ones come in after the one before them; the rest go, and their tasks stay on the project.</p>
            <div className={styles.startDate}><DateField label="Works start on" value={date} onChange={setDate} today={dateOfDay(today)} helper="New milestones are laid from here." /></div>
            <SourcePicker value={src} onChange={setSrc} quotes={quotes} templates={templates} testId="rebuild-sources" ai={ai} />
          </div>
          <div className={styles.shareColR}>
            <span className={styles.caption}>{drafts.length ? `${listWords([`${plural(kept, 'milestone')} kept`, ...(added ? [`${added} new`] : []), ...(gone.length ? [`${gone.length} taken off`] : [])])}` : 'What you will get'}</span>
            {aiQuote && ai && start !== null ? (   /* (gaps build I, I-Q14) Maison AI's draft, each milestone marked Kept or New, the rest taken off */
              <>
                <AiDraftReview input={aiInputOf(aiQuote, ai)} start={start} skip={src.aiSkip ?? []} onSkip={(skip) => setSrc((x) => ({ ...x, aiSkip: skip }))}
                               marks={Object.fromEntries(plan.rows.map((r) => { const m = r.keep ? list.find((x) => x.id === r.keep) ?? null : null; return [(r.draft as AiDraft).key, { kept: m ? { start: m.start, end: m.end } : null }] }))} />
                {plan.drop.length ? (
                  <ul className={styles.plan} data-testid="rebuild-plan">
                    {plan.drop.map((id) => <li key={id} className={styles.planRow} data-gone=""><span className={styles.planName}>{list.find((x) => x.id === id)?.title}</span><MetaChip color="red">Taken off</MetaChip></li>)}
                  </ul>
                ) : null}
              </>
            ) : drafts.length ? (
              <ul className={styles.plan} data-testid="rebuild-plan">
                {plan.rows.map((r, i) => {
                  const m = r.keep ? list.find((x) => x.id === r.keep)! : null
                  return (
                    <li key={i} className={styles.planRow} data-kept={m ? '' : undefined}>
                      <span className={styles.planName}>{m ? m.title : r.draft.title}<span className={styles.note}>{m ? ` · ${rangeLabel(m.start, m.end)}` : ` · ${rangeLabel(r.draft.start, r.draft.end)}`}</span></span>
                      <MetaChip color={m ? 'default' : 'blue'}>{m ? 'Kept' : 'New'}</MetaChip>
                    </li>
                  )
                })}
                {plan.drop.map((id) => {
                  const m = list.find((x) => x.id === id)!
                  return (
                    <li key={id} className={styles.planRow} data-gone="">
                      <span className={styles.planName}>{m.title}</span>
                      <MetaChip color="red">Taken off</MetaChip>
                    </li>
                  )
                })}
              </ul>
            ) : <span className={styles.getBlank}>{src.pick === 'upload' && !src.upload ? 'Choose the quote’s file — its stages of work make the milestones.' : 'Pick where the milestones come from.'}</span>}
          </div>
        </div>
      </Dialog>
      <ConfirmDialog open={confirm} nested title={`Take off ${plural(gone.length, 'milestone')}?`} confirmLabel="Rebuild" tone="danger"
                     message={`${listWords(gone.map((t) => `“${t}”`))} ${gone.length === 1 ? 'goes' : 'go'} from the schedule. Their tasks stay on the project; Undo brings ${gone.length === 1 ? 'it' : 'them'} back.`}
                     onCancel={() => setConfirm(false)} onConfirm={() => { void go() }} />
    </>
  )
}
