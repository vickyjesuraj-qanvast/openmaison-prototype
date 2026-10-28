'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { CompanyShell } from '@/components/company/company-shell'
import { ReadOnlyNote } from '@/components/company/read-only-note'
import { PortalCard as Card } from './portal-card'   // (the calm UI build 2026-10-27 — 5-23) the Company card head
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { useCopy } from '@/components/om/use-copy'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { ClientAccessPanel, useOrigin } from '@/components/portal/client-access-panel'
import { setPortalAddress, setPortalPaused, undoPortalAddress } from '@/app/portal/studio-actions'
import { CLIENT_PORTAL_TABS } from '@/lib/company/sections'
import { useMaisonAi } from '@/lib/maison-ai'
import { withFrom } from '@/lib/nav'
import { accessChip, agoText, firstName, portalPath, shortDay } from '@/lib/portal/model'
import type { PortalSetup } from '@/lib/portal/queries'
import { AddressDialog } from './address-dialog'
import { PORTAL_RUNS_KEY, PortalSetupGhost } from './portal-ghosts'
import { setFlagPref } from '@/lib/prefs'
import { PORTAL_LINKS_ID, PortalLinksCard, PortalSectionsCard, PortalWelcomeCard } from './portal-sections-card'
import { bringCardIntoView, useHashLanding } from '@/components/company/use-hash-landing'
import { privacyStepLine } from '@/lib/portal/links'
import styles from './portal-setup.module.css'

/* (pending modules S10 — card held:maison-ai, "Company › Client portal set-up's words-only suggestions") each is asked and answered from the records:
   the portal's own sign-in rule, Company › Client portal's switches, the clients' visits (lib/maison-ai/answers/clients.ts) */
const AI = ['How do clients sign in to the portal?', 'What does a client see before work starts?', 'Who has opened their portal this week?']

/**
 * (Projects r4a, board 9 · Q-44 · Q-49 · Q-50) Company › Client portal › Set-up: four checks to get it live, three of them already done from
 * what the studio entered elsewhere — the address (made from the studio's name; changing it keeps the old one working), the look (the brand
 * kit), how clients pay (the issuing entity's bank and PayNow) and trying it as a test client — then Live or Paused, the real page a client
 * sees, and the clients with access. Owners and Admins change it (checked on the server); everyone else reads it.
 * (pending modules S13) A fifth check, the privacy notice (PDPA), and its card — Privacy and terms — under the welcome line.
 */
