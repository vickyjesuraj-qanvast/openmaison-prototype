import Link from 'next/link'
import type { ReactNode } from 'react'
import { Icon } from '@/components/om/icon'
import { FREE_LINE, SIGN_UP } from '@/lib/site/model'
import s from './site.module.css'

/*
 * (pending modules S35 — 1.0's src/components/landing/v2/primitives.tsx) The website's building blocks, server-safe: the container, a band, the
 * type, the two buttons as links, the text link, the window frame, the margin chip, the glass tile. The reveal and the forms are client pieces
 * of their own (reveal.tsx · book-demo.tsx).
 */

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function Container({ children, size = 'default', className }: { children: ReactNode; size?: 'default' | 'narrow' | 'wide'; className?: string }) {
  return <div className={cx(s.container, size === 'narrow' && s.narrow, size === 'wide' && s.wide, className)}>{children}</div>
}

export function Section({ children, spacing = 'default', surface, top = false, ruled, id, className, label }: {
  children: ReactNode; spacing?: 'default' | 'major' | 'compact'; surface?: 'white' | 'sunk'; /** the page's first band — it clears the fixed bar */ top?: boolean
  ruled?: 'both' | 'top'; id?: string; className?: string; label?: string
}) {
  return (
    <section id={id} aria-label={label} className={cx(spacing === 'major' ? s.major : spacing === 'compact' ? s.compact : s.section, surface === 'white' && s.onWhite, surface === 'sunk' && s.onSunk,
      ruled === 'both' && s.ruled, ruled === 'top' && s.ruledTop, top && s.pageTop, className)}>
      {children}
    </section>
  )
}

export function Eyebrow({ children, center = false, className }: { children: ReactNode; center?: boolean; className?: string }) {
  return <span className={cx(s.eyebrow, center && s.eyebrowCenter, className)}>{children}</span>
}

export function Display({ children, size = 'm', as: Tag = 'h2', className, id }: { children: ReactNode; size?: 'xl' | 'l' | 'm' | 's'; as?: 'h1' | 'h2' | 'h3' | 'p'; className?: string; id?: string }) {
  return <Tag id={id} className={cx(size === 'xl' ? s.displayXl : size === 'l' ? s.displayL : size === 's' ? s.displayS : s.displayM, className)}>{children}</Tag>
}

export function Lede({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx(s.lede, className)}>{children}</p>
}

/** A link that reads as one of 1.0's two buttons — the accent (one per row) or the hairline ghost. */
export function ButtonLink({ href, children, variant = 'primary', icon, className, external = false, testId }: {
  href: string; children: ReactNode; variant?: 'primary' | 'ghost'; icon?: string; className?: string; external?: boolean; testId?: string
}) {
  const cls = cx(s.button, variant === 'primary' ? s.primary : s.ghost, className)
  const inner = <>{icon ? <Icon name={icon} size={16} /> : null}{children}</>
  if (external || /^(https?:|mailto:)/.test(href)) return <a href={href} className={cls} data-testid={testId} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{inner}</a>
  return <Link href={href} className={cls} data-testid={testId}>{inner}</Link>
}

/** 1.0's quiet "Explore →" link. */
export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  const inner = <>{children}<Icon name="arrow_forward" size={16} className={s.arrow} /></>
  if (/^(https?:|mailto:)/.test(href)) return <a href={href} className={cx(s.textLink, className)} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{inner}</a>
  return <Link href={href} className={cx(s.textLink, className)}>{inner}</Link>
}

export function Rule({ className }: { className?: string }) {
  return <hr className={cx(s.rule, className)} />
}

/** A clean window frame for a picture of the product (1.0's UISnapshot). */
export function Snapshot({ label, children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx(s.snapshot, className)}>
      <div className={s.snapshotBar} aria-hidden><span className={s.dot} /><span className={s.dot} /><span className={s.dot} />{label ? <span className={cx(s.label, s.snapshotLabel)}>{label}</span> : null}</div>
      <div className={s.snapshotBody}>{children}</div>
    </div>
  )
}

export function MarginChip({ tone, children }: { tone: 'good' | 'warn' | 'pending'; children: ReactNode }) {
  return <span className={cx(s.chip, tone === 'good' ? s.good : tone === 'warn' ? s.warn : s.pending)}>{children}</span>
}

/** 1.0's glass tile: a module's (or a security card's) hue behind its icon. */
export function Tile({ hue, icon, size = 'm', className }: { hue: string; icon: string; size?: 's' | 'm' | 'l' | 'xl'; className?: string }) {
  const px = size === 's' ? 16 : size === 'l' ? 22 : size === 'xl' ? 26 : 20
  return <span className={cx(s.tile, size === 's' ? s.tileS : size === 'l' ? s.tileL : size === 'xl' ? s.tileXl : s.tileM, className)} data-tile={hue} aria-hidden><Icon name={icon} size={px} /></span>
}

export function StatusTag({ children }: { children: ReactNode }) {
  return <span className={s.tag}>{children}</span>
}

/** 1.0's closing footnote ("Free to start · No card needed.") with 2.0's own door for a studio that would rather start on its own (S31). */
export function Footnote({ testId, line = FREE_LINE }: { testId: string; line?: string }) {
  return <p className={cx(s.fine, s.footnote)} data-testid={`${testId}-free`}>{line} <Link href={SIGN_UP} className={s.inlineLink} data-testid={`${testId}-start`}>Start your studio</Link></p>
}

export { cx }
