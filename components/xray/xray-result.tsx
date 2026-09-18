'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { PageReveal } from '@/components/shell/page-reveal'
import { DetailSkeleton } from '@/components/shell/detail-skeleton'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { ColumnSettingsDrawer } from '@/components/om/column-settings'
import { useTableColumns } from '@/components/om/table-columns'
import { MOBILE, useMediaQuery } from '@/lib/breakpoint'
import { fromLabel } from '@/lib/nav'
import { displayDate } from '@/lib/format'
import { moneyK } from '@/lib/xray/compare'
import type { XrayRecord } from '@/lib/xray/queries'
import { SendDialog } from './send-dialog'
import { XRAY_COLUMN_DEFS, XrayTable } from './xray-table'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './xray-result.module.css'

/**
 * A comparison's record page (REG-529): the L2 header (crumb Quote X-Ray, Back where you came from, New comparison), then one
 * reading column — the summary with its three figures, Say this with Send to client, the brands worth a word, and the
 * item-by-item table on the listing's model.
 */
export function XrayResult({ record, from }: { record: XrayRecord; from: string | undefined }) {
  const r = record.result
  const router = useRouter()
  const [sendOpen, setSendOpen] = useState(false)
  const [asQuestion, setAsQuestion] = useState<Record<number, boolean>>({})
  const [columnsOpen, setColumnsOpen] = useState(false)
  const phone = useMediaQuery(MOBILE)
  const columnPrefs = useTableColumns('xray-items', XRAY_COLUMN_DEFS, phone)
  const title = `${record.leadName ?? record.yourLabel} · vs ${record.otherStudio}`
  const risks = r.brands.filter((b) => b.tone !== 'note')
  const notes = r.brands.filter((b) => b.tone === 'note')
  return (
    <PageReveal skeleton={<DetailSkeleton />}>
      <div className={pageStyles.body} style={{ position: 'relative' }}>
        <PageHeaderL2 backHref={from ?? '/quote-x-ray'} crumbs={record.leadName && from && /[?&]lead=/.test(from) ? [{ label: record.leadName, href: record.leadId ? `/leads/${record.leadId}` : undefined }, { label: 'Quote X-Ray', href: from }] : fromLabel(from) && from ? [{ label: fromLabel(from)!, href: from }, { label: 'Quote X-Ray', href: '/quote-x-ray' }] : [{ label: 'Quote X-Ray', href: '/quote-x-ray' }]} title={title}
                      chips={<><MetaChip>{displayDate(new Date(record.createdAt))}</MetaChip><MetaChip>{r.compared} items compared</MetaChip></>}
                      actions={<Button appearance="outlined" variant="secondary" iconStart={<Icon name="add" size={20} />} onPress={() => router.push('/quote-x-ray')}>New comparison</Button>} />
        <div className={styles.column}>
          <section className={styles.card} aria-label="Summary" data-testid="xray-summary">
            <span className={styles.eyebrow}>Comparing your quote ({r.yourStudio} · {r.yourLabel}) with the quote from <b>{r.otherStudio}</b></span>
            <h2 className={styles.headline}>{r.headline}</h2>
            <div className={styles.tiles}>
              <div className={styles.tile}><span className={styles.tileLabel}>Yours ({r.yourStudio})</span><span className={styles.tileValue}>{moneyK(r.yoursMinor)}</span></div>
              <div className={styles.tile}><span className={styles.tileLabel}>{r.otherStudio}</span><span className={styles.tileValue}>{moneyK(r.theirsMinor)}</span></div>
              <div className={styles.tile} data-tone="primary"><span className={styles.tileLabel}>Real difference</span><span className={styles.tileValue}>{r.realDiffMinor < 0 ? '−' : ''}{moneyK(r.realDiffMinor)}</span><span className={styles.tileHelp}>{r.realDiffMinor > 0 ? 'ours more, like-for-like' : r.realDiffMinor < 0 ? 'ours less, like-for-like' : 'level, like-for-like'}</span></div>
            </div>
            <p className={styles.footnote}><Icon name="info" size={18} weight={300} /> {r.footnote}</p>
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
            {r.brands.length === 0 ? <span className={styles.none}>Neither quote names a brand worth a word.</span> : (
              <ul className={styles.brands}>
                {risks.map((b, i) => (
                  <li key={`${b.brand}-${i}`} className={styles.brand} data-tone={b.tone}>
                    <div className={styles.brandHead}>
                      <span className={styles.brandName}>{b.brand} <span className={styles.brandMeta}>{b.trade}{b.side === 'theirs' ? ' · in their quote' : b.side === 'yours' ? ' · in your quote' : ''}</span></span>
                      {b.tone === 'advantage' ? <MetaChip>Your advantage</MetaChip> : b.impact ? <span className={styles.impact} data-impact={b.impact}>Impact: {b.impact}</span> : null}
                    </div>
                    <span className={styles.brandText}>{b.text}</span>
                    {b.sources.length ? <span className={styles.sources}>{b.sources.map((s) => <span key={s} className={styles.source}><Icon name="open_in_new" size={14} weight={300} /> {s}</span>)}</span> : null}
                  </li>
                ))}
                {notes.length ? <li className={styles.also}>We also checked {notes.map((b) => b.brand).join(', ')} — both quotes name {notes.length === 1 ? 'it' : 'them'}.</li> : null}
              </ul>
            )}
          </section>

          <section className={styles.tableCard} aria-label="Item by item" data-testid="xray-items">
            <div className={styles.tableHead}>
              <span className={styles.cardTitle}>Item by item <span className={styles.count}>{r.compared} compared</span></span>
              <span className={styles.tableTools}>
                <span className={styles.legend}><span className={styles.swatch} data-status="yours-only" /> only in yours <span className={styles.swatch} data-status="theirs-only" /> only in theirs <span className={styles.swatch} data-status="unpriced" /> no price</span>
                {!phone ? <Tooltip label="Column settings"><IconButton icon="tune" label="Column settings" onClick={() => setColumnsOpen(true)} /></Tooltip> : null}
              </span>
            </div>
            <XrayTable rows={r.rows} otherStudio={r.otherStudio} columns={columnPrefs.columns} onReorder={columnPrefs.reorder} />
          </section>
          <span className={styles.foot}>Read by Quote X-Ray on {displayDate(new Date(record.createdAt))} · {record.otherFile} · <Link href="/quote-x-ray" className={styles.link}>All comparisons</Link></span>
        </div>

        <SendDialog open={sendOpen} onClose={() => setSendOpen(false)} draft={r.message} phone={record.leadPhone} />
        <ColumnSettingsDrawer open={columnsOpen} onClose={() => setColumnsOpen(false)} pinning={{ max: 2 }} columns={columnPrefs.all} onSave={columnPrefs.save} onReset={columnPrefs.reset} />
      </div>
    </PageReveal>
  )
}
