import { useSyncExternalStore } from 'react'
import type { DocEditorHandle } from '../editor/doc-editor'

/**
 * (contracts on the move 2026-10-22, P-04) The one paper on the page, for the pieces that place a field without a prop from their host —
 * today's editor opens the eSignatures panel by its own state and hands it only `onInsert(html)` (at the caret), which is the thing a finger
 * must not do. The editor registers its handle on mount and publishes its HTML on every change; a host that holds the paper itself (a section
 * screen with no editor mounted) passes `html` and `onPlace` instead and this is never read. One paper per page. The house store pattern
 * (lib/maison-ai.ts): module state, listeners, `useSyncExternalStore` with the desktop's empty snapshot on the server.
 */
export type LiveDoc = { api: DocEditorHandle; html: string }
let live: LiveDoc | null = null
const listeners = new Set<() => void>()
const tell = () => { listeners.forEach((cb) => cb()) }
export function registerLiveDoc(api: DocEditorHandle | null, html = '') { live = api ? { api, html } : null; tell() }
export function liveDocChanged(html: string) { if (live && live.html !== html) { live = { api: live.api, html }; tell() } }
/** The mounted paper's handle, or null. */
export const liveDoc = (): DocEditorHandle | null => live?.api ?? null
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb) } }
const snapshot = () => live
const server = () => null
/** The mounted paper's HTML as it changes, or null when no paper is on the page. */
export function useLiveDocHtml(): string | null {
  return useSyncExternalStore(subscribe, snapshot, server)?.html ?? null
}
