/**
 * Canonical vocabulary — extracted VERBATIM from the Figma mocks.
 * Sources:   "Filter - all sources"        (781:54190)
 * Property:  "Filter - all property types" (781:53980)
 * Stages:    stage dropdown (780:86452) + Move Stage wizard rail
 * Team:      "Filter - all assignees"      (781:54363)
 * Do NOT add values here that do not exist in the mocks (data rule, build plan §0P).
 */

export const STAGES = ['New', 'Contacted', 'Met', 'Quote Sent', 'Won'] as const
export const INACTIVE_STAGES = ['On Hold', 'Lost'] as const
export const ALL_STAGES = [...STAGES, ...INACTIVE_STAGES] as const
export type Stage = (typeof ALL_STAGES)[number]

export const SOURCES = [
  'Qanvast', 'Instagram', 'Referral', 'Walk-in', 'Facebook', 'Organic',
  'Hangout', 'Website', 'Email', 'Google Ads', 'Meta Ads', 'Others',
] as const
export type LeadSource = (typeof SOURCES)[number]

export const PROPERTY_TYPE_GROUPS: ReadonlyArray<readonly string[]> = [
  ['HDB 2-Room', 'HDB 3-Room', 'HDB 4-Room', 'HDB 5-Room', 'HDB Executive'],
  ['BTO 2-Room', 'BTO 3-Room', 'BTO 4-Room', 'BTO 5-Room'],
  ['Executive Condo', 'Condo Studio / 1-bedder', 'Condo 2-bedder', 'Condo 3-bedder',
   'Condo 4-bedder', 'Condo 5-bedder', 'Penthouse'],
  ['Landed — Terrace', 'Landed — Semi-D', 'Landed — Bungalow'],
  ['Commercial — Office', 'Commercial — Retail'],
  ['Others'],
]
export const PROPERTY_TYPES = PROPERTY_TYPE_GROUPS.flat()
export type PropertyType = string

/** Canonical team — "Filter - all assignees" after the designer's dedupe. */
export const TEAM = [
  { id: 'dane',     name: 'Dane',     role: 'Owner',    color: '#5B7FD7', isYou: true },
  { id: 'james',    name: 'James',    role: 'Designer', color: 'photo' },
  { id: 'sarah',    name: 'Sarah',    role: 'Designer', color: '#3E9B63' },
  { id: 'michelle', name: 'Michelle', role: 'Designer', color: '#E8A33D' },
  { id: 'germaine', name: 'Germaine', role: 'Designer', color: '#B07B2E' },
  { id: 'alex',     name: 'Alex',     role: 'Designer', color: '#2F3B8F' },
] as const

/** Contact channels — Move Stage "Contacted via" chips (781:58292). */
export const CONTACT_CHANNELS = ['WhatsApp', 'Email', 'SMS', 'Call', 'Others'] as const
/** Contact-log outcomes and the next step each one asks for (Move stage window 780:9xxxx · Notes 931:45231 "Connected → Schedule a meeting", 931:45383 "Callback requested"). */
export const OUTCOMES = ['Connected', 'Callback requested', 'Meeting scheduled', 'No response'] as const
export const NEXT_STEP_BY_OUTCOME: Record<string, string> = { Connected: 'Schedule a meeting', 'Callback requested': 'Schedule a call' }
/** "Preferred mode" options — the channels plus "In person" (Notes 931:45231). */
export const CONTACT_MODES = [...CONTACT_CHANNELS, 'In person'] as const

/** Only style/condition/key-collection values visible anywhere in the mocks. */
export const STYLES_SEEN = ['Contemporary'] as const
export const CONDITIONS_SEEN = ['New'] as const
export const KEY_COLLECTION_SEEN = ['Collected'] as const
