'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { MSG } from '@/lib/forms'
import { SG_MOBILE_MSG, digitsOnly, isSgMobile, phoneTyped } from '@/lib/format'
import styles from './household.module.css'

const RELATIONSHIP_MAX = 40

/**
 * (Projects round 9 — Q-42; board 8 "Add someone else from the household") A form dialog (s 400): their name, their mobile number — an
 * 8-digit Singapore mobile, grouped as typed (fix-G, G-05: 8 or 9 first — the portal's code goes by SMS, which a landline never takes) — and
 * how they are related, if the studio wants to say (G-44: its count as typed, up to 40). One press adds them and opens WhatsApp with their own
 * link — only once the add has landed (G-06). Errors show after the first press and clear as they are fixed; the dialog closes only once the
 * add lands.
 */
export function HouseholdDialog({ open, client, taken, onClose, onAdd, prefill = null }: {
  open: boolean
  /** (pending modules S05 — testers' L-4) the lead's second client, offered from Client access: the form opens with them, "Co-owner" */
  prefill?: { name: string; phone: string; relationship: string } | null
  /** The client's first name — "Someone else from Benjamin’s household". */
  client: string
  /** Numbers that already open this home (the client's own, the household's) — refused here before the press. */
  taken: { phone: string; who: string }[]
  onClose: () => void
  /** Adds them (and opens WhatsApp); answers the server's refusal, or null once added (or handed to a question). */
  onAdd: (v: { name: string; phone: string; relationship: string }) => Promise<string | null>
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [relationship, setRelationship] = useState('')
  const [tried, setTried] = useState(false)
  const [server, setServer] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setName(prefill?.name ?? ''); setPhone(prefill?.phone ?? ''); setRelationship(prefill?.relationship ?? ''); setTried(false); setServer(null) } }
  const clash = taken.find((t) => t.phone === phone)
  const nameError = !name.trim() ? MSG.required : null
  const phoneError = !phone ? MSG.required : !isSgMobile(phone) ? SG_MOBILE_MSG : clash ? `That number already opens this home — it’s ${clash.who}’s` : null
  const add = async () => {
    setTried(true)
    if (nameError || phoneError || busy) return
    setBusy(true)
    try { setServer(await onAdd({ name: name.trim(), phone, relationship: relationship.trim() })) }
    catch { setServer('Couldn’t add them — please try again') } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onClose={onClose} title="Add someone else from the household" width={400} size="form" closeOnScrim={false} nested
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <Button onPress={add} isDisabled={busy} data-testid="household-add">Add and send the link</Button>
            </>}>
      <form className={styles.form} onSubmit={(e) => { e.preventDefault(); void add() }} noValidate data-testid="household-dialog">
        <p className={styles.lede}>{`They sign in with their own number and see what ${client} sees. What they do is recorded under their own name.`}</p>
        <TextField label="Their name" value={name} onChange={(v) => { setName(v); setServer(null) }} autoFocus autoComplete="off" required error={tried ? nameError ?? undefined : undefined} />
        <TextField label="Their mobile number" value={phoneTyped(phone)} onChange={(v) => { setPhone(digitsOnly(v).slice(0, 8)); setServer(null) }} type="tel" inputMode="tel" numeric="digits" autoComplete="off" required
                   error={(tried ? phoneError : null) ?? server ?? undefined} helper="They sign in with this number — a code comes to it by SMS." />
        <TextField label="How they’re related (optional)" value={relationship} onChange={(v) => setRelationship(v.slice(0, RELATIONSHIP_MAX))} maxLength={RELATIONSHIP_MAX} autoComplete="off"
                   helper={`Wife, son, co-owner… — ${relationship.length} of ${RELATIONSHIP_MAX}`} />
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  )
}
