'use client'

import { useRef, useState } from 'react'
import { Button, TextArea } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Dialog } from '@/components/om/dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { addWork, makeWorkCover, removeWorkPicture, restoreWorkPicture, updateWork, type PictureInput } from '@/app/company/portfolio-actions'
import { readFileAsDataUrl } from '@/lib/templates/files'
import { PICTURES_MAX, PLACE_MAX, WORK_DESC_MAX, WORK_TITLE_MAX, type WorkCard } from '@/lib/portfolio/model'
import { PROPERTY_TYPES, STYLE_OPTIONS } from '@/lib/leads/enums'
import type { ProjectPick } from '@/lib/portfolio/queries'
import styles from './public-profile.module.css'

const NONE = 'Not said'
const NO_PROJECT = 'None'
const PICTURE_PROBLEM = 'That picture didn’t read — pick a JPG or PNG under 2 MB'

/** A picture the browser shrank, from an upload or a project's file (fetched from its own address, which the studio may open). */
async function shrink(file: File): Promise<string | null> {
  const url = await readFileAsDataUrl(file, 1400, { jpeg: true }).catch(() => null)
  return url && /^data:image\/(jpeg|png|webp);base64,/.test(url) && url.length <= 2_400_000 ? url : null
}

/**
 * (pending modules S27) Add or edit a piece of work: its name, where it was, the kind of home and the style, the studio project it shows (its
 * files' pictures to pick from), a line about it, and its pictures — uploaded (the browser shrinks them) or picked from the project; the first
 * is its cover. Pictures taken off an existing piece go when it is saved, and the snackbar's Undo brings them back. The house form dialog: it
 * closes once its save lands. *(invented copy: the labels, the helpers, the messages)*
 */
