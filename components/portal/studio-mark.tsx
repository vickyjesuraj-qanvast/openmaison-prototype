import type { CSSProperties } from 'react'
import type { PortalLook } from '@/lib/portal/queries'
import styles from './portal.module.css'

/** The brand's colour as the page's primary (Q-39) — the theme's computed value from the brand kit, set on the portal's root. */
export const brandStyle = (look: Pick<PortalLook, 'colour'>) => ({ '--brand': look.colour }) as CSSProperties

/** The studio's mark: its logo from the brand kit, else its initial on its colour (board 1's tile). Server-safe. */
export function StudioMark({ look, large = false }: { look: PortalLook; large?: boolean }) {
  return (
    <span className={large ? styles.markLarge : styles.mark} data-logo={look.logo ? '' : undefined} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {look.logo ? <img src={look.logo} alt="" /> : look.studio.charAt(0).toUpperCase()}
    </span>
  )
}
