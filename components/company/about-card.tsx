'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { RichEditor } from '@/components/quotes/editor/text/rich-editor'
import { HelpLink } from './help-link'
import { LeaveGuard } from './leave-guard'
import { addAboutPhoto, makeAboutCover, removeAboutPhoto, restoreAboutPhoto, saveStudioAbout, setAboutOrder } from '@/app/company/about-actions'
import { readFileAsDataUrl } from '@/lib/templates/files'
import { newId } from '@/lib/uid'
import { ABOUT_PHOTOS_MAX, AWARDS_MAX, AWARD_MAX, yearProblem, type StudioAbout } from '@/lib/portal/about-model'
import card from './profile-view.module.css'
import styles from './about-card.module.css'

export type AboutSetup = { about: StudioAbout; photos: { id: string; src: string; caption: string | null }[]; now: number }

/**
 * (gaps build H — H-Q21) Company › Profile › About the studio, for clients — what the portal's About page says beside the facts above: the
 * year the studio began, its story (the in-house rich editor — bold, italic, lists, links), its awards, up to six photos (the first is the
 * cover). The facts and socials above are read from here as they are — entered once (1.0 asked for them twice, M-156). Save lands it with
 * Undo; a photo is kept the moment it is picked and removed with Undo. Owners and Admins change it.
 */
