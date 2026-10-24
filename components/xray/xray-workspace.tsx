'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, SearchBar, SegmentedButton, SegmentedButtonItem } from '@/components/ds'
import { PageHeader } from '@/components/shell/page-header'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { MetaChip } from '@/components/om/meta-chip'
import { PageReveal } from '@/components/shell/page-reveal'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import { ChoiceCard } from '@/components/om/choice-card'
import { ProgressCard } from '@/components/om/progress-card'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { Dropzone, FieldError } from '@/components/leads/move-stage/fields'
import { useFlagPref } from '@/lib/prefs'
import { fromLabel, withFrom } from '@/lib/nav'
import { useSearchTarget } from '@/components/shell/search-focus'
import { SlashSlot } from '@/components/om/slash-slot'
import { displayDate } from '@/lib/format'
import { money } from '@/lib/xray/compare'
import { FILE_GLYPH, fileKind, readSide, totalCheck, XRAY_ACCEPT, XRAY_MAX_BYTES, type SideRead } from '@/lib/xray/reading'
import { deleteComparison, runComparison } from '@/app/quote-x-ray/actions'
import type { XrayData } from '@/lib/xray/queries'
import { COMPARISON_DELETE_RULE } from '@/lib/xray/policy'
import { XraySetupGhost } from './xray-setup-ghost'
import { answerLock, usePlanLock } from '@/components/credits/credits-client'
import { ProLocked } from '@/components/credits/pro-tag'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './xray-workspace.module.css'
import { DROP_HELP, SETUP_WORDS, XRAY_INTRO } from './intro-copy'   // (pending modules S19 · S21) the intro's and the setup's words, shared with its ghost

type Mode = 'lead' | 'upload'
export type Side = { file: File; read: SideRead | null }
const STEPS = ['Reading your quotes', 'Extracting line items', 'Matching comparable items', 'Running the analysis']
const STEP_MS = 650
const SEARCH_FROM = 8
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
/** Read a picked file; "Reading…" stays long enough to be read (the Create Quote window's upload does the same). */
export async function readShown(f: File): Promise<SideRead> {
  const started = Date.now()
  const read = await readSide(f)
  const wait = 600 - (Date.now() - started)
  if (wait > 0) await sleep(wait)
  return read
}

/** (REG-639, Q-10) What a picked file reads as, said at once under its tile. */
export function unreadable(side: 'other' | 'yours', reason: Exclude<SideRead, { ok: true }>['reason'], name: string, currency?: string): string {
  /* (sweep S3) the formats as they are read — an old .xls gets the leads import's way out, not a promise of "Excel" */
  if (reason === 'type') return /\.xls$/i.test(name) ? 'Save the sheet as XLSX or CSV first — the old .xls format is not read.' : 'We can read PDF, PNG, JPG, WebP, CSV and XLSX files.'
  if (reason === 'size') return `${name} is over 10 MB.`
  if (reason === 'empty') return 'We couldn’t find any priced lines in this file.'
  /* (pending modules S21) why a photo or a scan isn't read, and 1.0's hard stop on another currency */
  if (reason === 'scan') return `${name} is a photo or a scan — it has no words to read here. A PDF the studio made, or a spreadsheet, reads best.`
  if (reason === 'currency') return `This quote is in ${currency ?? 'another currency'} — Quote X-Ray compares quotes in S$.`
  return side === 'other' ? 'We couldn’t read this one — a spreadsheet of their quote reads best.' : 'We couldn’t read this one — try a spreadsheet of your quote, or compare from the lead instead.'
}

/** A picked file: its type's glyph, its name, Remove — and what was read from it. No stock thumbnail (E-109). (pending modules S21) A file that
    states its own total says whether the lines read come to it — the reading checks itself, as a person would. */
