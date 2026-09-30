'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { createContractDoc } from '@/app/contracts/actions'
import { fetchContractTemplateOptionsAction } from '@/app/contracts/read-actions'
import { ContractTemplatePicker } from '@/components/contracts/contract-template-picker'
import { useRun } from '@/components/leads/tasks/use-run'

/**
 * (REG-534 → REG-538; UX audit C6 — the quote side) "Create contract from this quote": the contract template picker, then the contract
 * reads this quote and opens in its editor — the quote editor's kebab, its Send ▾ › Send for signature, and the Quotes rows' own menu,
 * all through this one piece. `from` is where the contract's close comes back to.
 */
export function useContractFromQuote(from: string) {
  const router = useRouter()
  const { run } = useRun()
  const [quote, setQuote] = useState<{ id: string; leadId: string; number: string } | null>(null)
  const create = (templateId?: string) => {
    const q = quote
    setQuote(null)
    if (!q) return
    void run('create the contract', async () => {
      const id = await createContractDoc({ leadId: q.leadId, fromQuoteId: q.id, ...(templateId ? { templateId } : {}) })
      router.push(withFrom(`/contracts/${id}`, from))
    }, `Contract created from ${q.number}`)
  }
  return {
    open: (q: { id: string; leadId: string; number: string }) => setQuote(q),
    dialog: <ContractTemplatePicker open={!!quote} onClose={() => setQuote(null)} load={fetchContractTemplateOptionsAction} onUse={(t) => create(t)} onStarter={() => create()} />,
  }
}
