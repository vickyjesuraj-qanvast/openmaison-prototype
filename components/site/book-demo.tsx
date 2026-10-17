'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { duration } from '@/lib/motion'
import { Button } from '@/components/ds'
import { Dialog, FootStart } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { digitsOnly, phoneTyped } from '@/lib/format'
import { hasErrors, withServer, type FieldErrors } from '@/lib/forms'
import { checkDemoRequest, NAME_MAX, type DemoField } from '@/lib/site/forms'
import { requestDemo } from '@/app/site/actions'
import s from './book-demo.module.css'
import site from './site.module.css'

/*
 * (pending modules S35 — card onboarding:book-a-demo; 1.0's beta-signup-context.tsx · beta-signup-modal.tsx) Book a demo, the site's one way in:
 * name, studio, email and a +65 phone → a demo request kept as 1.0 kept it (`beta_signups`) and sent to OpenMaison's team through the house
 * outbox → Calendly opens to book the 30-minute call, prefilled (1.0's real booking page). 1.0 opened Calendly's own popup over the page; here
 * the house dialog holds the same Calendly page (its inline embed), with the page itself a press away should the embed not load.
 * Every button marked Book a demo opens it.
 */

const Ctx = createContext<() => void>(() => {})
export const useBookDemo = () => useContext(Ctx)

type Fields = { name: string; studio: string; email: string; phone: string }
const EMPTY: Fields = { name: '', studio: '', email: '', phone: '' }

/** The provider: Book a demo's two dialogs, opened from any button on the site (`?book` opens it on arrival — components/site/site-shell.tsx OpenOnBook). */
export function BookDemoProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [booked, setBooked] = useState<{ href: string; embed: string } | null>(null)
  const openForm = useCallback(() => setOpen(true), [])
  return (
    <Ctx.Provider value={openForm}>
      {children}
      {/* the form leaves first, then Calendly comes in — never two panels crossing over each other (the scrims overlap, so the page never
          flashes between them); focus goes back to the opener, which Calendly's dialog then hands back to when it closes */}
      <DemoForm open={open} onClose={() => setOpen(false)} onBooked={(b) => { setOpen(false); window.setTimeout(() => setBooked(b), Math.round(duration.modalExit * 1000)) }} />
      <PickATime booked={booked} onClose={() => setBooked(null)} />
    </Ctx.Provider>
  )
}

function DemoForm({ open, onClose, onBooked }: { open: boolean; onClose: () => void; onBooked: (b: { href: string; embed: string }) => void }) {
  const path = usePathname()
  const snackbar = useSnackbar()
  const [f, setF] = useState<Fields>(EMPTY)
  const [tried, setTried] = useState(false)
  const [server, setServer] = useState<FieldErrors<DemoField>>({})
  const [busy, setBusy] = useState(false)
  /* a fresh form each time it opens (1.0 mounted it fresh) — the render-phase adjust */
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setF(EMPTY); setTried(false); setServer({}) } }
  const errors = tried ? withServer(checkDemoRequest(f), server) : {}
  const set = (k: keyof Fields) => (v: string) => { setF((x) => ({ ...x, [k]: k === 'phone' ? digitsOnly(v).slice(0, 8) : v.slice(0, k === 'email' ? 200 : NAME_MAX) })); setServer((e) => ({ ...e, [k]: undefined })) }
  const submit = async () => {
    setTried(true)
    if (hasErrors(checkDemoRequest(f)) || busy) return
    setBusy(true)
    try {
      const r = await requestDemo({ ...f, sourcePage: path })
      if ('error' in r) {
        if (r.fields) setServer(r.fields)
        else snackbar({ message: couldnt('send your request', refusalOf(r.error)) })
        return
      }
      onBooked({ href: r.calendly, embed: `${r.calendly}&embed_type=Inline&embed_domain=${encodeURIComponent(window.location.host)}` })
    } catch { snackbar({ message: couldnt('send your request') }) } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onClose={onClose} size="form" title="See OpenMaison in action" closeOnScrim={false}
            subtitle="Tell us about your studio and we’ll open Calendly so you can book a demo with our team."
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button>
              <Button onPress={() => { void submit() }} isDisabled={busy} data-testid="demo-submit">{busy ? 'Sending…' : 'Book a demo'}</Button></>}>
      {/* (S42E, E-18) every field is asked for, so each wears the house mark, as the Contact form's do */}
      <form className={s.fields} data-testid="demo-form" noValidate onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <TextField label="Full name" required value={f.name} onChange={set('name')} error={errors.name} autoComplete="name" name="name" autoFocus />
        <TextField label="Studio name" required value={f.studio} onChange={set('studio')} error={errors.studio} autoComplete="organization" name="organization" />
        <TextField label="Email" required type="email" inputMode="email" value={f.email} onChange={set('email')} error={errors.email} autoComplete="email" name="email" />
        <TextField label="Phone" required type="tel" inputMode="tel" value={phoneTyped(f.phone)} onChange={set('phone')} error={errors.phone} autoComplete="tel-national" name="phone"
                   leading={f.phone ? '+65' : undefined} helper={errors.phone ? undefined : '8-digit Singapore number'} />
        <p className={s.fine}>Calendly sends your confirmation once you pick a time. No spam, ever.</p>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  )
}

/** Calendly, as 1.0 opened it once the request was kept: the booking page itself, inside the house dialog (nothing reaches Calendly before
    the visitor asked for a demo). */
function PickATime({ booked, onClose }: { booked: { href: string; embed: string } | null; onClose: () => void }) {
  return (
    <Dialog open={!!booked} onClose={onClose} size="modal" width={800} height="xl" phoneFull flush title="Pick a time"
            subtitle="Choose a slot that works for you. We’ll walk you through the platform."
            footer={booked ? <>
              <FootStart><a className={site.textLink} href={booked.href} target="_blank" rel="noopener noreferrer" data-testid="demo-calendly-link">Calendly not showing? Open it in a new tab<Icon name="open_in_new" size={16} /></a></FootStart>
              <Button onPress={onClose} data-testid="demo-done">Done</Button>
            </> : undefined}>
      {booked ? <Scheduler key={booked.embed} src={booked.embed} /> : <div className={s.scheduler} />}
    </Dialog>
  )
}

/** Calendly's page in the dialog's body. Until it has loaded, a quiet line says what is coming (the frame stays clear over it), so the body
    is never an empty white box; the foot's link is the way round when it never comes. */
function Scheduler({ src }: { src: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={s.scheduler} data-testid="demo-calendly" data-loaded={loaded || undefined}>
      {loaded ? null : <p className={s.waiting} data-testid="demo-calendly-waiting" aria-live="polite">Opening Calendly…</p>}
      <iframe className={s.frame} src={src} title="Book a 30-minute call with OpenMaison" onLoad={() => setLoaded(true)} />
    </div>
  )
}

/** A button that opens Book a demo (1.0's GetAccessButton) — the accent, or the ghost beside a filled one. */
export function BookDemoButton({ label = 'Book a demo', variant = 'primary', className, testId }: { label?: string; variant?: 'primary' | 'ghost'; className?: string; testId?: string }) {
  const open = useBookDemo()
  return (
    <button type="button" className={`${site.button} ${variant === 'primary' ? site.primary : site.ghost}${className ? ` ${className}` : ''}`} onClick={open} data-testid={testId ?? 'book-demo'}>
      <Icon name="calendar_month" size={16} />{label}
    </button>
  )
}
