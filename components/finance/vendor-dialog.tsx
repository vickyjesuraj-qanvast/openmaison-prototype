'use client'

import { useState } from 'react'
import { Button, Switch } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { CODE_MAX, clampCrewCapacity } from '@/lib/projects/contractors-model'
import { EMAIL_RE, MSG } from '@/lib/forms'
import { isSgPhone, phoneDigits, phoneTyped } from '@/lib/format'
import { NAME_MAX, NOTE_MAX, type VendorRecord } from '@/lib/finance/model'
import type { VendorInput } from '@/app/finance/vendor-actions'
import money from '@/components/projects/money/money.module.css'
import own from '@/components/projects/money/invoice-dialogs.module.css'
import phone from '@/components/leads/lead-form.module.css'

/**
 * (gaps build F1 — F1-Q4) A vendor's details — added from Finance › Vendors or in place from a PO's or a bill's vendor picker (1.0's "an ID can
 * quick-add a vendor mid-PO"). The house Dialog (form size, a sheet on a phone), the house fields; the bank details only for whoever may see
 * them (Owners and Admins). The host saves and closes it once the save lands.
 */
export function VendorDialog({ open, initial, name: seed, onSite, trades, bank, busy, nested = false, onClose, onSave }: {
  open: boolean
  initial: VendorRecord | null
  /** a name typed in a picker (or read off a bill) to start from */ name?: string
  /** (S45B) a new vendor added as a contractor for this trade (the Assign dialog's "Add a contractor") */ onSite?: string
  trades: string[]
  bank: boolean
  busy: boolean
  nested?: boolean
  onClose: () => void
  onSave: (v: VendorInput) => void
}) {
  const fresh = () => ({
    name: initial?.name ?? seed ?? '', trade: initial?.trade ?? '', contactName: initial?.contactName ?? '', phone: initial?.phone ?? '', email: initial?.email ?? '', uen: initial?.uen ?? '',
    chargesGst: initial?.chargesGst ?? false, bankName: initial?.bank?.bankName ?? '', accountName: initial?.bank?.accountName ?? '', accountNo: initial?.bank?.accountNo ?? '', payNow: initial?.bank?.payNow ?? '',
    notes: initial?.notes ?? '',
    /* (S45B · H-UHD-2) works on site — a contractor the studio puts on its projects */
    crew: !!initial?.contractor || !!onSite, crewTrades: initial?.contractor?.trades ?? (onSite ? [onSite] : []), capacity: String(initial?.contractor?.capacity ?? 1), code: initial?.contractor?.code ?? '',
  })
  const [f, setF] = useState(fresh)
  const [tried, setTried] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) { setWasOpen(open); if (open) { setF(fresh()); setTried(false) } }
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))
  const phoneWhy = f.phone && !isSgPhone(f.phone) ? MSG.phone : undefined
  const emailWhy = f.email.trim() && !EMAIL_RE.test(f.email.trim()) ? MSG.email : undefined
  const nameWhy = !f.name.trim() ? 'Give the vendor a name' : undefined
  const crewWhy = f.crew && !f.crewTrades.length ? 'Pick the trades they do on site' : undefined
  const capWhy = f.crew && clampCrewCapacity(f.capacity) === null ? MSG.capacity : undefined
  const crewOptions = [...new Set([...trades, ...f.crewTrades.filter((t) => !trades.some((x) => x.toLowerCase() === t.toLowerCase()))])]
  const tradeOptions = [...new Set([...trades, ...(f.trade && !trades.includes(f.trade) ? [f.trade] : [])])]
  const save = () => {
    setTried(true)
    if (nameWhy || phoneWhy || emailWhy || crewWhy || capWhy) return
    onSave({ name: f.name, trade: f.trade || null, contactName: f.contactName, phone: f.phone, email: f.email, uen: f.uen, chargesGst: f.chargesGst, notes: f.notes,
      contractor: { on: f.crew, trades: f.crewTrades, capacity: clampCrewCapacity(f.capacity) ?? 1, code: f.code },
      ...(bank ? { bankName: f.bankName, accountName: f.accountName, accountNo: f.accountNo, payNow: f.payNow } : {}) })
  }
  return (
    <Dialog open={open} onClose={onClose} title={initial ? `Edit ${initial.name}` : 'New vendor'} size="form" width={600} nested={nested} closeOnScrim={false} portal={nested}
            subtitle={initial ? undefined : 'A sub-contractor or a supplier — the studio’s directory, for POs, bills and expenses.'}
            footer={<><Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button><Button onPress={save} isDisabled={busy} data-testid="vendor-save">{busy ? 'Saving…' : initial ? 'Save' : 'Add vendor'}</Button></>}>
      <div className={money.fields} data-testid="vendor-dialog">
        <TextField label="Name" value={f.name} onChange={(v) => set({ name: v })} maxLength={NAME_MAX} required autoFocus={!initial} error={tried ? nameWhy : undefined} helper="The company, as it bills you — “Woodcraft Carpentry Pte Ltd”" />
        <div className={money.pairs}>
          <TextField label="Trade" mode="select" options={tradeOptions} value={f.trade} onChange={(v) => set({ trade: v })} searchable helper="What they do — the studio’s trades" />
          <TextField label="Contact person" value={f.contactName} onChange={(v) => set({ contactName: v })} maxLength={120} />
        </div>
        <div className={money.pairs}>
          <TextField label="Mobile" value={phoneTyped(f.phone)} type="tel" inputMode="tel" numeric="digits" trailingIcon={null}
                     leading={<span className={phone.prefix}>+65<span className={phone.divider} /></span>}
                     onChange={(v) => set({ phone: phoneDigits(v).slice(0, 8) })} error={tried ? phoneWhy : undefined} helper="Purchase orders go to it on WhatsApp" />
          <TextField label="Email" type="email" value={f.email} onChange={(v) => set({ email: v })} maxLength={120} error={tried ? emailWhy : undefined} />
        </div>
        <div className={money.pairs}>
          <TextField label="UEN" value={f.uen} onChange={(v) => set({ uen: v.toUpperCase() })} maxLength={20} helper="Their company registration number" />
          <label className={own.switchRow} data-testid="vendor-gst"><Switch size="sm" isSelected={f.chargesGst} onChange={(v: boolean) => set({ chargesGst: v })} aria-label="Charges GST" /><span>Charges GST <span className={money.sub}>· GST-registered — their POs add GST</span></span></label>
        </div>
        {/* (S45B · H-UHD-2 — 1.0's contractor switch, migration 497) a vendor who works on site: the studio puts them on its projects' milestones
            (each project's Schedule) and the Workload view counts their sites */}
        <label className={own.switchRow} data-testid="vendor-contractor"><Switch size="sm" isSelected={f.crew} onChange={(v: boolean) => set({ crew: v, crewTrades: v && !f.crewTrades.length && f.trade ? [f.trade] : f.crewTrades })} aria-label="Works on site" /><span>Works on site <span className={money.sub}>· a contractor the studio puts on its projects</span></span></label>
        {f.crew ? (
          <>
            <div data-testid="vendor-crew-trades">
              <span className={money.fieldLabel}>Trades they do on site</span>
              <Chips multiple label="Trades they do on site" options={crewOptions} value={f.crewTrades} onChange={(v) => set({ crewTrades: v })} />
              {tried && crewWhy ? <span className={money.sub} data-tone="alert" role="alert">{crewWhy}</span> : null}
            </div>
            <div className={money.pairs}>
              <TextField label="Sites at once" value={f.capacity} numeric="digits" maxLength={2} onChange={(v) => set({ capacity: v })} error={tried ? capWhy : undefined} helper="How many projects they can run at the same time" inputProps={{ 'data-testid': 'vendor-capacity' } as never} />
              <TextField label="Code (optional)" value={f.code} maxLength={CODE_MAX} onChange={(v) => set({ code: v })} helper="The studio’s short name for them" inputProps={{ 'data-testid': 'vendor-code' } as never} />
            </div>
          </>
        ) : null}
        {bank ? (
          <>
            <span className={money.fieldLabel}>How the studio pays them</span>
            <div className={money.pairs}>
              <TextField label="Bank" value={f.bankName} onChange={(v) => set({ bankName: v })} maxLength={60} />
              <TextField label="Account name" value={f.accountName} onChange={(v) => set({ accountName: v })} maxLength={120} />
            </div>
            <div className={money.pairs}>
              <TextField label="Account number" value={f.accountNo} onChange={(v) => set({ accountNo: v })} maxLength={30} />
              <TextField label="PayNow" value={f.payNow} onChange={(v) => set({ payNow: v })} maxLength={30} helper="Their UEN or mobile number" />
            </div>
          </>
        ) : null}
        <TextField label="Notes (optional)" value={f.notes} onChange={(v) => set({ notes: v })} maxLength={NOTE_MAX} multiline={3} helper="For the team — who to call on site, what they are good at" />
      </div>
    </Dialog>
  )
}
