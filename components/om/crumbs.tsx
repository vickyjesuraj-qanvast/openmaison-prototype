import Link from 'next/link'
import styles from './crumbs.module.css'

export type CrumbItem = { label: string; href?: string }

/**
 * Breadcrumbs (REG-536, owner 2026-09-18: "make the breadcrumbs clickable across"): every segment with an `href` is a link,
 * separated by " / ". The caller passes its own crumb class for the type and colour (the editors' 12/400 secondary); a
 * link keeps that colour at rest and goes primary + underlined on hover, so the line still reads as a crumb.
 */
export function Crumbs({ items, className, trailingSlash }: { items: CrumbItem[]; className?: string; /** the L2 header's "{crumb} / " shape */ trailingSlash?: boolean }) {
  return (
    <nav className={`${styles.nav} ${className ?? ''}`} aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={`${it.label}-${i}`} className={styles.item}>
          {i > 0 ? <span className={styles.sep} aria-hidden> / </span> : null}
          {it.href ? <Link href={it.href} className={styles.link}>{it.label}</Link> : <span>{it.label}</span>}
        </span>
      ))}
      {trailingSlash ? <span className={styles.sep} aria-hidden> / </span> : null}
    </nav>
  )
}
