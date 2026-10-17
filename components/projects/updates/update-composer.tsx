'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { Dialog, FootStart } from '@/components/om/dialog'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSheetLayout } from '@/components/om/sheet'
import { Dropzone } from '@/components/leads/move-stage/fields'
import { RichEditor } from '@/components/quotes/editor/text/rich-editor'
import { landedName, uploadablePicture } from '@/components/leads/files/upload-picture'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { discardUpdateUploads, saveProjectUpdate, uploadUpdateFile, type UpdateInput } from '@/app/projects/updates-actions'
import { MSG } from '@/lib/forms'
import { useMediaQuery } from '@/lib/breakpoint'
import { fileSize } from '@/lib/format'
import { isBlankHtml } from '@/lib/quotes/text'
import { dayLabel, dayOf } from '@/lib/projects/schedule-model'
import { takeSitePhotos } from './site-photos'
import {
  FILE_BYTES_MAX, MEDIA_ACCEPT, MEDIA_MAX, TITLE_MAX, mediaKindOf, publishesAtOnce,
  type MediaKind, type UpdateMedia, type UpdateStatus, type UpdateView,
} from '@/lib/projects/updates-model'
import { ClientUpdateCard } from './client-card'
import styles from './updates.module.css'

/** The row's square: the picture, a video's poster, else the kind's glyph. */
function AttThumb({ a }: { a: Att }) {
  const src = a.kind === 'photo' ? a.preview ?? a.media?.thumb ?? null : a.kind === 'video' ? a.media?.thumb ?? null : null
  // eslint-disable-next-line @next/next/no-img-element
  if (src) return <img src={src} alt="" />
  return <Icon name={a.kind === 'video' ? 'photo_camera' : a.kind === 'photo' ? 'image' : /\.pdf$/i.test(a.name) ? 'picture_as_pdf' : 'description'} size={20} weight={300} />
}

/** One attachment in the composer: an upload on its way, landed, or refused — or a file the update already carried. */
type Att = { key: string; name: string; kind: MediaKind; state: 'uploading' | 'done' | 'failed'; media: UpdateMedia | null; preview: string | null; file: File | null; reason: string | null; fresh: boolean }
const NONE = 'None'

/** A file's own bytes as a data URL — a video's or a document's, sent as they are. */
const readRaw = (file: File) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onerror = () => reject(r.error); r.onload = () => resolve(String(r.result)); r.readAsDataURL(file) })
/** A video's first frame as its poster (a JPEG, 480 wide) — what Files and the feed show for it; null when the browser can't draw it. */
function capturePoster(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    let done = false
    const finish = (r: string | null) => { if (done) return; done = true; URL.revokeObjectURL(url); resolve(r) }
    const timer = window.setTimeout(() => finish(null), 5000)
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url
    v.onloadeddata = () => { try { v.currentTime = Math.min(0.5, (v.duration || 1) / 2) } catch { finish(null) } }
    v.onseeked = () => {
      window.clearTimeout(timer)
      try {
        const scale = Math.min(1, 480 / (v.videoWidth || 480))
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round((v.videoWidth || 480) * scale)); c.height = Math.max(1, Math.round((v.videoHeight || 270) * scale))
        c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height)
        finish(c.toDataURL('image/jpeg', 0.8))
      } catch { finish(null) }
    }
    v.onerror = () => { window.clearTimeout(timer); finish(null) }
  })
}

/**
 * (REG-951, Projects round 3) The composer — a form dialog (a bottom sheet on a phone, REG-353): the title, a few lines in the house rich
 * editor, the milestone it belongs to (round 2's milestones, shown only when the project has some), and its photos, videos and documents —
 * picked or dropped, several at once, each uploading for real with its own row (the house upload toast's row: Uploading… · ✓ · Failed +
 * Retry), filed in the lead's Files › Site updates as it lands. Preview swaps the form for the client's card ("As the client sees it").
 * The footer follows the update: Save draft · Post (or Send for review, when the review rule holds the viewer's posts) for a new one or a
 * draft; Save changes for one in review, published or withdrawn; Save · Resubmit for one sent back. Closing with something typed asks first;
 * uploads that never made it onto an update go again. The dialog closes only once its save lands.
 *
 * (simplify S-23, her "build everything" 2026-10-09) On a phone (≤767) the post is the site's: the photos come first — the media well above the
 * title — and a new post starts on the running milestone: picked, and the title filled "Carpentry fabrication — Fri 9 Oct" (editable, still
 * required). Opened with `camera=1` (contract C — the phone site bar's Photos) it takes the photos picked on that press (site-photos.ts), else
 * opens the picker at once. A desk keeps today's order and an empty title.
 */
