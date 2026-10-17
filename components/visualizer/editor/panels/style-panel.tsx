'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ds'
import { Chips, rovingKey } from '@/components/om/chips'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { DESIGN_STYLES, styleForLead } from '@/lib/visualizer/styles'
import { GEOMETRIES, MAX_REFERENCES, REFERENCE_ROLES, STRENGTHS, STYLE_ASPECTS, type ReferenceRole, type StyleAspect } from '@/lib/visualizer/tools'
import type { Pending } from '@/lib/visualizer/model'
import { Panel } from '../rail'
import { chipCss, styleBoard } from '@/lib/visualizer/materials'
import { SAMPLE_ROOMS } from '@/lib/visualizer/samples'
import { revealInPanel } from './reveal'
import styles from './panels.module.css'

/* (REG-681) A style's finished look from any sample room that has one — the living room first. */
const ANY_LOOK: Record<string, string> = Object.fromEntries(SAMPLE_ROOMS.slice().reverse().flatMap((r) => Object.entries(r.looks)))


/**
 * Style (REG-674; 1.0's style cards and Style Transfer, B-86…B-91 · C-105): the lead's own style first (Q-32), None, then 1.0's 25 —
 * a card is a name and a palette, picking one never touches the surfaces (1.0's rule); with no other change Generate restyles the whole
 * room. Below, a look borrowed from a photo: up to three references, each read into its palette on the spot (1.0's *Read the style*).
 */
