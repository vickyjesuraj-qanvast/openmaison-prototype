/**
 * (REG-645, settings parity Q-01 · Q-02) Settings' modules — 1.0's Accounts groups as 2.0 names them: Studio · Lead management ·
 * Quotes & pricing, with Notifications beside them; Projects and Finance come with their modules. The open module is in the address
 * (`?section=`) and each tab of the strip is a link to it. Client-safe.
 */
/* (Dane UAT 2.14) The modules in the order a studio's work runs — leads, then projects, then quotes and pricing, then finance — with
   Notifications last; Projects and Finance keep their places as inert tabs until their modules come. One list drives the strip, the ghost
   and ⌘K's Go to. */
export const SETTINGS_MODULES = [
  { key: 'studio', label: 'Studio', live: true },
  { key: 'leads', label: 'Lead management', live: true },
  { key: 'projects', label: 'Projects', live: false },
  { key: 'quotes', label: 'Quotes & pricing', live: true },
  { key: 'finance', label: 'Finance', live: false },
  { key: 'notifications', label: 'Notifications', live: true },
] as const
export type SettingsModule = 'studio' | 'leads' | 'quotes' | 'notifications'
export const settingsHref = (key: string) => `/settings?section=${key}`
/** The module a `?section=` opens; Studio when none (1.0's Accounts opened on its Studio group). */
export const parseSettingsModule = (v: string | undefined): SettingsModule => (v === 'leads' || v === 'quotes' || v === 'notifications' ? v : 'studio')
