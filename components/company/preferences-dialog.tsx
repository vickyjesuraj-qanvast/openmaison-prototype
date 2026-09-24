'use client'

import { useState } from 'react'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { TextField } from '@/components/om/text-field'
import { Chips } from '@/components/om/chips'
import { DIMENSIONS, DONT_CARE, PRIORITIES, parsePreferences, preferenceCount, type Dimension, type LeadPreferences, type Priority } from '@/lib/company/preferences'
import styles from './preferences-dialog.module.css'

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
    <Dialog open={open} onClose={onClose} title={`Lead preferences${member ? ` · ${member.name}` : ''}`} width={600} size="modal"
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={() => { setPrefs({}); setSpecialty('') }}>Clear</Button>
              <Button onPress={() => { void onSave(prefs, specialty) }}>Save preferences</Button>
            </>}>
      <p className={styles.help}>Select the types of leads you prefer for each category, then set how important each one is. <b>Must match</b> means you strongly prefer those leads. <b>Nice to have</b> gives a soft boost. Leave a category as <b>Don’t care</b> to skip it. This is optional — if not set, every factor counts equally.</p>
      <TextField label="Specialty" value={specialty} onChange={setSpecialty} maxLength={120} trailingIcon={null} helper="A few words the suggestion matches — “HDB & BTO homes”, “Condo & landed, luxury finishes”." />
      {DIMENSIONS.map((d) => {
        const p = prefs[d.key]
        const priorityLabel = p ? PRIORITIES.find((x) => x.key === p.priority)!.label : DONT_CARE
        return (
          <div key={d.key} className={styles.dim} data-testid={`pref-${d.key}`}>
            <div className={styles.dimHead}>
              <span className={styles.dimTitle}>{d.label}</span>
              <div className={styles.priority}><TextField label="Priority" mode="select" size="s" options={[DONT_CARE, ...PRIORITIES.map((x) => x.label)]} value={priorityLabel} onChange={(v) => setPriority(d.key, v)} /></div>
            </div>
            {p ? (
              <Chips multiple label={d.label} options={d.options.map((o) => ({ value: o, label: d.labelOf(o) }))} value={p.values} onChange={(values) => setValues(d.key, values)} />
            ) : <span className={styles.hint}>This category won’t affect lead matching. Select a priority to configure.</span>}
          </div>
        )
      })}
      <span className={styles.count} data-testid="pref-count">{configured} of {DIMENSIONS.length} categories configured</span>
    </Dialog>
  )
}
