'use client'

import { useRef } from 'react'
import { parseSubReasons } from '@/lib/leads/return-model'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { useComingSoon } from '@/components/om/snackbar'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { bottomSheet, modalPanel, overlayFade } from '@/lib/motion'
import { useSheetLayout } from '@/components/om/sheet'
import { displayDateTimeTight } from '@/lib/format'
import { returnTags } from '@/lib/leads/return-tags'
import type { ReturnDetail } from '@/lib/leads/returns'
import type { LeadFile } from '@/lib/db/schema'
import styles from './return-details-modal.module.css'

/**
 * Return details — ModalComponent 620×934 r12 (frame 176 processing 931:49048 · 178 approved + refund 931:49138;
 * spec design-source/context/lead-return/01-wizard-details.txt "Return details"; build plan 00-build-plan.md).
 * Shell (overlay + panel, Escape, scroll lock) = components/leads/tasks/tasks-filters-modal.tsx at 620 wide, height to
 * content (viewport-capped, the body scrolls). Head 64 (H g16 p20/24, bottom rule): the lead name 20/Bold · `returnTags`
 * as the 20px "Tag Outlined" MetaChip (title case, as the Lead Details header — UI-01; H g8) · info 24 (coming soon) ·
 * close 24. Body V g20 p24:
 *   appeal banner (rejected with an appeal window only) 572×72 H g8 p16 yellow variant2 fill / variant1 stroke r8 —
 *     "here" is a DS Link → coming soon (user 2026-08-30);
 *   reply card (only once Qanvast has replied): Two Line (Qanvast image 40 + "Qanvast" 14 / "Business Team" 12 secondary)
 *     + rows Replied on · Status · Reason · Additional remarks;
 *   return card: Two Line (Avatar 40 of the returner + name / "<role> (you)" when it is me, else the role) + rows
 *     Returned on · Reason · Date and time of first outreach · Number of attempts made (5 → "+5"), rule, "Other Info"
 *     16/Bold, Comments, Attachments tiles 134×158 (the Notes attachment tile; click → onOpenFile; the mock's trash glyph
 *     at the caption's right = a 24px delete control, coming soon until removing evidence from a submitted return is
 *     specified — audit 2026-08-30, RD-01).
 * Rows are H g16: label 200 wide 14 secondary · value 14 ink. Dates use displayDateTimeTight ("28 Aug ’26, 4:30PM").
 */
