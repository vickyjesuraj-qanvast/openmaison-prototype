'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, SegmentedButton, SegmentedButtonItem } from '@/components/ds'
import { rovingKey } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Sheet } from '@/components/om/sheet'
import { Tooltip } from '@/components/om/tooltip'
import type { Intent, Quality } from '@/lib/visualizer/model'
import chips from '@/components/om/chips.module.css'
import styles from './rail.module.css'

export type Mode = 'surfaces' | 'furniture' | 'style' | 'lighting' | 'tools'
export const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: 'surfaces', label: 'Surfaces', icon: 'format_paint' },
  { key: 'furniture', label: 'Furniture', icon: 'weekend' },
  { key: 'style', label: 'Style', icon: 'style' },
  { key: 'lighting', label: 'Lighting', icon: 'lightbulb' },
  { key: 'tools', label: 'Tools', icon: 'handyman' },
]
/** (E3) The compact button's verb where the go line is narrow — only the labels longer than it ("Furnish the room" → "Furnish"); a
    label not listed keeps its words (cut with "…" if it must). */
const GO_SHORT: Record<string, string> = { 'Furnish the room': 'Furnish', 'Empty the room': 'Empty', 'Style transfer': 'Transfer', 'Render from sketch': 'Render', 'Generate from note': 'Generate' }
/** A change waiting (the model's `changeList` item, with its ×): `id` is the ChangeItem's, so `intent.ignored` finds it. */
export type Change = { id: string; label: string; onRemove: () => void; needs?: string | null }

/** (F169) The mode tabs' panel — the one Panel on screen answers to the tab that is selected. */
export const PANEL_ID = 'viz-panel'
const tabId = (m: Mode) => `viz-tab-${m}`

/**
 * The mode tabs (1.0's rail sections + the phone's dock, B-108 · B-114): icon over label, a dot on each mode holding picks.
 * (F169) One Tab stop — the arrows, Home and End move along the tabs and open the one reached.
 */
