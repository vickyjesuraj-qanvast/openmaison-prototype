'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Switch, TextArea } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { PortalMenu } from '@/components/om/portal-menu'
import { TextField } from '@/components/om/text-field'
import { Tooltip } from '@/components/om/tooltip'
import { useSnackbar } from '@/components/om/snackbar'
import { DropdownDivider, DropdownItem, MENU_WIDTH } from '@/components/leads/dropdown'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { CompanyShell } from '@/components/company/company-shell'
import { LeaveGuard } from '@/components/company/leave-guard'
import { MemberPhotoField, type PhotoDraft } from '@/components/company/member-photo-field'
import { moveWork, removeWork, restorePublicCard, restoreWork, savePublicCard } from '@/app/company/portfolio-actions'
import { BIO_MAX, TITLE_MAX } from '@/lib/portal/about-model'
import { YEARS_MAX, knownFor, workFacts, type WorkCard } from '@/lib/portfolio/model'
import { hangoutHref } from '@/lib/hangouts/model'
import { fromLabel, withFrom } from '@/lib/nav'
import { companySectionOf } from '@/lib/company/sections'
import { onLeads } from '@/lib/settings/roles'
import type { PublicProfileData } from '@/lib/portfolio/queries'
import { DesignerCard } from './designer-card'
import { WorkEditor } from './work-editor'
import { PublicProfileGhost } from './public-profile-ghost'
import { workLine } from './public-profile-words'
import profile from '@/components/company/profile-view.module.css'
import styles from './public-profile.module.css'

type Draft = { title: string; bio: string; years: string; shown: boolean; photo: PhotoDraft }
const draftOf = (m: PublicProfileData['member']): Draft => ({ title: m.portalTitle ?? '', bio: m.portalBio ?? '', years: m.portalYears ? String(m.portalYears) : '', shown: m.portalShown, photo: undefined })

/**
 * (pending modules S27 — api:designer-portfolio-profiles; 1.0's never-mounted ProfileEditor and its id_profiles / id_portfolio_* records) A
 * member's Public profile — what clients read about them: **Their card** (the photo, the job title, years in interior design, a line or two;
 * what they are known for is their specialty from Company › Members; Owners and Admins choose who is on the portal's About page), **Their
 * work** (projects with pictures, in their order — uploaded, or picked from a studio project's files) and **How clients see it** (the card
 * itself, and where it shows: the portal's Our team, the studio's Hangout pages, the meeting room's Past projects). One home for it: opened
 * from Company › Members (an Owner or an Admin, anyone's), from Your profile (the member's own), from a Hangout's plan. The card's fields
 * save with the header's Save changes and the leave guard; a piece of work saves in its own dialog; every remove answers with Undo.
 * *(invented copy: every title, help line and message)*
 */
