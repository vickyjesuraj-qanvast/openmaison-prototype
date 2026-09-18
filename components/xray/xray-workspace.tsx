'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, SegmentedButton, SegmentedButtonItem } from '@/components/ds'
import { PageHeader } from '@/components/shell/page-header'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { MetaChip } from '@/components/om/meta-chip'
import { PageReveal } from '@/components/shell/page-reveal'
import { LeadsSkeleton } from '@/components/shell/skeleton'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ChoiceCard } from '@/components/om/choice-card'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { Dropzone, FieldError, FileTile } from '@/components/leads/move-stage/fields'
import { useFlagPref } from '@/lib/prefs'
import { withFrom } from '@/lib/nav'
import { displayDate } from '@/lib/format'
import { money } from '@/lib/xray/compare'
import { deleteComparison, runComparison } from '@/app/quote-x-ray/actions'
import type { XrayData } from '@/lib/xray/queries'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './xray-workspace.module.css'

type Mode = 'lead' | 'upload'
const STEPS = ['Reading your quotes', 'Extracting line items', 'Matching comparable items', 'Running the analysis']
const STEP_MS = 650

/**
 * Tools › Quote X-Ray (REG-529; the 1.0 tool rebuilt on 2.0's pieces, no mock): an intro card you can dismiss, then the
 * setup — For a lead (a lead, one of its quotes, the other studio's file) or Upload two quotes (two files) — beside Recent
 * comparisons. Compare runs the reading with a four-step progress card, then opens the record page. The other studio's file
 * is one of the three reference quotes the prototype can read; anything else says so under the dropzone.
 */
