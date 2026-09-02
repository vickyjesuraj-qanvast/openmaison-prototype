'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * The window events the Overview's Create quick links raise on the tab they already stand on, and the tabs listen for.
 * BOTH ends read this map now (REG-286): overview.tsx used to `dispatchEvent` bare string literals, so a rename here
 * would silently disconnect the two halves. `questionnaire: 'om:questionnaire:add'` went with it — the Add Question
 * quick link was removed in REG-246, so nothing raised it and nothing listened for it.
 * `contracts` / `files` have live listeners waiting on a quick link that does not exist yet (see their tabs).
 */
export const CREATE_EVENTS = {
  tasks: 'om:tasks:add',
  quotes: 'om:quotes:new',
  contracts: 'om:contracts:new',
  notes: 'om:notes:new',
  files: 'om:files:upload',
} as const

/**
 * "Create" intent for a Lead Details tab (audit 2026-08-30, DUP-05): the `?new=` landing param (consumed once, then
 * `router.replace(href)` drops it) and the tab's window event both end in one `onIntent`. The handler is read through a
 * ref so the effects need no stale-closure disables. `landing` omitted = event only (Tasks, Files).
 */
export function useCreateIntent<V extends string = '1'>({ event, landing, onIntent }: {
  event: string
  landing?: { href: string; param?: string; values?: readonly V[] }
  /** `value` = the accepted landing param; `detail` = the window event's `CustomEvent.detail` (undefined on a landing). */
  onIntent: (value: V | undefined, detail?: unknown) => void
}) {
  const router = useRouter()
  const params = useSearchParams()
  const raw = landing ? params.get(landing.param ?? 'new') : null
  const accepted: readonly string[] = landing?.values ?? ['1']
  const value = raw !== null && accepted.includes(raw) ? (raw as V) : undefined
  const href = landing?.href

  const handler = useRef(onIntent)
  useEffect(() => { handler.current = onIntent })
  const landed = useRef(false)
  useEffect(() => {
    if (value === undefined || !href || landed.current) return
    landed.current = true
    router.replace(href)
    handler.current(value)
  }, [value, href, router])
  useEffect(() => {
    const onEvent = (e: Event) => handler.current(undefined, (e as CustomEvent<unknown>).detail)
    window.addEventListener(event, onEvent)
    return () => window.removeEventListener(event, onEvent)
  }, [event])
}
