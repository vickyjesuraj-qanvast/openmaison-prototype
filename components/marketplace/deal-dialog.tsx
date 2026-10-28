'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { withFrom } from '@/lib/nav'
import { askAgainLabel, askLabel, askWay, askedLine, dealChip, dealRun, endsSoon, type DealAsk, type DealView, type MarketViewer } from '@/lib/marketplace/model'
import styles from './marketplace.module.css'

/**
 * (pending modules S24 — 1.0's DealModal) A deal in full: its picture, what it is, when it runs, its terms and how to redeem it, and one filled
 * button — Get deal, which reaches the brand the way the deal says (its own page, WhatsApp, email). Nothing is bought here: the brand answers
 * the studio. Who asked before says so above the button, so nobody asks twice. The brand's name opens its page (not on its own page).
 * A form-size dialog: a bottom sheet on a phone. *(invented copy: the ask line, the no-way line)*
 * (the calm UI build 2026-10-27, 6-24) Its days are said once — "Runs 7 Oct – 11 Dec ’26" — and a chip only in its last week; once the studio
 * asked, the button is outlined "Ask again on WhatsApp" (the same press: a second ask is a choice, not the next step).
 */
export function DealDialog({ deal, onClose, viewer, now, here, onBrandPage = false, onGet }: {
  deal: DealView | null
  onClose: () => void
  viewer: MarketViewer
  now: number
  /** where the brand's page returns to */
  here: string
  onBrandPage?: boolean
  /** Get deal — resolves with the ask once it is recorded */
  onGet: (d: DealView) => Promise<DealAsk | null>
}) {
  const [busy, setBusy] = useState(false)
  /* the ask this dialog just made shows at once, before the page's refresh brings it */
  const [asked, setAsked] = useState<{ id: string; ask: DealAsk } | null>(null)
  /* the deal stays drawn while the dialog closes (render-phase adjust: the last one opened) */
  const [last, setLast] = useState<DealView | null>(deal)
  if (deal && deal !== last) setLast(deal)
  const shown = deal ?? last
  if (!shown) return null
  const ask = asked?.id === shown.id ? asked.ask : shown.asked
  const way = askWay(shown)
  const when = dealChip(shown, now), run = dealRun(shown)
  const press = async () => {
    if (busy || !deal) return
    setBusy(true)
    try { const a = await onGet(deal); if (a) setAsked({ id: deal.id, ask: a }) } finally { setBusy(false) }
  }
  return (
    <Dialog open={!!deal} onClose={onClose} title={shown.title} size="form" width={600}
            eyebrow={onBrandPage ? shown.brandName : <Link href={withFrom(`/marketplace/${shown.brandId}`, here)} className={styles.eyebrowLink} data-testid="deal-brand">{shown.brandName}</Link>}
            footer={way ? (
              <Button onPress={() => { void press() }} isDisabled={busy} iconStart={<Icon name={way === 'whatsapp' ? 'chat' : way === 'email' ? 'mail' : 'open_in_new'} size={20} />} data-testid="deal-get"
                      {...(ask ? { variant: 'secondary' as const, appearance: 'outlined' as const } : {})}>{ask ? askAgainLabel(shown) : askLabel(shown)}</Button>
            ) : undefined}>
      <div className={styles.deal} data-testid="deal-dialog">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {shown.picture ? <img className={styles.dealPicture} src={shown.picture} alt="" /> : null}
        {shown.flash || when ? (
          <div className={styles.dealMeta}>
            {shown.flash ? <MetaChip color="blue">Flash deal</MetaChip> : null}
            {when ? <MetaChip color={endsSoon(shown, now) ? 'yellow' : 'default'} icon="schedule">{when}</MetaChip> : null}
          </div>
        ) : null}
        {shown.description ? <p className={styles.dealText}>{shown.description}</p> : null}
        {run ? <p className={styles.dealSmall} data-testid="deal-run">{run}</p> : null}
        {shown.terms ? (
          <section className={styles.dealSection}>
            <h3 className={styles.dealHead}>Terms and conditions</h3>
            <p className={styles.dealSmall}>{shown.terms}</p>
          </section>
        ) : null}
        {shown.redemption ? (
          <section className={styles.dealSection}>
            <h3 className={styles.dealHead}>How to redeem</h3>
            <p className={styles.dealSmall}>{shown.redemption}</p>
          </section>
        ) : null}
        {!way ? <p className={styles.dealSmall}>{`${shown.brandName} takes this deal as How to redeem says.`}</p> : null}
        {ask ? <p className={styles.asked} data-testid="deal-asked"><Icon name="check_circle" size={16} />{askedLine(ask, viewer.id)}</p> : null}
      </div>
    </Dialog>
  )
}
