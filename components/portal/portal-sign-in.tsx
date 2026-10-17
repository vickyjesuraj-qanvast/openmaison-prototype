'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TextField } from '@/components/om/text-field'
import { CodeBoxes, emptyCode } from '@/components/om/code-boxes'   // (pending modules S30) the code step's boxes, the house piece
import { useSnackbar } from '@/components/om/snackbar'
import { PageReveal } from '@/components/shell/page-reveal'
import { requestCode, verifyCode } from '@/app/portal/actions'
import { MSG } from '@/lib/forms'
import { digitsOnly, isSgPhone, phoneTyped } from '@/lib/format'
import { CODE_LENGTH } from '@/lib/portal/model'
import { defaultWelcome } from '@/lib/portal/sections'
import type { PortalLook } from '@/lib/portal/queries'
import { StudioMark, brandStyle } from './studio-mark'
import { PortalSignInGhost } from './portal-ghosts'
import { PortalFoot } from './portal-foot'
import styles from './portal.module.css'

const RESEND_S = 30
/** (pending modules S34) The client's version of the studio sign-in's line (lib/auth/model.ts `SIGN_IN.demo`). (invented copy) */
const PORTAL_CODE_DEMO = 'Demo only — no text is sent: any six digits open your project.'

/**
 * (Projects round 4a, board 5 · Q-38) Signing in: the client's number, then a 6-digit code sent to it. Only a number the studio added opens
 * the portal; any other reads plainly. The prototype sends no SMS (the developers wire it) — the code step shows as it will, and (pending
 * modules S34) says so: the code goes through the one sign-in provider (lib/auth/provider.ts); while its stand-in answers, a line under the
 * boxes says no text is sent and any six digits open the project.
 */
/** (fix-F, F-10) Focus once the page can take it: the ghost holds the form `inert` for its beat (PageReveal), so a focus on arrival — or right
    after "Send me a code" — landed nowhere. Waits frame by frame until the field is live, for at most two seconds. */
