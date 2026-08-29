'use client'

import { createContext, useContext, type ReactNode } from 'react'

/**
 * Read-only scope (user 2026-08-29: a completed stage opens read-only until Edit).
 * Field primitives read the context to render the DS disabled state; the fieldset
 * disables every remaining native control (tabs, radios, tiles, inputs) for free.
 */
const ReadOnlyContext = createContext(false)
export const useReadOnly = () => useContext(ReadOnlyContext)

export function ReadOnlyScope({ readOnly, children }: { readOnly: boolean; children: ReactNode }) {
  return (
    <ReadOnlyContext.Provider value={readOnly}>
      <fieldset disabled={readOnly} style={{ display: 'contents', border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        {children}
      </fieldset>
    </ReadOnlyContext.Provider>
  )
}
