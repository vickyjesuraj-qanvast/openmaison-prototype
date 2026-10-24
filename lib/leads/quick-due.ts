/**
 * (Leads on the move, L3 — P-05 · A-09, his marks 2026-10-23, "continue the leads") A task's due in one press, for the listing's Tasks sheet on a
 * phone and a touch tablet: "Call back tomorrow at 10" is the commonest task on the move. Pure — the presets and the day each one means, from
 * the clock the caller captured. *(invented copy: the three preset words — the brief's own: Tomorrow 10:00 · In 3 days · Next week · Pick a day.)*
 */
export type DuePreset = 'tomorrow' | 'in3' | 'nextWeek'
/** The hour a preset lands on — the studios' first calls of the day. */
export const PRESET_HOUR = 10
export const DUE_PRESETS: readonly { key: DuePreset; label: string }[] = [
  { key: 'tomorrow', label: 'Tomorrow 10:00 AM' },
  { key: 'in3', label: 'In 3 days' },
  { key: 'nextWeek', label: 'Next week' },
]

/** The moment a preset means: tomorrow · in three days · the coming Monday (a week ahead when today is Monday) — each at 10:00 AM. */
export function presetDue(key: DuePreset, now: number): Date {
  const d = new Date(now)
  const at = (days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, PRESET_HOUR, 0, 0, 0)
  if (key === 'tomorrow') return at(1)
  if (key === 'in3') return at(3)
  const toMonday = ((8 - d.getDay()) % 7) || 7
  return at(toMonday)
}
