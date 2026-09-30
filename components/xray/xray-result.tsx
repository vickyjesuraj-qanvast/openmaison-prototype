'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { PageReveal } from '@/components/shell/page-reveal'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { StatTile } from '@/components/om/stat-tile'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { PickOneDialog, type PickOption } from '@/components/company/templates/pick-one-dialog'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { fromLabel, withFrom } from '@/lib/nav'
import { displayDate, displayDateTimeDot } from '@/lib/format'
import { firstName } from '@/lib/contracts/model'
import { FollowUpDialog } from '@/components/leads/detail/follow-up-dialog'
import { setFollowUp as setLeadFollowUp } from '@/app/leads/actions'
import { draftMessage, money, moneyK, type XrayRow } from '@/lib/xray/compare'
import type { XrayRecord } from '@/lib/xray/queries'
import { COMPARISON_DELETE_RULE } from '@/lib/xray/policy'
import { correctComparison, deleteComparison, rerunComparison, setComparisonOverrides } from '@/app/quote-x-ray/actions'
import { SendDialog } from './send-dialog'
import { XrayRecordSkeleton } from './xray-skeletons'
import { xrayColumnDefs, XrayTable, type RowAction } from './xray-table'
import pageStyles from '@/app/leads/leads.module.css'
import bar from '@/components/quotes/editor/template-bar.module.css'
import styles from './xray-result.module.css'

/**
 * A comparison's record page (REG-529): the L2 header (crumb Quote X-Ray, Back where you came from, New comparison), then one
 * reading column — the summary with its three figures, Say this with Send to client, the brands worth a word, and the
 * item-by-item table on the listing's model.
 * Round 3 of the X-Ray parity (REG-640) makes it a working copy: a match can be corrected on its row — *Not the same item* ·
 * *Same item as…* — and everything follows, with Undo (Q-14); a quote that changed after the reading says so, and *Run again*
 * reads it as it is now (Q-15); what went to the client is kept and shown (Q-16); the record names its quote and who ran it, and
 * its kebab offers Run again · Open the quote · Delete (Q-17).
 */
