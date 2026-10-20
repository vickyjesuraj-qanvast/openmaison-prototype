'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Checkbox } from '@/components/ds'
import { CodeBoxes, emptyCode } from '@/components/om/code-boxes'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { Bone, GhostSheet } from '@/components/shell/skeleton'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { displayDate } from '@/lib/format'
import { CODE_LENGTH, RESEND_S, SIGN_IN } from '@/lib/auth/model'
import { INVITE_DAYS, asRole } from '@/lib/company/invitations'
import type { JoinView } from '@/lib/company/invitations-server'
import { joinStudio, sendJoinCode } from '@/app/join/actions'
import sign from '@/components/contracts/sign/signing-page.module.css'
import portal from '@/components/portal/portal.module.css'
import styles from './join-page.module.css'

/**
 * (pending modules S09 — the card `onboarding:team-invitations`, his "build all of them" 2026-10-11; 1.0's invitation, whose link went to
 * /login) An invitation to the studio's team, as the person invited reads it: the studio's bar (the client links' letterhead bar) and one card
 * on the house notice — the studio, who invited them and as what, one filled button. Expired, cancelled or unknown links say so in the
 * studio's name, with who to ask (invented copy).
 * (pending modules S30 — sign-in) Join sends a 6-digit code to the mobile number (else the email) the studio has for them; typing it brings
 * them in and signs them in on this browser — 1.0's invitee confirmed their number at sign-in. A link that has already joined signs them in
 * the same way (a code, never the link alone), or simply opens the app when this browser is theirs already. The stand-in says plainly that
 * no message is sent and any six digits work.
 */
