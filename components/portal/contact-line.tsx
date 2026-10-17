'use client'

import { waLink } from '@/lib/portal/model'
import type { PortalData } from '@/lib/portal/home'
import styles from './portal.module.css'

/**
 * (Q-43; fix-F, F-13) "A question? Message Germaine on WhatsApp" — the line every portal page closes with: the client's designer when the
 * team has a mobile, else the studio when its own number is a mobile ("Message Demo Studio on WhatsApp"). A landline takes no WhatsApp
 * message, so with no mobile anywhere the line is not drawn (never a link that opens a chat with an office phone).
 */
export function ContactLine({ data, ask, about, className }: { data: Pick<PortalData, 'contact' | 'visitor'>; ask: string; about?: string; className?: string }) {
  const c = data.contact
  if (!c.phone || !c.label) return null
  return (
    <p className={className ?? styles.contact} data-slot="contact" data-testid="portal-contact">
      {ask}{' '}
      <a className={styles.link} href={waLink(c.phone, `Hi${c.name ? ` ${c.name}` : ''}, it’s ${data.visitor.name}${about ? `, ${about}` : ''}. `)} target="_blank" rel="noreferrer">{c.label}</a>
    </p>
  )
}
