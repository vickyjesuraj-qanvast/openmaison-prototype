'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Checkbox } from '@/components/ds'
import { TextField } from '@/components/om/text-field'
import { ChoiceCard } from '@/components/om/choice-card'
import { CodeBoxes, emptyCode } from '@/components/om/code-boxes'
import { Icon } from '@/components/om/icon'
import { PageReveal } from '@/components/shell/page-reveal'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { Words } from '@/components/shell/ghost-kit'
import { focusWhenLive } from '@/components/portal/portal-sign-in'
import { requestSignUpCode, startStudio } from '@/app/sign-up/actions'
import { CODE_LENGTH, RESEND_S, SIGN_IN } from '@/lib/auth/model'
import { SIGN_IN_PATH } from '@/lib/auth/paths'
import { forgetStudio } from '@/lib/auth/forget'
import type { FieldErrors } from '@/lib/forms'
import { digitsOnly, phoneTyped } from '@/lib/format'
import { HANDOFF_KEY, NAME_MAX, PERSON_MAX, SIGN_UP, SIGN_UP_KINDS, readSignUp, signUpBlock, type SignUpField, type SignUpKind } from '@/lib/studios/model'
import portal from '@/components/portal/portal.module.css'
import choice from '@/components/om/choice-card.module.css'
import { TermsLine, TermsLineGhost } from './terms-line'
import { site } from '@/lib/site/model'
import { carryTrialRoom, hasTrialRoom, takeTrialRoom, TRIAL_LANDING } from '@/lib/visualizer/trial/carry'
import { carrySnackbar, useSnackbar } from '@/components/om/snackbar'
import { anyWork, carriedLine, landedLine, roomLandedLine, type WorkCount } from '@/lib/trial/policy'
import { intentPlanName, withPlanIntent, type PlanIntent } from '@/lib/credits/plan-intent'   // (S46D — D4)
import signIn from './sign-in.module.css'
import styles from './sign-up.module.css'

type Handed = { phone: string; email: string }
const noStore = () => () => {}
const NOTHING: Handed = { phone: '', email: '' }
let handedCache: { raw: string | null; v: Handed } = { raw: null, v: NOTHING }
const readHanded = (): Handed => {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY)
    if (raw === handedCache.raw) return handedCache.v
    const v = raw ? (raw.includes('@') ? { phone: '', email: raw } : { phone: digitsOnly(raw).slice(0, 8), email: '' }) : NOTHING
    handedCache = { raw, v }
    return v
  } catch { return NOTHING }
}

type Step = 'who' | 'member' | 'details' | 'code'

/**
 * (pending modules S31 — her "build all of them" 2026-10-11; card onboarding:studio-sign-up; 1.0's /onboarding tour — Get started · Your unified
 * workspace · Choose your role · phone and code — which saved nothing) A new studio signs itself up, on sign-in's page (the client portal's
 * sign-in, composed, in OpenMaison's frame). Three short steps, one filled button each: how you work (1.0's role choice, which now decides
 * something — someone who works in a studio is sent to its Owner, a freelancer gets a studio of one), the studio's name with yours and your
 * mobile, then the 6-digit code — and the studio opens, signed in as its Owner, with the welcome and Set up your studio waiting (S08). The
 * stand-in says plainly that no text is sent; on this prototype the studio opens in a database of its own and the demo stays as it is.
 */