export function ReturnDetailsModal({ open, leadName, ret, onClose, onOpenFile }: {
  open: boolean
  leadName: string
  ret: ReturnDetail
  onClose: () => void
  onOpenFile: (file: LeadFile) => void
}) {
  useScrollLock(open)   // the page never scrolls behind this surface
  const comingSoon = useComingSoon()
  /* (REG-287) The panel claims `aria-modal`, so it owes the WAI-ARIA dialog contract: focus moves in on open,
     Tab cycles inside instead of walking into the page the modal has declared inert, and focus returns to the
     opener on close. Esc goes through the same layer policy as every other surface — a menu / picker / nested
     dialog above this panel owns it first (components/om/surface.ts), which is what the hand-rolled
     `!e.defaultPrevented` window listener this replaces was reaching for. */
  const panel = useRef<HTMLDivElement>(null)
  /* (REG-353) ≤767 this modal is the canvas' bottom sheet: it rises off the bottom edge and wears the grabber. */
  const sheet = useSheetLayout()
  useEscapeLayer(open, panel, onClose)
  useDialogFocus(open, panel)

  const showAppeal = ret.status === 'rejected' && !!ret.appealDays
  const me = ret.returnedBy
  const hasOtherInfo = !!ret.comments || ret.attachments.length > 0

  // Rows print only what the record holds — the spec lists the mock's filled values, not an empty state.
  const replyRows: [string, string | null][] = [
    ['Replied on', ret.repliedAt ? displayDateTimeTight(ret.repliedAt) : null],
    ['Status', ret.statusText],
    ['Reason', ret.replyReason],
    ['Additional remarks', ret.replyRemarks],
  ]
  const returnRows: [string, string | null][] = [
    ['Returned on', displayDateTimeTight(ret.returnedAt)],
    ['Reason', ret.reason],
    /* (REG-609, parity D-39) The seven reasons' own fields. */
    ['Specific reasons', parseSubReasons(ret.subReasons).join(' · ') || null],
    ['Details', ret.detail ?? null],
    ['Date and time of first outreach', ret.firstOutreachAt ? displayDateTimeTight(ret.firstOutreachAt) : null],
    ['Number of attempts made', ret.attempts == null ? null : ret.attempts >= 5 ? '+5' : String(ret.attempts)],
  ]
  const rows = (list: [string, string | null][]) => (
    <div className={styles.rows}>
      {list.map(([label, value]) => value ? (
        <div key={label} className={styles.row}>
          <span className={styles.rowLabel}>{label}</span>
          <span className={styles.rowValue}>{value}</span>
        </div>
      ) : null)}
    </div>
  )

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          {/* (REG-287) tabIndex={-1} so the panel can hold focus; `outline: none` matches every other panel that takes
              focus on open (components/om/dialog.module.css, move-stage/wizard.module.css) — inline because this
              surface's stylesheet is outside this pass. The ring belongs to the panel's own controls. */}
          <motion.div ref={panel} className={styles.panel} style={{ outline: 'none' }} variants={sheet ? bottomSheet : modalPanel}
                      role="dialog" aria-modal aria-label={leadName} tabIndex={-1} data-testid="return-details">
            {sheet ? <span className={styles.grabber} aria-hidden /> : null}
            <div className={styles.heading}>
              <div className={styles.titleWrap}>
                <span className={styles.title}>{leadName}</span>
                <span className={styles.tags}>
                  {returnTags(ret).map((t) => <MetaChip key={t.label} color={t.color}>{t.label}</MetaChip>)}
                </span>
              </div>
              {/* Tooltip label = the file viewer's info control (file-viewer.tsx) — the mock has no tooltip text. */}
              <Tooltip label="Information">
                <button type="button" className={styles.iconBtn} aria-label="Information" onClick={comingSoon}>
                  <Icon name="info" size={24} />
                </button>
              </Tooltip>
              <Tooltip label="Close">
                <button type="button" className={styles.iconBtn} aria-label="Close" onClick={onClose}>
                  <Icon name="close" size={24} family="outlined" />
                </button>
              </Tooltip>
            </div>

            <div className={styles.body}>
              {showAppeal ? (
                <div className={styles.banner} data-testid="appeal-banner">
                  <span className={styles.bannerText}>
                    Submit an appeal within {ret.appealDays} days with more supporting documents/information{' '}
                    <Link className={styles.here} onPress={comingSoon}>here</Link>.
                  </span>
                </div>
              ) : null}

              {ret.repliedAt ? (
                <section className={styles.card} aria-label="Qanvast’s reply" data-testid="reply-card">
                  <div className={styles.twoLine}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/figma-assets/qanvast-avatar.png" width={40} height={40} alt="" className={styles.qanvastAvatar} />
                    <span className={styles.twoLineText}>
                      <span className={styles.twoLineName}>Qanvast</span>
                      <span className={styles.twoLineSub}>Business Team</span>
                    </span>
                  </div>
                  {rows(replyRows)}
                </section>
              ) : null}

              <section className={styles.card} aria-label="Return" data-testid="return-card">
                {me ? (
                  <div className={styles.twoLine}>
                    <Avatar name={me.name} color={me.color} size={40} tooltip={false} />
                    <span className={styles.twoLineText}>
                      <span className={styles.twoLineName}>{me.name}</span>
                      <span className={styles.twoLineSub}>{me.isYou ? `${me.role} (you)` : me.role}</span>
                    </span>
                  </div>
                ) : null}
                {rows(returnRows)}
                {hasOtherInfo ? (
                  <>
                    <div className={styles.rule} />
                    <span className={styles.otherInfo}>Other Info</span>
                    {ret.comments ? (
                      <div className={styles.block}>
                        <span className={styles.blockLabel}>Comments</span>
                        <span className={styles.blockText}>{ret.comments}</span>
                      </div>
                    ) : null}
                    {ret.attachments.length ? (
                      <div className={styles.block}>
                        <span className={styles.blockLabel}>Attachments</span>
                        <div className={styles.tiles}>
                          {ret.attachments.map((f) => (
                            <div key={f.id} className={styles.tile} data-testid="return-attachment">
                              <button type="button" className={styles.tileMain} aria-label={`Open ${f.name}`} onClick={() => onOpenFile(f)}>
                                {f.thumb ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={f.thumb} alt="" className={styles.tileImg} width={126} height={108} />
                                ) : (
                                  /* No thumbnail (a PDF): the Notes tile's surface-variant box with the kind's glyph. */
                                  <span className={styles.tileBox}><Icon name={kindIcon(f)} size={24} className={styles.tileBoxIcon} /></span>
                                )}
                                <span className={styles.caption}>
                                  <Icon name={kindIcon(f)} size={20} className={styles.kindIcon} />
                                  <span className={styles.tileName}>{f.name}</span>
                                </span>
                              </button>
                              {/* Trash 24 at the caption's right (931:49048) — the Notes tile's control slot; coming soon (RD-01). */}
                              <span className={styles.tileMenuWrap}>
                                <Tooltip label="Delete attachment">
                                  <button type="button" className={styles.tileDelete} aria-label={`Delete ${f.name}`} onClick={comingSoon}>
                                    <Icon name="delete" size={24} weight={300} />
                                  </button>
                                </Tooltip>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </section>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/** The tile's kind glyph — components/leads/notes/attachments-column.tsx kindIcon. */
const kindIcon = (f: LeadFile) => (f.kind === 'pdf' || f.mime === 'application/pdf' ? 'picture_as_pdf' : 'image')
