'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { MSG } from '@/lib/forms'
import { SLUG_MAX, cleanSlug, portalPath, slugProblem } from '@/lib/portal/model'
import styles from './portal-setup.module.css'

/** What the box keeps as it is typed: lower case, letters, numbers and single hyphens (a hyphen may end it while typing; Save trims it). */
const typed = (raw: string) => raw.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+/, '').slice(0, SLUG_MAX)

/**
 * (Projects r4a, Q-44) Change the portal's address — a form dialog (s 400): the address after the portal's path, cleaned as typed. Reserved
 * words and an address in use are refused (the server's answer reads under the field); the old address stays and leads to the new one, so
 * every link already sent keeps working. Closes only once the change lands.
 */
export function AddressDialog({ open, slug, host, oldSlugs, onClose, onSave }: {
  open: boolean
  slug: string
  host: string
  oldSlugs: string[]
  onClose: () => void
  /** Answers the refusal's words, or null when it saved. */
  onSave: (slug: string) => Promise<string | null>
}) {
  const [value, setValue] = useState(slug)
  const [error, setError] = useState<string | null>(null)
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setValue(slug); setError(null); setTried(false) } }
  const next = cleanSlug(value)
  const local = !next ? MSG.required : slugProblem(next, { taken: false })
  const save = async () => {
    setTried(true)
    if (local || busy) return
    setBusy(true)
    try { setError(await onSave(next)) } catch { setError('Couldn’t change the address — please try again') } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onClose={onClose} title="Change the address" width={400} size="form" closeOnScrim={false}
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose}>Cancel</Button>
              <Button onPress={save} isDisabled={busy} data-testid="address-save">Save</Button>
            </>}>
      {/* (fix-G, G-35) a form, so Enter saves as every form dialog does */}
      <form className={styles.field} onSubmit={(e) => { e.preventDefault(); void save() }} noValidate data-testid="address-form">
        <TextField label="Address" value={value} onChange={(v) => { setValue(typed(v)); setError(null) }} autoFocus
                   leading={<span className={styles.prefix}>{`${host}/my/`}</span>}
                   error={(tried ? local : null) ?? error ?? undefined}
                   helper="Letters, numbers and hyphens. Your clients sign in here." />
        <p className={styles.old}>{`The current address, ${portalPath(slug)}, keeps working — it leads to the new one.${oldSlugs.length ? ` So do the earlier ones.` : ''}`}</p>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Dialog>
  )
}