export function StudioSignUp({ paused, demo, canStart, trial = null, intent = null }: { paused: boolean; /** the stand-in provider — the page says so */ demo: boolean; /** a studio can be made on this server */ canStart: boolean
  /** (pending modules S41b-3) what this browser made in the website's free trial — it moves into the studio made here */ trial?: WorkCount | null
  /** (S46D — D4) the plan picked on the website's Pricing — the new studio opens Plans on it (Freelance starts as a studio of one) */ intent?: PlanIntent | null }) {
  const snackbar = useSnackbar()
  const handed = useSyncExternalStore(noStore, readHanded, () => NOTHING)
  /* (pending modules S36) a room photo brought from the website's AI Visualizer trial — it goes into the studio made here */
  const carried = useSyncExternalStore(noStore, hasTrialRoom, () => false)
  const [step, setStep] = useState<Step>('who')
  const [kind, setKind] = useState<SignUpKind>(intent?.plan === 'pro_freelance' ? 'solo' : 'studio')   // (S46D — D4) Freelance is a business of one
  const [studioName, setStudioName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phoneOwn, setPhone] = useState<string | null>(null)
  const [emailOwn, setEmail] = useState<string | null>(null)
  const phone = phoneOwn ?? handed.phone
  const email = emailOwn ?? handed.email
  const [errors, setErrors] = useState<FieldErrors<SignUpField>>({})
  const [tried, setTried] = useState(false)
  const [taken, setTaken] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState<{ to: string; at: number } | null>(null)
  const [code, setCode] = useState<string[]>(() => emptyCode(CODE_LENGTH))
  const [codeError, setCodeError] = useState<string | null>(null)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [left, setLeft] = useState(0)
  const first = useRef<HTMLInputElement | null>(null)
  const form = useRef<HTMLFormElement | null>(null)
  const go = useRef<HTMLAnchorElement | null>(null)
  /* focus follows the step: the first choice, the first field, the first box */
  useEffect(() => focusWhenLive(() => (step === 'code' ? first.current : step === 'details' ? form.current?.querySelector('input') ?? null : step === 'who' ? document.querySelector<HTMLElement>('[data-testid="sign-up-kind"][data-checked] button') : go.current)), [step])
  /* the resend clock (1.0's 30 seconds) */
  useEffect(() => {
    if (!sent) return
    const tick = () => setLeft(Math.max(0, RESEND_S - Math.floor((Date.now() - sent.at) / 1000)))
    const t = window.setInterval(tick, 1000)
    return () => window.clearInterval(t)
  }, [sent])

  const solo = kind === 'solo'
  const details = { kind, studioName, ownerName, phone, email }
  const blocked = signUpBlock({ paused, canStart })
  /* errors show after the first send and clear as the field is typed in (lib/forms' rule) */
  const fieldError = (f: SignUpField) => (tried ? errors[f] : undefined)
  const edit = (f: SignUpField, set: (v: string) => void) => (v: string) => { set(v); setFormError(null); if (taken) setTaken(false); if (tried) setErrors((e) => ({ ...e, [f]: undefined })) }

  const choose = () => setStep(kind === 'member' ? 'member' : 'details')
  const ask = async (again = false) => {
    if (busy) return
    setTried(true)
    const checked = readSignUp(details)
    if ('errors' in checked) { setErrors(checked.errors); return }
    setBusy(true)
    try {
      const r = await requestSignUpCode(details)
      if ('errors' in r) { setErrors(r.errors); setTaken(!!r.taken); if (again) setStep('details'); return }
      if ('error' in r) { setFormError(r.error); if (again) setStep('details'); return }
      setErrors({}); setFormError(null); setTaken(false)
      setSent({ to: r.to, at: Date.now() }); setLeft(RESEND_S)
      setCode(emptyCode(CODE_LENGTH)); setCodeError(null)
      setStep('code')
      if (again) snackbar({ message: `A new code is on its way to ${r.to}` })
    } catch { snackbar({ message: SIGN_IN.couldntSend }) }
    finally { setBusy(false) }
  }
  const start = async () => {
    if (busy) return
    const value = code.join('')
    if (value.length !== CODE_LENGTH) { setCodeError(SIGN_IN.codeShort); return }
    setBusy(true)
    let landed = false
    try {
      const r = await startStudio({ ...details, code: value, remember })
      if ('errors' in r) { setErrors(r.errors); setTaken(!!r.taken); setStep('details'); return }
      if ('error' in r) { setCodeError(r.error); return }
      landed = true
      /* another studio opens: a full load, so nothing the browser kept of the one before stays (S30's Sign out does the same) —
         (pending modules S36) but a room photo brought from the trial is the visitor's own, not the old studio's: it is kept across, and the
         new studio opens on its AI Visualizer, where the photo becomes its first design */
      const room = takeTrialRoom()
      forgetStudio()
      /* (pending modules S41b-3) the trial's leads, quote and reading came over: the studio opens where they are, and says so once */
      const c = 'claimed' in r ? r.claimed : undefined
      /* (S42E, E-14) with a room photo too, the studio opens on its AI Visualizer and the photo becomes a design (its editor is where it lands):
         the photo carries the one line that says what else came and where — said there, with the way to it */
      if (room) carryTrialRoom({ ...room, ...(c && anyWork(c) ? { landed: roomLandedLine(c) } : {}) })
      const to = room ? TRIAL_LANDING : c && (c.leads || c.quote) ? '/leads' : c?.reading ? '/quote-x-ray' : r.to
      if (c && !room) carrySnackbar(to, landedLine(c))
      window.location.assign(withPlanIntent(to, intent))   // (S46D — D4) wherever it lands, Plans opens on the plan picked on the website
    } catch { snackbar({ message: SIGN_UP.couldnt }) }
    finally { if (!landed) setBusy(false) }
  }
  const back = () => { setCodeError(null); setFormError(null); setStep(step === 'code' ? 'details' : 'who') }

  const title = step === 'who' ? SIGN_UP.title : step === 'member' ? SIGN_UP.memberTitle : step === 'details' ? SIGN_UP.detailsTitle[solo ? 'solo' : 'studio'] : SIGN_UP.codeTitle
  const lede = step === 'who' ? (blocked ? SIGN_UP.ledeBlocked : SIGN_UP.lede) : step === 'member' ? SIGN_UP.memberLede : step === 'details' ? SIGN_UP.detailsLede
    : `We sent a 6-digit code to ${sent?.to ?? ''}. Enter it to start ${studioName.trim() || 'your studio'}.`
  const demoLines = demo && (step === 'details' || step === 'code')
  return (
    <PageReveal skeleton={<StudioSignUpGhost blocked={blocked} />}>
      <div className={`${portal.page} ${portal.signinPage}`} data-testid="sign-up" data-step={step}>
        <div className={portal.signin}>
          <div className={portal.signinHead}>
            {/* (pending modules S35) the wordmark opens OpenMaison's website */}
            <Link href={site('/')} className={signIn.brand} data-testid="sign-up-site">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={signIn.logo} src="/figma-assets/logo.svg" alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={signIn.wordmark} src="/figma-assets/logo-wordmark.svg" alt="OpenMaison" />
            </Link>
            <div className={portal.signinText}>
              <h1 className={portal.h1s} data-testid="sign-up-title">{title}</h1>
              <p className={portal.lede16} data-testid="sign-up-lede">{lede}</p>
            </div>
          </div>

          {carried && !blocked && step !== 'member' ? <p className={portal.line} data-testid="sign-up-carried">{SIGN_UP.carried}</p> : null}
          {trial && !blocked && step !== 'member' ? <p className={portal.line} data-testid="sign-up-trial-work">{carriedLine(trial)}</p> : null}

          {step === 'who' ? (blocked ? (
            <p className={signIn.notice} role="status" data-testid="sign-up-blocked"><Icon name="lock" size={20} weight={300} />{blocked}</p>
          ) : (
            <form className={portal.form} onSubmit={(e) => { e.preventDefault(); choose() }} noValidate>
              <div className={styles.choices} role="radiogroup" aria-label="How you work">
                {SIGN_UP_KINDS.map((k) => (
                  <span key={k.key} className={styles.choice} data-testid="sign-up-kind" data-kind={k.key} data-checked={kind === k.key || undefined}>
                    <ChoiceCard title={k.title} help={k.help} selected={kind === k.key} onSelect={() => setKind(k.key)} />
                  </span>
                ))}
              </div>
              <button type="submit" className={portal.go} data-testid="sign-up-continue">Continue</button>
            </form>
          )) : null}

          {step === 'member' ? (
            <div className={portal.form}>
              <Link ref={go} href={SIGN_IN_PATH} className={`${portal.go} ${styles.goLink}`} data-testid="sign-up-to-sign-in">Go to sign in</Link>
              <p className={portal.line}>{SIGN_UP.memberLine}</p>
            </div>
          ) : null}

          {step === 'details' ? (
            <form ref={form} className={portal.form} onSubmit={(e) => { e.preventDefault(); void ask() }} noValidate data-testid="sign-up-details">
              <TextField label={SIGN_UP.studioLabel[solo ? 'solo' : 'studio']} value={studioName} onChange={edit('studioName', (v) => setStudioName(v.slice(0, NAME_MAX)))}
                         maxLength={NAME_MAX} autoComplete="organization" helper={solo ? SIGN_UP.soloHelper : undefined} error={fieldError('studioName')} />
              <TextField label="Your name" value={ownerName} onChange={edit('ownerName', (v) => setOwnerName(v.slice(0, PERSON_MAX)))} maxLength={PERSON_MAX} autoComplete="name" error={fieldError('ownerName')} />
              <TextField label="Mobile number" value={phoneTyped(phone)} onChange={edit('phone', (v) => setPhone(digitsOnly(v).slice(0, 8)))} leading={phone ? '+65' : undefined}
                         type="tel" inputMode="tel" autoComplete="tel-national" error={fieldError('phone')} />
              <TextField label="Work email (optional)" value={email} onChange={edit('email', (v) => setEmail(v.slice(0, 120)))} type="email" inputMode="email" autoComplete="email" error={fieldError('email')} />
              {taken ? <p className={portal.line} data-testid="sign-up-taken"><Link className={portal.link} href={SIGN_IN_PATH}>Sign in</Link> with it instead.</p> : null}
              {formError ? <p className={portal.error} role="alert" data-testid="sign-up-error">{formError}</p> : null}
              <button type="submit" className={portal.go} disabled={busy} data-testid="sign-up-send">{busy ? 'Sending…' : 'Send me a code'}</button>
              <p className={portal.line} data-testid="sign-up-plan">{intent ? SIGN_UP.planPicked(intentPlanName(intent.plan)) : SIGN_UP.plan}</p>
            </form>
          ) : null}

          {step === 'code' ? (
            <form className={portal.form} onSubmit={(e) => { e.preventDefault(); void start() }} noValidate>
              <CodeBoxes value={code} onChange={(c) => { setCode(c); setCodeError(null) }} onEnter={() => void start()} invalid={!!codeError} testId="sign-up-digit" firstRef={first} />
              {codeError ? <p className={portal.error} role="alert" data-testid="sign-up-code-error">{codeError}</p> : null}
              <span className={signIn.check} data-testid="sign-up-remember"><Checkbox isSelected={remember} onChange={(on: boolean) => setRemember(on)}>Keep me signed in for 30 days</Checkbox></span>
              <button type="submit" className={portal.go} disabled={busy} data-testid="sign-up-go">{busy ? SIGN_UP.going : SIGN_UP.go}</button>
              <p className={portal.line} data-testid="sign-up-resend">
                {left > 0 ? `No code yet? You can ask for a new one in ${left} ${left === 1 ? 'second' : 'seconds'}.`
                  : <>No code yet? <button type="button" className={portal.link} onClick={() => void ask(true)} disabled={busy}>Send a new code</button></>}
              </p>
            </form>
          ) : null}

          <div className={signIn.foot}>
            {step === 'who'
              ? <p className={portal.line} data-testid="sign-up-have-account">{SIGN_UP.haveAccount} <Link className={portal.link} href={SIGN_IN_PATH}>Sign in</Link></p>
              : <p className={portal.line}><button type="button" className={portal.link} onClick={back} disabled={busy} data-testid="sign-up-back">{step === 'code' ? 'Use another number' : 'Back'}</button></p>}
            {demoLines ? <p className={signIn.fine} data-testid="sign-up-demo">{SIGN_IN.demoJoin}</p> : null}
            {demoLines ? <p className={signIn.fine} data-testid="sign-up-prototype">{SIGN_UP.prototype}</p> : null}
            <TermsLine testId="sign-up-terms" />
          </div>
        </div>
      </div>
    </PageReveal>
  )
}