export function PublicProfileView({ data, from }: { data: PublicProfileData; from?: string }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const m = data.member
  const [seed, setSeed] = useState(data)
  const [d, setD] = useState<Draft>(() => draftOf(m))
  const [busy, setBusy] = useState(false)
  if (seed !== data) { setSeed(data); setD(draftOf(data.member)) }
  const base = draftOf(m)
  const dirty = d.title !== base.title || d.bio !== base.bio || d.years !== base.years || d.shown !== base.shown || d.photo !== undefined
  const yearsN = d.years.trim() === '' ? null : Number(d.years)
  const yearsBad = yearsN !== null && (!Number.isFinite(yearsN) || yearsN > YEARS_MAX)
  const own = m.isYou
  const whose = own ? 'your' : `${m.name}’s`

  const save = async (): Promise<boolean> => {
    if (yearsBad) { snackbar({ message: couldnt('save the card', `Years from 0 to ${YEARS_MAX}`) }); return false }
    setBusy(true)
    try {
      const r = await savePublicCard(m.id, { title: d.title, bio: d.bio, years: yearsN, ...(data.mayShow ? { shown: d.shown } : {}), ...(d.photo !== undefined ? { photo: d.photo } : {}) })
      if ('error' in r) { snackbar({ message: couldnt(`save ${whose} card`, refusalOf(r.error)) }); return false }
      snackbar({ message: own ? 'Your public card is saved' : `${m.name}’s public card is saved`, actionLabel: 'Undo', onAction: () => { void restorePublicCard(m.id, r.previous).then((u) => { if ('error' in u) snackbar({ message: couldnt('put it back', refusalOf(u.error)) }); else router.refresh() }) } })
      router.refresh()
      return true
    } catch { snackbar({ message: couldnt(`save ${whose} card`) }); return false } finally { setBusy(false) }
  }
  const discard = () => setD(draftOf(m))

  /* their work: each move and remove at once (put back when refused), a remove with its Undo */
  const [editing, setEditing] = useState<WorkCard | 'new' | null>(null)
  const work = data.card.work
  const move = async (w: WorkCard, dir: 'up' | 'down') => {
    try { const r = await moveWork(w.id, dir); if ('error' in r) { snackbar({ message: couldnt('move it', refusalOf(r.error)) }); return } router.refresh() }
    catch { snackbar({ message: couldnt('move it') }) }
  }
  const remove = async (w: WorkCard) => {
    try {
      const r = await removeWork(w.id)
      if ('error' in r) { snackbar({ message: couldnt(`take “${w.title}” off`, refusalOf(r.error)) }); return }
      router.refresh()
      snackbar({ message: `“${w.title}” is off ${own ? 'your' : `${m.name}’s`} profile`, actionLabel: 'Undo', onAction: () => { void restoreWork(w.id).then((u) => { if ('error' in u) snackbar({ message: couldnt('put it back', refusalOf(u.error)) }); else router.refresh() }) } })
    } catch { snackbar({ message: couldnt(`take “${w.title}” off`) }) }
  }

  /* the card as clients read it — the draft's words over the record's */
  const preview = { ...data.card, title: d.title.trim() || m.role, bio: d.bio.trim() || null, years: yearsN && yearsN > 0 && !yearsBad ? yearsN : null,
    photo: d.photo === undefined ? data.card.photo : d.photo }
  const here = `/company/members/${m.id}/profile${from ? `?from=${encodeURIComponent(from)}` : ''}`
  const title = own ? 'Your public profile' : `${m.name}’s public profile`
  const back = from ?? '/company/members'
  return (
    <CompanyShell title={title} from={back} crumb="" origin={companySectionOf(back) ?? fromLabel(back) ?? 'Back'} skeleton={<PublicProfileGhost />} actions={data.mayEdit ? <>
      <Button variant="secondary" appearance="outlined" onPress={discard} isDisabled={!dirty || busy}>Discard</Button>
      <Button onPress={() => { void save() }} isDisabled={!dirty || busy} data-testid="card-save">{busy ? 'Saving…' : 'Save changes'}</Button>
    </> : undefined}>
      <LeaveGuard dirty={dirty} what={`${whose} card`} onSave={save} onDiscard={discard} />
      <div className={profile.layout} data-testid="public-profile" data-member={m.id}>
        <div className={profile.form}>
          <section className={profile.card} aria-labelledby="pp-card">
            <div className={profile.cardHead}>
              <h2 id="pp-card" className={profile.cardTitle}>{own ? 'Your card' : 'Their card'}</h2>
              <p className={profile.cardHelp}>Clients read it on their portal’s About page and on your studio’s Hangout pages.</p>
            </div>
            {data.mayEdit ? <MemberPhotoField member={{ name: m.name, color: m.color, portalPhotoId: m.photoId }} draft={d.photo} onChange={(p) => setD({ ...d, photo: p })} testId="card-photo" locked={data.photoLocked} /> : null}
            <div className={styles.fields}>
              <TextField label="Job title" value={d.title} maxLength={TITLE_MAX} disabled={!data.mayEdit} onChange={(v) => setD({ ...d, title: v.slice(0, TITLE_MAX) })} helper={`Blank shows ${own ? 'your' : 'their'} role — ${m.role}`} />
              <TextField label="Years in interior design" value={d.years} numeric="digits" maxLength={2} disabled={!data.mayEdit} onChange={(v) => setD({ ...d, years: v })} error={yearsBad ? `From 0 to ${YEARS_MAX}` : undefined} />
              <div className={styles.wide}>
                <TextArea label="A line or two" value={d.bio} isDisabled={!data.mayEdit} onChange={(v: string) => setD({ ...d, bio: v.slice(0, BIO_MAX) })} description={`${d.bio.length} of ${BIO_MAX} characters`} />
              </div>
            </div>
            <p className={styles.line} data-testid="card-known">
              <span className={styles.muted}>Known for: </span>{knownFor(m.specialty).join(' · ') || 'nothing yet'}
              <span className={styles.muted}>{` — ${own ? 'your' : 'their'} specialty, set with ${own ? 'your' : 'their'} lead preferences on `}</span>
              {/* (pending modules S40) the door opens the preferences themselves (`?prefs=`), for whoever may set them — Owners and Admins for
                  anyone, the member for themself (REG-612's rule); it was a link for Owners and Admins only, to the list */}
              {data.mayEdit && onLeads(m.role) ? <Link className={styles.link} href={withFrom(`/company/members?prefs=${encodeURIComponent(m.id)}`, here)} data-testid="card-known-edit">Company › Members</Link> : 'Company › Members'}
            </p>
            {data.mayShow ? (
              <label className={styles.switchRow} data-testid="card-shown">
                <span className={styles.switchText}><span className={styles.switchLabel}>Show on the About page</span><span className={profile.cardHelp}>The client portal’s About › Our team.</span></span>
                <Switch size="sm" isSelected={d.shown} onChange={(v: boolean) => setD({ ...d, shown: v })} aria-label={`Show ${m.name} on the About page`} />
              </label>
            ) : <p className={profile.cardHelp}>{m.portalShown ? 'On the client portal’s About page.' : 'Not on the client portal’s About page — an Owner or an Admin chooses who is.'}</p>}
          </section>

          <section className={profile.card} aria-labelledby="pp-work" data-testid="card-work">
            <div className={profile.cardHead}>
              <h2 id="pp-work" className={profile.cardTitle}>{own ? 'Your work' : 'Their work'}</h2>
              <p className={profile.cardHelp}>{`Homes ${own ? 'you’ve' : 'they’ve'} done, with their pictures — upload them, or pick them from a project’s files. Clients see them in this order.`}</p>
            </div>
            {work.length ? (
              <div className={styles.works} role="list">
                {work.map((w, i) => <WorkTile key={w.id} w={w} first={i === 0} last={i === work.length - 1} may={data.mayEdit} onEdit={() => setEditing(w)} onMove={(dir) => { void move(w, dir) }} onRemove={() => { void remove(w) }} />)}
              </div>
            ) : <p className={profile.cardHelp}>{own ? 'No work on your profile yet.' : 'No work on their profile yet.'}</p>}
            {data.mayEdit ? <span><Button variant="secondary" appearance="outlined" iconStart={<Icon name="add" size={20} />} onPress={() => setEditing('new')} data-kb="create" data-kb-label="Add work" data-testid="work-add">Add work</Button></span> : null}
          </section>

          <section className={profile.card} aria-labelledby="pp-preview" data-testid="card-preview">
            <div className={profile.cardHead}>
              <h2 id="pp-preview" className={profile.cardTitle}>How clients see it</h2>
              <p className={profile.cardHelp}>{dirty ? 'With your changes — save them to show them.' : 'As it shows now.'}</p>
            </div>
            <div className={styles.preview}><DesignerCard card={preview} testId="card-preview-card" /></div>
            <ul className={styles.where} data-testid="card-where">
              <li>{data.shownOn.about ? 'The client portal’s About › Our team' : 'Not on the client portal’s About page'}</li>
              {data.shownOn.hangouts.map((h) => <li key={h.id}><Link className={styles.link} href={withFrom(hangoutHref(h.id, 'plan'), here)}>{h.name}</Link>’s booking page</li>)}
              <li>The meeting room’s Past projects</li>
            </ul>
          </section>
        </div>
      </div>
      <WorkEditor open={editing} memberId={m.id} projects={data.projects} onClose={() => setEditing(null)} onSaved={(msg, undo) => { setEditing(null); router.refresh(); snackbar(undo ? { message: msg, actionLabel: 'Undo', onAction: undo } : { message: msg }) }} />
    </CompanyShell>
  )
}