export function StylePanel({ pending, onStyle, leadName, leadStyle, onAddRef, onPatchTransfer, looks = null, baseEdited = false }: {
  /** (REG-681) The room's own finished looks (a sample room; a look it lacks borrows another sample's) — the card shows the style, not
      only its colours. (pending modules S43C) A sample's look is the engine's own restyle of its photo, the picture Generate makes. (F060)
      Null for a studio's own photo: another room's picture would promise a render this photo can't make, so its cards are the palette and
      the materials. */
  looks?: Record<string, string> | null
  /** (F192) The version on screen carries finishes or furniture changes — a style repaints every surface of it; (pending modules S43C) its
      pieces' changes stay (the engine's restyle paints the version's own picture). */
  baseEdited?: boolean
  pending: Pending
  onStyle: (name: string) => void
  leadName: string | null
  leadStyle: string | null
  onAddRef: () => void
  onPatchTransfer: (fn: (t: Pending['transfer']) => Pending['transfer']) => void
}) {
  const t = pending.transfer
  const suggested = styleForLead(leadStyle)
  const ordered = suggested ? [suggested, ...DESIGN_STYLES.filter((s) => s.name !== suggested.name)] : DESIGN_STYLES
  const picked = !!pending.style && ordered.some((s) => s.name === pending.style)
  /* (surfaces-18) a reference just added brings the references and their settings (How far, What carries over) into view — the
     references kept in sight when both don't fit; a panel opening on references already there stays where it is */
  const refsBox = useRef<HTMLDivElement>(null)
  const carries = useRef<HTMLDivElement>(null)
  const refCount = useRef(t.refs.length)
  useEffect(() => {
    const was = refCount.current
    refCount.current = t.refs.length
    if (t.refs.length > was) revealInPanel(refsBox.current, carries.current ?? refsBox.current)
  }, [t.refs.length])
  return (
    <Panel title="Style" sub="A whole-room look — or leave None and change only what you pick" testId="viz-style">
      {suggested && leadName ? (
        <div className={styles.lead}><Icon name="person" size={20} weight={300} /><span><b>{leadName.split(' ')[0]}’s style: {leadStyle}</b> — {suggested.name === leadStyle ? 'first below' : `${suggested.name} is the nearest, first below`}.</span></div>
      ) : null}
      {picked && baseEdited ? <span className={styles.hint} data-testid="viz-style-edited">A style repaints every surface of this version in its own finishes — the furniture changes stay.</span> : null}
      {/* (F169) one Tab stop — the arrows move along the cards and pick the one reached */}
      <div className={styles.cards} data-aligned="" role="radiogroup" aria-label="Design style" onKeyDown={(e) => { rovingKey(e, ':scope > [role=radio]') }}>
        <button type="button" role="radio" aria-checked={!pending.style} tabIndex={!picked ? 0 : -1} className={styles.card} data-on={!pending.style || undefined} onClick={() => onStyle('')}>
          <span className={styles.hatch} /><span className={styles.cardName}>None</span><span className={styles.cardHelp}>Only your changes are applied</span>
        </button>
        {ordered.map((s) => {
          const pic = looks ? looks[s.name] ?? ANY_LOOK[s.name] ?? null : null
          const board = styleBoard(s.name)
          const on = pending.style === s.name
          return (
            <button key={s.id} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} className={styles.card} data-on={on || undefined} onClick={() => onStyle(on ? '' : s.name)} data-testid="viz-style-card">
              {/* (F015) the same header on every card: the look's picture over its palette strip, or the palette alone, both 16:10 */}
              <span className={styles.cardHead}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {pic ? <img className={styles.stylePic} src={pic} alt="" loading="lazy" /> : null}
                <span className={styles.palette} aria-hidden data-thin={pic ? '' : undefined}>{s.colorPalette.map((c, i) => <span key={i} style={{ background: c }} />)}</span>
              </span>
              {/* (new:fresh-desktop:'Grace’s pick' on the nearest) the tag claims the client's pick only when it is theirs */}
              {suggested?.name === s.name && leadName ? <span className={styles.cardTag}>{suggested.name === leadStyle ? `${leadName.split(' ')[0]}’s pick` : 'Closest match'}</span> : null}
              {on ? <span className={styles.cardCheck}><Icon name="done" size={14} /></span> : null}
              <span className={styles.cardName}>{s.name}</span><span className={styles.cardHelp}>{s.description}</span>
              {/* (F015 · F069) the materials sit at the card's foot, one to a line beside its own chip and named in full — the words
                  are the board's point; the cards in a row share their height, so the boards line up */}
              <span className={styles.board}>
                {board.map((m) => (
                  <span key={m.id} className={styles.boardItem}><span className={styles.boardChip} style={{ background: chipCss(m) }} aria-hidden /><span className={styles.boardName}>{m.name}</span></span>
                ))}
              </span>
            </button>
          )
        })}
      </div>
      <div className={styles.section} data-testid="viz-transfer">
        <span className={styles.head}><span>Or borrow a look from a photo</span><span className={styles.headCount}>{t.refs.length}/{MAX_REFERENCES}</span></span>
        <span className={styles.hint}>A magazine shot, a mood board or a past project. The room’s shape and camera stay put; its colours and finishes follow the photo.</span>
        {t.refs.length ? (
          <div ref={refsBox} className={styles.refs} data-roles={t.refs.length > 1 || undefined}>
            {t.refs.map((r) => (
              <div key={r.id} className={styles.ref}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.url} alt="A style reference" />
                <span className={styles.refPal} aria-label="Its palette">{r.palette.map((c, i) => <span key={i} style={{ background: c }} />)}</span>
                {t.refs.length > 1 ? <TextField label="Use it for" mode="select" size="s" value={REFERENCE_ROLES.find((x) => x.key === r.role)?.label ?? REFERENCE_ROLES[0]!.label} options={REFERENCE_ROLES.map((x) => x.label)} onChange={(v) => onPatchTransfer((tt) => ({ ...tt, refs: tt.refs.map((x) => (x.id === r.id ? { ...x, role: (REFERENCE_ROLES.find((y) => y.label === v)?.key ?? 'overall') as ReferenceRole } : x)) }))} /> : null}
                {/* (new:style-light-tools:reference × invisible) a white chip on the photo, whatever its colours */}
                <span className={styles.refRemove}><Tooltip label="Remove this reference"><IconButton icon="close" label="Remove this reference" size={24} variant="bare" iconSize={16} onClick={() => onPatchTransfer((tt) => ({ ...tt, refs: tt.refs.filter((x) => x.id !== r.id) }))} /></Tooltip></span>
              </div>
            ))}
          </div>
        ) : null}
        {t.refs.length < MAX_REFERENCES ? <span className={styles.actions}><Button variant="secondary" appearance="outlined" iconStart={<Icon name="add_photo_alternate" size={20} weight={300} />} onPress={onAddRef}>{t.refs.length ? 'Add another reference' : 'Upload a reference photo'}</Button></span> : null}
        {t.refs.length ? (
          <>
            {pending.style ? <span className={styles.hint}>Generate uses the reference, not the {pending.style} card — take the references off to go back to the card.</span> : null}
            <div className={styles.field}><span className={styles.head}>How far</span><Chips label="How far" options={STRENGTHS.map((s) => ({ value: s.key, label: s.label }))} value={t.strength} onChange={(v) => onPatchTransfer((tt) => ({ ...tt, strength: v as typeof tt.strength }))} /><span className={styles.hint}>{STRENGTHS.find((s) => s.key === t.strength)?.hint}</span></div>
            <div ref={carries} className={styles.field}><span className={styles.head}>What carries over</span><Chips multiple label="What carries over" options={STYLE_ASPECTS.map((a) => ({ value: a.key, label: a.label }))} value={t.aspects} onChange={(v) => onPatchTransfer((tt) => ({ ...tt, aspects: v as StyleAspect[] }))} />
              <span className={styles.hint}>{t.aspects.length ? 'Anything not picked stays as it is in your photo.' : 'Nothing picked — pick at least one before generating.'}</span></div>
            <div className={styles.field}><span className={styles.head}>The room’s shape</span><Chips label="The room’s shape" options={GEOMETRIES.map((g) => ({ value: g.key, label: g.label }))} value={t.geometry} onChange={(v) => onPatchTransfer((tt) => ({ ...tt, geometry: v as typeof tt.geometry }))} /><span className={styles.hint}>{GEOMETRIES.find((g) => g.key === t.geometry)?.hint}</span></div>
            <TextField label="Keep unchanged" value={t.keep} onChange={(v) => onPatchTransfer((tt) => ({ ...tt, keep: v }))} placeholder="e.g. the floor, the client’s green sofa" />
          </>
        ) : null}
      </div>
    </Panel>
  )
}