/** (REG-708) Sign-up's ghost — drawn by its loading.tsx and handed to its PageReveal: the mark, the title and lede, the three ways of working
    (each the house choice card's own box) and Continue, the foot's way to sign in — or the notice while sign-ups are paused. */
export function StudioSignUpGhost({ blocked = null }: { blocked?: string | null }) {
  return (
    <GhostSheet label="Loading">
      <div className={`${portal.page} ${portal.signinPage}`} aria-hidden>
        <div className={portal.signin}>
          <div className={portal.signinHead}>
            <span className={signIn.brand}><Bone w={40} h={40} r={8} /><Bone w={136} h={22} r={4} /></span>
            <div className={portal.signinText}><Words as="h2" className={portal.h1s}>{SIGN_UP.title}</Words><Words as="p" className={portal.lede16}>{blocked ? SIGN_UP.ledeBlocked : SIGN_UP.lede}</Words></div>
          </div>
          {blocked ? <span className={signIn.notice}><Bone w={20} h={20} r={4} /><Words>{blocked}</Words></span> : (
            <div className={portal.form}>
              <div className={styles.choices}>
                {SIGN_UP_KINDS.map((k) => (
                  <span key={k.key} className={`${choice.card} ${styles.choiceGhost}`}>
                    <span className={choice.text}><Words className={choice.title}>{k.title}</Words><Words className={choice.help}>{k.help}</Words></span>
                    <Bone w={20} h={20} r={10} />
                  </span>
                ))}
              </div>
              <Bone w="100%" h={52} r={4} />
            </div>
          )}
          <div className={signIn.foot}><Words as="p" className={portal.line}>{`${SIGN_UP.haveAccount} Sign in`}</Words><TermsLineGhost /></div>
        </div>
      </div>
    </GhostSheet>
  )
}