export function ModeTabs({ mode, onMode, marks, variant = 'rail' }: { mode: Mode; onMode: (m: Mode) => void; marks: Record<Mode, boolean>; variant?: 'rail' | 'dock' }) {
  return (
    <div className={styles.tabs} data-variant={variant} role="tablist" aria-label="Edit" onKeyDown={(e) => { rovingKey(e, ':scope > [role=tab]') }}>
      {MODES.map((m) => (
        <button key={m.key} id={tabId(m.key)} type="button" role="tab" aria-selected={mode === m.key} aria-controls={PANEL_ID} tabIndex={mode === m.key ? 0 : -1}
                className={styles.tab} onClick={() => onMode(m.key)} data-testid={`viz-mode-${m.key}`}>
          <span className={styles.tabIcon}><Icon name={m.icon} size={22} weight={300} fill={mode === m.key} />{marks[m.key] ? <span className={styles.mark} aria-hidden /> : null}</span>
          <span className={styles.tabLabel}>{m.label}{marks[m.key] ? <span className={styles.srOnly}>, has changes</span> : null}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * (F007 · F051) The chips of the changes waiting, each with its ×. A list taller than its cap scrolls, cut mid-chip, and fades at the
 * foot only while there is more below (the flag is written by the list's own scroll and size observers — never read in render).
 * (F052) A chip the next Generate can't use is muted: it stays for the one after.
 */
function ChangeChips({ changes, ignored, capped }: { changes: Change[]; ignored: ReadonlySet<string>; capped: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !capped) return
    /* (F007) "more below" = a chip's own box past the list's foot — measured on the chips, never on scrollHeight, which a chip's
       hit area or a sub-pixel row could tip over while nothing is hidden */
    const check = () => {
      const last = el.lastElementChild
      el.toggleAttribute('data-more', !!last && last.getBoundingClientRect().bottom > el.getBoundingClientRect().bottom + 2)
    }
    check()
    const ro = new ResizeObserver(check); ro.observe(el)
    const mo = new MutationObserver(check); mo.observe(el, { childList: true, subtree: true, characterData: true })
    el.addEventListener('scroll', check, { passive: true })
    return () => { ro.disconnect(); mo.disconnect(); el.removeEventListener('scroll', check); el.removeAttribute('data-more') }
  }, [capped])
  return (
    <div ref={ref} className={styles.changeList} data-capped={capped || undefined} data-testid="viz-changes">
      {changes.map((c) => {
        const muted = ignored.has(c.id)
        return (
          <span key={c.id} className={`${chips.chip} ${styles.change}`} data-selected={muted ? undefined : ''} data-muted={muted || undefined} data-testid="viz-change">
            <span className={styles.changeText}>{c.label}{muted ? <span className={styles.srOnly}> (kept for your next Generate)</span> : null}</span>
            <Tooltip label="Take this change off"><button type="button" className={styles.changeX} aria-label={`Take off ${c.label}`} onClick={c.onRemove}><Icon name="close" size={16} /></button></Tooltip>
          </span>
        )
      })}
    </div>
  )
}

/**
 * The rail's foot (1.0's footer, B-105 · C-01 · C-04): what Generate will apply, each removable; Variants 1 · 2 · 3 and Fast / High
 * quality at every width (Q-09); the one primary button whose words follow the intent (§5.6); the reason it waits, or what went wrong.
 * (F006 · F035 · F175) One count everywhere — "Your changes · n", the phone's "n changes" and the button all read the model's
 * `changeList` (the intent's `total`); what the next pass leaves for later is muted with the intent's `ignoredNote` (F052).
 * (F066 · F144) ≤1024 the count opens the changes in a sheet, each with its ×, and Clear all.
 */
export function GenerateFooter({ changes, onClear, intent, variants, onVariants, quality, onQuality, onGenerate, busy, error, compact = false, disabled = false, describe = null, reasonLink = null }: {
  changes: Change[]; onClear: () => void; intent: Intent
  variants: 1 | 2 | 3; onVariants: (n: 1 | 2 | 3) => void; quality: Quality; onQuality: (q: Quality) => void
  onGenerate: () => void; busy: boolean; error: string | null
  /** ≤1024 with the tray closed: the count and the button on one line above the dock. */
  compact?: boolean
  disabled?: boolean
  /** (REG-679) Describe a change — always in view above what Generate will do. */
  describe?: ReactNode
  /** (new:fresh-desktop:Furnish says empty first) Why Generate waits, when the way on is one press away — e.g. Furnish on a version that
      isn't emptied while the room has one that is: "Furnish works on an emptied version — open V4". Replaces the intent's reason. */
  reasonLink?: { text: string; label: string; onPress: () => void } | null
}) {
  const many = intent.kind === 'edit' || intent.kind === 'restyle' || intent.kind === 'transfer'
  /* (UAT walk) only a pass that can make one version holds the choice at 1 — with nothing waiting, the choice stays the studio's own to set
     (after a two-version Generate it read a greyed "1" while the room still held 2, and couldn't be set back) */
  const oneOnly = intent.kind !== null && !many
  const [opts, setOpts] = useState(false)
  const [sheet, setSheet] = useState(false)
  if (sheet && (!changes.length || !compact)) setSheet(false)   // nothing left to show (render-phase adjust, not an effect)
  const total = intent.total ?? changes.length
  const ignored = new Set(intent.ignored ?? [])
  const note = ignored.size && intent.ignoredNote ? intent.ignoredNote : null
  /* (the sheet's copy closes the sheet as it opens the version) */
  const reasonOf = (then?: () => void): ReactNode => (reasonLink && !intent.kind
    ? <>{reasonLink.text} <button type="button" className={styles.inlineLink} onClick={() => { reasonLink.onPress(); then?.() }} data-testid="viz-reason-link">{reasonLink.label}</button></>
    : intent.reason)
  const reason = reasonOf()
  const waits = !intent.kind && reason ? reasonOf(() => setSheet(false)) : null
  const knobs = (
    <div className={styles.knobs}>
      <Tooltip label={oneOnly ? 'This one makes a single version' : 'How many versions one Generate makes'}>
        <span className={styles.knob} data-off={oneOnly || undefined}>
          <span className={styles.knobLabel}>Versions</span>
          <SegmentedButton aria-label="Versions" selectedKeys={[String(oneOnly ? 1 : variants)]} isDisabled={oneOnly} onSelectionChange={(k) => { const v = Number([...k][0]); if (v === 1 || v === 2 || v === 3) onVariants(v) }}>
            <SegmentedButtonItem id="1">1</SegmentedButtonItem><SegmentedButtonItem id="2">2</SegmentedButtonItem><SegmentedButtonItem id="3">3</SegmentedButtonItem>
          </SegmentedButton>
        </span>
      </Tooltip>
      <Tooltip label="Fast is quicker; High quality reads the photo more finely">
        <span className={styles.knob}>
          <span className={styles.knobLabel}>Quality</span>
          <SegmentedButton aria-label="Quality" selectedKeys={[quality]} onSelectionChange={(k) => { const v = [...k][0]; if (v === 'fast' || v === 'high') onQuality(v) }}>
            <SegmentedButtonItem id="fast">Fast</SegmentedButtonItem><SegmentedButtonItem id="high">High</SegmentedButtonItem>
          </SegmentedButton>
        </span>
      </Tooltip>
    </div>
  )
  const errorLine = error ? <span className={styles.error} role="alert" data-testid="viz-error"><Icon name="error" size={16} weight={300} />{error}</span> : null
  if (compact) {
    /* what went wrong, or why Generate waits: beside the button when nothing is picked, else on its own line under the row */
    const status = errorLine ?? (reason && !intent.kind ? <span className={styles.compactText}>{reason}</span> : null)
    return (
      /* (new:style-light-tools:FAB over the knobs) data-viz-knobs tells the frame the switches are up — the Maison AI button steps aside */
      <div className={styles.foot} data-compact="" data-viz-knobs={opts || undefined}>
        {opts ? knobs : null}
        <div className={styles.compactRow}>
          {changes.length ? (
            <button type="button" className={styles.compactToggle} aria-haspopup="dialog" aria-expanded={sheet} onClick={() => setSheet(true)} data-testid="viz-changes-toggle">
              {total} {total === 1 ? 'change' : 'changes'}<span className={styles.waitWord}>&nbsp;waiting</span><Icon name="expand_less" size={18} weight={300} />
            </button>
          ) : null}
          <span className={styles.compactStatus}>{changes.length ? null : status}</span>
          <Tooltip label={`Makes ${oneOnly ? 1 : variants} · ${quality === 'high' ? 'High quality' : 'Fast'}`}><IconButton icon="tune" label="Versions and quality" size={36} variant="bare" iconSize={20} iconWeight={300} selected={opts} aria-expanded={opts} onClick={() => setOpts((o) => !o)} /></Tooltip>
          {/* (F158) the count lives in the text beside it — the button says only what it does (its full words stay its name) */}
          <Button onPress={onGenerate} isDisabled={!intent.kind || busy || disabled} className={styles.goCompact} aria-label={busy ? intent.busy : intent.label} iconStart={<Icon name="wand_shine" size={20} weight={300} />} data-testid="viz-generate">
            <span className={styles.goText}>{busy ? intent.busy : intent.kind === 'edit' ? 'Generate' : intent.kind === 'restyle' ? 'Restyle' : intent.label}</span>
            {/* (E3) the verb alone, where the go line is too narrow for the words (the CSS picks one) */}
            {!busy && GO_SHORT[intent.label] ? <span className={styles.goShort} aria-hidden>{GO_SHORT[intent.label]}</span> : null}
          </Button>
        </div>
        {changes.length && status ? <div className={styles.compactLine}>{status}</div> : null}
        <Sheet open={sheet} onClose={() => setSheet(false)} title={`Your changes · ${total}`} label="Your changes"
               headActions={<span className={styles.sheetAction}><Button appearance="text" onPress={() => { onClear(); setSheet(false) }}>Clear all</Button></span>} bodyClassName={styles.sheetBody}>
          <ChangeChips changes={changes} ignored={ignored} capped={false} />
          {note ? <span className={styles.note}>{note}</span> : null}
          {waits ? <span className={styles.note}>{waits}</span> : null}
        </Sheet>
      </div>
    )
  }
  return (
    <div className={styles.foot}>
      {describe}
      {changes.length ? (
        <div className={styles.changes}>
          <span className={styles.changesHead}><span>Your changes · {total}</span><button type="button" className={styles.link} onClick={onClear}>Clear all</button></span>
          <ChangeChips changes={changes} ignored={ignored} capped />
          {note ? <span className={styles.note} data-testid="viz-ignored">{note}</span> : null}
        </div>
      ) : null}
      <Button onPress={onGenerate} isDisabled={!intent.kind || busy || disabled} className={styles.go} iconStart={<Icon name="wand_shine" size={20} weight={300} />} data-testid="viz-generate">{busy ? intent.busy : intent.label}</Button>
      {errorLine ?? (reason ? <span className={styles.hint} data-idle={!intent.total || undefined}>{reason}</span> : null)}
      {/* (simplicity pass) how many versions and how fine: one quiet line, the two switches only on Change */}
      <div className={styles.opts}>
        <span className={styles.optsText} data-testid="viz-options">Makes {!oneOnly ? `${variants} ${variants === 1 ? 'version' : 'versions'}` : '1 version'} · {quality === 'high' ? 'High quality' : 'Fast'}</span>
        <button type="button" className={styles.link} aria-expanded={opts} onClick={() => setOpts((o) => !o)} data-testid="viz-options-toggle">{opts ? 'Done' : 'Change'}</button>
      </div>
      {opts ? knobs : null}
    </div>
  )
}

/** ≤1024 the panels open in the tray above the dock; the tray hands them its close (the panel's head carries it). */
export const PanelClose = createContext<(() => void) | null>(null)

/** A panel's frame: a title with its actions, the body scrolling under it. (F169) It is the mode tabs' tabpanel. */
export function Panel({ title, sub, actions, back, children, testId }: { title: string; sub?: ReactNode; actions?: ReactNode; back?: { label: string; onBack: () => void }; children: ReactNode; testId?: string }) {
  const close = useContext(PanelClose)
  if (close) actions = <>{actions}<Tooltip label="Close"><IconButton icon="expand_more" label="Close the panel" size={36} variant="bare" iconSize={24} iconWeight={300} onClick={close} /></Tooltip></>
  return (
    <section id={PANEL_ID} role="tabpanel" className={styles.panel} aria-label={title} data-testid={testId}>
      {back ? <button type="button" className={styles.back} onClick={back.onBack}><Icon name="arrow_back" size={18} weight={300} />{back.label}</button> : null}
      <div className={styles.panelHead}><div className={styles.panelTitles}><h2 className={styles.panelTitle}>{title}</h2>{sub ? <span className={styles.panelSub}>{sub}</span> : null}</div>{actions ? <span className={styles.panelActions}>{actions}</span> : null}</div>
      <div className={styles.panelBody} data-viz-panel-body="">{children}</div>
    </section>
  )
}
