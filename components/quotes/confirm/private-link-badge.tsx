import { Icon } from '@/components/om/icon'
import styles from './private-link-badge.module.css'

/**
 * (The calm UI build 2026-10-27, the UI audit's 4-09 · W-028) One badge on every client page — /confirm, /quote/<token>, /sign/<token>, the
 * bundle: a lock and "Private link". It was three: PRIVATE LINK (green), SECURE SIGNING (green), VIEW ONLY (grey). A client meets these pages
 * one after another from WhatsApp; one word tells them it is the same studio and the same document.
 */
export function PrivateLinkBadge() {
  return (
    <span className={styles.badge} data-testid="private-link-badge">
      <span className={styles.icon} aria-hidden><Icon name="lock" size={16} weight={400} /></span>
      Private link
    </span>
  )
}