export function focusWhenLive(get: () => HTMLElement | null | undefined): () => void {
  let raf = 0
  const until = performance.now() + 2000
  const tick = () => {
    const el = get()
    if (el && !el.closest('[inert]') && el.offsetParent !== null) { el.focus(); return }
    if (performance.now() < until) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

export function PortalSignIn({ look, slug, next = null }: { look: PortalLook; slug: string; /** (fix-F, F-20) the page to come back to */ next?: string | null }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [sent, setSent] = useState<{ ending: string; at: number; /** (pending modules S34) the stand-in: no text goes, any six digits open it */ demo: boolean } | null>(null)
  const [code, setCode] = useState<string[]>(() => emptyCode(CODE_LENGTH))
  const [codeError, setCodeError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [left, setLeft] = useState(0)
  const first = useRef<HTMLInputElement | null>(null)
  const form = useRef<HTMLFormElement | null>(null)
  /* (fix-F, F-10) the number field on arrival, the code's first box once it is sent — keyed on the step, after the ghost has gone */
  useEffect(() => focusWhenLive(() => (step === 'code' ? first.current : form.current?.querySelector('input'))), [step, sent])

  /* the resend clock: "You can ask for a new one in 24 seconds" */
  useEffect(() => {
    if (!sent) return
    const tick = () => setLeft(Math.max(0, RESEND_S - Math.floor((Date.now() - sent.at) / 1000)))
    const t = window.setInterval(tick, 1000)
    return () => window.clearInterval(t)
  }, [sent])

  const ask = async (again = false) => {
    if (busy) return
    const digits = digitsOnly(phone)
    if (!isSgPhone(digits)) { setPhoneError(MSG.phone); return }
    setBusy(true)
    try {
      const r = await requestCode(slug, { phone: digits })
      if ('error' in r) { setPhoneError(r.error); if (again) { setStep('phone'); } return }
      setPhoneError(null)
      setSent({ ending: r.ending, at: Date.now(), demo: r.demo }); setLeft(RESEND_S)
      setCode(emptyCode(CODE_LENGTH)); setCodeError(null)
      setStep('code')
      if (again) snackbar({ message: `A new code is on its way to the number ending ${r.ending}` })
    } catch {
      snackbar({ message: 'Couldn’t send the code — please try again' })
    } finally { setBusy(false) }
  }
  const open = async () => {
    if (busy) return
    const value = code.join('')
    if (value.length !== CODE_LENGTH) { setCodeError('Enter all 6 digits of the code'); return }
    setBusy(true)
    try {
      const r = await verifyCode(slug, { phone: digitsOnly(phone), code: value, next })
      if ('error' in r) { setCodeError(r.error); return }
      router.replace(r.to)
    } catch {
      snackbar({ message: 'Couldn’t open your page — please try again' })
    } finally { setBusy(false) }
  }
  return (
    <PageReveal skeleton={<PortalSignInGhost />}>
      <div className={`${styles.page} ${styles.signinPage}`} style={brandStyle(look)} data-testid="portal-sign-in" data-step={step}>
        <div className={styles.signin}>
          <div className={styles.signinHead}>
            <StudioMark look={look} large />
            <div className={styles.signinText}>
              <h1 className={styles.h1s} data-testid="portal-sign-in-welcome">{look.welcome ?? defaultWelcome(look.studio)}</h1>   {/* (Projects round 9, Q-44) the studio's welcome line */}
              <p className={styles.lede16}>
                {step === 'phone'
                  ? `Enter the mobile number ${look.studio} has for you. We’ll send a 6-digit code to it.`
                  : `We sent a 6-digit code to the number ending ${sent?.ending ?? ''}. Enter it to open your project.`}
              </p>
            </div>
          </div>

          {step === 'phone' ? (
            <form ref={form} className={styles.form} onSubmit={(e) => { e.preventDefault(); void ask() }} noValidate>
              <TextField label="Your mobile number" value={phoneTyped(phone)} onChange={(v) => { setPhone(digitsOnly(v).slice(0, 8)); setPhoneError(null) }}
                         type="tel" inputMode="tel" numeric="digits" autoComplete="tel-national" error={phoneError ?? undefined} />
              <button type="submit" className={styles.go} disabled={busy} data-testid="portal-send-code">Send me a code</button>
            </form>
          ) : (
            <form className={styles.form} onSubmit={(e) => { e.preventDefault(); void open() }} noValidate>
              <CodeBoxes value={code} onChange={(c) => { setCode(c); setCodeError(null) }} onEnter={() => void open()} invalid={!!codeError} testId="portal-digit" firstRef={first} />
              {codeError ? <p className={styles.error} role="alert">{codeError}</p> : null}
              {/* (pending modules S34) said plainly while the prototype's sign-in stand-in answers — the studio's sign-in says the same (SIGN_IN.demo) */}
              {sent?.demo ? <p className={styles.line} data-testid="portal-code-demo">{PORTAL_CODE_DEMO}</p> : null}
              <button type="submit" className={styles.go} disabled={busy} data-testid="portal-open">Open my project</button>
              <p className={styles.line}>
                {left > 0 ? `No code yet? You can ask for a new one in ${left} ${left === 1 ? 'second' : 'seconds'}.`
                  : <>No code yet? <button type="button" className={styles.link} onClick={() => void ask(true)} disabled={busy}>Send a new code</button></>}
              </p>
            </form>
          )}

          <div className={styles.foot}>
            {step === 'code' ? (
              <>
                <p className={styles.footStrong}>Not your number?</p>
                <p className={styles.line}>{`Ask your designer at ${look.studio} to update it. Only the numbers your studio has added can open this project.`}</p>
                <p className={styles.line}><button type="button" className={styles.link} onClick={() => { setStep('phone'); setSent(null) }}>Use another number</button></p>
              </>
            ) : <p className={styles.line}>Only the numbers your studio has added can open this page.</p>}
            {/* (pending modules S13) the studio's privacy notice where the number is asked for — and its terms and contact page */}
            <PortalFoot links={look.links} studio={look.studio} inline />
          </div>
        </div>
      </div>
    </PageReveal>
  )
}
