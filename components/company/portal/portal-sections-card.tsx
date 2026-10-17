'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Switch } from '@/components/ds'
import { LeaveGuard } from '@/components/company/leave-guard'
import { Card } from '@/components/leads/detail/card'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { useSnackbar } from '@/components/om/snackbar'
import { TextField } from '@/components/om/text-field'
import { setPortalLinks, setPortalSection, setPortalWelcome } from '@/app/portal/sections-actions'
import { PORTAL_SECTIONS, WELCOME_MAX, defaultWelcome, type PortalSections, type SectionKey } from '@/lib/portal/sections'
import { FOOT_LINKS, LINKS_HELP, footLinkProblem, footLinksShown, parseFootLinks, sameFootLinks, type FootLinkKey, type FootLinks } from '@/lib/portal/links'
import styles from './portal-sections.module.css'

/**
 * (Projects round 9 — Q-45; board 9 "What clients can see") The six sections, each switched on or off for every client — the Notifications
 * event table's card table (REG-614 · REG-727), a DS sm switch per row (REG-460). A section that is off is gone from every client's portal and
 * refused on the server; inside a section that is on, the client still sees only what was shared. Each switch saves at once — put back, and
 * said, when the server refuses; switching one off offers Undo. Owners and Admins switch; everyone else reads.
 */
