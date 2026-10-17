'use client'

import { useState, type ReactNode } from 'react'
import { useSnackbar } from '@/components/om/snackbar'
import { LeadFormModal, type LeadFormData, type LeadFormOpen } from '@/components/leads/lead-form'
import { addTrialLead } from '@/app/site/try/tools-actions'
import { DEFAULT_LEAD_SOURCE_NAMES } from '@/lib/settings/types'
import { TRIAL_WORDS, type TrialLead } from '@/lib/trial/policy'

/**
 * (pending modules S41b-3) The studio's Create New Lead form for a visitor — one opener for every trial page that adds a lead (Leads, and
 * Upload a quote's "Add the client"): the form in its trial mode, the lead kept in the visitor's workspace by the server, the three-lead
 * limit said by 1.0's gate. The form stays open until the save lands (the house rule); a refusal of the form's own rules shows in its fields.
 */
export function useAddTrialLead({ onAdded, onGate }: { onAdded: (lead: TrialLead) => void | Promise<void>; onGate: (text: string) => void }): { open: () => void; modal: ReactNode } {
  const snack = useSnackbar()
  const [form, setForm] = useState<LeadFormOpen | null>(null)
  const submit = async (_mode: 'create' | 'edit', data: LeadFormData): Promise<boolean> => {
    const { assignees: _team, ...rest } = data
    void _team
    try {
      const r = await addTrialLead({ data: rest, botToken: null })
      if ('errors' in r) return false   // the form says the same thing in its fields (one rule, lib/leads/lead-input.ts)
      if ('error' in r) { if (r.reason === 'limit') { setForm(null); onGate(r.error) } else snack({ message: r.error }); return false }
      setForm(null)
      await onAdded(r.lead)
      return true
    } catch { snack({ message: TRIAL_WORDS.couldnt('add the lead') }); return false }
  }
  return {
    open: () => setForm({ mode: 'create' }),
    modal: <LeadFormModal form={form} team={[]} trial sources={DEFAULT_LEAD_SOURCE_NAMES} onClose={() => setForm(null)} onSubmit={submit} />,
  }
}
