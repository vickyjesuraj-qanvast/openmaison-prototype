'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { setMemberPayNow } from '@/app/company/members-actions'
import { PAYNOW_MAX, PAYNOW_MSG, cleanPayNow, payNowShown } from '@/lib/finance/model'

/** Whose PayNow the dialog changes — a member's row on Company › Members, or the signed-in member on Your profile. */
export type PayNowOwner = { id: string; name: string; isYou: boolean; paynow: string | null }

/**
 * (simplify round 2 · F1 §6.9.3) A member's PayNow — what the studio pays their claims and commission to: Finance's pay dialogs show it with its
 * copy. Owners and Admins set anyone's, a member their own (`setMemberPayNow`'s rule, as a refusal). Blank takes it off; a saved change answers
 * with Undo; a refusal keeps the dialog open with what was typed.
 * (pending modules S14 — the steps' note after S01: "Accounting can't set their own PayNow") One dialog for its two doors: the member's row on
 * Company › Members and Your profile › Your PayNow (every member, Accounting too) — the same record, the same rule, the same words.
 */
export function PayNowDialog({ owner, onClose, onSaved }: { owner: PayNowOwner | null; onClose: () => void; /** the record changed (before → after) */ onSaved?: (paynow: string | null) => void }) {
  const router = useRouter()
  const snackbar = useSnackbar()
  const [draft, setDraft] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  /* each opening starts from the record (render-phase adjust, keyed on whose and what — a host may hand a fresh object every render) */
  const key = owner ? `${owner.id}|${owner.paynow ?? ''}` : null
  const [seen, setSeen] = useState<string | null>(null)
  if (key !== seen) { setSeen(key); if (owner) { setDraft(owner.paynow ? payNowShown(owner.paynow) : ''); setTried(false) } }
  const err = cleanPayNow(draft) === null ? PAYNOW_MSG : undefined
  const save = async () => {
    const m = owner
    if (!m || busy) return
    setTried(true)
    if (err) return
    setBusy(true)
    try {
      const r = await setMemberPayNow(m.id, { paynow: draft })
      if ('error' in r) { snackbar({ message: couldnt('save the PayNow', refusalOf(r.error)) }); return }   // the dialog stays with what was typed
      onClose()
      if (r.before === r.paynow) return
      onSaved?.(r.paynow)
      const whose = m.isYou ? 'Your' : `${m.name}’s`
      snackbar({ message: r.paynow ? `${whose} PayNow is saved` : `${whose} PayNow is taken off`, actionLabel: 'Undo', onAction: () => {
        void setMemberPayNow(m.id, { paynow: r.before ?? '' }).then((u) => { if ('error' in u) snackbar({ message: couldnt('put it back', refusalOf(u.error)) }); else { onSaved?.(r.before); router.refresh() } }, () => snackbar({ message: couldnt('put it back') }))
      } })
      router.refresh()
    } catch { snackbar({ message: 'Couldn’t save the PayNow — please try again' }) } finally { setBusy(false) }
  }
  return (
    <Dialog open={!!owner} onClose={onClose} title={owner?.isYou ? 'Your PayNow' : `${owner?.name ?? 'Their'}’s PayNow`} size="form" width={400}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={() => { void save() }} isDisabled={busy} data-testid="member-paynow-save">{busy ? 'Saving…' : 'Save'}</Button></>}>
      {owner ? (
        <TextField label="PayNow (UEN or mobile)" value={draft} maxLength={PAYNOW_MAX} autoFocus inputMode="text" onChange={setDraft} error={tried ? err : undefined}
                   onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void save() } }}
                   helper={`Finance shows it, with a copy button, when the studio pays ${owner.isYou ? 'you' : owner.name.split(' ')[0]} back for a claim or pays ${owner.isYou ? 'your' : 'their'} commission. Leave it blank to take it off.`} />
      ) : null}
    </Dialog>
  )
}