export function PortalSectionsCard({ sections, mayRun }: { sections: PortalSections; mayRun: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [shown, setShown] = useState(sections)
  const [was, setWas] = useState(sections)
  if (was !== sections) { setWas(sections); setShown(sections) }
  const flip = async (key: SectionKey, on: boolean, undo = false) => {
    const name = PORTAL_SECTIONS.find((s) => s.key === key)!.name
    setShown((s) => ({ ...s, [key]: on }))
    try {
      const r = await setPortalSection(key, on)
      if ('error' in r) { setShown((s) => ({ ...s, [key]: !on })); snackbar({ message: couldnt(on ? `show ${name}` : `hide ${name}`, refusalOf(r.error)) }); return }
      setShown(r.sections)
      if (!undo) snackbar(on ? { message: `${name} is back on every client’s portal` } : { message: `${name} is off — no client sees it`, actionLabel: 'Undo', onAction: () => { void flip(key, true, true) } })
      router.refresh()
    } catch { setShown((s) => ({ ...s, [key]: !on })); snackbar({ message: `Couldn’t ${on ? 'show' : 'hide'} ${name} — please try again` }) }
  }
  return (
    <Card title="What clients can see" metaRight={`${PORTAL_SECTIONS.filter((s) => shown[s.key]).length} of ${PORTAL_SECTIONS.length} on`} testId="portal-sections">
      <div className={styles.body}>
        <p className={styles.help}>A section that is off is hidden for every client and its data is not sent. Inside a section, a client still sees only what you have shared.</p>
        <div className={styles.table} role="table" aria-label="What clients can see" data-card-table="">
          <div className={styles.head} role="row"><span role="columnheader">Section</span><span role="columnheader" className={styles.col}>Shown</span></div>
          {PORTAL_SECTIONS.map((s) => (
            <div key={s.key} className={styles.row} role="row" data-testid={`portal-section-${s.key}`} data-on={shown[s.key] || undefined}>
              <span role="cell" className={styles.name}><span>{s.name}</span><span className={styles.line}>{s.line}</span></span>
              <span role="cell" className={styles.col}>
                <Switch size="sm" isSelected={shown[s.key]} isDisabled={!mayRun} onChange={(on: boolean) => { void flip(s.key, on) }} aria-label={`${s.name} — shown to clients`} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

/**
 * (Projects round 9 — Q-44; board 9 "Welcome line, shown when a client signs in") One plain line, up to WELCOME_MAX characters: the sign-in
 * page's heading, and a line under the studio's name on each client's home. The field opens on what clients read now — the studio's own line,
 * or the sign-in page's ("Your renovation with Demo Studio"). Save lands it (with Undo); unsaved edits ask before a move (the leave guard).
 */
export function PortalWelcomeCard({ welcome, studio, mayRun }: { welcome: string | null; studio: string; mayRun: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const saved = welcome ?? defaultWelcome(studio)
  const [value, setValue] = useState(saved)
  const [was, setWas] = useState(saved)
  if (was !== saved) { setWas(saved); setValue(saved) }
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const dirty = mayRun && value.replace(/\s+/g, ' ').trim() !== saved
  const save = async (): Promise<boolean> => {
    if (busy) return false
    setBusy(true)
    try {
      const r = await setPortalWelcome({ line: value })
      if ('error' in r) { setError(r.error); return false }
      setError(null)
      snackbar({
        message: r.line ? 'Welcome line saved — clients read it when they sign in' : 'Clients read the sign-in page’s own words again',
        actionLabel: 'Undo', onAction: () => { void setPortalWelcome({ line: r.previous ?? '' }).then((u) => { if ('error' in u) snackbar({ message: couldnt('put the welcome line back', refusalOf(u.error)) }); else router.refresh() }) },
      })
      router.refresh()
      return true
    } catch { snackbar({ message: 'Couldn’t save the welcome line — please try again' }); return false } finally { setBusy(false) }
  }
  return (
    <Card title="Welcome line" testId="portal-welcome">
      <div className={styles.body}>
        <form className={styles.welcome} onSubmit={(e) => { e.preventDefault(); void save() }} noValidate>
          <TextField label="Welcome line, shown when a client signs in" value={value} onChange={(v) => { setValue(v.slice(0, WELCOME_MAX)); setError(null) }} maxLength={WELCOME_MAX}
                     disabled={!mayRun} error={error ?? undefined}
                     helper={`On the sign-in page, and under your studio’s name on each client’s home. Plain words, up to ${WELCOME_MAX} characters — ${value.length} used.`} />
          {mayRun ? (
            <div className={styles.actions}>
              {dirty ? <Button variant="secondary" appearance="outlined" onPress={() => { setValue(saved); setError(null) }} isDisabled={busy}>Cancel</Button> : null}
              <Button type="submit" isDisabled={!dirty || busy} data-testid="portal-welcome-save">Save</Button>
            </div>
          ) : null}
        </form>
      </div>
      <LeaveGuard dirty={dirty} what="the welcome line" onSave={save} onDiscard={() => setValue(saved)} />
    </Card>
  )
}

/** (pending modules S13) Where Getting it live's Privacy notice row lands: the card, its first field focused. */
export const PORTAL_LINKS_ID = 'portal-links'

type LinkValues = Record<FootLinkKey, string>
const asValues = (l: FootLinks): LinkValues => ({ privacy: l.privacy ?? '', terms: l.terms ?? '', contact: l.contact ?? '' })

/**
 * (pending modules S13 — card held:client-portal, "Add Privacy and Terms links to the portal footer?" as recommended; 1.0's Studio Profile ›
 * Footer Links) The studio's privacy notice, terms and contact page — web addresses on its own site, each shown at the foot of every portal page
 * and the sign-in page once set, none while empty. Clients sign in with their phone number, so the card says why a privacy notice matters
 * (Singapore's PDPA). The Welcome line's pattern: Save lands it with Undo, a bad address is refused under its own field, unsaved edits ask
 * before a move (the leave guard). Owners and Admins change it; everyone else reads it.
 */
export function PortalLinksCard({ links, mayRun }: { links: FootLinks; mayRun: boolean }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [value, setValue] = useState<LinkValues>(() => asValues(links))
  const [was, setWas] = useState(links)
  if (was !== links) { setWas(links); setValue(asValues(links)) }
  const [errors, setErrors] = useState<Partial<Record<FootLinkKey, string>>>({})
  const [busy, setBusy] = useState(false)
  /* what the boxes would save (a bare address gets its https://) — dirty only when that differs from what is saved */
  const typed = parseFootLinks(value)
  const dirty = mayRun && (!sameFootLinks(typed, links) || FOOT_LINKS.some((d) => !!value[d.key].trim() && !!footLinkProblem(value[d.key])))
  const save = async (): Promise<boolean> => {
    if (busy) return false
    const problems = Object.fromEntries(FOOT_LINKS.flatMap((d) => { const p = value[d.key].trim() ? footLinkProblem(value[d.key]) : null; return p ? [[d.key, p]] : [] })) as Partial<Record<FootLinkKey, string>>
    if (Object.keys(problems).length) { setErrors(problems); return false }
    setBusy(true)
    try {
      const r = await setPortalLinks({ privacy: value.privacy, terms: value.terms, contact: value.contact })
      if ('error' in r) { snackbar({ message: couldnt('save the links', refusalOf(r.error)) }); return false }
      setErrors({})
      const back = r.previous
      snackbar({
        message: footLinksShown(r.links).length ? 'Links saved — clients see them at the foot of every page' : 'No links at the foot of the portal now',
        actionLabel: 'Undo', onAction: () => { void setPortalLinks({ privacy: back.privacy, terms: back.terms, contact: back.contact }).then((u) => { if ('error' in u) snackbar({ message: couldnt('put the links back', refusalOf(u.error)) }); else router.refresh() }, () => snackbar({ message: 'Couldn’t put the links back — please try again' })) },
      })
      router.refresh()
      return true
    } catch { snackbar({ message: 'Couldn’t save the links — please try again' }); return false } finally { setBusy(false) }
  }
  const discard = () => { setValue(asValues(links)); setErrors({}) }
  return (
    <div id={PORTAL_LINKS_ID} className={styles.anchor}>
      <Card title="Privacy and terms" metaRight={`${footLinksShown(links).length} of ${FOOT_LINKS.length} linked`} testId="portal-links">
        <div className={styles.body}>
          <p className={styles.help}>{LINKS_HELP}</p>
          <form className={styles.welcome} onSubmit={(e) => { e.preventDefault(); void save() }} noValidate>
            {FOOT_LINKS.map((d) => (
              <TextField key={d.key} label={d.field} name={d.key} autoComplete="url" value={value[d.key]} maxLength={500} disabled={!mayRun}
                         onChange={(v) => { setValue((x) => ({ ...x, [d.key]: v })); setErrors((x) => ({ ...x, [d.key]: undefined })) }}
                         error={errors[d.key]} />
            ))}
            {mayRun ? (
              <div className={styles.actions}>
                {dirty ? <Button variant="secondary" appearance="outlined" onPress={discard} isDisabled={busy}>Cancel</Button> : null}
                <Button type="submit" isDisabled={!dirty || busy} data-testid="portal-links-save">Save</Button>
              </div>
            ) : null}
          </form>
        </div>
        <LeaveGuard dirty={dirty} what="the privacy and terms links" onSave={save} onDiscard={discard} />
      </Card>
    </div>
  )
}