export function UpdateComposer({ open, projectId, clientFirst, reachLine = null, editing, milestones, reviewOn, role, me, reviewers, milestoneId: startMilestone = null, now, onClose, onSaved }: {
  open: boolean
  projectId: string
  clientFirst: string
  /** (fix-C, C-08) Why the client won't see a post (not invited, the portal's Updates off) — null when they will. */
  reachLine?: string | null
  /** The update being edited; null = a new one. */
  editing: UpdateView | null
  /** (simplify S-23) `running`: under way now — a phone's new post starts on it */
  milestones: { id: string; name: string; running?: boolean }[]
  reviewOn: boolean
  role: string
  me: { id: string; name: string } | null
  /** (gaps build D, item 10) the members named as reviewers — one of them posts at once, as an Owner does */
  reviewers?: string[]
  /** (gaps build D, item 10) a new update opened from a milestone (`?new=1&milestone=`) starts with it picked */
  milestoneId?: string | null
  now: number
  onClose: () => void
  onSaved: (id: string, status: UpdateStatus, held: boolean) => void
}) {
  /* (fix-C, C-29) a phone has no dragging: the drop well says what a press does */
  const touch = useMediaQuery('(hover: none)')
  /* (simplify S-23) the phone's post: photos first, the running milestone's title and pick; `camera=1` opens on the picker */
  const phone = useSheetLayout()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const camera = params.get('camera') === '1'
  const cameraInput = useRef<HTMLInputElement>(null)
  const cameraDone = useRef(false)
  const atOnce = publishesAtOnce(reviewOn, role, me ? { id: me.id, reviewers } : null)
  const [title, setTitle] = useState('')
  const [html, setHtml] = useState('')
  const [milestone, setMilestone] = useState(NONE)
  const [atts, setAtts] = useState<Att[]>([])
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const [asking, setAsking] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)
  /* (fix-C, C-06) uploads made here and then removed with ✕ — they go with the composer's save or close, as the ones never removed do */
  const [dropped, setDropped] = useState<string[]>([])
  /* (render-phase adjust) a fresh form each time it opens — on a new update, or on the one being edited */
  const openKey = open ? editing?.id ?? 'new' : null
  const [seen, setSeen] = useState<string | null>(null)
  if (openKey !== seen) {
    setSeen(openKey)
    if (openKey) {
      /* (simplify S-23) a phone's new post starts on the running milestone (or the one it was opened from): its name and today's day */
      const start = startMilestone ? milestones.find((m) => m.id === startMilestone) ?? null : null
      const site = !editing && phone ? start ?? milestones.find((m) => m.running) ?? null : null
      setTitle(editing?.title ?? (site ? `${site.name} — ${dayLabel(dayOf(new Date(now)))}`.slice(0, TITLE_MAX) : '')); setHtml(editing?.html ?? '')
      setMilestone(editing?.milestoneId ? milestones.find((m) => m.id === editing.milestoneId)?.name ?? NONE : (start?.name ?? site?.name ?? NONE))
      setAtts((editing?.media ?? []).map((m) => ({ key: m.fileId, name: m.name, kind: m.kind, state: 'done' as const, media: m, preview: null, file: null, reason: null, fresh: false })))
      setTouched(false); setBusy(false); setPreview(false); setAsking(false); setRefused(null); setDropped([])
    }
  }
  /* object URLs of picked pictures, let go when the composer closes */
  const urls = useRef<string[]>([])
  useEffect(() => { if (!open) { urls.current.forEach((u) => URL.revokeObjectURL(u)); urls.current = [] } }, [open])

  const setRow = (key: string, patch: Partial<Att>) => setAtts((list) => list.map((a) => (a.key === key ? { ...a, ...patch } : a)))
  const upload = async (key: string, file: File, kind: MediaKind) => {
    setRow(key, { state: 'uploading', reason: null })
    try {
      const data = kind === 'photo' ? await uploadablePicture(file) : await readRaw(file)
      if (!data) { setRow(key, { state: 'failed', reason: 'Couldn’t read this picture' }); return }
      const poster = kind === 'video' ? await capturePoster(file) : null
      const r = await uploadUpdateFile(projectId, { name: kind === 'photo' ? landedName(file.name, data) : file.name, data, poster })
      if ('error' in r) setRow(key, { state: 'failed', reason: r.error })
      else setRow(key, { state: 'done', media: r, name: r.name })
    } catch (e) { setRow(key, { state: 'failed', reason: refusalOf(e) }) }
  }
  const pickMany = (files: File[]) => {
    const room = MEDIA_MAX - atts.filter((a) => a.state !== 'failed').length
    const taken = files.slice(0, Math.max(0, room))
    setRefused(files.length > taken.length ? `An update holds up to ${MEDIA_MAX} files — ${files.length - taken.length} not added` : null)
    const rows: Att[] = taken.map((file, i) => {
      const kind = mediaKindOf(file.name, file.type)
      const key = `pick-${Date.now()}-${i}-${file.name}`
      const preview = kind === 'photo' ? URL.createObjectURL(file) : null
      if (preview) urls.current.push(preview)
      const tooBig = kind !== 'photo' && file.size > FILE_BYTES_MAX
      return { key, name: file.name, kind: kind ?? 'doc', state: !kind || tooBig ? 'failed' : 'uploading', media: null, preview, file: !kind || tooBig ? null : file, reason: !kind ? 'Pictures, videos, PDFs and Office documents only' : tooBig ? 'Over 6 MB' : null, fresh: true }
    })
    setAtts((list) => [...list, ...rows])
    for (const r of rows) if (r.state === 'uploading' && r.file) void upload(r.key, r.file, r.kind)
  }
  /* (simplify S-23 · contract C) landed with `camera=1` — the site bar's Photos: the photos picked on that press, else the picker at once (a
     phone may refuse it once the press is spent; the well, first, is then one press away). Once per landing; the address keeps no flag. */
  const landing = open && !editing && camera
  useEffect(() => {
    if (!landing) { cameraDone.current = false; return }
    if (cameraDone.current) return
    cameraDone.current = true
    const picked = takeSitePhotos()
    window.setTimeout(() => { if (picked.length) pickMany(picked); else cameraInput.current?.click() }, 0)
    const next = new URLSearchParams(params.toString()); next.delete('camera')
    const q = next.toString()
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per landing: the picker opens on the flag, not on every render's pickMany
  }, [landing])
  const remove = (key: string) => {
    const gone = atts.find((a) => a.key === key)
    if (gone?.fresh && gone.media) { const id = gone.media.fileId; setDropped((d) => (d.includes(id) ? d : [...d, id])) }
    setAtts((list) => list.filter((a) => a.key !== key))
  }

  const uploading = atts.some((a) => a.state === 'uploading')
  const landed = atts.filter((a) => a.state === 'done' && a.media).map((a) => a.media!)
  const freshIds = (keep: string[]) => [...atts.filter((a) => a.fresh && a.media && !keep.includes(a.media.fileId)).map((a) => a.media!.fileId), ...dropped.filter((id) => !keep.includes(id))]
  const milestoneId = milestones.find((m) => m.name === milestone)?.id ?? null
  const initial = JSON.stringify([editing?.title ?? '', editing?.html ?? '', editing?.milestoneId ?? null, (editing?.media ?? []).map((m) => m.fileId)])
  const dirty = uploading || atts.some((a) => a.fresh) || dropped.length > 0 || JSON.stringify([title, isBlankHtml(html) ? '' : html, milestoneId, landed.map((m) => m.fileId)]) !== initial
  const titleError = touched && !title.trim() ? MSG.required : undefined

  const status = editing?.status ?? null
  const save = async (intent: UpdateInput['intent']) => {
    setTouched(true)
    if (!title.trim() || uploading || busy) return
    setBusy(true)
    try {
      const keep = landed.map((m) => m.fileId)
      const r = await saveProjectUpdate(projectId, { id: editing?.id ?? null, title, html: isBlankHtml(html) ? '' : html, milestoneId, fileIds: keep, intent })
      if ('error' in r) { setRefused(couldnt('save the update', refusalOf(r.error))); return }
      const spare = freshIds(keep)
      if (spare.length) void discardUpdateUploads(projectId, { fileIds: spare }).catch(() => undefined)
      onSaved(r.id, r.status, !!r.held)
    } catch (e) { setRefused(couldnt('save the update', refusalOf(e))) }
    finally { setBusy(false) }
  }
  const leave = () => {
    const spare = freshIds([])
    if (spare.length) void discardUpdateUploads(projectId, { fileIds: spare }).catch(() => undefined)
    setAsking(false); onClose()
  }
  const close = () => { if (busy) return; if (dirty) setAsking(true); else leave() }

  /* the footer follows the update (the dialog's head says where a post goes) */
  const postLabel = atOnce ? 'Post' : 'Send for review'
  const buttons = !editing || status === 'draft'
    ? <><Button variant="secondary" appearance="outlined" onPress={() => { void save('draft') }} isDisabled={busy || uploading} data-testid="composer-draft">Save draft</Button>
        <Button onPress={() => { void save('post') }} isDisabled={busy || uploading} data-testid="composer-post">{busy ? 'Saving…' : uploading ? 'Uploading…' : postLabel}</Button></>
    : status === 'sent_back'
      ? <><Button variant="secondary" appearance="outlined" onPress={() => { void save('save') }} isDisabled={busy || uploading}>Save</Button>
          <Button onPress={() => { void save('post') }} isDisabled={busy || uploading} data-testid="composer-post">{busy ? 'Saving…' : uploading ? 'Uploading…' : atOnce ? 'Post' : 'Resubmit'}</Button></>
      /* (fix-C, C-09) in review while the rule lets this viewer post (review switched off since): Post sends it */
      : status === 'in_review' && atOnce
        ? <><Button variant="secondary" appearance="outlined" onPress={() => { void save('save') }} isDisabled={busy || uploading}>Save changes</Button>
            <Button onPress={() => { void save('post') }} isDisabled={busy || uploading} data-testid="composer-post">{busy ? 'Saving…' : uploading ? 'Uploading…' : 'Post'}</Button></>
      : <Button onPress={() => { void save('save') }} isDisabled={busy || uploading} data-testid="composer-post">{busy ? 'Saving…' : uploading ? 'Uploading…' : status === 'published' && !atOnce ? 'Save and send for review' : 'Save changes'}</Button>
  /* (fix-C, C-01) an edit to a published update is held for review — the client keeps reading what they read; (C-08) words true to access */
  const subtitle = status === 'published' && !atOnce ? `Your change waits for review — ${clientFirst} keeps reading the published update until an Owner or an Admin approves it.`
    : status === 'published' ? (reachLine ?? `${clientFirst} sees the change at once.`)
    : atOnce ? (reachLine ? `${reachLine} Save a draft to finish it later.` : `Once it’s posted, ${clientFirst} sees it. Save a draft to finish it later.`) : `An Owner or an Admin checks it before ${clientFirst} sees it.`

  /* the words of the post — the title, the details, the milestone: first at a desk, under the photos on a phone (simplify S-23) */
  const words = (
    <>
      <TextField label="Title" required value={title} onChange={setTitle} maxLength={TITLE_MAX} autoFocus={!editing && !phone} error={titleError}
                 helper={`${title.length}/${TITLE_MAX} · What happened, in a line — “Kitchen cabinets are in”`} />
      <div className={styles.richBox}>
        <span className={styles.eyebrow}>Details</span>
        <RichEditor value={html} onChange={setHtml} label="Details" framed minHeight={120}
                    placeholder={`What was done, what’s next, anything ${clientFirst} should decide`} />
      </div>
      {milestones.length ? (
        <TextField label="Milestone" mode="select" options={[NONE, ...milestones.map((m) => m.name)]} value={milestone} onChange={setMilestone} helper="The stage of the work it belongs to" />
      ) : null}
    </>
  )
  return (
    <>
      <Dialog open={open} onClose={close} closeOnScrim={false} size="form" width={600} title={editing ? 'Edit update' : 'Post an update'} subtitle={subtitle}
              footer={<>
                <FootStart>
                  {preview
                    ? <Button appearance="text" iconStart={<Icon name="edit" size={20} />} onPress={() => setPreview(false)}>Back to edit</Button>
                    : <Button appearance="text" iconStart={<Icon name="visibility" size={20} />} onPress={() => setPreview(true)} data-testid="composer-preview">Preview</Button>}
                </FootStart>
                <Button variant="secondary" appearance="outlined" onPress={close} isDisabled={busy}>Cancel</Button>
                {buttons}
              </>}>
        {preview ? (
          <div className={styles.preview} data-testid="composer-preview-pane">
            <span className={styles.previewCaption}>As {clientFirst} sees it{atOnce || status === 'published' ? '' : ', once it’s approved'}</span>
            <ClientUpdateCard title={title.trim()} html={isBlankHtml(html) ? '' : html} author={editing?.author?.name ?? me?.name ?? null}
                              at={editing?.publishedAt ?? now} milestone={milestones.find((m) => m.id === milestoneId)?.name ?? null}
                              media={atts.filter((a) => a.state === 'done' && a.media).map((a) => ({ ...a.media!, thumb: a.media!.thumb ?? a.preview }))} />
          </div>
        ) : (
          <div className={styles.fields} data-testid="update-composer" data-order={phone ? 'photos-first' : undefined}>
            {phone ? null : words}
            <div className={styles.richBox} data-testid="composer-media">
              <span className={styles.eyebrow}>Photos, videos and documents</span>
              <Dropzone variant="compact" title={touch ? <b>Add photos, videos or documents</b> : <>Drop them here or <b>browse</b></>} accept={MEDIA_ACCEPT} label="Add photos, videos or documents" onPick={() => undefined} onPickMany={pickMany} />
              {atts.length ? (
                <div className={styles.uploads} data-testid="composer-uploads">
                  {atts.map((a) => (
                    <div key={a.key} className={styles.upRow} data-state={a.state} data-testid="composer-upload">
                      <span className={styles.upThumb} aria-hidden><AttThumb a={a} /></span>
                      <span className={styles.upName}>{a.name}</span>
                      {a.state === 'uploading' ? (
                        <><span className={styles.upStatus}>Uploading…</span><span className={`${styles.upIcon} ${styles.spin}`}><Icon name="progress_activity" size={20} /></span></>
                      ) : a.state === 'failed' ? (
                        <>
                          <span className={styles.upFailed}>{a.reason ?? 'Failed'}</span>
                          {a.file ? (
                            <Tooltip label="Retry upload" side="top">
                              <button type="button" className={styles.upRetry} aria-label={`Retry uploading ${a.name}`} onClick={() => { const f = a.file; if (f) void upload(a.key, f, a.kind) }}><Icon name="refresh" size={20} /></button>
                            </Tooltip>
                          ) : null}
                        </>
                      ) : (
                        <><span className={styles.upStatus}>{fileSize(a.media?.sizeBytes ?? null)}</span><span className={styles.upIcon}><Icon name="check_circle" size={20} fill /></span></>
                      )}
                      <Tooltip label="Remove" side="top">
                        <IconButton icon="close" label={`Remove ${a.name}`} size={24} variant="bare" iconSize={20} onClick={() => remove(a.key)} disabled={a.state === 'uploading'} />
                      </Tooltip>
                    </div>
                  ))}
                </div>
              ) : <span className={styles.upHelp}>Up to {MEDIA_MAX} files. Pictures land in Files › Site updates as they upload; a video or a document up to 6 MB.</span>}
              <input ref={cameraInput} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ''; if (files.length) pickMany(files) }} data-testid="composer-camera-input" />
            </div>
            {phone ? words : null}
            {refused ? <span className={styles.upFailed} role="alert" data-testid="composer-refused">{refused}</span> : null}
          </div>
        )}
      </Dialog>
      <ConfirmDialog open={asking} nested title="Discard this update?" message="What you typed and the files you added are not kept." confirmLabel="Discard" cancelLabel="Keep editing"
                     onConfirm={leave} onCancel={() => setAsking(false)} />
    </>
  )
}
