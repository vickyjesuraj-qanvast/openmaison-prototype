'use client'

import { useSnackbar } from '@/components/om/snackbar'
import { isSgPhone, phoneDigits } from '@/lib/format'

/**
 * (UX audit 2026-09-30, T9) Sharing a lead's file with the client — the tile menu, the list row's menu and the viewer's kebab: Copy link, or
 * Send on WhatsApp with a short draft to the lead's number (the AI Visualizer share dialog's rule: the number when it is a Singapore one, else
 * WhatsApp asks who). The link is the file's signed read-only address (`FileRow.share`, lib/leads/file-share.ts) — it opens without
 * signing in. WhatsApp opens on the press itself: a popup blocker eats a window opened after a round trip (REG-534).
 * Copy (invented): "Link to “X” copied" · "Link to “X” is in WhatsApp" · the draft "Hi Olivia, here’s “X”: <link>" signed with the sender.
 */
export function useFileShare({ lead, sender }: { lead: { name: string; phone: string | null }; sender: string }) {
  const snackbar = useSnackbar()
  const urlOf = (path: string) => `${window.location.origin}${path}`
  const copyLink = (f: { name: string; share: string | null }) => {
    if (!f.share) { snackbar({ message: 'Couldn’t make the link — this file can’t be shared' }); return }
    const write = navigator.clipboard ? navigator.clipboard.writeText(urlOf(f.share)) : Promise.reject(new Error('no clipboard'))
    write.then(() => snackbar({ message: `Link to “${f.name}” copied` }), () => snackbar({ message: 'Couldn’t copy the link — please try again' }))
  }
  const sendWhatsApp = (f: { name: string; share: string | null }) => {
    if (!f.share) { snackbar({ message: 'Couldn’t make the link — this file can’t be shared' }); return }
    const first = lead.name.split(' ')[0] || 'there'
    const text = `Hi ${first}, here’s “${f.name}”: ${urlOf(f.share)}\n\n${sender}`
    const digits = phoneDigits(lead.phone).slice(-8)
    window.open(`https://wa.me/${isSgPhone(digits) ? `65${digits}` : ''}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
    snackbar({ message: `Link to “${f.name}” is in WhatsApp` })
  }
  return { copyLink, sendWhatsApp }
}
