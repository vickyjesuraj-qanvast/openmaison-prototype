'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Checkbox } from '@/components/ds'
import { TextField } from '@/components/om/text-field'
import { CodeBoxes, emptyCode } from '@/components/om/code-boxes'
import { Icon } from '@/components/om/icon'
import { carrySnackbar, useSnackbar } from '@/components/om/snackbar'
import { landedLine } from '@/lib/trial/policy'
import { PageReveal } from '@/components/shell/page-reveal'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Words } from '@/components/shell/ghost-kit'
import { focusWhenLive } from '@/components/portal/portal-sign-in'
import Link from 'next/link'
import { requestSignInCode, signInWithCode } from '@/app/sign-in/actions'
import { CODE_LENGTH, RESEND_S, SIGN_IN, SIGN_IN_NOTICE } from '@/lib/auth/model'
import { SIGN_UP_PATH, isSignInReason, type SignInReason } from '@/lib/auth/paths'
import { forgetStudio } from '@/lib/auth/forget'
import { HANDOFF_KEY, SIGN_UP } from '@/lib/studios/model'
import { digitsOnly, phoneTyped } from '@/lib/format'
import portal from '@/components/portal/portal.module.css'
import { TermsLine, TermsLineGhost } from './terms-line'
import { site } from '@/lib/site/model'
import styles from './sign-in.module.css'

const NOTICE_ICON: Record<SignInReason, string> = { out: 'logout', ended: 'schedule', deactivated: 'lock', qanvast: 'link_off' }
const noticeText = (r: SignInReason) => { const n = SIGN_IN_NOTICE[r]; return n.line ? `${n.title}. ${n.line}` : `${n.title}.` }
/* (REG-708) the demo's who-to-try line is the studio's data: the page tells this browser's ghosts its words, so the loader that paints before
   the page wraps it as the page will; before any visit, the base demo's own line */
const HINT_KEY = 'om.ghost.sign-in.hint'
const BASE_HINT = 'dane@demostudio.sg'   // (the calm UI build 2026-10-27, 1-46) what to type, in the demo box
const noStore = () => () => {}
const readHint = () => { try { return localStorage.getItem(HINT_KEY) ?? BASE_HINT } catch { return BASE_HINT } }
/** Only digits and spaces so far: a mobile number — it shows grouped ("9123 4567") after its +65. */
const typingNumber = (raw: string) => /^[\d\s]+$/.test(raw)

/**
 * (pending modules S30 — his "build all of them" 2026-10-11; card onboarding:studio-sign-in; 1.0's /login) Signing in to the studio's app:
 * the mobile number or the work email, then the 6-digit code sent to it — resend after 30 seconds, paste the code, Keep me signed in for 30
 * days (1.0's, ticked by default). The client portal's sign-in is the pattern (its page, its boxes, its words); this one wears OpenMaison's
 * mark. A number nobody in the studio has says so with who to ask; the stand-in says plainly that no message is sent and any six digits work.
 * Already signed in, the page is never shown (the server sends you home); signed out, every studio page comes here and returns after.
 */