export function XrayWorkspace({ data, leadId: initialLead, quoteId: initialQuote, from }: { data: XrayData; leadId: string | null; quoteId: string | null; from: string | undefined }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [introHidden, setIntroHidden] = useFlagPref('om.xray.introHidden', false)
  const [mode, setMode] = useState<Mode>('lead')
  const [leadId, setLeadId] = useState<string | null>(() => initialLead ?? (initialQuote ? data.quotes.find((q) => q.id === initialQuote)?.leadId ?? null : null))
  const [quoteId, setQuoteId] = useState<string | null>(initialQuote)
  const [other, setOther] = useState<File | null>(null)
  const [mine, setMine] = useState<File | null>(null)
  const [error, setError] = useState<{ side: 'other' | 'yours'; text: string } | null>(null)
  const [running, setRunning] = useState<number | null>(null)   // the progress step, null = the setup
  const [del, setDel] = useState<{ payload: XrayData['recents'][number] | null; open: boolean }>({ payload: null, open: false })
  const [busy, setBusy] = useState(false)

  const lead = data.leads.find((l) => l.id === leadId) ?? null
  /* (REG-530) Opened from a lead (or one of its quotes): the page is that lead's — an L3 under Lead Details with the L2 header,
     the lead locked instead of a picker, and only its own comparisons in Recent. */
  const scoped = initialLead ? data.leads.find((l) => l.id === initialLead) ?? null : null
  const scopedQuote = scoped && initialQuote ? data.quotes.find((q) => q.id === initialQuote) ?? null : null
  const recents = scoped ? data.recents.filter((r) => r.leadId === scoped.id) : data.recents
  const leadQuotes = useMemo(() => data.quotes.filter((q) => q.leadId === leadId), [data.quotes, leadId])
  const leadLabel = (l: XrayData['leads'][number]) => `${l.name} — ${l.propertyType}`
  const ready = mode === 'lead' ? !!(lead && quoteId && other) : !!(mine && other)
  const hint = mode === 'lead' ? (!lead ? 'Choose a lead.' : !quoteId ? 'Choose which of your quotes to compare.' : !other ? 'Add the other studio’s quote.' : '') : (!mine ? 'Add your quote.' : !other ? 'Add the other studio’s quote.' : '')

  /* The progress card walks its four steps on a timer while the reading runs; the record opens once both are done. */
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])
  const compare = async () => {
    if (!ready || busy) return
    setBusy(true); setError(null); setRunning(0)
    const started = Date.now()
    timer.current = setInterval(() => setRunning((s) => (s === null ? s : Math.min(s + 1, STEPS.length - 1))), STEP_MS)
    try {
      const r = await runComparison({ leadId: mode === 'lead' ? leadId : null, quoteId: mode === 'lead' ? quoteId : null, yourFile: mode === 'upload' ? mine?.name ?? null : null, otherFile: other!.name })
      const wait = Math.max(0, STEPS.length * STEP_MS + 200 - (Date.now() - started))
      await new Promise((res) => setTimeout(res, wait))
      if (timer.current) { clearInterval(timer.current); timer.current = null }
      if ('error' in r) {
        setRunning(null)
        if (r.error === 'unreadable-other') { setOther(null); setError({ side: 'other', text: 'We couldn’t read this one — try a PDF from the client.' }) }
        else if (r.error === 'unreadable-yours') { setMine(null); setError({ side: 'yours', text: 'We couldn’t read this one — try the PDF you sent the client.' }) }
        else snackbar({ message: 'Nothing to compare yet — pick a quote first' })
        return
      }
      router.push(withFrom(`/quote-x-ray/${r.id}`, from ?? '/quote-x-ray'))
    } catch {
      if (timer.current) { clearInterval(timer.current); timer.current = null }
      setRunning(null); snackbar({ message: 'Couldn’t run the comparison — please try again' })
    } finally { setBusy(false) }
  }
  const remove = async (id: string, label: string) => {
    try { await deleteComparison(id); snackbar({ message: `${label} deleted` }); router.refresh() }
    catch { snackbar({ message: 'Couldn’t delete — please try again' }) }
  }

  return (
    <PageReveal skeleton={<LeadsSkeleton />}>
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        {scoped ? (
          <PageHeaderL2 backHref={from ?? `/leads/${scoped.id}`} crumbs={from?.startsWith('/quotes/') && scopedQuote ? [{ label: 'Quotes', href: '/quotes' }, { label: scopedQuote.number, href: `/quotes/${scopedQuote.id}` }] : [{ label: 'Leads', href: '/leads' }, { label: scoped.name, href: `/leads/${scoped.id}` }]} title="Quote X-Ray" />
        ) : (
          <PageHeader title="Quote X-Ray" />
        )}
        <div className={styles.content}>
          {!introHidden ? (
            <section className={styles.intro} aria-label="What Quote X-Ray does">
              <div className={styles.introText}>
                <span className={styles.introTitle}>Client comparing your quote with another studio’s? Upload theirs — we check it against yours, item by item.</span>
                <ul className={styles.introList}>
                  <li><Icon name="check" size={18} weight={300} /><span><b>The real price difference</b> — after counting the work each quote includes or leaves out.</span></li>
                  <li><Icon name="check" size={18} weight={300} /><span><b>Up to three points to tell your client</b> — missing items, brands, and prices that don’t add up.</span></li>
                  <li><Icon name="check" size={18} weight={300} /><span><b>A WhatsApp message ready to send</b> — edit it in your own words and go.</span></li>
                </ul>
                <span className={styles.introNote}>Takes a moment. Always check the numbers before you send anything to a client.</span>
              </div>
              <Tooltip label="Dismiss"><IconButton icon="close" label="Dismiss" size={24} variant="bare" iconSize={20} onClick={() => setIntroHidden(true)} /></Tooltip>
            </section>
          ) : null}

          <div className={styles.columns}>
            <section className={styles.card} aria-label="New comparison" data-testid="xray-setup">
              {running !== null ? (
                <div className={styles.progress} role="status" aria-live="polite" data-testid="xray-progress">
                  <span className={styles.progressGlyph}><Icon name="scan" size={28} weight={300} /></span>
                  <span className={styles.progressTitle}>Comparing the two quotes…</span>
                  <span className={styles.progressHelp}>A moment — please keep this page open.</span>
                  <span className={styles.bar} aria-hidden><span className={styles.barFill} style={{ width: `${Math.round(((running + 1) / STEPS.length) * 100)}%` }} /></span>
                  <ol className={styles.steps}>
                    {STEPS.map((s, i) => (
                      <li key={s} className={styles.step} data-state={i < running ? 'done' : i === running ? 'now' : 'todo'}>
                        <span className={styles.stepGlyph}>{i < running ? <Icon name="check_circle" size={18} weight={300} /> : i === running ? <Icon name="progress_activity" size={18} weight={300} className={styles.spin} /> : <span className={styles.dot} />}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <>
                  <SegmentedButton aria-label="Compare" selectedKeys={[mode]} onSelectionChange={(keys) => { const k = [...keys][0]; if (k === 'lead' || k === 'upload') { setMode(k); setError(null) } }}>
                    <SegmentedButtonItem id="lead">For a lead</SegmentedButtonItem>
                    <SegmentedButtonItem id="upload">Upload two quotes</SegmentedButtonItem>
                  </SegmentedButton>

                  {mode === 'lead' ? (
                    <div className={styles.grid}>
                      <div className={styles.side}>
                        <span className={styles.eyebrow}>Lead</span>
                        {scoped ? (
                          <span className={styles.lockedLead} data-testid="xray-lead"><span className={styles.lockedName}>{scoped.name}</span><MetaChip>{scoped.propertyType}</MetaChip></span>
                        ) : (
                          <TextField label="Lead" mode="select" value={lead ? leadLabel(lead) : ''} options={data.leads.map(leadLabel)}
                                     onChange={(v) => { const l = data.leads.find((x) => leadLabel(x) === v); setLeadId(l?.id ?? null); setQuoteId(null) }} />
                        )}
                        {lead ? (
                          <div className={styles.quotes}>
                            <span className={styles.question}>Which quote is the client comparing against?</span>
                            {leadQuotes.length === 0 ? <span className={styles.none}>{lead.name} has no quote yet — <Link href={`/leads/${lead.id}/quotes`} className={styles.link}>create one</Link> first.</span> : null}
                            {leadQuotes.map((q) => (
                              <ChoiceCard key={q.id} title={`${q.number} · ${q.title}`} selected={quoteId === q.id} onSelect={() => setQuoteId(q.id)}
                                          help={`${money(q.amountMinor)} · ${q.status} · updated ${displayDate(new Date(q.updatedAt))}`} />
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className={styles.side}>
                        <span className={styles.eyebrow}>The other studio’s quote</span>
                        {other ? <FileTile name={other.name} onDelete={() => setOther(null)} /> : <Dropzone title="The other studio’s quote" helper="Drop a file or browse · PDF, image, CSV, Excel" accept=".pdf,image/*,.csv,.xls,.xlsx" onPick={(f) => { if (f) { setOther(f); setError(null) } }} />}
                        {error?.side === 'other' ? <FieldError message={error.text} /> : null}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.grid}>
                      <div className={styles.side}>
                        <span className={styles.eyebrow}>Your quote</span>
                        {mine ? <FileTile name={mine.name} onDelete={() => setMine(null)} /> : <Dropzone title="Your quote" helper="Drop a file or browse · PDF, image, CSV, Excel" accept=".pdf,image/*,.csv,.xls,.xlsx" onPick={(f) => { if (f) { setMine(f); setError(null) } }} />}
                        {error?.side === 'yours' ? <FieldError message={error.text} /> : null}
                      </div>
                      <div className={styles.side}>
                        <span className={styles.eyebrow}>The other studio’s quote</span>
                        {other ? <FileTile name={other.name} onDelete={() => setOther(null)} /> : <Dropzone title="The other studio’s quote" helper="Drop a file or browse · PDF, image, CSV, Excel" accept=".pdf,image/*,.csv,.xls,.xlsx" onPick={(f) => { if (f) { setOther(f); setError(null) } }} />}
                        {error?.side === 'other' ? <FieldError message={error.text} /> : null}
                      </div>
                    </div>
                  )}

                  <div className={styles.foot}>
                    <span className={styles.hint}>{hint}</span>
                    <Button onPress={() => { void compare() }} isDisabled={!ready || busy}>Compare</Button>
                  </div>
                </>
              )}
            </section>

            <aside className={styles.recents} aria-label="Recent comparisons">
              <span className={styles.recentsHead}>Recent comparisons</span>
              {recents.length === 0 ? (
                <span className={styles.recentsEmpty}>{scoped ? `Nothing compared for ${scoped.name} yet.` : 'Nothing compared yet. Your comparisons will be kept here.'}</span>
              ) : (
                <ul className={styles.recentList}>
                  {recents.map((r) => {
                    const label = `${r.leadName ?? r.yourLabel} · vs ${r.otherStudio}`
                    return (
                      <li key={r.id} className={styles.recent} data-testid="xray-recent">
                        <Link href={withFrom(`/quote-x-ray/${r.id}`, '/quote-x-ray')} className={styles.recentLink}>
                          <span className={styles.recentText}><span className={styles.recentTitle}>{label}</span><span className={styles.recentMeta}>{displayDate(new Date(r.createdAt))}{r.leadName ? ` · ${r.yourLabel}` : ''}</span></span>
                          <Icon name="chevron_right" size={20} weight={300} className={styles.chev} />
                        </Link>
                        <Tooltip label="Delete"><IconButton icon="delete" label={`Delete ${label}`} size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => setDel({ payload: r, open: true })} /></Tooltip>
                      </li>
                    )
                  })}
                </ul>
              )}
            </aside>
          </div>
        </div>

        <ConfirmDialog open={del.open} title="Delete this comparison?" confirmLabel="Delete"
                       message={`${del.payload ? `${del.payload.leadName ?? del.payload.yourLabel} · vs ${del.payload.otherStudio}` : 'It'} will be deleted permanently. This can’t be undone.`}
                       onCancel={() => setDel((d) => ({ ...d, open: false }))}
                       onConfirm={() => { const r = del.payload; setDel((d) => ({ ...d, open: false })); if (r) void remove(r.id, `${r.leadName ?? r.yourLabel} · vs ${r.otherStudio}`) }} />
      </div>
    </PageReveal>
  )
}
