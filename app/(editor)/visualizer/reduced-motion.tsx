'use client'

import type { ReactNode } from 'react'
import { MotionConfig } from 'motion/react'

/** (audit 2026-09-26, F172) The editor's motion follows the viewer's reduced-motion setting (the globals.css contract): the crossfades,
    the tray, the progress card and the banners keep only their opacity. */
export function ReducedMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
