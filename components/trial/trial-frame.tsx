'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { Dialog } from '@/components/om/dialog'
import { BookDemoButton } from '@/components/site/book-demo'
import { Container, Display, Eyebrow, Lede, Section, cx } from '@/components/site/primitives'
import { SIGN_UP } from '@/lib/site/model'
import { anyWork, countOf, TRIAL_WORDS, TRY_PATH, workWords, type TrialToolKey, type TrialWork } from '@/lib/trial/policy'
import s from '@/components/site/site.module.css'
import p from '@/components/site/pages.module.css'
import x from './trial-tools.module.css'

/*
 * (pending modules S41b-3) The frame every no-account tool page shares — S36's tool page's grammar on the website's pieces: the crumb back to
 * the tool's site page, the allowance in the eyebrow (S36's "Free · no sign-up · 3 of 3 …"), the title and its line; then the tool; then
 * what keeps the work (1.0's gate in words before it is a wall — "run-up, not ambush"); then the other tools to try. The tool's own presses
 * are the studio's; Start your studio is the page's other filled button, in its own row.
 */

/** Where Start your studio goes (S31's sign-up, told it came from the trial — S36's). */
export const START_HREF = `${SIGN_UP}?from=try`
export function useStartStudio(): () => void {
  const router = useRouter()
  return () => router.push(START_HREF)
}

export function TrialHero({ back, here, allowance, title, lede, children }: {
  back: { label: string; href: string }; here: string; allowance: string; title: string; lede: string; children?: ReactNode
}) {
  return (
    <Section top className={p.heroBand} label={title} id="try-start">
      <Container>
        <nav aria-label="Breadcrumb" className={p.crumbs}>
          <Link href={back.href} className={p.crumbBack} data-testid="trial-crumb"><Icon name="arrow_back" size={16} />{back.label}</Link>
          <span aria-hidden className={p.crumbSep}>/</span><span aria-current="page" className={p.crumbHere}>{here}</span>
        </nav>
        <div className={x.hero}>
          <Eyebrow><span className={x.allowance} data-testid="trial-allowance">{TRIAL_WORDS.eyebrow} · {allowance}</span></Eyebrow>
          <Display as="h1" size="l" className={p.mt20}>{title}</Display>
          <Lede className={p.mt20}>{lede}</Lede>
          {children}
        </div>
      </Container>
    </Section>
  )
}

/** The tool itself, in the studio's own look. */
export function TrialApp({ label, children, testId }: { label: string; children: ReactNode; testId: string }) {
  return (
    <Section spacing="compact" label={label} className={x.appBand}>
      <Container><div className={x.app} data-testid={testId}>{children}</div></Container>
    </Section>
  )
}

/** What keeps the work: start your studio — everything made here moves in (or Book a demo). Said from the first visit, before any wall. */
export function KeepBand({ work, extra }: { work: TrialWork; extra?: string }) {
  const start = useStartStudio()
  const c = countOf(work)
  const made = anyWork(c)
  return (
    <Section spacing="compact" label={TRIAL_WORDS.keepTitle}>
      <Container>
        <div className={cx(s.card, x.keep)} data-testid="trial-keep">
          <div className={x.keepText}>
            <h2 className={x.keepTitle}>{TRIAL_WORDS.keepTitle}</h2>
            <p className={x.keepBody} data-testid="trial-keep-body">{made ? `So far: ${workWords(c)}. ${TRIAL_WORDS.keepBody}` : TRIAL_WORDS.keepNone}</p>
            <p className={s.fine}>{extra ? `${extra} ` : ''}{TRIAL_WORDS.keepFine}</p>
          </div>
          <div className={x.keepButtons}>
            <button type="button" className={cx(s.button, s.primary)} onClick={start} data-testid="trial-start-studio"><Icon name="storefront" size={20} />{TRIAL_WORDS.start}</button>
            <BookDemoButton variant="ghost" testId="trial-book-demo" />
          </div>
        </div>
      </Container>
    </Section>
  )
}

const OTHER: Record<TrialToolKey, { title: string; icon: string; line: string }> = {
  visualizer: { title: 'AI Visualizer', icon: 'wand_shine', line: 'Restyle a room photo in seconds.' },
  leads: { title: 'Leads', icon: 'people_alt', line: 'Add your enquiries the way your studio will.' },
  quote: { title: 'Upload a quote', icon: 'upload_file', line: 'See a quote spreadsheet read into lines.' },
  xray: { title: 'Quote X-Ray', icon: 'scan', line: 'See where your quote wins against another studio’s.' },
}
/** The other tools to try without an account — only those open on this server. */
export function OtherTools({ current, open }: { current: TrialToolKey | null; open: Partial<Record<TrialToolKey, boolean>> }) {
  const keys = (Object.keys(OTHER) as TrialToolKey[]).filter((k) => k !== current && open[k])
  if (!keys.length) return null
  return (
    <Section spacing="compact" label={TRIAL_WORDS.others}>
      <Container>
        <Display size="m" className={x.othersHead}>{TRIAL_WORDS.others}</Display>
        <div className={s.grid3}>
          {keys.map((k) => (
            <Link key={k} href={TRY_PATH[k]} className={cx(s.card, s.linkCard, x.other)} data-testid="trial-other" data-tool={k}>
              <span className={x.otherTitle}><Icon name={OTHER[k].icon} size={20} />{OTHER[k].title}<Icon name="arrow_forward" size={16} /></span>
              <span className={s.cardBody}>{OTHER[k].line}</span>
            </Link>
          ))}
        </div>
      </Container>
    </Section>
  )
}

/** 1.0's account gate — a dialog over the work, which stays where it is (1.0's rule: "the gate is a modal, never a redirect"). */
export function TrialGate({ text, onClose }: { text: string | null; onClose: () => void }) {
  const start = useStartStudio()
  return (
    <Dialog open={!!text} onClose={onClose} title={TRIAL_WORDS.gateTitle} width={400} size="form" alert nested portal
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} data-testid="trial-gate-later">{TRIAL_WORDS.notNow}</Button>
                     <Button onPress={() => { onClose(); start() }} data-testid="trial-gate-start">{TRIAL_WORDS.start}</Button></>}>
      <p className={x.fine} data-testid="trial-gate">{text}</p>
    </Dialog>
  )
}