export function PortalSetupView({ data, from }: { data: PortalSetup; from?: string }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const origin = useOrigin()
  useMaisonAi(AI)
  useHashLanding()   // (pending modules S13) ⌘K's Client portal privacy and terms lands on #portal-links
  /* (fix-G, G-45) the loader's next ghost draws this viewer's header — Pause only for whoever runs the portal */
  useEffect(() => { setFlagPref(PORTAL_RUNS_KEY, data.mayRun) }, [data.mayRun])
  const [addressOpen, setAddressOpen] = useState(false)
  const [pausing, setPausing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [accessFor, setAccessFor] = useState<string | null>(null)
  const { slug, settings, mayRun, sample } = data
  const host = origin ? origin.replace(/^https?:\/\//, '') : ''
  const address = `${host}${portalPath(slug)}`
  /* (parity map, CP-127 — 1.0's Studio Portal URL card) the address copies whole (with its https) and opens in a new tab: the sign-in page a
     client lands on; seeing it signed in as a client is "See it as {client}" beside, the test client's view */
  const fullAddress = `${origin ?? ''}${portalPath(slug)}`
  const { copied, copy } = useCopy(fullAddress, { done: 'Portal address copied', failed: 'Couldn’t copy the address — please try again' })
  const closed = data.closedByPlatform   // (parity map, CP-148) OpenMaison closed it — the studio can't open it again
  const here = withFrom('/company/portal', from ?? '')
  const testHref = sample ? `${portalPath(slug, 'preview')}?client=${encodeURIComponent(sample.leadId)}&test=1` : null
  /* (fix-G, G-18) honest words: the test opens a real client's page, read-only — say whose */
  const testLabel = sample ? `See it as ${firstName(sample.client)}` : ''

  /* (pending modules S13) Getting it live's Privacy notice row: the card, its first box ready to type in */
  const toLinks = () => {
    const el = document.getElementById(PORTAL_LINKS_ID)
    if (!el) return
    bringCardIntoView(el, !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    window.setTimeout(() => el.querySelector<HTMLInputElement>('input[name="privacy"]')?.focus({ preventScroll: true }), 400)
  }
  const openTest = () => {
    if (!testHref) return
    window.open(testHref, '_blank')
    window.setTimeout(() => router.refresh(), 1500)   // the checklist's fourth step ticks once the test opens
  }
  const pause = async (paused: boolean) => {
    setBusy(true)
    try {
      const r = await setPortalPaused(paused)
      if ('error' in r) { snackbar({ message: couldnt(paused ? 'pause the portal' : 'put the portal live', refusalOf(r.error)) }); return }
      setPausing(false)
      /* (fix-G, G-20) Undo answers as every Undo does — what it did, or what failed */
      snackbar(paused
        ? { message: 'The portal is paused — clients see a notice', actionLabel: 'Undo', onAction: () => { void setPortalPaused(false).then((u) => { if ('error' in u) snackbar({ message: couldnt('put the portal live', refusalOf(u.error)) }); else { snackbar({ message: 'The portal is live again' }); router.refresh() } }, () => snackbar({ message: 'Couldn’t put the portal live — please try again' })) } }
        : { message: 'The portal is live again' })
      router.refresh()
    } catch { snackbar({ message: paused ? 'Couldn’t pause the portal — please try again' : 'Couldn’t put the portal live — please try again' }) } finally { setBusy(false) }
  }
  const saveAddress = async (next: string): Promise<string | null> => {
    const r = await setPortalAddress({ slug: next })
    if ('error' in r) return r.error
    setAddressOpen(false)
    if (r.slug === r.previous) snackbar({ message: `The address stays ${portalPath(r.slug)}` })   // (fix-G, G-35) a Save that changes nothing still answers
    else {
      snackbar({
        message: `The portal’s address is now ${portalPath(r.slug)} — ${portalPath(r.previous)} leads there`, actionLabel: 'Undo',
        /* (fix-G, G-35 · G-20) Undo of a change made moments ago takes the new address away altogether, and says so */
        onAction: () => { void undoPortalAddress({ slug: r.slug, previous: r.previous }).then((u) => { if ('error' in u) snackbar({ message: couldnt('change the address back', refusalOf(u.error)) }); else { snackbar({ message: `The portal’s address is ${portalPath(u.slug)} again` }); router.refresh() } }, () => snackbar({ message: 'Couldn’t change the address back — please try again' })) },
      })
    }
    router.refresh()
    return null
  }

  const steps: { key: string; title: string; line: string; done: boolean; action: { label: string; run: () => void } | null; tools?: ReactNode }[] = [
    {
      key: 'address', title: 'Address', done: true,
      /* (parity map, CP-127) Copy and Open beside the address, before its Change */
      tools: (
        <>
          <Tooltip label={copied ? 'Copied' : 'Copy the address'}><IconButton icon={copied ? 'check' : 'content_copy'} label="Copy the portal’s address" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => { void copy() }} data-testid="portal-address-copy" /></Tooltip>
          <Tooltip label="Open — the page a client signs in on"><IconButton icon="open_in_new" label="Open the portal’s address in a new tab" size={36} variant="bare" iconSize={20} iconWeight={300} onClick={() => { window.open(portalPath(slug), '_blank', 'noopener') }} data-testid="portal-address-open" /></Tooltip>
        </>
      ),
      line: `${address} · ${data.oldSlugs.length ? `your earlier ${data.oldSlugs.length === 1 ? 'address leads' : 'addresses lead'} here — ${data.oldSlugs.map((o) => portalPath(o.slug)).join(', ')}` : 'made from your studio’s name'}. An old address keeps working after a change.`,
      action: mayRun ? { label: 'Change', run: () => setAddressOpen(true) } : null,
    },
    {
      key: 'look', title: 'Logo and colour', done: data.brandReady,
      line: data.brandReady ? 'Taken from your brand kit. Nothing to enter again.' : 'Add your logo and colours to the brand kit — the portal wears them.',
      action: { label: 'Open brand kit', run: () => router.push(withFrom('/company/templates/brand', here)) },
    },
    {
      key: 'pay', title: 'How clients pay', done: data.pay.bank && data.pay.payNow,
      line: data.pay.bank && data.pay.payNow ? `${data.pay.entity} · bank transfer and PayNow, from Company › Profile.`
        : data.pay.bank ? `${data.pay.entity} · bank transfer, from Company › Profile. Add a PayNow ID there too.`
        : `Add the bank and PayNow your clients pay into, under ${data.pay.entity} in Company › Profile.`,
      /* (fix-G, G-07) the hash after the query, so the page lands on the entities card with its way back */
      action: { label: 'Open Profile', run: () => router.push(`${withFrom('/company/profile', here)}#entities`) },
    },
    /* (pending modules S13 — card held:client-portal, the PDPA revisit) a portal that signs people in by their number links the studio's
       privacy notice; done once it does */
    {
      key: 'privacy', title: 'Privacy notice', done: !!data.links.privacy,
      /* (the calm UI build 2026-10-27 — 5-37) the why (PDPA) is said once, on the Privacy and terms card the press brings into view */
      line: data.links.privacy ? privacyStepLine(data.links) : 'Not linked yet.',
      action: mayRun ? { label: data.links.privacy ? 'Change' : 'Add the link', run: toLinks } : null,
    },
    {
      key: 'test', title: 'Try it yourself', done: !!settings.testedAt,
      line: settings.testedAt ? `Done ${shortDay(settings.testedAt)}. Open it again any time — nothing you do there is recorded.` : sample ? `Open ${sample.client}’s page as they see it — read-only, nothing you do there is recorded.` : data.clients.length ? 'Only a client’s team, Owners and Admins open the portal as the client.' : 'Invite a client first — then open the portal as them.',
      action: testHref ? { label: testLabel, run: openTest } : null,
    },
  ]
  const done = steps.filter((s) => s.done).length

  return (
    <CompanyShell title="Client portal" tabs={[...CLIENT_PORTAL_TABS]} from={from} skeleton={<PortalSetupGhost runs={mayRun} />}
      actions={
        <>
          <span data-testid="portal-state">{closed ? <MetaChip>Closed by OpenMaison</MetaChip> : settings.paused ? <MetaChip color="yellow">Paused</MetaChip> : <MetaChip color="green">Live</MetaChip>}</span>   {/* (parity map, CP-148) */}
          {mayRun ? (settings.paused
            ? <Button variant="secondary" appearance="outlined" isDisabled={busy} onPress={() => void pause(false)} data-testid="portal-go-live">Go live again</Button>
            : <Button variant="secondary" appearance="outlined" isDisabled={busy} onPress={() => setPausing(true)} data-testid="portal-pause">Pause the portal</Button>) : null}
          {/* (5-37 · T-03) outlined — the checklist's Try it yourself keeps the same press; the page's one job is not this */}
          {testHref ? <Button variant="secondary" appearance="outlined" onPress={openTest} iconStart={<Icon name="open_in_new" size={20} />} data-testid="portal-test">{testLabel}</Button> : null}
        </>
      }>
      <div className={styles.page} data-testid="portal-setup">
        {/* (parity map, CP-148) OpenMaison closed the portal: said first, where the decision would be made — whom to ask, never who did it */}
        {closed ? (
          <div className={styles.paused} role="note" data-testid="portal-closed-note">
            <Icon name="lock" size={20} weight={300} />
            <span className={styles.pausedText}>
              <span className={styles.pausedTitle}>{`Closed by OpenMaison${closed.at ? ` on ${shortDay(closed.at)}` : ''}`}</span>
              <span className={styles.pausedLine}>Every client page says it is closed for now and asks them to contact you; nothing they press goes through. Links for a quote, a signature, designs or a file still work. Contact OpenMaison to open it again.</span>
            </span>
          </div>
        ) : null}
        {settings.paused ? (
          <div className={styles.paused} role="note" data-testid="portal-paused-note">
            <Icon name="schedule" size={20} weight={300} />
            <span className={styles.pausedText}>
              <span className={styles.pausedTitle}>{`The portal is paused${data.pausedByName && settings.pausedAt ? ` — ${data.pausedByName} paused it ${agoText(settings.pausedAt, data.now)}` : ''}`}</span>
              <span className={styles.pausedLine}>Clients see a notice under your studio’s name, and nothing they press goes through. Links for a quote, a signature, designs or a file still work.</span>
            </span>
          </div>
        ) : null}
        {mayRun ? null : <ReadOnlyNote text="Only Owners and Admins change the portal’s set-up." />}
        <div className={styles.grid}>
          <div className={styles.column}>
            <Card title="Getting it live" metaRight={`${done} of ${steps.length} done`} testId="portal-checklist">
              <div className={styles.body}>
                <div className={styles.group}>
                  {steps.map((s) => (
                    <div key={s.key} className={styles.row} data-static="" data-stack="" data-state={s.done ? 'done' : 'future'} data-testid={`portal-step-${s.key}`} data-done={s.done || undefined}>
                      <Icon name={s.done ? 'check_circle' : 'radio_button_unchecked'} size={20} weight={300} fill={s.done} className={styles.icon} />
                      <span className={styles.label}>
                        <span className={styles.nameGroup}><span className={styles.name}>{s.title}</span><span className={styles.till} data-testid={s.key === 'address' ? 'portal-address' : undefined}>{s.line}</span></span>
                      </span>
                      {s.tools ? <span className={styles.rowTools}>{s.tools}</span> : null}
                      {s.action ? <span className={styles.rowAction}><Button appearance="text" onPress={s.action.run}>{s.action.label}</Button></span> : null}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            {/* (Projects round 9, Q-45 · Q-44) board 9's two cards under the checklist */}
            <PortalSectionsCard sections={data.sections} mayRun={mayRun} />
            <PortalWelcomeCard welcome={data.welcome} studio={data.look.studio} mayRun={mayRun} />
            <PortalLinksCard links={data.links} mayRun={mayRun} />
          </div>
          <div className={styles.column}>
            <Card title="What a client sees" testId="portal-what-client-sees">
              <div className={styles.preview}>
                {sample ? (
                  <>
                    <p className={styles.previewHelp}>{`The real page, opened with ${sample.client}’s ${sample.project ? 'project' : 'page'} — read-only.`}</p>
                    {/* (fix-G, G-17) exactly what a client sees: no studio strip (`frame=1`), the paused notice while paused (a new frame when it
                        changes), and it scrolls */}
                    <div className={styles.phone}>
                      <iframe key={settings.paused ? 'paused' : 'live'} src={`${portalPath(slug, 'preview')}?client=${encodeURIComponent(sample.leadId)}&frame=1`} title={`${sample.client}’s page`} tabIndex={-1} loading="lazy" data-testid="portal-frame" />
                    </div>
                  </>
                ) : <p className={styles.previewEmpty}>{data.clients.length ? 'A client’s page shows here for their team, Owners and Admins.' : 'Invite a client and their page shows here.'}</p>}
              </div>
            </Card>
            <Card title="Clients" link={{ label: 'All clients', onClick: () => router.push(withFrom('/company/portal/clients', from ?? '')) }} testId="portal-clients-card">
              <div className={styles.body}>
                <div className={styles.group}>
                  {data.clients.slice(0, 4).map((c) => {
                    const chip = accessChip(c.stamps, data.now)
                    return (
                      <button key={c.leadId} type="button" className={styles.row} onClick={() => setAccessFor(c.leadId)} data-testid="portal-client-row">
                        <Icon name="person" size={20} weight={300} className={styles.icon} />
                        <span className={styles.label}><span className={styles.nameGroup}><span className={styles.name}>{c.client}</span><span className={styles.till}>{c.home}</span></span></span>
                        <span className={styles.rowEnd}><MetaChip color={chip.tone}>{chip.label}</MetaChip></span>
                      </button>
                    )
                  })}
                  {data.clients.length === 0 ? <p className={styles.previewEmpty}>No clients yet — a project’s client appears here, and anyone you invite.</p> : null}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
      <AddressDialog open={addressOpen} slug={slug} host={host} oldSlugs={data.oldSlugs.map((o) => o.slug)} onClose={() => setAddressOpen(false)} onSave={saveAddress} />
      <ConfirmDialog open={pausing} title="Pause the portal?" tone="primary" confirmLabel="Pause"
                     message="Clients see a notice under your studio’s name and can’t open their page until you put it live again. Links for a quote, a signature, designs or a file keep working."
                     onConfirm={() => void pause(true)} onCancel={() => setPausing(false)} />
      <ClientAccessPanel open={!!accessFor} leadId={accessFor} onClose={() => setAccessFor(null)} />
    </CompanyShell>
  )
}