export function JoinPage({ view, token, studio, logo }: { view: JoinView | null; token: string; studio?: string; logo?: string | null }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<{ to: string; at: number } | null>(null)
  const [code, setCode] = useState<string[]>(() => emptyCode(CODE_LENGTH))
  const [codeError, setCodeError] = useState<string | null>(null)
  const [remember, setRemember] = useState(true)
  const [left, setLeft] = useState(0)
  const first = useRef<HTMLInputElement | null>(null)
  useEffect(() => { if (sent) first.current?.focus() }, [sent])
  useEffect(() => {
    if (!sent) return
    const tick = () => setLeft(Math.max(0, RESEND_S - Math.floor((Date.now() - sent.at) / 1000)))
    const t = window.setInterval(tick, 1000)
    return () => window.clearInterval(t)
  }, [sent])
  const name = view?.studio ?? studio ?? 'Your studio'
  const mark = view ? view.logo : logo ?? null
  const ask = async (again = false) => {
    if (busy) return
    setBusy(true)
    try {
      const r = await sendJoinCode({ token })
      if ('error' in r) { snackbar({ message: couldnt('send the code', refusalOf(r.error)) }); router.refresh(); return }
      setSent({ to: r.to, at: Date.now() }); setLeft(RESEND_S); setCode(emptyCode(CODE_LENGTH)); setCodeError(null)
      if (again) snackbar({ message: `A new code is on its way to ${r.to}` })
    } catch { snackbar({ message: SIGN_IN.couldntSend }) }
    finally { setBusy(false) }
  }
  const join = async () => {
    if (busy) return
    const value = code.join('')
    if (value.length !== CODE_LENGTH) { setCodeError(SIGN_IN.codeShort); return }
    setBusy(true)
    let landed = false
    try {
      const r = await joinStudio({ token, code: value, remember })
      if ('error' in r) { setCodeError(r.error); return }
      landed = true
      router.push(r.href)   // their first page — the welcome waits there; the button stays busy until it opens
    } catch { snackbar({ message: couldnt('join') }) }
    finally { if (!landed) setBusy(false) }
  }
  const state = view?.state ?? 'inactive'
  const first0 = view?.name.trim().split(/\s+/)[0] ?? ''
  const joining = state === 'open'
  const goLabel = joining ? `Join ${name}` : 'Sign in'
  /* the code step — the same on an open link (Join) and a joined one (Sign in) */
  const codeStep = sent ? (
    <form className={styles.codeForm} onSubmit={(e) => { e.preventDefault(); void join() }} noValidate data-testid="join-code">
      <p className={sign.uploadedHelp} data-testid="join-sent">{`We sent a 6-digit code to ${sent.to}. Enter it to ${joining ? 'join' : 'sign in'}.`}</p>
      <CodeBoxes value={code} onChange={(c) => { setCode(c); setCodeError(null) }} onEnter={() => void join()} invalid={!!codeError} testId="join-digit" firstRef={first} />
      {codeError ? <p className={portal.error} role="alert" data-testid="join-code-error">{codeError}</p> : null}
      <span className={styles.check} data-testid="join-remember"><Checkbox isSelected={remember} onChange={(on: boolean) => setRemember(on)}>Keep me signed in for 30 days</Checkbox></span>
      <Button type="submit" isDisabled={busy} data-testid="join-go">{busy ? (joining ? 'Joining…' : 'Signing in…') : goLabel}</Button>
      <p className={styles.fine} data-testid="join-resend">
        {left > 0 ? `No code yet? You can ask for a new one in ${left} ${left === 1 ? 'second' : 'seconds'}.`
          : <>No code yet? <button type="button" className={portal.link} onClick={() => void ask(true)} disabled={busy}>Send a new code</button></>}
      </p>
      <p className={styles.fine} data-testid="join-demo">{SIGN_IN.demoJoin}</p>
    </form>
  ) : null
  return (
    <div className={sign.page} data-testid="join-page" data-state={state} data-step={sent ? 'code' : 'start'}>
      <header className={sign.top}>
        <span className={sign.brand}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {mark ? <img className={sign.logo} src={mark} alt="" /> : null}
          <span className={sign.studio}>{name}</span>
        </span>
      </header>
      <main className={styles.body}>
        <div className={sign.notice} role={state === 'open' || state === 'joined' ? undefined : 'status'}>
          <span className={sign.uploadedGlyph}><Icon name={state === 'expired' ? 'schedule' : state === 'inactive' ? 'lock' : 'person_add'} size={32} /></span>
          {state === 'open' && view ? <>
            <h1 className={sign.noticeTitle}>{`Join ${name}`}</h1>
            <p className={sign.uploadedHelp} data-testid="join-line">{`${view.by ? `${view.by} invited you` : 'You’re invited'} to ${name}’s team ${asRole(view.role)}.`}</p>
            {codeStep ?? (view.to ? <>
              <Button onPress={() => { void ask() }} isDisabled={busy} data-testid="join-go">{busy ? 'Sending…' : `Join ${name}`}</Button>
              <p className={styles.fine} data-testid="join-demo">{`We’ll send a 6-digit code to ${view.to} to make sure it’s you. The link is open until ${displayDate(new Date(view.until))}.`}</p>
            </> : <p className={styles.fine} data-testid="join-demo">{`There’s no mobile number or email to send your code to. Ask ${view.by ?? name} to add one, then open this link again.`}</p>)}
          </> : state === 'joined' && view ? <>
            <h1 className={sign.noticeTitle}>{`You’re on ${name}’s team`}</h1>
            <p className={sign.uploadedHelp} data-testid="join-line">{`${first0 ? `${first0}, you` : 'You'} joined${view.joinedAt ? ` on ${displayDate(new Date(view.joinedAt))}` : ''}.`}</p>
            {view.signedIn ? <Button onPress={() => router.push('/')} data-testid="join-go">Open OpenMaison</Button>
              : codeStep ?? (view.to ? <>
                <Button onPress={() => { void ask() }} isDisabled={busy} data-testid="join-go">{busy ? 'Sending…' : 'Sign in'}</Button>
                <p className={styles.fine} data-testid="join-demo">{`We’ll send a 6-digit code to ${view.to} to sign you in.`}</p>
              </> : null)}
          </> : state === 'expired' && view ? <>
            <h1 className={sign.noticeTitle}>This invitation has expired</h1>
            <p className={sign.uploadedHelp} data-testid="join-line">{`Invitations stay open for ${INVITE_DAYS} days. Ask ${view.by ?? name} to send you a new one.`}</p>
          </> : <>
            <h1 className={sign.noticeTitle}>This invitation is no longer active</h1>
            <p className={sign.uploadedHelp} data-testid="join-line">{`Ask ${name} for a new one if you’re joining the team.`}</p>
          </>}
        </div>
      </main>
    </div>
  )
}

/** (REG-708) The invitation page's ghost: the studio's bar, then the card — its glyph, the title, the line, the button and the caption. */
export function JoinGhost() {
  return (
    <GhostSheet label="Loading the invitation">
      <div className={sign.page}>
        <div className={sign.top}><span className={sign.brand}><Bone w={120} h={28} r={4} /></span></div>
        <div className={styles.body}>
          <div className={sign.notice}>
            <Bone w={64} h={64} r="50%" />
            <Bone w={220} h={24} />
            <Bone w="70%" h={14} />
            <Bone w={180} h={36} r={4} />
            <span className={styles.ghostFine}><Bone w="96%" h={10} /><Bone w="40%" h={10} /></span>
          </div>
        </div>
      </div>
    </GhostSheet>
  )
}
