'use client'

import { useCallback, useEffect, useRef, useState, useTransition, type KeyboardEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { anchoredSurface } from '@/lib/motion'
import type { SessionMember } from '@/lib/db/session'
import { viewAs } from '@/app/view-as-actions'
import { setDemoPlan, type DemoPlan } from '@/app/credits/actions'
import { refreshCredits, useCredits } from '@/components/credits/credits-client'
import type { CreditSummary } from '@/lib/credits/model'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { useSnackbar } from '@/components/om/snackbar'
import { Sheet, useSheetLayout } from '@/components/om/sheet'
import menuStyles from '@/components/leads/menus.module.css'
import panel from '@/components/company/company-popover.module.css'
import styles from './view-as-popover.module.css'
import { useRailPopover } from '@/components/shell/rail-popover'
import { homeOfRole, onLeads, opensPath } from '@/lib/settings/roles'
import { Switch } from '@/components/ds'
import { setMyAccepting } from '@/app/company/members-actions'   // (pending modules S16)
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { leaveThen } from '@/components/company/leave-guard'   // (pending modules S30) unsaved edits ask before Sign out
import { signOut } from '@/app/sign-in/actions'   // (pending modules S30)
import { forgetMember, forgetStudio } from '@/lib/auth/forget'
import { openPrototypeStudio } from '@/app/studios/actions'   // (pending modules S31)
import type { StudioChrome } from '@/lib/studios/model'

/** (REG-705, AI credits Q-41) The studio's plan, for a demo — Upgrade and the upgrade moment, a trial, a failed payment, a studio not counted yet. */
const DEMO_PLANS: { key: DemoPlan; label: string; help: string }[] = [
  { key: 'free', label: 'Free', help: 'Upgrade in the rail · 30 AI credits a month' },
  { key: 'trial', label: 'Pro — Studio · trial', help: '14 days free, then monthly' },
  { key: 'pro', label: 'Pro — Studio', help: 'The base plan · AI credits in the rail' },
  { key: 'low', label: 'Almost out', help: 'Pro with 15 AI credits left · the warnings' },
  { key: 'past_due', label: 'Payment failed', help: 'Pro in its 14 days of grace' },
  { key: 'not_counting', label: 'Not counted yet', help: 'AI tools free for a month’s notice' },
]
const demoPlanOf = (s: CreditSummary | null): DemoPlan | null => (!s ? null : !s.counting ? 'not_counting' : s.status === 'past_due' ? 'past_due' : s.planId === 'free' ? 'free' : s.status === 'trialing' ? 'trial' : s.planId === 'pro_studio' ? (s.poolState === 'ok' ? 'pro' : 'low') : null)

/** (parity map, FR-040) A View as that moves to another part of the app — an Accounting member to Finance — crosses a route group's layout,
    whose shell (and its snackbar host) is a new one: the sentence rides in this tab's session and the new shell's View as says it once it
    mounts; the rail's and the phone's both look, the first takes it. */
const NOTE_KEY = 'om.viewas.note'
type Note = { message: string; back: string | null }
const keepNote = (n: Note) => { try { sessionStorage.setItem(NOTE_KEY, JSON.stringify(n)) } catch { /* the sentence is a courtesy */ } }
const takeNote = (): Note | null => {
  try {
    const v = sessionStorage.getItem(NOTE_KEY)
    if (!v) return null
    sessionStorage.removeItem(NOTE_KEY)
    const n = JSON.parse(v) as Partial<Note> | null
    return n && typeof n.message === 'string' ? { message: n.message, back: typeof n.back === 'string' ? n.back : null } : null
  } catch { return null }
}

/** "Designer · reports to James" — the second line of a member's row. */
export const memberLine = (m: SessionMember): string => (m.reportsTo ? `${m.role} · reports to ${m.reportsTo}` : m.role)

/**
 * Demo Studio › View as (REG-667, user-directed 2026-09-25 for the UAT; no mock — on the Company panel's chrome, REG-484): the
 * studio's active members with their roles; picking one makes the whole prototype that member (app/view-as-actions.ts). The
 * snackbar offers the way back. ≤767 it is a bottom sheet, opened from More.
 * (pending modules S01) The studio block's menu now leads with you — your avatar and name, Your profile — before View as; on a phone the top
 * bar's avatar opens the same menu as a sheet titled You (More › View as still opens View as alone).
 * (pending modules S30) …and you end with Sign out. View as stays the demo's way to be another member (no code, as before); signing in with
 * a code is sign-in's (/sign-in).
 * (pending modules S43A) "You" here is THIS browser's member (lib/db/session.ts): a browser signed in by a code is its own member, ticked in
 * the list whatever the demo's standing session is. A pick still moves the whole prototype — the standing session's windows — and this browser.
 */
export function ViewAsPopover({ open, anchor, onClose, onBack, team, profile = false, studios = [] }: { open: boolean; anchor: RefObject<HTMLElement | null> | null; onClose: () => void; /** (REG-899) the phone sheet's back to More */ onBack?: () => void; team: SessionMember[]
  /** (pending modules S01) the studio block's whole menu — you first (Your profile), then View as: the rail's block and the phone's avatar. More ›
      View as opens View as alone. */
  profile?: boolean
  /** (pending modules S31) the studios on this prototype — the demo's and the ones started here — shown only once one was started */
  studios?: StudioChrome['studios'] }) {
  const router = useRouter()
  const pathname = usePathname()
  const snackbar = useSnackbar()
  const sheet = useSheetLayout()
  const [, startTransition] = useTransition()
  const { place } = useRailPopover({ open, anchor, onClose, sheet, align: 'bottom' })   // (REG-728) the rail's popovers open one way

  const current = team.find((m) => m.isYou) ?? null
  /* (pending modules S16 — his "build all of them" 2026-10-11; 1.0's top bar: "Open" / "Closed" to new leads, one press, for the member
     themself) your own Open to new leads, under Your profile — the record Company › Members' switch writes (REG-612). Optimistic: the switch
     moves on the press and goes back if the save is refused; the server's answer takes over once the page has refreshed. */
  const serverOpen = current?.acceptingLeads ?? true
  const [openSeen, setOpenSeen] = useState(serverOpen)
  const [openToLeads, setOpenToLeads] = useState(serverOpen)
  if (serverOpen !== openSeen) { setOpenSeen(serverOpen); setOpenToLeads(serverOpen) }
  const setOpen = useCallback(function apply(next: boolean, undoable: boolean) {
    setOpenToLeads(next)
    startTransition(async () => {
      let r: Awaited<ReturnType<typeof setMyAccepting>>
      try { r = await setMyAccepting(next) } catch (e) { setOpenToLeads(!next); snackbar({ key: 'you-accepting', message: couldnt('change whether you take new leads', refusalOf(e)) }); return }
      if ('error' in r) { setOpenToLeads(!next); snackbar({ key: 'you-accepting', message: couldnt('change whether you take new leads', refusalOf(r.error)) }); return }
      router.refresh()
      snackbar({ key: 'you-accepting', message: next ? 'You’re open to new leads' : 'You’re closed to new leads',
        ...(undoable ? { actionLabel: 'Undo', onAction: () => apply(r.before, false) } : {}) })
    })
  }, [router, snackbar, startTransition])
  const flipOpen = () => setOpen(!openToLeads, true)
  const onOpenKey = (e: KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipOpen() } }
  const become = useCallback(function go(m: SessionMember, back: SessionMember | null) {
    startTransition(async () => {
      const r = await viewAs(m.id)
      if (r.error) { snackbar({ message: r.error }); return }
      const message = `Viewing as ${m.name} · ${m.role}`
      /* (parity map, FR-040 — 1.0 landed a bookkeeper on Finance) someone whose role does not open this page goes to their own work; the
         sentence follows them there */
      if (!opensPath(m.role, window.location.pathname)) { keepNote({ message, back: back?.id ?? null }); router.push(homeOfRole(m.role)); return }   // (S44O — C6) the role's own front door
      router.refresh()
      snackbar({
        message,
        ...(back ? { actionLabel: `Back to ${back.name}`, onAction: () => go(back, null) } : {}),
      })
    })
  }, [router, snackbar, startTransition])
  /* (parity map, FR-040) the sentence a View as carried here from another part of the app, said once this shell is up — (pending modules S31)
     looked for once, as the shell mounts: a later re-render of the page being left (a studio switch loads the next page in full) must never
     take the sentence meant for the next one */
  const lookedForNote = useRef(false)
  useEffect(() => {
    if (lookedForNote.current) return
    lookedForNote.current = true
    const n = takeNote()
    if (!n) return
    const back = team.find((x) => x.id === n.back) ?? null
    snackbar({ message: n.message, ...(back ? { actionLabel: `Back to ${back.name}`, onAction: () => become(back, null) } : {}) })
  }, [team, snackbar, become])
  const pick = (m: SessionMember) => { onClose(); if (!m.isYou) become(m, current) }
  /* (pending modules S30 — his "build all of them" 2026-10-11; card onboarding:studio-sign-in, S16's note: Log out's place; 1.0's profile menu
     ended with Sign out) Sign out: unsaved edits ask first (the leave guard), the session ends on the server, this browser forgets what it
     kept for you, and sign-in opens — a full load, so nothing of the studio stays in the page */
  const [leaving, setLeaving] = useState(false)
  const leave = () => {
    onClose()
    leaveThen(() => {
      setLeaving(true)
      void signOut().then((r) => { forgetMember(); window.location.assign(r.to) }, () => { setLeaving(false); snackbar({ message: couldnt('sign you out') }) })
    })
  }
  /* (REG-705) the studio's plan, demo only — the whole prototype follows (the rail's slot plays the upgrade moment on Free → Pro) */
  const credits = useCredits(null)
  const plan = demoPlanOf(credits)
  const pickPlan = (k: DemoPlan) => {
    onClose()
    if (k === plan) return
    startTransition(async () => {
      const r = await setDemoPlan(k)
      if ('error' in r) { snackbar({ message: r.error }); return }
      await refreshCredits()
      router.refresh()
      snackbar({ key: 'demo-plan', message: `Studio plan: ${r.label} (demo)` })
    })
  }
  const plans = (
    <div className={panel.group} role="group" aria-label="Studio plan (demo only)" data-testid="demo-plan">
      <span className={panel.eyebrow} data-menu-label="" role="presentation">Studio plan · demo only</span>   {/* (REG-728) the house group title */}
      {DEMO_PLANS.map((p) => (
        <button key={p.key} type="button" role="menuitemradio" aria-checked={plan === p.key} className={panel.row} data-on={plan === p.key || undefined} onClick={() => pickPlan(p.key)}>
          <span className={panel.glyph}><Icon name="diamond" size={20} weight={300} /></span>
          <span className={panel.text}>
            <span className={panel.label}>{p.label}</span>
            <span className={panel.help}>{p.help}</span>
          </span>
          {plan === p.key ? <Icon name="check" size={20} weight={300} /> : null}
        </button>
      ))}
    </div>
  )

  /* (pending modules S31 — his "build all of them" 2026-10-11; card onboarding:studio-sign-up) the studios on this prototype, demo only as View
     as is: one is open at a time; picking another opens it as its own session (lib/studios/registry.ts) — a full load, so nothing of the one
     before stays in the page; the sentence follows to the new shell */
  const [switching, setSwitching] = useState<string | null>(null)
  const pickStudio = (key: string) => {
    onClose()
    const s = studios.find((x) => x.key === key)
    if (!s || s.open || switching) return
    leaveThen(() => {
      setSwitching(key)
      void openPrototypeStudio(key).then((r) => {
        if ('error' in r) { setSwitching(null); snackbar({ message: couldnt('switch studios', r.error) }); return }
        forgetStudio()
        keepNote({ message: `Switched to ${r.name}`, back: null })
        window.location.assign(r.to)
      }, () => { setSwitching(null); snackbar({ message: couldnt('switch studios') }) })
    })
  }
  const studioGroup = studios.length ? (
    <div className={panel.group} role="group" aria-label="Studios (demo only)" data-testid="demo-studios">
      <span className={panel.eyebrow} data-menu-label="" role="presentation">Studios · demo only</span>
      {studios.map((st) => (
        <button key={st.key} type="button" role="menuitemradio" aria-checked={st.open} className={panel.row} data-on={st.open || undefined} onClick={() => pickStudio(st.key)} disabled={!!switching} data-studio={st.key}>
          <span className={panel.glyph}><Icon name="storefront" size={20} weight={300} /></span>
          <span className={panel.text}>
            <span className={panel.label}>{switching === st.key ? `Opening ${st.name}…` : st.name}</span>
            <span className={panel.help}>{st.line}</span>
          </span>
          {st.open ? <Icon name="check" size={20} weight={300} /> : null}
        </button>
      ))}
    </div>
  ) : null

  const list = (
    <div className={panel.group} role="group" aria-label="Members">
      {team.map((m) => (
        <button key={m.id} type="button" role="menuitemradio" aria-checked={m.isYou} className={panel.row} data-on={m.isYou || undefined} onClick={() => pick(m)}>
          <Avatar name={m.name} color={m.color} size={36} tooltip={false} />
          <span className={panel.text}>
            <span className={panel.label}>{m.name}</span>
            <span className={panel.help}>{memberLine(m)}</span>
          </span>
          {m.isYou ? <Icon name="check" size={20} weight={300} /> : null}
        </button>
      ))}
    </div>
  )
  const head = (
    <>
      <p className={styles.help}>See the prototype as another member of the studio — the leads they see and what they may do.</p>
    </>
  )
  /* (pending modules S01 — his "build all of them" 2026-10-11; 1.0's profile menu › Your Profile) who you are, and the way to your profile */
  const you = profile && current ? (
    <>
      <div className={panel.group} role="group" aria-label="You" data-testid="you-group">
        <Link href="/profile" role="menuitem" className={panel.row} aria-current={pathname === '/profile' ? 'page' : undefined} onClick={onClose} data-testid="open-profile">
          <Avatar name={current.name} color={current.color} size={36} tooltip={false} />
          <span className={panel.text}>
            <span className={panel.label}>{current.name}</span>
            <span className={panel.help}>Your profile</span>
          </span>
          <Icon name="chevron_right" size={20} weight={300} />
        </Link>
        {/* (pending modules S16) your own Open to new leads — a checkbox row whose mark is the DS switch (the house DropdownItem's rule for a
            row that draws its own mark); the switch is the row's picture only (inert), the row takes the press, ↵ and Space */}
        {onLeads(current.role) ? (
          <div role="menuitemcheckbox" aria-checked={openToLeads} tabIndex={0} className={panel.row} onClick={flipOpen} onKeyDown={onOpenKey}
               aria-label="Open to new leads" aria-describedby="you-accepting-help" data-testid="you-accepting">
            <span className={panel.glyph}><Icon name="person_add" size={20} weight={300} /></span>
            <span className={panel.text}>
              <span className={panel.label}>Open to new leads</span>
              <span className={panel.help} id="you-accepting-help">{openToLeads ? 'Suggested for new leads' : 'Not suggested for leads'}</span>
            </span>
            <span className={styles.switchMark} inert aria-hidden><Switch size="sm" isSelected={openToLeads} aria-label="Open to new leads" /></span>
          </div>
        ) : null}
        {/* (pending modules S30) Sign out — the last of you, under Your profile (and Open to new leads) */}
        <button type="button" role="menuitem" className={panel.row} onClick={leave} disabled={leaving} data-testid="sign-out">
          <span className={panel.glyph}><Icon name="logout" size={20} weight={300} /></span>
          <span className={panel.text}><span className={panel.label}>{leaving ? 'Signing out…' : 'Sign out'}</span></span>
        </button>
      </div>
      <div className={menuStyles.divider} role="separator" />
    </>
  ) : null
  if (typeof document === 'undefined') return null
  if (sheet) {
    return (
      <Sheet open={open} onClose={onClose} onBack={onBack} title={you ? 'You' : 'View as'} label={you ? 'You' : 'View as'} role="menu">
        {/* (pending modules S01) from the phone's avatar: you first, then View as under its own title */}
        <div className={panel.sheetBody}>{you}{you ? <span className={styles.titleRow}><span className={panel.title}>View as</span><span className={panel.soon}>Demo only</span></span> : null}{head}{list}{plans}{studioGroup}</div>
      </Sheet>
    )
  }
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div ref={place} className={`${menuStyles.menu} ${panel.popover} ${styles.fits}`} role="menu" aria-label="View as" data-om-menu
                    variants={anchoredSurface} initial="initial" animate="animate" exit="exit" style={{ position: 'fixed', zIndex: 130 }}>
          {you}
          <span className={styles.titleRow}>
            <span className={panel.title}>View as</span>
            <span className={panel.soon}>Demo only</span>
          </span>
          {head}
          {list}
          {plans}
          {studioGroup}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
