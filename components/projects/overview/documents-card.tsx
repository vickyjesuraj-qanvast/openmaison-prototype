'use client'

import Link from 'next/link'
import { Card } from '@/components/leads/detail/card'
import { Icon } from '@/components/om/icon'
import { Bone } from '@/components/shell/skeleton'
import { Line, Words } from '@/components/shell/ghost-kit'
import card from '@/components/leads/detail/card.module.css'
import type { ProjectDocumentRow } from './documents'
import styles from './documents-card.module.css'

/**
 * (Contracts on the move, C4 — P-11 · C-23; his "please check and built accordingly" 2026-10-22) DOCUMENTS — the signed quote and the contract on
 * the Overview, each a 48 row (glyph · name 16 · its date 14 · ↗) that opens the record with the way back (`?from=` the project). Drawn ≤1024
 * only (documents-card.module.css): the desk keeps them as the info column's Project info rows, and View Client Info keeps them too. A document
 * not on record is said in its row, without a press ("None yet"); no document at all → no card (the host passes no rows). Words invented: the
 * card's title *Documents*, "None yet", "Uploaded copy, in Files", "Sent … · not signed yet".
 */
export function DocumentsCard({ rows }: { rows: ProjectDocumentRow[] }) {
  if (!rows.length) return null
  return (
    <div className={styles.documents} data-testid="project-documents">
      <Card title="Documents" headGap={8} testId="documents">
        <div className={styles.body}>
          <div className={styles.group}>
            {rows.map((r) => {
              const inner = (
                <>
                  <Icon name={r.icon} size={20} weight={300} className={styles.icon} />
                  <span className={styles.text}><span className={styles.name}>{r.name}</span><span className={styles.when}>{r.when}</span></span>
                  {r.href ? <span className={styles.go} aria-hidden><Icon name="arrow_outward" size={20} /></span> : null}
                </>
              )
              return r.href
                ? <Link key={r.key} href={r.href} className={styles.row} data-testid={r.testId}>{inner}</Link>
                : <div key={r.key} className={styles.row} data-static="" data-testid={r.testId}>{inner}</div>
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}

/** (REG-708) The Documents card's ghost — its head in its own word and its two 48 rows, on the card's own classes; ≤1024 only, as the card. */
export function DocumentsGhost() {
  return (
    <span className={styles.documents} data-card="documents">
      <section className={card.card}>
        <div className={card.head}><div className={card.headText}><Words className={card.title}>Documents</Words></div></div>
        <div className={styles.body}>
          <div className={styles.group}>
            {[[104, 112], [208, 120]].map(([a, b], i) => (
              <div key={i} className={styles.row} data-static="">
                <Bone w={20} h={20} r="50%" />
                <span className={styles.text}><Line w={a!} lh={24} h={14} /><Line w={b!} lh={20} h={12} /></span>
                <Bone w={20} h={20} r={4} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </span>
  )
}