export function XrayFile({ side, onRemove }: { side: Side; onRemove: () => void }) {
  const kind = fileKind(side.file.name) ?? 'pdf'
  const r = side.read
  const check = r?.ok ? totalCheck(r.totalMinor, r.stated) : null
  return (
    <div className={styles.file} data-testid="xray-file">
      <span className={styles.fileRow}>
        <span className={styles.fileGlyph} data-kind={kind}><Icon name={FILE_GLYPH[kind]} size={20} fill /></span>
        <span className={styles.fileName} title={side.file.name}>{side.file.name}</span>
        <Tooltip label="Remove file"><IconButton icon="delete" label={`Remove ${side.file.name}`} size={36} variant="bare" iconSize={20} iconWeight={300} onClick={onRemove} /></Tooltip>
      </span>
      {r === null ? (
        <span className={styles.fileNote} role="status"><Icon name="upload_file" size={18} weight={300} /> Reading {side.file.name}…</span>
      ) : r.ok ? (
        <>
          <span className={styles.fileNote} role="status" data-tone="done"><Icon name="task_alt" size={18} weight={300} /> <span><b>{r.lines.length} {r.lines.length === 1 ? 'line' : 'lines'}</b> read{r.studio ? ` from ${r.studio}’s quote` : ''} · {money(r.totalMinor)}{check?.agrees ? ' — the same as its own total' : ''}</span></span>
          {check && !check.agrees ? (
            <span className={styles.fileNote} data-tone="check" data-testid="xray-file-check"><Icon name="info" size={18} weight={300} /> <span>The quote’s own total is {money(check.statedMinor)} — a line may not have been read. Check the item-by-item list before you send anything.</span></span>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

/**
 * Tools › Quote X-Ray (REG-529; the 1.0 tool rebuilt on 2.0's pieces, no mock): an intro card you can dismiss, then the
 * setup — For a lead (a lead, one of its quotes, the other studio's file) or Upload two quotes (two files) — beside Recent
 * comparisons. Compare runs the reading with a four-step progress card, then opens the record page.
 * Round 2 of the X-Ray parity (REG-639): a file is read the moment it is picked — a spreadsheet for real, a PDF or a photo
 * as one of the three reference quotes by name — and says what it read or why it can't (Q-10); the lead list finds as you
 * type and picks by id, a lead with one quote has it chosen, a quote with no lines can't be, a lead with no quote offers
 * Create a quote or Upload your quote instead, and Upload two quotes stays with the lead it was opened for (Q-11); every
 * way back keeps the lead's scope (Q-12); Recent lists every comparison, with a search once it grows long (Q-13).
 */
export function XrayWorkspace({ data, leadId: initialLead, quoteId: initialQuote, from }: { data: XrayData; leadId: string | null; quoteId: string | null; from: string | undefined }) {
  const router = useRouter()
  const xrayLock = usePlanLock('quote_xray')   // (pending modules S19) Quote X-Ray is Pro
  const snackbar = useSnackbar()
  const [introHidden, setIntroHidden] = useFlagPref('om.xray.introHidden', false)
  const scoped = initialLead ? data.leads.find((l) => l.id === initialLead) ?? null : null
  const liveQuote = (id: string | null, lead: string | null) => (id ? data.quotes.find((q) => q.id === id && (!lead || q.leadId === lead) && q.lineCount > 0) ?? null : null)
  const onlyQuote = (lead: string | null) => { const qs = data.quotes.filter((q) => q.leadId === lead && q.lineCount > 0); return qs.length === 1 ? qs[0]!.id : null }
  const [mode, setMode] = useState<Mode>('lead')
  const [leadId, setLeadId] = useState<string | null>(() => scoped?.id ?? liveQuote(initialQuote, null)?.leadId ?? null)
  /* (E-17) a `?quote=` that is not one of the lead's live quotes is not chosen; a lead with one quote has it chosen (1.0's chip) */
  const [quoteId, setQuoteId] = useState<string | null>(() => liveQuote(initialQuote, scoped?.id ?? null)?.id ?? onlyQuote(scoped?.id ?? liveQuote(initialQuote, null)?.leadId ?? null))
  /** (Q-11) The lead an upload run stays with: the page's own lead, or the one "Upload your quote instead" came from. */
  const [uploadLead, setUploadLead] = useState<string | null>(scoped?.id ?? null)
  const [other, setOther] = useState<Side | null>(null)
  const [mine, setMine] = useState<Side | null>(null)
  const [studioName, setStudioName] = useState('')
  /* (sweep S3) each side keeps its own message: picking your file no longer wipes why the other one couldn't be read */
  const [errors, setErrors] = useState<{ other?: string; yours?: string }>({})
  const setError = (e: { side: 'other' | 'yours'; text: string } | null) => setErrors((cur) => (e ? { ...cur, [e.side]: e.text } : {}))
  const clearError = (side: 'other' | 'yours') => setErrors((cur) => { const n = { ...cur }; delete n[side]; return n })
  const [running, setRunning] = useState<number | null>(null)   // the progress step, null = the setup
  const [del, setDel] = useState<{ payload: XrayData['recents'][number] | null; open: boolean }>({ payload: null, open: false })
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  /* (sweep S3) a run in flight belongs to this page: leaving it (a Recent row, the rail) means it never pulls the person back */
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const lead = data.leads.find((l) => l.id === leadId) ?? null
  const linked = mode === 'upload' ? data.leads.find((l) => l.id === uploadLead) ?? null : null
  /* (Q-11) the list is picked by id: two leads with one name and property type read "… (2)" */
  const labels = useMemo(() => { const seen = new Map<string, number>(); return new Map(data.leads.map((l) => { const base = `${l.name} — ${l.propertyType}`; const n = (seen.get(base) ?? 0) + 1; seen.set(base, n); return [l.id, n === 1 ? base : `${base} (${n})`] as const })) }, [data.leads])
  const leadQuotes = useMemo(() => data.quotes.filter((q) => q.leadId === leadId), [data.quotes, leadId])
  const comparable = leadQuotes.filter((q) => q.lineCount > 0)
  /* (Q-12) this page's own address — the record's Back, a Recent row and New comparison all return here, scope and all */
  const here = scoped ? withFrom(`/quote-x-ray?lead=${scoped.id}`, from) : '/quote-x-ray'
  const scopedQuote = scoped && initialQuote ? data.quotes.find((q) => q.id === initialQuote) ?? null : null
  const recents = scoped ? data.recents.filter((r) => r.leadId === scoped.id) : data.recents
  /* (sweep S3) the search box leaves once Recent is short again — and takes its query with it, so nothing stays narrowed unseen */
  if (recents.length <= SEARCH_FROM && query) setQuery('')
  const q = query.trim().toLowerCase()
  const shown = q ? recents.filter((r) => `${r.leadName ?? ''} ${r.yourLabel} ${r.otherStudio}`.toLowerCase().includes(q)) : recents
  const otherOk = !!other?.read?.ok, mineOk = !!mine?.read?.ok
  const ready = mode === 'lead' ? !!(lead && quoteId && otherOk) : mineOk && otherOk
  const reading = (s: Side | null) => !!s && s.read === null
  const hint = mode === 'lead'
    ? (!lead ? 'Choose a lead.' : !comparable.length ? '' : !quoteId ? 'Choose which of your quotes to compare.' : !other ? 'Add the other studio’s quote.' : reading(other) ? 'Reading the other studio’s quote…' : '')
    : (!mine ? 'Add your quote.' : reading(mine) ? 'Reading your quote…' : !other ? 'Add the other studio’s quote.' : reading(other) ? 'Reading the other studio’s quote…' : '')

  const pickLead = (id: string | null) => { setLeadId(id); setQuoteId(onlyQuote(id)) }
  /* (Q-10) read on pick: the type and size first, then the file itself; a later pick or a remove wins over a slow read */
  const pick = async (side: 'other' | 'yours', f: File | undefined) => {
    if (!f) return
    clearError(side)
    const set = side === 'other' ? setOther : setMine
    const kind = fileKind(f.name)
    if (!kind || f.size > XRAY_MAX_BYTES) { set(null); setError({ side, text: unreadable(side, !kind ? 'type' : 'size', f.name) }); return }
    if (side === 'other') setStudioName('')
    set({ file: f, read: null })
    const read = await readShown(f)
    if (read.ok) {
      set((cur) => (cur && cur.file === f ? { file: f, read } : cur))
      if (side === 'other' && read.kind === 'pdf' && read.studio) setStudioName(read.studio)   // (S21) the letterhead's name, theirs to correct
    } else { set((cur) => (cur && cur.file === f ? null : cur)); setError({ side, text: unreadable(side, read.reason, f.name, read.currency) }) }
  }

  /* The progress card walks its four steps on a timer while the reading runs; the record opens once both are done. */
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])
  const compare = async () => {
    if (xrayLock.locked) { xrayLock.open(); return }
    if (!ready || busy || !other?.read?.ok) return
    setBusy(true); setError(null); setRunning(0)
    const started = Date.now()
    timer.current = setInterval(() => setRunning((s) => (s === null ? s : Math.min(s + 1, STEPS.length - 1))), STEP_MS)
    try {
      const o = other.read, m = mine?.read
      const r = await runComparison({
        leadId: mode === 'lead' ? leadId : uploadLead,
        quoteId: mode === 'lead' ? quoteId : null,
        yourFile: mode === 'upload' ? mine?.file.name ?? null : null,
        otherFile: other.file.name,
        other: o.kind !== 'reference' ? { lines: o.lines, studio: studioName.trim() || null } : null,   // (S21) a sheet's lines or a PDF's, read here
        yours: mode === 'upload' && m?.ok && m.kind !== 'reference' ? { lines: m.lines } : null,
        otherRef: o.kind === 'reference' ? o.ref ?? null : null,   // (S42 E-05) recognised by its words, sent by its key
        yourRef: mode === 'upload' && m?.ok && m.kind === 'reference' ? m.ref ?? null : null,
      })
      const wait = Math.max(0, STEPS.length * STEP_MS + 200 - (Date.now() - started))
      await sleep(wait)
      if (timer.current) { clearInterval(timer.current); timer.current = null }
      if ('error' in r) {
        setRunning(null)
        if ('locked' in r) { answerLock(r.error, 'quote_xray'); return }
        if (r.error === 'unreadable-other') { setOther(null); setError({ side: 'other', text: unreadable('other', 'unreadable', other.file.name) }) }
        else if (r.error === 'unreadable-yours') { setMine(null); setError({ side: 'yours', text: unreadable('yours', 'unreadable', mine?.file.name ?? '') }) }
        else if (r.error === 'same-quote') { setOther(null); setError({ side: 'other', text: 'That is the same quote as yours — add the other studio’s quote.' }) }   /* (REG-641, E-94) */
        else { setQuoteId(null); router.refresh(); snackbar({ message: 'Couldn’t compare — that quote has changed or is no longer there' }) }   /* (sweep S3) the pick went stale: say so, and read the page again */
        return
      }
      if (alive.current) router.push(withFrom(`/quote-x-ray/${r.id}`, here))
    } catch {
      if (timer.current) { clearInterval(timer.current); timer.current = null }
      setRunning(null); snackbar({ message: 'Couldn’t run the comparison — please try again' })
    } finally { setBusy(false) }
  }
  const remove = async (id: string, label: string) => {
    try {
      const res = await deleteComparison(id)
      if ('error' in res) { if ('locked' in res) { answerLock(res.error, 'quote_xray'); return } snackbar({ message: res.error === 'not-allowed' ? COMPARISON_DELETE_RULE : 'That comparison is already gone' }); router.refresh(); return }
      snackbar({ message: `${label} deleted` }); router.refresh()
    } catch { snackbar({ message: 'Couldn’t delete the comparison — please try again' }) }
  }

  const dropzone = (side: 'other' | 'yours', title: string) => {
    const s = side === 'other' ? other : mine
    return (
      <>
        {s ? <XrayFile side={s} onRemove={() => { (side === 'other' ? setOther : setMine)(null); if (side === 'other') setStudioName('') }} />
          : <Dropzone title={title} label={`Upload ${title.charAt(0).toLowerCase()}${title.slice(1)}`} helper={DROP_HELP} accept={XRAY_ACCEPT} onPick={(f) => { void pick(side, f) }} />}
        {errors[side] ? <FieldError message={errors[side]!} /> : null}
        {side === 'other' && s?.read?.ok && s.read.kind !== 'reference' ? (
          <TextField label="Their studio’s name (optional)" value={studioName} onChange={setStudioName} maxLength={80} trailingIcon={null} />
        ) : null}
      </>
    )
  }
  const lockedLead = (l: XrayData['leads'][number], onClear?: () => void) => (
    <span className={styles.lockedLead} data-testid="xray-lead">
      <span className={styles.lockedName}>{l.name}</span><MetaChip>{l.propertyType}</MetaChip>
      {onClear ? <span className={styles.lockedClear}><Tooltip label="Not for this lead"><IconButton icon="close" label={`Not for ${l.name}`} size={36} variant="bare" iconSize={20} iconWeight={300} onClick={onClear} /></Tooltip></span> : null}
    </span>
  )

  return (
    <PageReveal skeleton={<XraySetupGhost />}>   {/* (REG-708) the ghost its loading.tsx drew */}
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        {scoped ? (
          <PageHeaderL2 backHref={from ?? `/leads/${scoped.id}`} crumbs={from?.startsWith('/quotes/') && scopedQuote ? [{ label: 'Quotes', href: '/quotes' }, { label: scopedQuote.number, href: from }]
            /* (sweep S3) the crumb names where Back goes (lib/nav `fromLabel`): Tools › Quotes, the lead, or the listing */
            : from && !from.startsWith('/leads/') && fromLabel(from) ? [{ label: fromLabel(from)!, href: from }, { label: scoped.name, href: `/leads/${scoped.id}` }]
            : [{ label: 'Leads', href: '/leads' }, { label: scoped.name, href: `/leads/${scoped.id}` }]} title="Quote X-Ray" />
        ) : (
          <PageHeader title="Quote X-Ray" />
        )}
        <div className={styles.content}>
          {!introHidden ? (
            <section className={styles.intro} aria-label="What Quote X-Ray does">
              <div className={styles.introText}>
                <span className={styles.introTitle}>{XRAY_INTRO.title}</span>
                <ul className={styles.introList}>
                  {XRAY_INTRO.points.map(([b, rest]) => <li key={b}><Icon name="check" size={18} weight={300} /><span><b>{b}</b>{rest}</span></li>)}
                </ul>
                <span className={styles.introNote}>{XRAY_INTRO.note}</span>
              </div>
              <Tooltip label="Dismiss"><IconButton icon="close" label="Dismiss" size={24} variant="bare" iconSize={20} onClick={() => setIntroHidden(true)} /></Tooltip>
            </section>
          ) : null}

          <div className={styles.columns}>
            {/* (pending modules S19 — 1.0's plan gating: Quote X-Ray is Pro) on Free the setup is the lock — what X-Ray does and the way on;
                the comparisons already made stay listed beside it, kept for Pro */}
            {xrayLock.locked ? <ProLocked feature="quote_xray" kept={recents.length ? `Your ${recents.length} ${recents.length === 1 ? 'comparison is' : 'comparisons are'} kept` : null} testId="xray-locked" /> : (
            <section className={styles.card} aria-label="New comparison" data-testid="xray-setup">
              {/* (REG-2801) the house's progress card, moved from here */}
              {running !== null ? (
                <ProgressCard glyph="scan" title="Comparing the two quotes…" help="A moment — please keep this page open." steps={STEPS} at={running} testId="xray-progress" />
              ) : (
                <>
                  <SegmentedButton aria-label="Compare" selectedKeys={[mode]} onSelectionChange={(keys) => { const k = [...keys][0]; if (k === 'lead' || k === 'upload') { setMode(k); setErrors({}) } }}>
                    <SegmentedButtonItem id="lead">For a lead</SegmentedButtonItem>
                    <SegmentedButtonItem id="upload">Upload two quotes</SegmentedButtonItem>
                  </SegmentedButton>

                  {mode === 'lead' ? (
                    <div className={styles.grid}>
                      <div className={styles.side}>
                        <span className={styles.eyebrow}>Lead</span>
                        {scoped ? lockedLead(scoped) : data.leads.length === 0 ? (
                          /* (sweep S3) nobody to compare for — Who sees leads can leave a Designer with no leads; say so and offer the other way */
                          <div className={styles.noQuote} data-testid="xray-no-leads">
                            <span className={styles.none}>No leads to compare for yet.</span>
                            <span className={styles.noQuoteActions}><Button appearance="outlined" variant="secondary" iconStart={<Icon name="upload_file" size={20} />} onPress={() => { setMode('upload'); setErrors({}) }}>Upload two quotes</Button></span>
                          </div>
                        ) : (
                          <TextField label="Lead" required mode="select" searchable value={lead ? labels.get(lead.id) ?? '' : ''} options={data.leads.map((l) => labels.get(l.id)!)}
                                     onChange={(v) => pickLead(data.leads.find((x) => labels.get(x.id) === v)?.id ?? null)} />
                        )}
                        {lead ? (
                          <div className={styles.quotes} role={comparable.length ? 'radiogroup' : undefined} aria-label={comparable.length ? SETUP_WORDS.question : undefined}>
                            {comparable.length ? <span className={styles.question} aria-hidden>{SETUP_WORDS.question}</span> : null}
                            {comparable.length === 0 ? (
                              <div className={styles.noQuote} data-testid="xray-no-quote">
                                <span className={styles.none}>{leadQuotes.length ? `${lead.name}’s quotes have no lines to compare yet.` : `${lead.name} has no quote yet.`}</span>
                                <span className={styles.noQuoteActions}>
                                  <Button appearance="outlined" variant="secondary" iconStart={<Icon name="add" size={20} />} onPress={() => router.push(withFrom(`/leads/${lead.id}/quotes?new=1`, here))}>Create a quote</Button>
                                  <Button appearance="outlined" variant="secondary" iconStart={<Icon name="upload_file" size={20} />} onPress={() => { setMode('upload'); setUploadLead(lead.id); setErrors({}) }}>Upload your quote instead</Button>
                                </span>
                              </div>
                            ) : null}
                            {comparable.length ? leadQuotes.map((qq) => (
                              <ChoiceCard key={qq.id} title={`${qq.number} · ${qq.title}`} selected={quoteId === qq.id} onSelect={() => setQuoteId(qq.id)} disabled={qq.lineCount === 0}
                                          help={qq.lineCount === 0 ? 'No lines to compare yet' : `${money(qq.amountMinor)} · ${qq.status} · ${qq.lineCount} ${qq.lineCount === 1 ? 'line' : 'lines'} · updated ${displayDate(new Date(qq.updatedAt))}`} />
                            )) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className={styles.side}>
                        <span className={styles.eyebrow}>The other studio’s quote</span>
                        {dropzone('other', 'The other studio’s quote')}
                      </div>
                    </div>
                  ) : (
                    <>
                      {linked ? (
                        <div className={styles.side}>
                          <span className={styles.eyebrow}>Lead</span>
                          {lockedLead(linked, scoped ? undefined : () => setUploadLead(null))}
                        </div>
                      ) : null}
                      <div className={styles.grid}>
                        <div className={styles.side}>
                          <span className={styles.eyebrow}>Your quote</span>
                          {dropzone('yours', 'Your quote')}
                        </div>
                        <div className={styles.side}>
                          <span className={styles.eyebrow}>The other studio’s quote</span>
                          {dropzone('other', 'The other studio’s quote')}
                        </div>
                      </div>
                    </>
                  )}

                  <div className={styles.foot}>
                    <span className={styles.hint}>{hint}</span>
                    <Button onPress={() => { void compare() }} isDisabled={!ready || busy}>Compare</Button>
                  </div>
                </>
              )}
            </section>
            )}

            <aside className={styles.recents} aria-label="Recent comparisons">
              <span className={styles.recentsHead}>{scoped ? `Recent comparisons · ${scoped.name}` : 'Recent comparisons'}</span>   {/* (sweep S3) a lead's page lists only its readings — the head says so */}
              {recents.length > SEARCH_FROM ? <RecentSearch query={query} onQuery={setQuery} inputRef={searchRef} /> : null}
              {recents.length === 0 ? (
                <span className={styles.recentsEmpty}>{scoped ? `Nothing compared for ${scoped.name} yet.` : 'Nothing compared yet. Your comparisons will be kept here.'}</span>
              ) : shown.length === 0 ? (
                <span className={styles.recentsEmpty}>No comparison matches “{query.trim()}”.</span>
              ) : (
                <ul className={styles.recentList}>
                  {shown.map((r) => {
                    const label = `${r.leadName ?? r.yourLabel} · vs ${r.otherStudio}`
                    return (
                      <li key={r.id} className={styles.recent} data-testid="xray-recent">
                        <Link href={withFrom(`/quote-x-ray/${r.id}`, here)} className={styles.recentLink}>
                          <span className={styles.recentText}><span className={styles.recentTitle}>{label}</span><span className={styles.recentMeta}>{displayDate(new Date(r.createdAt))}{r.sentAt ? ` · Sent ${displayDate(new Date(r.sentAt))}` : ''}{r.leadName ? ` · ${r.yourLabel}` : ''}</span></span>
                          <Icon name="chevron_right" size={20} weight={300} className={styles.chev} />
                        </Link>
                        {/* (REG-641, Q-20) its maker, an Owner or an Admin — out of reach for anyone else, and the tooltip says who */}
                        <Tooltip label={r.canDelete ? 'Delete' : COMPARISON_DELETE_RULE}><IconButton icon="delete" label={`Delete ${label}`} size={36} variant="bare" iconSize={20} iconWeight={300} disabled={!r.canDelete} onClick={() => { if (xrayLock.locked) { xrayLock.open(); return } setDel({ payload: r, open: true }) }} /></Tooltip>
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

/** (sweep S3) Recent's search answers the rail's search tile and the "/" key while it is shown (the house `useSearchTarget`). */
function RecentSearch({ query, onQuery, inputRef }: { query: string; onQuery: (v: string) => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  const wrap = useRef<HTMLSpanElement>(null)
  useEffect(() => { inputRef.current = wrap.current?.querySelector('input') ?? null })
  useSearchTarget(inputRef)
  return <span ref={wrap} className={styles.recentsSearch}><SlashSlot empty={query === ''}><SearchBar appearance="outlined" size="md" placeholder="Search by lead, quote or studio" aria-label="Search comparisons" value={query} onChange={onQuery} /></SlashSlot></span>
}
