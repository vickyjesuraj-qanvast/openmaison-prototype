'use client'

import { useState } from 'react'
import { Chips } from '@/components/om/chips'
import { useSnackbar } from '@/components/om/snackbar'
import { HelpLink } from '@/components/company/help-link'
import { LINK_DAY_CHOICES, type ContractRules } from '@/lib/contracts/link'
import { setContractRules } from './actions'
import styles from './settings.module.css'

/**
 * (pending modules S03 — the Contracts list's "Contracts Settings", pointed here as the card recommends) Settings › Quotes & pricing ›
 * Contracts: how long a signing link stays open after each send or reminder — 1.0's seven days by default. A choice saves at once and puts
 * itself back when the server refuses (the house rule); read-only for a member who doesn't run the studio.
 */
export function ContractsSettingsCard({ rules, readOnly }: { rules: ContractRules; readOnly: boolean }) {
  const snackbar = useSnackbar()
  const [days, setDays] = useState(rules.linkDays)
  const choose = async (v: string) => {
    const next = Number(v)
    if (!next || next === days) return
    const prev = days
    setDays(next)
    try {
      const r = await setContractRules({ linkDays: next })
      if ('error' in r) { setDays(prev); snackbar({ message: `Couldn’t save the setting — ${r.error.charAt(0).toLowerCase()}${r.error.slice(1)}` }); return }
      snackbar({ message: `Signing links now stay open for ${r.linkDays} days after each send` })
    } catch { setDays(prev); snackbar({ message: 'Couldn’t save the setting — please try again' }) }
  }
  return (
    <div className={styles.setting} id="contracts" data-testid="settings-contracts">
      <div className={styles.settingHead}>
        <span className={styles.settingTitle}>Contracts · signing links</span>
        <span className={styles.settingHelp}>How long a contract’s signing link stays open after you send it or send a reminder. Past that, the client sees that the link has expired and you send it again. Links already out keep the day they were given. Contract templates and standard PDFs are in <HelpLink href="/company/templates/contracts">Company › Templates › Contracts</HelpLink>.</span>
      </div>
      <Chips label="Signing links stay open for" options={LINK_DAY_CHOICES.map((d) => ({ value: String(d), label: `${d} days` }))} value={String(days)} onChange={(v) => { void choose(v) }} disabled={readOnly} testId="contract-link-days" />
    </div>
  )
}
