'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@/components/om/confirm-dialog'
import { prototypeStudioCount, resetPrototype } from '@/app/leads/actions'

/**
 * Prototype-only: put everything back to the base state (user 2026-08-29) — leads, imports, tasks, settings and browser prefs — behind the house
 * confirm. (the Dashboard redesigned 2026-10-26, lane D4) Moved out of the sheet (components/leads/ai-sheet.tsx) word for word, so the docked
 * field — Maison AI on the Dashboard, where the floating button steps aside — offers the same reset with the same confirm: one copy, never two.
 * `open` says whether the confirm is up (the sheet stops closing on an outside press while it is).
 */
export function useResetPrototype(): { open: boolean; ask: () => void; dialog: React.ReactNode } {
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  /* (S42 audit A-17) the studios started here go with a reset — the confirmation names them when there are any */
  const [studios, setStudios] = useState(0)
  const ask = () => { setConfirmReset(true); void prototypeStudioCount().then(setStudios, () => setStudios(0)) }
  const doReset = async () => {
    setResetting(true)
    try {
      await resetPrototype()
      try { Object.keys(localStorage).filter((k) => k.startsWith('om.')).forEach((k) => localStorage.removeItem(k)) } catch {}
      /* (simplify S-13) Reports' remembered tab and Finance report live in two cookies — the base state forgets them too */
      try { for (const c of ['om_reports_tab', 'om_reports_finance']) document.cookie = `${c}=; path=/company/reports; max-age=0` } catch {}
      window.location.replace('/')   // (S42 audit A-04) the front door (the Dashboard; Finance for Accounting), as every other way in
    } catch { setResetting(false); setConfirmReset(false) }
  }
  const dialog = (
    <ConfirmDialog open={confirmReset} title="Reset the prototype?" tone="danger"
                   message={`Leads, imports, tasks and settings go back to the base state${studios ? ` — and the ${studios === 1 ? 'studio' : `${studios} studios`} started here ${studios === 1 ? 'is' : 'are'} removed` : ''}. Anything you tried in this session is lost.`}
                   confirmLabel={resetting ? 'Resetting…' : 'Reset'} onCancel={() => { if (!resetting) setConfirmReset(false) }} onConfirm={() => { if (!resetting) void doReset() }} />
  )
  return { open: confirmReset, ask, dialog }
}