export function AboutCard({ data, canRun }: { data: AboutSetup; canRun: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [saved, setSaved] = useState<StudioAbout>(data.about)
  const [year, setYear] = useState(data.about.year ? String(data.about.year) : '')
  const [story, setStory] = useState(data.about.story)
  const [awards, setAwards] = useState(data.about.awards.map((a) => ({ ...a, yearText: a.year ? String(a.year) : '' })))
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const yearError = yearProblem(year, data.now)
  const now = (): StudioAbout => ({ year: year.trim() ? Number(year) : null, story, awards: awards.filter((a) => a.name.trim()).map((a) => ({ id: a.id, name: a.name.trim(), year: /^\d{4}$/.test(a.yearText) ? Number(a.yearText) : null })) })
  const dirty = canRun && JSON.stringify(now()) !== JSON.stringify(saved)
  const reset = () => { setYear(saved.year ? String(saved.year) : ''); setStory(saved.story); setAwards(saved.awards.map((a) => ({ ...a, yearText: a.year ? String(a.year) : '' }))); setTried(false) }
  const save = async (): Promise<boolean> => {
    setTried(true)
    if (yearError) return false
    setBusy(true)
    try {
      const r = await saveStudioAbout(now())
      if ('error' in r) { snackbar({ message: couldnt('save the About page', refusalOf(r.error)) }); return false }
      setSaved(r.about); setTried(false)
      snackbar({ message: 'Saved — clients read it on their About page', actionLabel: 'Undo', onAction: () => { void saveStudioAbout(r.previous).then((u) => { if ('error' in u) snackbar({ message: couldnt('put it back', refusalOf(u.error)) }); else { setSaved(u.about); setYear(u.about.year ? String(u.about.year) : ''); setStory(u.about.story); setAwards(u.about.awards.map((a) => ({ ...a, yearText: a.year ? String(a.year) : '' }))); router.refresh() } }) } })
      router.refresh(); return true
    } catch { snackbar({ message: 'Couldn’t save the About page — please try again' }); return false } finally { setBusy(false) }
  }
  const addPhotos = async (files: FileList | null) => {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith('image/'))
    const room = ABOUT_PHOTOS_MAX - data.photos.length
    if (!list.length) return
    if (room <= 0) { snackbar({ message: `Up to ${ABOUT_PHOTOS_MAX} photos — remove one first` }); return }
    for (const f of list.slice(0, room)) {
      const url = await readFileAsDataUrl(f, 1600, { jpeg: true }).catch(() => null)
      const r = url ? await addAboutPhoto({ dataUrl: url }).catch(() => ({ error: 'please try again' })) : { error: 'That photo didn’t read — pick a JPG or PNG' }
      if ('error' in r) { snackbar({ message: couldnt(`add ${f.name}`, refusalOf(r.error)) }); break }
    }
    if (list.length > room) snackbar({ message: `Up to ${ABOUT_PHOTOS_MAX} photos — ${room} added` })
    router.refresh()
  }
  const remove = async (id: string) => {
    const r = await removeAboutPhoto(id).catch(() => ({ error: 'please try again' }))
    if ('error' in r) { snackbar({ message: couldnt('remove the photo', refusalOf(r.error)) }); return }
    snackbar({ message: 'Photo removed', actionLabel: 'Undo', onAction: () => { void restoreAboutPhoto(id).then((u) => { if ('error' in u) snackbar({ message: couldnt('put the photo back', refusalOf(u.error)) }); else router.refresh() }) } })
    router.refresh()
  }
  const cover = async (id: string) => {
    const r = await makeAboutCover(id).catch(() => ({ error: 'please try again' }))
    if ('error' in r) { snackbar({ message: couldnt('make it the cover', refusalOf(r.error)) }); return }
    snackbar({ message: 'That photo is the cover now', actionLabel: 'Undo', onAction: () => { void setAboutOrder(r.order).then(() => router.refresh()) } })
    router.refresh()
  }
  return (
    <section id="about" className={card.card} aria-labelledby="profile-about" data-testid="profile-about">
      <LeaveGuard dirty={dirty} what="the About page" onSave={save} onDiscard={reset} />
      <div className={card.cardHead}>
        <h2 id="profile-about" className={card.cardTitle}>About the studio, for clients</h2>
        <p className={card.cardHelp}>What your clients read on the About page of their portal, beside the details above and your team (each member is shown from <HelpLink href="/company/members">Company › Members</HelpLink>). Switch the page on or off under <HelpLink href="/company/portal">Company › Client portal</HelpLink>.</p>
      </div>
      <TextField label="The year the studio began" value={year} onChange={(v) => setYear(v.slice(0, 4))} numeric="digits" maxLength={4} className={styles.year} disabled={!canRun} error={tried ? yearError ?? undefined : undefined} helper="Shown as “Est. 2012”" />
      <RichEditor label="Your story" placeholder="How the studio began, how you work, what you care about…" value={story} onChange={setStory} minHeight={200} framed />
      <p className={styles.label}>Awards and recognition</p>
      <div className={styles.awards} data-testid="about-awards-edit">
        {awards.map((a, i) => (
          <div key={a.id} className={styles.award}>
            <TextField label="Award" value={a.name} onChange={(v) => setAwards((x) => x.map((y, k) => (k === i ? { ...y, name: v.slice(0, AWARD_MAX) } : y)))} maxLength={AWARD_MAX} disabled={!canRun} />
            <TextField label="Year" value={a.yearText} onChange={(v) => setAwards((x) => x.map((y, k) => (k === i ? { ...y, yearText: v.slice(0, 4) } : y)))} numeric="digits" maxLength={4} disabled={!canRun} />
            {canRun ? <Tooltip label="Take this award off"><IconButton icon="close" label={`Take ${a.name || 'this award'} off`} onClick={() => setAwards((x) => x.filter((_, k) => k !== i))} /></Tooltip> : <span />}
          </div>
        ))}
        {canRun && awards.length < AWARDS_MAX ? <span className={card.markActions}><Button appearance="text" iconStart={<Icon name="add" size={20} />} onPress={() => setAwards((x) => [...x, { id: newId(), name: '', year: null, yearText: '' }])}>Add an award</Button></span> : null}
      </div>
      <p className={styles.label}>{`Photos — up to ${ABOUT_PHOTOS_MAX}, the first is the cover`}</p>
      <div className={styles.photos} data-testid="about-photos-edit">
        {data.photos.map((ph, i) => (
          <div key={ph.id} className={styles.photo} data-testid="about-photo">
            <span className={styles.pic}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ph.src} alt="" loading="lazy" />
            </span>
            <span className={styles.photoTools}>
              {i === 0 ? <span className={styles.coverMark}>Cover</span> : canRun ? <Button appearance="text" size="sm" onPress={() => { void cover(ph.id) }}>Make cover</Button> : null}
              {canRun ? <Tooltip label="Remove the photo"><IconButton icon="delete" label="Remove the photo" size={24} variant="bare" iconSize={18} onClick={() => { void remove(ph.id) }} /></Tooltip> : null}
            </span>
          </div>
        ))}
        {canRun && data.photos.length < ABOUT_PHOTOS_MAX ? (
          <>
            <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add_photo_alternate" size={20} />} onPress={() => input.current?.click()} data-testid="about-add-photos">Add photos</Button>
            <input ref={input} className={styles.fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(e) => { void addPhotos(e.target.files); e.target.value = '' }} data-testid="about-photo-input" />
          </>
        ) : null}
      </div>
      {canRun ? (
        <div className={styles.actions}>
          <Button variant="secondary" appearance="outlined" onPress={reset} isDisabled={!dirty || busy}>Discard</Button>
          <Button onPress={() => { void save() }} isDisabled={!dirty || busy} data-testid="about-save">{busy ? 'Saving…' : 'Save'}</Button>
        </div>
      ) : null}
    </section>
  )
}