export function StudioSignIn({ next, notice, hint, demo, signUps = 'open' }: {
  next: string | null; notice: SignInReason | null
  /** the demo's line: who to try (the Owner's email) */ hint: string | null
  /** the stand-in provider — the page says so */ demo: boolean
  /** (pending modules S31) a new studio may sign up — the door under the form; paused, "No account found" says 1.0's "Contact support for
      account setup" instead */
  signUps?: 'open' | 'paused'
}) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [step, setStep] = useState<'contact' | 'code'>('contact')
  const [raw, setRaw] = useState('')
  const [contactError, setContactError] = useState<string | null>(null)
  const [noAccount, setNoAccount] = useState(false)
  const [sent, setSent] = useState<{ to: string; joining: boolean; at: number } | null>(null)
  const [code, setCode] = useState<string[]>(() => emptyCode(CODE_LENGTH))
  const [codeError, setCodeError] = useState<string | null>(null)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [left, setLeft] = useState(0)
  const [shownNotice, setShownNotice] = useState<SignInReason | null>(notice)
  const first = useRef<HTMLInputElement | null>(null)
  const form = useRef<HTMLFormElement | null>(null)
  useEffect(() => focusWhenLive(() => (step === 'code' ? first.current : form.current?.querySelector('input'))), [step, sent])
  useEffect(() => { try { if (hint) localStorage.setItem(HINT_KEY, hint); else localStorage.removeItem(HINT_KEY) } catch { /* the ghost keeps the base line */ } }, [hint])
  /* the resend clock (1.0's 30 seconds): "You can ask for a new one in 24 seconds" */
  useEffect(() => {
    if (!sent) return
    const tick = () => setLeft(Math.max(0, RESEND_S - Math.floor((Date.now() - sent.at) / 1000)))
    const t = window.setInterval(tick, 1000)
    return () => window.clearInterval(t)
  }, [sent])

  const ask = async (again = false) => {
    if (busy) return
    setBusy(true)
    try {
      const r = await requestSignInCode({ contact: raw })
      if ('error' in r) { setContactError(r.error); setNoAccount(!!r.noAccount); if (again) setStep('contact'); return }
      setContactError(null); setNoAccount(false); setShownNotice(null)
      setSent({ to: r.to, joining: r.joining, at: Date.now() }); setLeft(RESEND_S)
      setCode(emptyCode(CODE_LENGTH)); setCodeError(null)
      setStep('code')
      if (again) snackbar({ message: `A new code is on its way to ${r.to}` })
    } catch { snackbar({ message: SIGN_IN.couldntSend }) }
    finally { setBusy(false) }
  }
  const signIn = async () => {
    if (busy) return
    const value = code.join('')
    if (value.length !== CODE_LENGTH) { setCodeError(SIGN_IN.codeShort); return }
    setBusy(true)
    let landed = false
    try {
      const r = await signInWithCode({ contact: raw, code: value, remember, next })
      if ('error' in r) { setCodeError(r.error); return }
      landed = true
      /* (pending modules S31) their studio is another of this prototype's — it opened: a full load, so nothing of the one before stays */
      /* (pending modules S41b-3) what came over from the website's free trial is said once, on the page they land on */
      if (r.switched) { forgetStudio(); if (r.claimed) carrySnackbar(r.to, landedLine(r.claimed)); window.location.assign(r.to); return }
      if (r.claimed) carrySnackbar(r.to, landedLine(r.claimed))
      router.replace(r.to)   // the button stays busy until their page opens
    } catch { snackbar({ message: 'Couldn’t sign you in — please try again' }) }
    finally { if (!landed) setBusy(false) }
  }
  const back = () => { setStep('contact'); setSent(null); setCodeError(null) }
  /* (pending modules S31) the number or email nobody has rides to sign-up in this tab, so it isn't typed twice */
  const handOver = () => { try { if (noAccount && raw.trim()) sessionStorage.setItem(HANDOFF_KEY, raw.trim()); else sessionStorage.removeItem(HANDOFF_KEY) } catch { /* typed again */ } }
  /* paused (the platform's switch): 1.0's "Contact support for account setup", once a number has no account — shown only when it applies */
  const door = signUps === 'open'
    ? <p className={portal.line} data-testid="sign-in-sign-up">{SIGN_UP.door} <Link className={portal.link} href={SIGN_UP_PATH} onClick={handOver}>{SIGN_UP.doorLink}</Link></p>
    : noAccount ? <p className={portal.line} data-testid="sign-in-sign-up-paused">{`${SIGN_UP.door} ${SIGN_UP.paused}.`}</p> : null

  const lede = step === 'contact'
    ? 'Enter your mobile number or work email. We’ll send you a 6-digit code.'
    : `We sent a 6-digit code to ${sent?.to ?? ''}. ${sent?.joining ? 'Enter it to join your studio’s team.' : 'Enter it to sign in.'}`
  return (
    <PageReveal skeleton={<StudioSignInGhost demo={demo} hint={hint ?? ''} signUps={signUps} />}>
      <div className={`${portal.page} ${portal.signinPage}`} data-testid="sign-in" data-step={step}>
        <div className={portal.signin}>
          <div className={portal.signinHead}>
            {/* (pending modules S35) the wordmark opens OpenMaison's website */}
            <Link href={site('/')} className={styles.brand} data-testid="sign-in-site">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.logo} src="/figma-assets/logo.svg" alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.wordmark} src="/figma-assets/logo-wordmark.svg" alt="OpenMaison" />
            </Link>
            <div className={portal.signinText}>
              <h1 className={portal.h1s}>Sign in to OpenMaison</h1>
              <p className={portal.lede16} data-testid="sign-in-lede">{lede}</p>
            </div>
          </div>
          {shownNotice ? <p className={styles.notice} role="status" data-testid="sign-in-notice"><Icon name={NOTICE_ICON[shownNotice]} size={20} weight={300} />{noticeText(shownNotice)}</p> : null}

          {step === 'contact' ? (
            <form ref={form} className={portal.form} onSubmit={(e) => { e.preventDefault(); void ask() }} noValidate>
              <TextField label={SIGN_IN.contactLabel} value={typingNumber(raw) ? phoneTyped(digitsOnly(raw).slice(0, 8)) : raw}
                         onChange={(v) => { setRaw(typingNumber(v) ? digitsOnly(v).slice(0, 8) : v.slice(0, 120)); setContactError(null); setNoAccount(false) }}
                         leading={raw && typingNumber(raw) ? '+65' : undefined} autoComplete="username" error={contactError ?? undefined} />
              <button type="submit" className={portal.go} disabled={busy} data-testid="sign-in-send">{busy ? 'Sending…' : 'Send me a code'}</button>
            </form>
          ) : (
            <form className={portal.form} onSubmit={(e) => { e.preventDefault(); void signIn() }} noValidate>
              <CodeBoxes value={code} onChange={(c) => { setCode(c); setCodeError(null) }} onEnter={() => void signIn()} invalid={!!codeError} testId="sign-in-digit" firstRef={first} />
              {codeError ? <p className={portal.error} role="alert" data-testid="sign-in-code-error">{codeError}</p> : null}
              <span className={styles.check} data-testid="sign-in-remember"><Checkbox isSelected={remember} onChange={(on: boolean) => setRemember(on)}>Keep me signed in for 30 days</Checkbox></span>
              <button type="submit" className={portal.go} disabled={busy} data-testid="sign-in-go">{busy ? 'Signing in…' : 'Sign in'}</button>
              <p className={portal.line} data-testid="sign-in-resend">
                {left > 0 ? `No code yet? You can ask for a new one in ${left} ${left === 1 ? 'second' : 'seconds'}.`
                  : <>No code yet? <button type="button" className={portal.link} onClick={() => void ask(true)} disabled={busy}>Send a new code</button></>}
              </p>
            </form>
          )}

          <div className={styles.foot}>
            {step === 'code' ? <p className={portal.line}><button type="button" className={portal.link} onClick={back} data-testid="sign-in-back">Use another number or email</button></p>
              : noAccount ? <p className={portal.line} data-testid="sign-in-no-account">{SIGN_IN.noAccountHelp}</p> : null}
            {step === 'contact' ? door : null}
            {/* (the calm UI build 2026-10-27 — the audit's 1-46, T-05) the demo's two lines as one quiet box: what any code is, and who to try */}
            {demo ? <p className={styles.demoBox} data-testid="sign-in-demo">{SIGN_IN.demoBox}{hint && step === 'contact' ? <> — try <span data-testid="sign-in-hint">{hint}</span></> : null}</p> : null}
            <TermsLine testId="sign-in-terms" />
          </div>
        </div>
      </div>
    </PageReveal>
  )
}

