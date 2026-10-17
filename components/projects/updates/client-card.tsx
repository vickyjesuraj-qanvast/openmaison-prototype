'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { MetaChip } from '@/components/om/meta-chip'
import { clientDay, firstName, type UpdateMedia } from '@/lib/projects/updates-model'
import styles from './updates.module.css'

/**
 * (REG-952, Projects round 3) One update as the client reads it — the portal canvas's Updates card (Client Portal Proposal › Updates):
 * "Fri 2 Oct · from Germaine", the title, a few lines, the photos two across at 4:3 or three across square, a video that plays, a document
 * that opens. Nothing of the studio's (no state, no reviewer, no cost). The composer's Preview draws it; the portal's own Updates page
 * (round 4b) draws the same card at the column's width (`wide`), its photos opening the viewer (`onPhoto`), "New" on one the client has
 * not opened yet, and a foot (board 3's "Confirm this stage").
 */
export function ClientUpdateCard({ title, html, author, at, media, milestone, wide = false, onPhoto, onCompare, fresh = false, changed = false, foot, id, lead, aside }: {
  title: string
  html: string
  author: string | null
  at: number
  media: UpdateMedia[]
  milestone?: string | null
  /** (r4b) The portal's column width — the composer's preview keeps the phone's 358. */
  wide?: boolean
  /** (r4b) A photo pressed: its index among the photos — the portal opens its viewer there. */
  onPhoto?: (index: number) => void
  /** (gaps build D, item 10) Two or more photos: Compare before and after opens the house slider */
  onCompare?: () => void
  /** (r4b) Not opened by the client yet. */
  fresh?: boolean
  /** (fix-C, C-22) Opened before, its words changed since — the portal's Changed chip (REG-1060's word for it). */
  changed?: boolean
  /** (r4b) What follows the media — board 3's "Confirm this stage". */
  foot?: ReactNode
  /** (r4b) The update's id, for the portal's opened stamp. */
  id?: string
  /** (r4b) Words before the date — the home's "Latest update" (boards 1 · 7). */
  lead?: string
  /** (r4b) At the date line's end — the home's "All updates". */
  aside?: ReactNode
}) {
  const photos = media.filter((m) => m.kind === 'photo' && m.thumb)
  const videos = media.filter((m) => m.kind === 'video' && m.src)
  const docs = media.filter((m) => m.kind === 'doc' && m.src)
  const shown = photos.slice(0, 6)
  const more = photos.length - shown.length
  return (
    <article className={styles.client} data-testid="client-update" data-wide={wide || undefined} data-update-id={id} data-fresh-client={fresh || changed || undefined}>
      <div className={styles.clientDate} data-aside={aside ? '' : undefined}>
        <span>
          {fresh ? <MetaChip color="blue" className={styles.clientNew}>New</MetaChip> : changed ? <MetaChip color="blue" className={styles.clientNew}>Changed</MetaChip> : null}   {/* (REG-1060) the house chip, as the portal's New / Changed */}
          {lead ? `${lead} · ` : ''}{clientDay(at)}{author ? ` · from ${firstName(author)}` : ''}
        </span>
        {aside}
      </div>
      {milestone ? <span className={styles.clientMilestone}><MetaChip icon="flag">{milestone}</MetaChip></span> : null}
      <h2 className={styles.clientTitle}>{title || 'Untitled update'}</h2>
      {html ? <div className={styles.clientHtml} dangerouslySetInnerHTML={{ __html: html }} /> : null}
      {shown.length ? (
        <div className={styles.clientPhotos} data-n={shown.length}>
          {shown.map((p, i) => onPhoto ? (
            <button key={p.fileId} type="button" className={styles.clientPhotoBtn} onClick={() => onPhoto(i)} aria-label={`Open photo ${i + 1} of ${photos.length}`} data-testid="client-update-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.thumb!} alt="" className={styles.clientPhoto} loading="lazy" />
              {i === shown.length - 1 && more > 0 ? <span className={styles.clientMore}>{`+${more}`}</span> : null}
            </button>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.fileId} src={p.thumb!} alt="" className={styles.clientPhoto} />
          ))}
        </div>
      ) : null}
      {onCompare && photos.length >= 2 ? (
        <span className={styles.compareRow}><Button appearance="text" iconStart={<Icon name="compare" size={20} />} onPress={onCompare} data-testid="client-update-compare">Compare before and after</Button></span>
      ) : null}
      {videos.map((v) => <video key={v.fileId} className={styles.clientVideo} src={v.src!} poster={v.thumb ?? undefined} controls playsInline preload="metadata" />)}
      {docs.map((d) => (
        <a key={d.fileId} className={styles.clientFile} href={d.src!} target="_blank" rel="noopener noreferrer">
          <Icon name={d.mime === 'application/pdf' ? 'picture_as_pdf' : 'description'} size={20} weight={300} />{d.name}
        </a>
      ))}
      {foot}
    </article>
  )
}