/** One piece of work on the editor: its first picture, its name and facts, and its ⋮ — Edit · Move earlier · Move later · Take it off. */
function WorkTile({ w, first, last, may, onEdit, onMove, onRemove }: { w: WorkCard; first: boolean; last: boolean; may: boolean; onEdit: () => void; onMove: (dir: 'up' | 'down') => void; onRemove: () => void }) {
  const [open, setOpen] = useState(false)
  const kebab = useRef<HTMLSpanElement>(null)
  return (
    <div className={styles.work} role="listitem" data-testid="work-card">
      <span className={styles.workPic}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {w.pictures[0] ? <img src={w.pictures[0].src} alt="" /> : <Icon name="image" size={24} />}
      </span>
      <div className={styles.workTop}>
        <span className={styles.workText}>
          <h3 className={styles.workName}>{w.title}</h3>
          <span className={styles.workFacts}>{workLine(workFacts(w), w.pictures.length)}</span>
        </span>
        {may ? (
          <span className={styles.menuWrap} ref={kebab}>
            <Tooltip label="More actions" disabled={open}><IconButton icon="more_vert" label={`More actions for ${w.title}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} /></Tooltip>
            <PortalMenu open={open} anchor={kebab} onClose={() => setOpen(false)} align="right" width={MENU_WIDTH.standard} role="menu" sheetTitle={w.title}>
              <DropdownItem onSelect={() => { setOpen(false); onEdit() }}>Edit</DropdownItem>
              {!first ? <DropdownItem onSelect={() => { setOpen(false); onMove('up') }}>Move earlier</DropdownItem> : null}
              {!last ? <DropdownItem onSelect={() => { setOpen(false); onMove('down') }}>Move later</DropdownItem> : null}
              <DropdownDivider />
              <DropdownItem onSelect={() => { setOpen(false); onRemove() }}>Take it off</DropdownItem>
            </PortalMenu>
          </span>
        ) : null}
      </div>
    </div>
  )
}
