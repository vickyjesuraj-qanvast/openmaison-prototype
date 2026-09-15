'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { useComingSoon } from '@/components/om/snackbar'
import { Tooltip } from '@/components/om/tooltip'
import { TextField } from '@/components/om/text-field'
import { useScrollLock } from '@/components/om/use-scroll-lock'
import { useDialogFocus, useEscapeLayer } from '@/components/om/surface'
import { useSheetLayout } from '@/components/om/sheet'
import { Dropdown, DropdownItem } from '@/components/leads/dropdown'
import { bottomSheet, modalPanel, overlayFade } from '@/lib/motion'
import { displayDate } from '@/lib/format'
import type { QuoteTemplate } from '@/lib/db/schema'
import styles from './create-quote-modal.module.css'

/** "used 2w ago" (the 1.0 card's meta): days under a week, weeks under a month, then the date. */
function usedAgo(at: Date | null, now: number): string | null {
  if (!at) return null
  const days = Math.floor((now - at.getTime()) / 86_400_000)
  if (days < 1) return 'used today'
  if (days < 7) return `used ${days}d ago`
  if (days < 30) return `used ${Math.floor(days / 7)}w ago`
  return `used ${displayDate(at)}`
}
const KIND_LABEL: Record<string, string> = { design: 'Design only' }
/** The rail shows the default and the most recently used; the rest sit behind View all (design reference). */
const RAIL_MAX = 3

/**
 * Create Quote modal (REG-412 — the 1.0 "Start a quote for {lead}" screen on the 2.0 DS, chosen from the design
 * reference of 2026-09-11): xl 1200 · "FROM A DESIGN TEMPLATE · n SAVED" with View all / New design template · a tile
 * rail where Blank Quote leads the studio's templates (the tile is the action, its kebab holds Preview · Set as
 * default) · "MORE WAYS TO START" (Upload a quote · Draft with Maison AI). Every count, name, tag and "used n ago"
 * comes from `quote_templates` (REG-403). View all, New design template, Preview, Upload and Draft answer coming
 * soon until their surfaces exist. ≤767 it is the canvas' bottom sheet (REG-353).
 */