export function WorkEditor({ open, memberId, projects, onClose, onSaved }: {
  open: WorkCard | 'new' | null; memberId: string; projects: ProjectPick[]; onClose: () => void; onSaved: (msg: string, undo?: () => void) => void
}) {
  const snackbar = useSnackbar()
  const editing = open && open !== 'new' ? open : null
  const blank = () => ({ title: editing?.title ?? '', place: editing?.place ?? '', propertyType: editing?.propertyType ?? NONE, style: editing?.style ?? NONE, projectId: editing?.projectId ?? '', description: editing?.description ?? '' })
  const [f, setF] = useState(blank)
  const [added, setAdded] = useState<{ key: string; src: string; data: string | null; fileId: string | null }[]>([])
  const [removed, setRemoved] = useState<string[]>([])
  const [cover, setCover] = useState<string | null>(null)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [seen, setSeen] = useState(open)
  if (seen !== open) { setSeen(open); setF(blank()); setAdded([]); setRemoved([]); setCover(null); setTried(false); setProblem(null) }
  const input = useRef<HTMLInputElement>(null)
  const project = projects.find((p) => p.id === f.projectId) ?? null
  const kept = (editing?.pictures ?? []).filter((p) => !removed.includes(p.id))
  const count = kept.length + added.length
  const titleError = tried && !f.title.trim() ? 'Give the work a name' : undefined

  const upload = async (files: FileList | null) => {
    const list = Array.from(files ?? []).filter((x) => x.type.startsWith('image/') && x.type !== 'image/svg+xml')
    if (!list.length) return
    const room = PICTURES_MAX - count
    if (room <= 0) { setProblem(`Up to ${PICTURES_MAX} pictures for each piece of work`); return }
    const out: typeof added = []
    for (const file of list.slice(0, room)) {
      const data = await shrink(file)
      if (!data) { setProblem(PICTURE_PROBLEM); continue }
      out.push({ key: `u-${file.name}-${file.size}-${out.length}-${added.length}`, src: data, data, fileId: null })
    }
    if (out.length) { setProblem(list.length > room ? `Up to ${PICTURES_MAX} pictures for each piece of work — ${list.length - room} left out` : null); setAdded((a) => [...a, ...out]) }
  }
  const togglePick = (p: ProjectPick['pictures'][number]) => {
    const have = added.find((a) => a.fileId === p.fileId)
    if (have) { setAdded((a) => a.filter((x) => x !== have)); return }
    if (count >= PICTURES_MAX) { setProblem(`Up to ${PICTURES_MAX} pictures for each piece of work`); return }
    setProblem(null)
    setAdded((a) => [...a, { key: `f-${p.fileId}`, src: p.src, data: null, fileId: p.fileId }])
  }
  /* a project's picture is read from its address and shrunk here, when it is saved */
  const pictureData = async (a: (typeof added)[number]): Promise<PictureInput | null> => {
    if (a.data) return { data: a.data }
    try {
      const res = await fetch(a.src)
      if (!res.ok) return null
      const blob = await res.blob()
      const data = await shrink(new File([blob], 'picture.jpg', { type: blob.type || 'image/jpeg' }))
      return data ? { data, sourceFileId: a.fileId } : null
    } catch { return null }
  }

  const save = async () => {
    if (busy) return
    if (!f.title.trim()) { setTried(true); return }
    setBusy(true)
    try {
      const pics: PictureInput[] = []
      for (const a of added) { const p = await pictureData(a); if (!p) { snackbar({ message: couldnt('add a picture', PICTURE_PROBLEM) }); return } pics.push(p) }
      const fields = { title: f.title, place: f.place, propertyType: f.propertyType === NONE ? null : f.propertyType, style: f.style === NONE ? null : f.style, projectId: f.projectId || null, description: f.description }
      if (!editing) {
        const r = await addWork(memberId, { ...fields, pictures: pics })
        if ('error' in r) { snackbar({ message: couldnt('add the work', refusalOf(r.error)) }); return }
        onSaved(`“${f.title.trim()}” is on the profile`)
        return
      }
      const r = await updateWork(editing.id, { ...fields, pictures: pics })
      if ('error' in r) { snackbar({ message: couldnt('save the work', refusalOf(r.error)) }); return }
      for (const id of removed) { const x = await removeWorkPicture(id); if ('error' in x) { snackbar({ message: couldnt('take a picture off', refusalOf(x.error)) }); return } }
      if (cover && !removed.includes(cover)) await makeWorkCover(cover)
      const off = [...removed]
      onSaved(off.length ? `“${f.title.trim()}” saved — ${off.length} ${off.length === 1 ? 'picture' : 'pictures'} taken off` : `“${f.title.trim()}” saved`,
        off.length ? () => { void Promise.all(off.map((id) => restoreWorkPicture(id))).then(() => onSaved(`${off.length === 1 ? 'The picture is' : 'The pictures are'} back`)) } : undefined)
    } catch { snackbar({ message: couldnt(editing ? 'save the work' : 'add the work') }) } finally { setBusy(false) }
  }

  const firstId = cover ?? kept[0]?.id ?? null
  return (
    <Dialog open={!!open} onClose={onClose} title={editing ? 'Edit the work' : 'Add work'} size="modal" width={800} closeOnScrim={false}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => { void save() }} isDisabled={busy} data-testid="work-save">{busy ? 'Saving…' : editing ? 'Save' : 'Add work'}</Button></>}>
      {open ? (
        <div className={styles.form} data-testid="work-editor">
          <div className={styles.fields}>
            <TextField label="Name" required value={f.title} maxLength={WORK_TITLE_MAX} onChange={(v) => setF({ ...f, title: v })} error={titleError} helper="e.g. A calm 5-room in Tampines" />
            <TextField label="Where" value={f.place} maxLength={PLACE_MAX} onChange={(v) => setF({ ...f, place: v })} helper="The estate or the street — never the unit" />
            <TextField label="Kind of home" mode="select" searchable options={[NONE, ...PROPERTY_TYPES]} value={f.propertyType} onChange={(v) => setF({ ...f, propertyType: v })} />
            <TextField label="Style" mode="select" options={[NONE, ...STYLE_OPTIONS]} value={f.style} onChange={(v) => setF({ ...f, style: v })} />
            <div className={styles.wide}>
              <TextField label="The studio project it shows" mode="select" searchable options={[NO_PROJECT, ...projects.map((p) => `${p.number} · ${p.name}`)]}
                         value={project ? `${project.number} · ${project.name}` : NO_PROJECT}
                         onChange={(v) => { const p = projects.find((x) => `${x.number} · ${x.name}` === v); setF({ ...f, projectId: p?.id ?? '', propertyType: f.propertyType === NONE && p?.propertyType ? p.propertyType : f.propertyType, style: f.style === NONE && p?.style && (STYLE_OPTIONS as readonly string[]).includes(p.style) ? p.style : f.style }) }}
                         helper="Optional — its files’ pictures are offered below" />
            </div>
            <div className={styles.wide}>
              <TextArea label="A line about it" value={f.description} onChange={(v: string) => setF({ ...f, description: v.slice(0, WORK_DESC_MAX) })} description={`${f.description.length} of ${WORK_DESC_MAX} characters`} />
            </div>
          </div>
          <div className={styles.form}>
            <span className={styles.switchLabel}>{`Pictures · ${count} of ${PICTURES_MAX}`}</span>
            {count ? (
              <div className={styles.pics} data-testid="work-pictures">
                {kept.map((p) => (
                  <div key={p.id} className={styles.pic}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <span className={styles.picBox}><img src={p.src} alt={p.caption ?? ''} /></span>
                    <span className={styles.picTools}>
                      {p.id === firstId ? <span className={styles.cover}>Cover</span> : <Button appearance="text" size="sm" onPress={() => setCover(p.id)}>Make cover</Button>}
                      <IconButton icon="close" label="Take this picture off" size={36} onClick={() => setRemoved((r) => [...r, p.id])} />
                    </span>
                  </div>
                ))}
                {added.map((a) => (
                  <div key={a.key} className={styles.pic}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <span className={styles.picBox}><img src={a.src} alt="" /></span>
                    <span className={styles.picTools}>
                      <span className={styles.cover}>{!firstId && added[0] === a ? 'Cover' : 'New'}</span>
                      <IconButton icon="close" label="Take this picture off" size={36} onClick={() => setAdded((x) => x.filter((y) => y !== a))} />
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            {problem ? <p className={styles.problem} role="alert">{problem}</p> : null}
            <span className={styles.adds}>
              <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add_photo_alternate" size={20} />} onPress={() => input.current?.click()} isDisabled={count >= PICTURES_MAX} data-testid="work-upload">Upload pictures</Button>
              <input ref={input} className={styles.fileInput} type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(e) => { void upload(e.target.files); e.target.value = '' }} data-testid="work-file" />
            </span>
            {project && project.pictures.length ? (
              <>
                <span className={styles.muted}>{`From ${project.number}’s files — pick the ones to show`}</span>
                <div className={styles.pics} data-testid="work-project-pictures">
                  {project.pictures.map((p) => {
                    const on = added.some((a) => a.fileId === p.fileId)
                    return (
                      <button key={p.fileId} type="button" className={styles.pick} aria-pressed={on} aria-label={`${on ? 'Picked' : 'Pick'} ${p.name}`} onClick={() => togglePick(p)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.src} alt="" loading="lazy" />
                        {on ? <span className={styles.pickMark}><Icon name="check" size={16} /></span> : null}
                      </button>
                    )
                  })}
                </div>
              </>
            ) : project ? <span className={styles.muted}>{`${project.number} has no pictures in its files yet.`}</span> : null}
          </div>
        </div>
      ) : null}
    </Dialog>
  )
}
