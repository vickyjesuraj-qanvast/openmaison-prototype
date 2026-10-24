'use client'

import { createContext, useContext } from 'react'

/**
 * (Leads on the move, P-04 — his marks 2026-10-23, "continue the leads") True inside the Move stage window drawn ONE STEP PER SCREEN — a phone
 * and a tablet held upright (components/leads/log/use-move-layout.ts). The steps' panels read it to draw their on-the-move shape: a member row
 * that is its own label (B-02), a completed log as a summary card with Edit (B-09), the log's fields as the log sheet's (P-03), Won as a
 * checklist (B-11 · B-12), Take a photo for a signed quote (Q-03). False on the desk and a tablet held sideways — the window as it was.
 */
export const MoveScreen = createContext(false)
export const useMoveScreen = () => useContext(MoveScreen)

/** (Leads on the move, B-15) The stage moves share one snackbar key, so the newest move's words — and its Undo — replace the last one's. */
export const STAGE_MOVE_KEY = 'stage-move'
