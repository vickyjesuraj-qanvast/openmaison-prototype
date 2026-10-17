'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { PortalMenu } from '@/components/om/portal-menu'
import { Tooltip } from '@/components/om/tooltip'
import { DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { displayDateTime, displayTime, fileSize } from '@/lib/format'
import { ago } from '@/lib/templates/ago'
import { UPDATE_STATUS_LABEL, UPDATE_STATUS_TONE, clientDay, deleteBlock, feedAt, seenSince, withdrawBlock, type UpdateView } from '@/lib/projects/updates-model'
import { PhotoCompare } from './photo-compare'
import styles from './updates.module.css'

export type UpdateAction = 'edit' | 'preview' | 'approve' | 'sendBack' | 'resubmit' | 'post' | 'republish' | 'withdraw' | 'delete'
  | 'discard'   // (fix-C, C-01) take back a change held for review — the client keeps the published words

/**
 * (REG-951) One post in the feed — the detail card's white box. Along its top, while it is not plain published, the review band (the quote's
 * approval / sent banner, REG-624): In review names who sent it and when, and gives an Owner or an Admin Send back · Approve (anyone else
 * reads that it waits); Sent back carries the reviewer's reason with Edit · Resubmit; a Draft says only the studio sees it, with its Post; a
 * Withdrawn one says the client no longer sees it, with Publish again. Then who wrote it and when, its state and its milestone, ⋮ (Edit · See
 * it as the client · Withdraw · Delete — a refused one says why in its row, REG-656), the title, the words, the photos and videos as the house
 * square (each opens in the project's Files), the documents as rows. The foot says who approved it and whether the client has seen it.
 */
export function UpdateCard({ u, projectId, clientFirst, mayPost, mayReview, atOnce, now, busy, from, onAction }: {
  u: UpdateView
  projectId: string
  clientFirst: string
  mayPost: boolean
  mayReview: boolean
  /** The viewer's posts reach the client at once (an Owner or an Admin, or review off) — the band's buttons say Post rather than Resubmit. */
  atOnce: boolean
  now: number
  busy: boolean
  /** Where a photo's viewer returns to (REG-465). */
  from: string
  onAction: (a: UpdateAction, u: UpdateView) => void
}) {
  const [menu, setMenu] = useState(false)
  const [comparing, setComparing] = useState(false)   // (gaps build D, item 10) before and after
  const anchor = useRef<HTMLSpanElement>(null)
  const pick = (a: UpdateAction) => { setMenu(false); onAction(a, u) }
  const at = feedAt(u)
  /* (fix-C, C-01) a change held for review: the card shows the change (what the reviewer reads); "See it as the client" shows what they read */
  const held = u.status === 'published' ? u.pending : null
  const shown = held ? { title: held.title, html: held.html, milestoneName: held.milestoneName, media: held.media } : u
  const photos = shown.media.filter((m) => m.kind !== 'doc')
  const docs = shown.media.filter((m) => m.kind === 'doc')
  const withdrawWhy = withdrawBlock({ status: u.status, clientOpenedAt: u.clientOpenedAt, publishedAt: u.publishedAt })
  const deleteWhy = deleteBlock(u)
  const fileHref = (fileId: string) => `/projects/${projectId}/files/${fileId}?from=${encodeURIComponent(from)}`

  const since = u.publishedAt ? clientDay(u.publishedAt) : null
  const band = held && !held.sentBack ? (
    <div className={styles.band} role="status" data-tone="await" data-testid="update-band" data-held="">
      <span className={styles.bandIcon}><Icon name="approval" size={20} weight={300} /></span>
      <span className={styles.bandText}><b>Changes wait for review</b>{held.by ? ` — ${held.by.name} ${ago(held.at, now)}` : ''}. {clientFirst} still sees the version from {since ?? 'before'}.</span>
      {mayReview ? (
        <span className={styles.bandActions}>
          <Button appearance="text" onPress={() => onAction('sendBack', u)} isDisabled={busy} data-testid="update-send-back">Send back</Button>
          <Button onPress={() => onAction('approve', u)} isDisabled={busy} data-testid="update-approve">Approve</Button>
        </span>
      ) : <span className={styles.bandWait}>Waiting for an Owner or an Admin</span>}
    </div>
  ) : held && held.sentBack ? (
    <div className={styles.band} role="status" data-tone="changes" data-testid="update-band" data-held="">
      <span className={styles.bandIcon}><Icon name="edit" size={20} weight={300} /></span>
      <span className={styles.bandText}><b>Changes sent back</b>{held.sentBack.by ? ` by ${held.sentBack.by.name}` : ''}{held.sentBack.at ? ` ${ago(held.sentBack.at, now)}` : ''} — <i data-testid="update-reason">{held.sentBack.note}</i>. {clientFirst} still sees the version from {since ?? 'before'}.</span>
      {mayPost ? (
        <span className={styles.bandActions}>
          <Button appearance="text" onPress={() => onAction('edit', u)} isDisabled={busy}>Edit</Button>
          <Button onPress={() => onAction('resubmit', u)} isDisabled={busy} data-testid="update-resubmit">{atOnce ? 'Post' : 'Resubmit'}</Button>
        </span>
      ) : null}
    </div>
  ) : u.status === 'in_review' ? (
    <div className={styles.band} role="status" data-tone="await" data-testid="update-band">
      <span className={styles.bandIcon}><Icon name="approval" size={20} weight={300} /></span>
      <span className={styles.bandText}><b>{u.submittedBy?.name ?? 'A designer'}</b> sent this for review{u.submittedAt ? ` ${ago(u.submittedAt, now)}` : ''}.</span>
      {mayReview ? (
        <span className={styles.bandActions}>
          <Button appearance="text" onPress={() => onAction('sendBack', u)} isDisabled={busy} data-testid="update-send-back">Send back</Button>
          <Button onPress={() => onAction('approve', u)} isDisabled={busy} data-testid="update-approve">Approve</Button>
        </span>
      ) : mayPost && atOnce ? (
        /* (fix-C, C-09) review switched off since it was sent: off means every post publishes — its author posts it */
        <span className={styles.bandActions}><Button onPress={() => onAction('post', u)} isDisabled={busy} data-testid="update-post-review-off">Post</Button></span>
      ) : <span className={styles.bandWait}>Waiting for an Owner or an Admin</span>}
    </div>
  ) : u.status === 'sent_back' ? (
    <div className={styles.band} role="status" data-tone="changes" data-testid="update-band">
      <span className={styles.bandIcon}><Icon name="edit" size={20} weight={300} /></span>
      <span className={styles.bandText}><b>Sent back</b>{u.reviewedBy ? ` by ${u.reviewedBy.name}` : ''}{u.reviewedAt ? ` ${ago(u.reviewedAt, now)}` : ''}{u.reviewNote ? <> — <i data-testid="update-reason">{u.reviewNote}</i></> : null}</span>
      {mayPost ? (
        <span className={styles.bandActions}>
          <Button appearance="text" onPress={() => onAction('edit', u)} isDisabled={busy}>Edit</Button>
          <Button onPress={() => onAction('resubmit', u)} isDisabled={busy} data-testid="update-resubmit">{atOnce ? 'Post' : 'Resubmit'}</Button>
        </span>
      ) : null}
    </div>
  ) : u.status === 'draft' ? (
    <div className={styles.band} role="status" data-tone="changes" data-testid="update-band">
      <span className={styles.bandIcon}><Icon name="draft" size={20} weight={300} /></span>
      <span className={styles.bandText}><b>Draft</b> — only the studio sees it.</span>
      {mayPost ? <span className={styles.bandActions}><Button onPress={() => onAction('post', u)} isDisabled={busy} data-testid="update-post-draft">{atOnce ? 'Post' : 'Send for review'}</Button></span> : null}
    </div>
  ) : u.status === 'withdrawn' ? (
    <div className={styles.band} role="status" data-tone="changes" data-testid="update-band">
      <span className={styles.bandIcon}><Icon name="visibility_off" size={20} weight={300} /></span>
      <span className={styles.bandText}><b>Withdrawn</b>{u.withdrawnBy ? ` by ${u.withdrawnBy.name}` : ''}{u.withdrawnAt ? ` ${ago(u.withdrawnAt, now)}` : ''} — {clientFirst} no longer sees it.</span>
      {mayPost ? <span className={styles.bandActions}><Button variant="secondary" appearance="outlined" onPress={() => onAction('republish', u)} isDisabled={busy} data-testid="update-republish">{atOnce ? 'Publish again' : 'Send for review again'}</Button></span> : null}
    </div>
  ) : null

  const approvedBy = u.status === 'published' && u.reviewedBy && u.reviewedAt ? `Approved by ${u.reviewedBy.name} ${ago(u.reviewedAt, now)}` : null
  const edited = u.editedAt && u.status !== 'draft' ? `Edited${u.editedBy && u.editedBy.id !== u.author?.id ? ` by ${u.editedBy.name}` : ''} ${ago(u.editedAt, now)}` : null
  /* (r4b) the portal stamps the open — once for each publish (a withdrawn and republished update is new to them again); (fix-C, C-22) and once
     for each edit: words changed since they last looked are not "seen" until they open it again (the portal marks it Changed) */
  const seen = u.clientOpenedAt && seenSince(u) ? `Seen by ${u.clientOpenedBy ?? clientFirst} ${ago(u.clientOpenedAt, now)}` : u.status === 'published' && u.editedAt && u.clientOpenedAt ? `${clientFirst} hasn’t seen the change yet` : null   // (fix-F, C-07) the person who opened it
  const foot = [approvedBy, edited, seen].filter(Boolean).join(' · ')

  return (
    <article className={styles.post} data-update-id={u.id} data-status={u.status} data-kb-row="" data-kb-id={u.id} data-testid="update-post" aria-label={u.title}>
      {band}
      <div className={styles.postBody}>
        <div className={styles.postHead}>
          {u.author ? <Avatar name={u.author.name} color={u.author.color} size={36} tooltip={false} /> : null}
          <span className={styles.who}>
            <span className={styles.whoName}>{u.author?.name ?? 'The studio'}</span>
            <Tooltip label={displayDateTime(new Date(at))}><span className={styles.whoMeta}>{displayTime(new Date(at))}</span></Tooltip>
          </span>
          <span className={styles.tags}>
            {shown.milestoneName ? <MetaChip icon="flag">{shown.milestoneName}</MetaChip> : null}
            {/* the state once: the band says it while there is one; a published post wears the tag */}
            {/* (REG-1060) one chip piece in the row: the milestone's and the state's are both the house MetaChip */}
            {band ? null : <span data-testid={UPDATE_STATUS_TONE[u.status] === 'default' ? undefined : 'update-state'}><MetaChip color={UPDATE_STATUS_TONE[u.status]}>{UPDATE_STATUS_LABEL[u.status]}</MetaChip></span>}
          </span>
          <span ref={anchor} className={styles.postKebab}>
            <Tooltip label="More options" disabled={menu}>
              <IconButton icon="more_vert" label={`More options for ${u.title}`} variant="bare" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((o) => !o)} data-testid="update-kebab" />
            </Tooltip>
          </span>
          <PortalMenu open={menu} anchor={anchor} onClose={() => setMenu(false)} align="right" width={MENU_WIDTH.wide} role="menu" sheetTitle={u.title}>
            {mayPost ? <DropdownItem onSelect={() => pick('edit')}>{held ? 'Edit the change' : 'Edit'}</DropdownItem> : null}
            <DropdownItem onSelect={() => pick('preview')}>See it as the client</DropdownItem>
            {mayPost && held ? <DropdownItem onSelect={() => pick('discard')} help={`${clientFirst} keeps the published words`} data-testid="update-discard">Discard the change</DropdownItem> : null}
            {mayPost && u.status === 'published' ? <DropdownItem onSelect={() => pick('withdraw')} disabled={!!withdrawWhy} title={withdrawWhy ?? undefined} help={withdrawWhy ? undefined : `${clientFirst} stops seeing it — you can publish it again`}>Withdraw</DropdownItem> : null}
            {mayPost ? <DropdownItem tone="danger" onSelect={() => pick('delete')} disabled={!!deleteWhy} title={deleteWhy ?? undefined}>Delete</DropdownItem> : null}
          </PortalMenu>
        </div>
        <h3 className={styles.postTitle}>{shown.title}</h3>
        {shown.html ? <div className={styles.html} dangerouslySetInnerHTML={{ __html: shown.html }} /> : null}
        {photos.length ? (
          <div className={styles.media} data-testid="update-media">
            {/* (fix-C, C-05) a video opens the house viewer as a photo does — it plays there from its kept bytes */}
            {photos.map((m) => m.kind === 'video' ? (
              <Link key={m.fileId} className={styles.tile} href={fileHref(m.fileId)} aria-label={`Play ${m.name}`} data-testid="update-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.thumb ? <img src={m.thumb} alt="" /> : <Icon name="photo_camera" size={24} weight={300} />}
                <span className={styles.tileLabel}>Video</span>
              </Link>
            ) : (
              <Link key={m.fileId} className={styles.tile} href={fileHref(m.fileId)} aria-label={`Open ${m.name}`} data-testid="update-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.thumb ? <img src={m.thumb} alt="" /> : <Icon name="image" size={24} weight={300} />}
              </Link>
            ))}
          </div>
        ) : null}
        {/* (gaps build D, item 10 — 1.0 D-29 · D-54) two photos or more: before and after on the house slider */}
        {photos.filter((m) => m.kind === 'photo' && m.thumb).length >= 2 ? (
          <span className={styles.compareRow}><Button appearance="text" iconStart={<Icon name="compare" size={20} />} onPress={() => setComparing(true)} data-testid="update-compare">Compare before and after</Button></span>
        ) : null}
        <PhotoCompare open={comparing} title={shown.title} photos={photos.filter((m) => m.kind === 'photo' && m.thumb).map((m) => ({ id: m.fileId, src: m.thumb!, name: m.name }))} onClose={() => setComparing(false)} />
        {docs.length ? (
          <div className={styles.docs}>
            {docs.map((d) => (
              <Link key={d.fileId} className={styles.doc} href={fileHref(d.fileId)} data-testid="update-doc">
                <span className={styles.docThumb}><Icon name={d.mime === 'application/pdf' || /\.pdf$/i.test(d.name) ? 'picture_as_pdf' : 'description'} size={20} weight={300} /></span>
                <span className={styles.docName}>{d.name}</span>
                <span className={styles.docSize}>{fileSize(d.sizeBytes)}</span>
              </Link>
            ))}
          </div>
        ) : null}
        {foot ? <span className={styles.postFoot}>{foot}</span> : null}
      </div>
    </article>
  )
}