/** (REG-708) Sign-in's ghost — drawn by its loading.tsx and handed to its PageReveal: the mark, the title and lede, the notice the address
    names, the field and the button, the foot's demo line. */
export function StudioSignInGhost({ demo = true, hint, signUps = 'open' }: { demo?: boolean; /** the page's own line (its reveal); the loader reads this browser's */ hint?: string; /** (S31) the door under the form */ signUps?: 'open' | 'paused' }) {
  const reason = useSearchParams().get('reason')
  const kept = useSyncExternalStore(noStore, readHint, () => BASE_HINT)
  const line = hint ?? kept
  return (
    <GhostSheet label="Loading">
      <div className={`${portal.page} ${portal.signinPage}`} aria-hidden>
        <div className={portal.signin}>
          <div className={portal.signinHead}>
            <span className={styles.brand}><Bone w={40} h={40} r={8} /><Bone w={136} h={22} r={4} /></span>
            <div className={portal.signinText}><Words as="h2" className={portal.h1s}>Sign in to OpenMaison</Words><Words as="p" className={portal.lede16}>Enter your mobile number or work email. We’ll send you a 6-digit code.</Words></div>
          </div>
          {isSignInReason(reason) ? <span className={styles.notice}><Bone w={20} h={20} r={4} /><Words>{noticeText(reason)}</Words></span> : null}
          <div className={portal.form}><Bone w="100%" h={48} r={4} /><Bone w="100%" h={52} r={4} /></div>
          {/* (S31) the way to sign up, then the demo's two lines: the stand-in's own words, then who to try */}
          <div className={styles.foot}>
            {signUps === 'open' ? <Words as="p" className={portal.line}>{`${SIGN_UP.door} ${SIGN_UP.doorLink}`}</Words> : null}
            {demo ? <Words as="p" className={styles.demoBox}>{line ? `${SIGN_IN.demoBox} — try ${line}` : SIGN_IN.demoBox}</Words> : null}
            <TermsLineGhost />
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