export function XrayResult({ record, from }: { record: XrayRecord; from: string | undefined }) {
  const r = record.result
  const router = useRouter()
  const snackbar = useSnackbar()
  const [sendOpen, setSendOpen] = useState(false)
  const [asQuestion, setAsQuestion] = useState<Record<number, boolean>>({})
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [kebab, setKebab] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pairing, setPairing] = useState<{ row: XrayRow; options: PickOption[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [rerunning, setRerunning] = useState(false)
  /* (sweep S3) a correction reads the comparison again and renumbers its points — the "Say it as a question" picks start over */
  const [seenResult, setSeenResult] = useState(r)
  if (seenResult !== r) { setSeenResult(r); setAsQuestion({}) }
  const phone = useMediaQuery(MOBILE)
  const defs = useMemo(() => xrayColumnDefs(r.otherStudio), [r.otherStudio])
  const columnPrefs = useTableColumns('xray-items', defs, phone)
  const title = `${record.leadName ?? record.yourLabel} · vs ${record.otherStudio}`
  /* (REG-639, Q-12) a reading belongs to its lead: the crumbs name the lead and its X-Ray page, and every way on keeps that scope */
  const scopedSetup = record.leadId ? withFrom(`/quote-x-ray?lead=${record.leadId}`, `/leads/${record.leadId}`) : '/quote-x-ray'
  /* (sweep S3) Back goes where the page was opened from, and its crumb names that place (lib/nav `fromLabel`) — never a place Back doesn't go */
  const fromName = from && !from.startsWith('/quote-x-ray') ? fromLabel(from) : undefined
  const crumbs = fromName && from ? [{ label: fromName === 'Lead' && record.leadName ? record.leadName : fromName, href: from }, { label: 'Quote X-Ray', href: scopedSetup }]
    : record.leadId && record.leadName ? [{ label: record.leadName, href: `/leads/${record.leadId}` }, { label: 'Quote X-Ray', href: scopedSetup }] : [{ label: 'Quote X-Ray', href: '/quote-x-ray' }]
  const here = withFrom(`/quote-x-ray/${record.id}`, from)
  const quoteHref = record.quote?.live ? withFrom(`/quotes/${record.quote.id}`, here) : null
  /* (REG-638, parity Q-09) Key points by 1.0's rules: advantages and risks as cards; a brand only their quote names with nothing to
     raise joins "We also checked"; one both quotes name is left out (an engine-1 reading's "note" on both sides included). */
  const cards = r.brands.filter((b) => b.tone === 'advantage' || b.tone === 'risk')
  const checked = r.brands.filter((b) => b.tone === 'checked' || (b.tone === 'note' && b.side === 'theirs'))
  const questions = new Set(Object.entries(asQuestion).filter(([, on]) => on).map(([n]) => Number(n)))
  /* (Q-08) the draft follows the screen: a point switched to its question goes out as the question */
  /* (UX audit C12) …and its greeting follows the recipient's name in the Send dialog */
  const draftFor = (name: string) => draftMessage({ ...r, client: firstName(name) || r.client }, questions)
  /* (UX audit C12) after a WhatsApp send, the next step — a follow-up on the lead (the Overview's Set a follow-up) */
  const [followUpAt, setFollowUpAt] = useState<Date | null>(null)
  const onSent = ({ via, name }: { via: 'whatsapp' | 'copy'; name: string }) => {
    router.refresh()
    if (via === 'whatsapp') snackbar({ message: `Sent to ${name} on WhatsApp`, ...(record.leadId ? { actionLabel: 'Add a follow-up', onAction: () => setFollowUpAt(new Date()) } : {}) })
  }

  const fail = (what: string) => snackbar({ message: `Couldn’t ${what} — please try again` })
  /* (Q-14) a correction reads the comparison again; Undo puts the corrections back as they were */
  const correct = async (change: { split?: [string, number][]; pair?: [string, number][] }, done: string) => {
    if (busy) return
    setBusy(true)
    try {
      const res = await correctComparison(record.id, change)
      if ('error' in res) { fail('correct the match'); return }
      router.refresh()
      snackbar({ message: done, actionLabel: 'Undo', onAction: () => { void setComparisonOverrides(record.id, res.previous).then(() => router.refresh(), () => fail('undo')) } })
    } catch { fail('correct the match') } finally { setBusy(false) }
  }
  const loneTheirs = r.rows.filter((x) => !(x.yourIds?.length) && (x.theirIdx?.length ?? 0) > 0)
  const loneYours = r.rows.filter((x) => x.status === 'yours-only' && (x.yourIds?.length ?? 0) > 0)
  const rowActions = (row: XrayRow): RowAction[] => {
    if (!record.correctable || !row.yourIds || !row.theirIdx) return []
    const ys = row.yourIds, ts = row.theirIdx
    if (ys.length && ts.length) return [{ label: 'Not the same item', onSelect: () => { void correct({ split: ys.flatMap((y) => ts.map((t) => [y, t] as [string, number])) }, 'Marked as not the same item') } }]
    /* (sweep S3) each line names its room, so two lines with one name and price read apart — and the dialog picks by id */
    if (ys.length && loneTheirs.length) return [{ label: 'Same item as…', onSelect: () => setPairing({ row, options: loneTheirs.map((x) => ({ id: String(x.theirIdx![0]), label: x.name, sub: [x.room, x.theirsMinor ? money(x.theirsMinor) : 'No price given'].filter(Boolean).join(' · ') })) }) }]
    if (ts.length && loneYours.length) return [{ label: 'Same item as…', onSelect: () => setPairing({ row, options: loneYours.map((x) => ({ id: x.yourIds![0]!, label: x.name, sub: [x.room, x.yourWord ?? (x.yoursMinor !== null ? money(x.yoursMinor) : '')].filter(Boolean).join(' · ') })) }) }]
    return []
  }
  const pairWith = async (picked: string) => {
    const row = pairing?.row
    setPairing(null)
    if (!row) return
    const pair: [string, number] = row.yourIds!.length ? [row.yourIds![0]!, Number(picked)] : [picked, row.theirIdx![0]!]
    await correct({ pair: [pair] }, 'Paired as the same item')
  }
  /* (sweep S3) one run at a time — a second press waits for the first; one verb and one noun: Run again, the comparison */
  const runAgain = async () => {
    setKebab(false)
    if (rerunning) return
    setRerunning(true)
    try {
      const res = await rerunComparison(record.id)
      if ('error' in res) { snackbar({ message: res.error === 'gone' ? 'Couldn’t run it again — the quote was deleted or archived' : 'Couldn’t run it again — the quote has no lines' }); return }
      router.push(withFrom(`/quote-x-ray/${res.id}`, from ?? scopedSetup))
      snackbar({ message: 'Run again — the earlier comparison is kept' })
    } catch { fail('run it again') } finally { setRerunning(false) }
  }
  const remove = async () => {
    setDeleting(false)
    try {
      const res = await deleteComparison(record.id)
      if ('error' in res) { snackbar({ message: res.error === 'not-allowed' ? COMPARISON_DELETE_RULE : 'That comparison is already gone' }); return }
      router.push(scopedSetup); snackbar({ message: `${title} deleted` })
    } catch { fail('delete') }
  }

  return (
    <PageReveal skeleton={<XrayRecordSkeleton />}>
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        <PageHeaderL2 backHref={from ?? scopedSetup} crumbs={crumbs} title={title}
                      chips={<><MetaChip>{displayDate(new Date(record.createdAt))}</MetaChip><MetaChip>{r.compared} {r.compared === 1 ? 'item' : 'items'} compared</MetaChip>{record.sent ? <MetaChip icon="send">Sent {displayDate(new Date(record.sent.at))}</MetaChip> : null}</>}
                      actions={<Button appearance="outlined" variant="secondary" iconStart={<Icon name="add" size={20} />} onPress={() => router.push(scopedSetup)}>New comparison</Button>}
                      titleActions={<>
                        <span className={styles.anchor}>
                          <Tooltip label="More options" disabled={kebab}><IconButton icon="more_vert" label="More options" aria-haspopup="menu" aria-expanded={kebab} onClick={() => setKebab((o) => !o)} /></Tooltip>
                          <Dropdown open={kebab} onClose={() => setKebab(false)} align="right" sheetTitle={title}>
                            {record.quote?.live ? <DropdownItem disabled={rerunning} onSelect={() => { void runAgain() }}>Run again</DropdownItem> : null}
                            {quoteHref ? <DropdownItem onSelect={() => { setKebab(false); router.push(quoteHref) }}>Open the quote</DropdownItem> : null}
                            <DropdownItem tone="danger" disabled={!record.canDelete} help={record.canDelete ? undefined : COMPARISON_DELETE_RULE} onSelect={() => { setKebab(false); setDeleting(true) }}>Delete</DropdownItem>   {/* (REG-728) the rule in the row, not a native title */}
                          </Dropdown>
                        </span>
                      </>} />
        {record.stale && record.quote ? (
          <div className={`${bar.banner} ${styles.banner}`} role="status" data-testid="xray-stale" data-tone="changes">
            <span className={bar.bannerIcon}><Icon name="history" size={20} weight={300} /></span>
            <span className={bar.bannerText}><b>{record.quote.number}</b> has changed since this comparison. Run it again to compare the quote as it is now — this comparison is kept.</span>
            <span className={bar.bannerActions}><Button variant="secondary" appearance="outlined" isDisabled={rerunning} onPress={() => { void runAgain() }}>{rerunning ? 'Running…' : 'Run again'}</Button></span>
          </div>
        ) : null}
        <div className={styles.column}>
          <section className={styles.card} aria-label="Summary" data-testid="xray-summary">
            <span className={styles.eyebrow}>Comparing your quote ({r.yourStudio} · {quoteHref ? <Link href={quoteHref} className={styles.link} data-testid="xray-quote-link">{r.yourLabel}</Link> : r.yourLabel}{record.quote?.gone ? ` — the quote was ${record.quote.gone}` : ''}) with the quote from <b>{r.otherStudio}</b></span>
            <h2 className={styles.headline}>{r.headline}</h2>
            <div className={styles.tiles}>
              {/* (UX audit C11) what the two figures count — the quote's own total has discounts and GST in it (the footnote gives it) */}
              <StatTile label={`Yours (${r.yourStudio})`} value={moneyK(r.yoursMinor)} testId="xray-tile-yours" help={r.engine && r.engine >= 2 ? 'line totals, before GST' : undefined} />
              <StatTile label={r.otherStudio} value={moneyK(r.theirsMinor)} testId="xray-tile-theirs" help={r.engine && r.engine >= 2 ? 'line totals, before GST' : undefined} />
              <StatTile label="Real difference" tone="primary" value={moneyK(r.realDiffMinor)} testId="xray-tile-real"
                        help={r.realDiffMinor > 0 ? 'ours more, like-for-like' : r.realDiffMinor < 0 ? 'ours less, like-for-like' : 'level, like-for-like'} />
            </div>
            <p className={styles.footnote}><Icon name="info" size={18} weight={300} /> <span>{r.footnote}{r.engine && r.engine >= 2 ? <> Both sides are compared on their line totals, before discounts and GST{r.quoteTotalMinor != null && r.quoteTotalMinor !== r.yoursMinor ? <> — with them, {r.yourLabel.split(' · ')[0]} comes to {money(r.quoteTotalMinor)}</> : null}.</> : null}</span></p>
          </section>

          <section className={styles.card} aria-label="Say this" data-testid="xray-points">
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}><Icon name="chat" size={20} weight={300} /> Say this</span>
              <Button iconStart={<Icon name="chat" size={20} />} onPress={() => setSendOpen(true)}>Send to client</Button>
            </div>
            {r.points.length === 0 ? <span className={styles.none}>The two quotes line up — nothing to flag.</span> : (
              <ol className={styles.points}>
                {r.points.map((p) => (
                  <li key={p.n} className={styles.point}>
                    <span className={styles.pointN}>{p.n}</span>
                    <div className={styles.pointBody}>
                      <span className={styles.say}>“{asQuestion[p.n] && p.asQuestion ? p.asQuestion : p.say}”</span>
                      <span className={styles.evidence}><b>{p.evidenceLabel}</b> · {p.evidence}</span>
                      {p.asQuestion ? <Button appearance="text" onPress={() => setAsQuestion((a) => ({ ...a, [p.n]: !a[p.n] }))}>{asQuestion[p.n] ? 'Say it as a point' : 'Say it as a question'}</Button> : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className={styles.card} aria-label="Key points you can use" data-testid="xray-brands">
            <div className={styles.cardHead}><span className={styles.cardTitle}><Icon name="verified" size={20} weight={300} /> Key points you can use</span></div>
            {cards.length + checked.length === 0 ? <span className={styles.none}>Neither quote names a brand worth a word.</span> : (
              <ul className={styles.brands}>
                {cards.map((b, i) => (
                  <li key={`${b.brand}-${i}`} className={styles.brand} data-tone={b.tone}>
                    <div className={styles.brandHead}>
                      <span className={styles.brandName}>{b.brand} <span className={styles.brandMeta}>{b.trade}{b.side === 'theirs' ? ' · in their quote' : b.side === 'yours' ? ' · in your quote' : ''}</span></span>
                      {b.tone === 'advantage' ? <MetaChip color="green">Your advantage</MetaChip> : b.impact ? <MetaChip color={b.impact === 'high' ? 'red' : 'yellow'}>Impact: {b.impact}</MetaChip> : null}   {/* (sweep S3) the house chip, not a page-local pill */}
                    </div>
                    <span className={styles.brandText}>{b.text}</span>
                    {b.sources.length ? <span className={styles.sources}>Sources · {b.sources.join(' · ')}</span> : null}
                  </li>
                ))}
                {checked.length ? <li className={styles.also} data-testid="xray-checked">We also checked {checked.map((b) => b.brand).join(', ')} in their quote — nothing to flag.</li> : null}
              </ul>
            )}
          </section>

          <section className={styles.tableCard} aria-label="Item by item" data-testid="xray-items">
            <div className={styles.tableHead}>
              <span className={styles.cardTitle}>Item by item <span className={styles.count}>{r.compared} compared</span></span>
              <span className={styles.tableTools}>
                <span className={styles.legend}><span className={styles.swatch} data-status="yours-only" /> only in yours <span className={styles.swatch} data-status="theirs-only" /> only in theirs <span className={styles.swatch} data-status="unpriced" /> no price given</span>
                {!phone ? <Tooltip label="Column settings"><IconButton icon="tune" label="Column settings" onClick={() => setColumnsOpen(true)} /></Tooltip> : null}
              </span>
            </div>
            <XrayTable rows={r.rows} otherStudio={r.otherStudio} columns={columnPrefs.columns} onReorder={columnPrefs.reorder} rowActions={record.correctable ? rowActions : undefined} />
          </section>
          <span className={styles.foot} data-testid="xray-foot">
            Read by Quote X-Ray on {displayDate(new Date(record.createdAt))} for {record.createdBy} · {record.otherFile}
            {record.sent ? <> · <span data-testid="xray-sent-line">Sent to the client on {displayDate(new Date(record.sent.at))}</span></> : null}   {/* (sweep S3) the header's Sent chip folds away on a tablet and a phone; the foot keeps saying it */}
            {record.corrected ? <> · Corrected by {record.corrected.by} on {displayDate(new Date(record.corrected.at))}</> : null}
            {' · '}<Link href={scopedSetup} className={styles.link}>{record.leadName ? `All comparisons for ${record.leadName}` : 'All comparisons'}</Link>
          </span>
        </div>

        <SendDialog open={sendOpen} onClose={() => setSendOpen(false)} comparisonId={record.id} draft={draftFor} sent={record.sent} defaults={{ name: record.leadName ?? r.client ?? '', phone: record.leadPhone }} onSent={onSent} />
        {record.leadId ? (
          <FollowUpDialog open={!!followUpAt} leadName={record.leadName ?? 'the client'} today={followUpAt ?? new Date(record.createdAt)} onClose={() => setFollowUpAt(null)}
                          onSave={({ title, dueAt }) => {
                            const leadId = record.leadId!
                            /* the dialog closes once the task is saved (sweep rule); a refusal keeps it open and says so */
                            void setLeadFollowUp(leadId, { title, dueAt: dueAt.toISOString() }).then(() => { setFollowUpAt(null); snackbar({ message: `Follow-up set for ${displayDateTimeDot(dueAt)}` }) }, () => snackbar({ message: 'Couldn’t set the follow-up — please try again' }))
                          }} />
        ) : null}
        <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 3 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
        <PickOneDialog open={!!pairing} onClose={() => setPairing(null)} title="Same item as…" label={pairing?.row.yourIds?.length ? `${r.otherStudio}’s line` : 'Your line'}
                       placeholder={pairing?.row.yourIds?.length ? `Choose one of ${r.otherStudio}’s lines` : 'Choose one of your lines'} empty="No line to pair with"
                       load={async () => pairing?.options ?? []} confirmLabel="Pair" onPick={(id) => pairWith(id)} />
        <ConfirmDialog open={deleting} title="Delete this comparison?" confirmLabel="Delete"
                       message={`${title} will be deleted permanently. This can’t be undone.`}
                       onCancel={() => setDeleting(false)} onConfirm={() => { void remove() }} />
      </div>
    </PageReveal>
  )
}