export function CreateQuoteModal({ open, leadName, templates, now, onClose, onStart, onSetDefault, clients, priceBookCount }: {
  open: boolean
  /** The lead the quote is for; '' when the modal opens studio-wide and the Client field decides (REG-422). */
  leadName: string
  templates: QuoteTemplate[]
  now: number
  onClose: () => void
  /** A template's id, or null for Blank Quote; `clientId` = the Client field's lead when the modal carries one. */
  onStart: (templateId: string | null, clientId: string | null) => void
  onSetDefault: (templateId: string) => void
  /** Tools › Quotes (REG-422): the studio's leads — the modal opens with a Client field on top and a tile waits for a pick. */
  clients?: { id: string; name: string }[]
  /** The studio's My Items count — the 1.0 row's "your 8-item price book" (REG-412), from the record. */
  priceBookCount?: number
}) {
  useScrollLock(open)
  const comingSoon = useComingSoon()
  const panel = useRef<HTMLDivElement>(null)
  const sheet = useSheetLayout()
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientError, setClientError] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setClientId(null); setClientError(false) } }   // every opening starts with no client (render-phase adjust)
  const client = clients?.find((c) => c.id === clientId) ?? null
  const start = (templateId: string | null) => {
    if (clients && !clientId) { setClientError(true); return }
    onStart(templateId, clientId)
  }
  /* A template's kebab menu renders INSIDE this panel, and the surface policy skips descendants (REG-287), so the
     modal would take Esc first and close under the open menu. While a menu is open the menu owns Esc; the layer re-arms
     when it closes. */
  useEscapeLayer(open && menuFor === null, panel, onClose)
  useDialogFocus(open, panel)
  const rail = templates.slice(0, RAIL_MAX)
  const forName = clients ? client?.name ?? '' : leadName
  const title = forName ? `Start a quote for ${forName}` : 'Start a quote'

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={styles.overlay} variants={overlayFade} initial="initial" animate="animate" exit="exit"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
          <motion.div ref={panel} className={styles.panel} style={{ outline: 'none' }} variants={sheet ? bottomSheet : modalPanel}
                      role="dialog" aria-modal aria-label={title} tabIndex={-1} data-testid="create-quote">
            {sheet ? <span className={styles.grabber} aria-hidden /> : null}
            <div className={styles.heading}>
              <span className={styles.title}>{title}</span>
              <Tooltip label="Close">
                <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
                  <Icon name="close" size={24} family="outlined" />
                </button>
              </Tooltip>
            </div>
            <div className={styles.body}>
              {clients ? (
                /* (REG-422) Studio-wide: the Client field decides which lead the quote belongs to; a tile pressed before a pick shows the field's error. */
                <section className={styles.block} aria-label="Client">
                  <TextField label="Client" mode="select" required value={client?.name ?? ''} options={clients.map((c) => c.name)}
                             error={clientError ? 'Choose a client first' : undefined}
                             onChange={(name) => { setClientId(clients.find((c) => c.name === name)?.id ?? null); setClientError(false) }} />
                </section>
              ) : null}
              {/* Templates: eyebrow row, then the rail — Blank Quote first (Figma 1209), then the studio's templates. */}
              <section className={styles.block} aria-label="From a design template">
                <div className={styles.eyebrowRow}>
                  <span className={styles.eyebrow}>From a design template · {templates.length} saved</span>
                  <div className={styles.eyebrowActions}>
                    <Button appearance="text" iconEnd={<Icon name="chevron_right" size={20} />} onPress={comingSoon}>View all</Button>
                    <Button appearance="text" iconStart={<Icon name="add" size={20} />} onPress={comingSoon}>New design template</Button>
                  </div>
                </div>
                <div className={styles.rail}>
                  <div className={styles.tile}>
                    <button type="button" className={styles.action} onClick={() => start(null)} aria-label="Blank Quote — start from an empty table">
                      <span className={styles.well} data-blank><Icon name="add" size={40} weight={300} /></span>
                      <span className={styles.caption}>
                        <span className={styles.nameRow}><span className={styles.name}>Blank Quote</span></span>
                        <span className={styles.meta}>Start from an empty table</span>
                      </span>
                    </button>
                  </div>
                  {rail.map((t) => {
                    const used = usedAgo(t.lastUsedAt, now)
                    const meta = [KIND_LABEL[t.kind] ?? t.kind, used].filter(Boolean).join(' · ')
                    return (
                      <div key={t.id} className={styles.tile} data-kebab>
                        <button type="button" className={styles.action} onClick={() => start(t.id)} aria-label={`Use ${t.name}`}>
                          <span className={styles.well} aria-hidden>
                            <span className={styles.doc}>
                              <span className={styles.ln} data-h style={{ width: '42%' }} /><span className={styles.ln} /><span className={styles.ln} style={{ width: '84%' }} /><span className={styles.ln} style={{ width: '92%' }} />
                              <span className={styles.ln} data-tb /><span className={styles.ln} /><span className={styles.ln} style={{ width: '88%' }} /><span className={styles.ln} style={{ width: '72%' }} />
                            </span>
                          </span>
                          <span className={styles.caption}>
                            <span className={styles.nameRow}>
                              <span className={styles.name}>{t.name}</span>
                              {t.isDefault ? <MetaChip>Default</MetaChip> : null}
                            </span>
                            <span className={styles.meta}>{meta}</span>
                          </span>
                        </button>
                        <span className={styles.kebab}>
                          <Tooltip label="More options" disabled={menuFor === t.id}>
                            <IconButton icon="more_vert" label={`More options for ${t.name}`} size={24} variant="bare" iconSize={24} iconWeight={300}
                                        aria-haspopup="menu" aria-expanded={menuFor === t.id}
                                        onClick={() => setMenuFor((m) => (m === t.id ? null : t.id))} />
                          </Tooltip>
                          <Dropdown open={menuFor === t.id} onClose={() => setMenuFor(null)} align="right" sheetTitle={t.name}>
                            <DropdownItem onSelect={() => { setMenuFor(null); comingSoon() }}>Preview</DropdownItem>
                            <DropdownItem onSelect={() => { setMenuFor(null); onSetDefault(t.id) }} disabled={t.isDefault} title={t.isDefault ? 'Already the default' : undefined}>Set as default</DropdownItem>
                          </Dropdown>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
              {/* More ways to start — the 1.0 rows, verbatim; both answer coming soon until their flows exist. */}
              <section className={styles.block} aria-label="More ways to start">
                <span className={styles.eyebrow}>More ways to start</span>
                <div className={styles.list}>
                  <button type="button" className={styles.row} onClick={comingSoon}>
                    <span className={styles.glyph}><Icon name="upload_file" size={20} weight={300} /></span>
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>Upload a quote <MetaChip>PDF · XLS · JPG</MetaChip></span>
                      <span className={styles.rowDesc}>Digitize an existing quote — we scan it into editable line items</span>
                    </span>
                    <span className={styles.trail}><Icon name="chevron_right" size={24} /></span>
                  </button>
                  <button type="button" className={styles.row} onClick={comingSoon}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <span className={styles.glyph}><img src="/figma-assets/maison-ai-mark.svg" alt="" /></span>
                    <span className={styles.rowText}>
                      <span className={styles.rowTitle}>Draft with Maison AI</span>
                      {/* (REG-403) The 1.0 row says "your 8-item price book" — the count is the studio's My Items (price_book_items). */}
                      <span className={styles.rowDesc}>Describe the scope — we draft a categorized quote from your {priceBookCount ? `${priceBookCount}-item ` : ''}price book</span>
                    </span>
                    <span className={styles.trail}><Icon name="chevron_right" size={24} /></span>
                  </button>
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
