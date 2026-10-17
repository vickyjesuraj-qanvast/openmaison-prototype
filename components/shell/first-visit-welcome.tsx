'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ds'
import { Dialog, DialogMessage } from '@/components/om/dialog'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { withFrom } from '@/lib/nav'
import type { Welcome } from '@/lib/studio-setup/model'
import { markWelcomed } from '@/app/welcome-actions'

/* who has closed theirs in this tab — a layout the router kept from before the close never opens it twice (the record decides on a reload) */
const closed = new Set<string>()

/**
 * (pending modules S08 — 1.0's welcome-modal.tsx) A member's first visit: one short welcome, on the house Dialog (400, a centred card on a
 * phone too), with one filled button — an Owner's or an Admin's "Set up your studio" while the studio's list is open, a member's "See my
 * leads", Accounting's "Open Finance" — and Not now. Never a tour over the page (guided tours are step S32's). However it closes, the visit
 * is recorded (`markWelcomed`), so it shows once per member; the app shell mounts it only while the member is owed one.
 */
export function FirstVisitWelcome({ welcome, memberId }: { welcome: Welcome; memberId: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const snackbar = useSnackbar()
  const [open, setOpen] = useState(() => !closed.has(memberId))
  const [busy, setBusy] = useState(false)
  const [address, hash] = welcome.action.href.split('#')
  const current = search ? `${pathname}?${search}` : pathname
  /* already where the button goes — the leads, Finance, Settings › Studio: it only closes */
  const here = current === address || (!address?.includes('?') && pathname === address)

  /* the dialog closes once its record lands; a record that fails still lets the member in, and says the welcome may come back */
  const finish = async (go: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      const r = await markWelcomed()
      if ('error' in r) snackbar({ message: couldnt('note your first visit', refusalOf(r.error)) })
    } catch (e) { snackbar({ message: couldnt('note your first visit', refusalOf(e)) }) }
    closed.add(memberId)
    setOpen(false); setBusy(false)
    if (go && !here && address) router.push(`${withFrom(address, current)}${hash ? `#${hash}` : ''}`)   // Back returns here
  }

  return (
    <Dialog open={open} onClose={() => { void finish(false) }} title={welcome.title} width={400} closeOnScrim={false}
            footer={<>
              <Button variant="secondary" appearance="outlined" isDisabled={busy} onPress={() => { void finish(false) }} data-testid="welcome-later">Not now</Button>
              <Button isDisabled={busy} onPress={() => { void finish(true) }} data-testid="welcome-go">{welcome.action.label}</Button>
            </>}>
      <div data-testid="first-visit-welcome"><DialogMessage>{welcome.body}</DialogMessage></div>
    </Dialog>
  )
}
