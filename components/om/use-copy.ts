'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSnackbar } from '@/components/om/snackbar'
import { copyText } from '@/lib/clipboard'

/** How long the button reads "Copied" before returning to its label. */
const COPIED_MS = 2000

type CopyState = { key: unknown; copied: boolean; run: number }

/**
 * Copy-to-clipboard for a button that confirms in place (REG-283, user 2026-09-01: "Portal link and Ask client
 * copy cta should change to Copied after copy cta clicked"). The snackbar still fires — it is the app's answer
 * for every action — but the button now answers too, where the eye already is.
 *
 * One hook rather than the same state written into both dialogs: the Ask-the-client and Invite-to-Portal boxes
 * copy the same link with the same two outcomes, and the audit's standing lesson is that a rule implemented
 * twice drifts (REG-280).
 *
 * `copied` returns to false after COPIED_MS, and on failure it never goes true — the error snackbar is the
 * whole answer, and a button reading "Copied" over a failed copy would be a lie.
 *
 * `resetOn` is the host dialog's own `open` flag. Both hosts stay MOUNTED while closed, so without it a copy
 * made just before closing left the button reading "Copied" when the dialog was opened again. The reset is a
 * render-phase adjust keyed on that value — the house pattern, since `setState` in an effect body is refused
 * by the project's lint rules and would also paint the stale label for one frame first.
 *
 * Each copy carries a `run` number and its timer only clears the confirmation it started. That is what keeps
 * the render-phase adjust free of the timer ref: refs may not be read during render (react-hooks/refs), so a
 * superseded timer is allowed to fire and simply finds a newer run and does nothing.
 */
export function useCopy(
  text: string,
  { resetOn, done = 'Link copied', failed = 'Couldn’t copy the link — please try again' }: {
    resetOn?: unknown
    done?: string
    failed?: string
  } = {},
) {
  const snackbar = useSnackbar()
  const [state, setState] = useState<CopyState>({ key: resetOn, copied: false, run: 0 })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Render-phase adjust: the host opened or closed, so any confirmation on screen is stale.
  if (state.key !== resetOn) setState({ key: resetOn, copied: false, run: state.run })

  // The host can unmount with a timer pending — clear it rather than leave it running.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  /* (sweep S3) `copy` answers whether it worked — a caller that keeps a record of the copy (X-Ray's send) keeps it only then — and a
     browser with no clipboard gets the failure line, never silence. (REG-897) A page without the Clipboard API (plain http on a LAN
     address) copies the old way inside the same press (lib/clipboard.ts). */
  const copy = useCallback((): Promise<boolean> => {
    return copyText(text).then(
      () => {
        snackbar({ message: done })
        setState((s) => {
          const run = s.run + 1
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(
            () => setState((cur) => (cur.run === run ? { ...cur, copied: false } : cur)),
            COPIED_MS,
          )
          return { key: resetOn, copied: true, run }
        })
        return true
      },
      () => { snackbar({ message: failed }); return false },
    )
  }, [text, snackbar, done, failed, resetOn])

  return { copied: state.key === resetOn && state.copied, copy }
}
