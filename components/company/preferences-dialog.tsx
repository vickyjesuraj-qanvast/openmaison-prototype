'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { DIMENSIONS, DONT_CARE, PRIORITIES, parsePreferences, preferenceCount, type Dimension, type LeadPreferences, type Priority } from '@/lib/company/preferences'
import styles from './preferences-dialog.module.css'

/** (W-514) the priority select reads lightest first: Any · Nice to have · Must match (the stored keys are unchanged) */
const PRIORITY_ORDER = ['nice', 'must'].map((k) => PRIORITIES.find((x) => x.key === k)!.label)

/**
 * (REG-612, parity Q-27 · C-37) Lead preferences — 1.0's editor on the DS: four dimensions, each a priority (Don't care · Nice to have ·
 * Must match) and the values it applies to, plus the specialty line the suggestion matches words against. 1.0's words, 2.0's pieces.
 */
export function PreferencesDialog({ open, member, onClose, onSave }: {
  open: boolean
  member: { id: string; name: string; leadPreferences: string | null; specialty: string | null } | null
  onClose: () => void
  onSave: (prefs: LeadPreferences, specialty: string) => Promise<void> | void
}) {
  const [prefs, setPrefs] = useState<LeadPreferences>({})
  const [specialty, setSpecialty] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {   // every opening starts from the member's saved preferences
    setWasOpen(open)
    if (open && member) { setPrefs(parsePreferences(member.leadPreferences)); setSpecialty(member.specialty ?? '') }
  }
  const setPriority = (key: Dimension, label: string) => {
    const p = PRIORITIES.find((x) => x.label === label)?.key
    setPrefs((prev) => { const n = { ...prev }; if (!p) delete n[key]; else n[key] = { values: prev[key]?.values ?? [], priority: p }; return n })
  }
  const setValues = (key: Dimension, values: string[]) => setPrefs((prev) => ({ ...prev, [key]: { ...(prev[key] ?? { values: [], priority: 'nice' as Priority }), values } }))
  const configured = preferenceCount(prefs)
  return (
    <Dialog open={open} onClose={onClose} title={member ? `${member.name}’s lead preferences` : 'Lead preferences'} width={600} size="modal"
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={() => { setPrefs({}); setSpecialty('') }}>Clear</Button>
              <Button onPress={() => { void onSave(prefs, specialty) }}>Save preferences</Button>
            </>}>
      {/* (the calm UI build 2026-10-27 — 5-31 · W-357) one line about the member, not "you"; Any says what a row left alone means */}
      <p className={styles.help}>{`What kind of leads suit ${member?.name.split(' ')[0] ?? 'them'}? Leave a row on Any if it doesn’t matter.`}</p>
      <TextField label="Specialty" value={specialty} onChange={setSpecialty} maxLength={120} trailingIcon={null} helper="A few words the suggestion matches — “HDB & BTO homes”, “Condo & landed, luxury finishes”." />
      {DIMENSIONS.map((d) => {
        const p = prefs[d.key]
        const priorityLabel = p ? PRIORITIES.find((x) => x.key === p.priority)!.label : DONT_CARE
        return (
          <div key={d.key} className={styles.dim} data-testid={`pref-${d.key}`}>
            <div className={styles.dimHead}>
              <span className={styles.dimTitle}>{d.label}</span>
              <div className={styles.priority}><TextField label="Priority" mode="select" size="s" options={[DONT_CARE, ...PRIORITY_ORDER]} value={priorityLabel} onChange={(v) => setPriority(d.key, v)} /></div>
            </div>
            {p ? (
              <Chips multiple label={d.label} options={d.options.map((o) => ({ value: o, label: d.labelOf(o) }))} value={p.values} onChange={(values) => setValues(d.key, values)} />
            ) : null}   {/* (W-407) a row on Any says itself — the four repeated hints went */}
          </div>
        )
      })}
      {/* (W-072) the visible count went; it stays for a screen reader, which hears it as the rows change */}
      <span className={styles.srOnly} role="status" data-testid="pref-count">{`${configured} of ${DIMENSIONS.length} set`}</span>
    </Dialog>
  )
}
