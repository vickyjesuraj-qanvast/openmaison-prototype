import { SettingsGhost } from './settings-ghost'

/** (REG-708) Settings' ghost: the open module's own head and cards (`?section=`, read as the page reads it) — the one the page's PageReveal draws. */
export default function Loading() {
  return <SettingsGhost />
}
