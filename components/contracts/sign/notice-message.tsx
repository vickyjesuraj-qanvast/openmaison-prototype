'use client'

import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'

/**
 * (Quotes on the move, K4 — A-23) The dead link's way to ask: "Message {studio}" opens WhatsApp on the press with the link's own address in the
 * draft, so the studio knows which link to replace. A client piece of the server-rendered notice (link-notice.tsx). *(invented copy)*
 */
export function NoticeMessage({ studio, phone }: { studio: string; phone: string }) {
  const digits = phone.replace(/\D/g, ''), to = digits.length === 8 ? `65${digits}` : digits
  const message = () => {
    const where = window.location.href
    const text = `Hi ${studio}, the link I have (${where}) says it is no longer active. Could you send me an updated one?`
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }
  if (!to) return null
  return <Button variant="secondary" appearance="outlined" iconStart={<Icon name="chat" size={20} />} onPress={message} data-testid="link-notice-message">Message {studio}</Button>
}
