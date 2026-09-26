'use client'

import type { ReactNode } from 'react'
import { MotionConfig } from 'motion/react'

/**
 * (audit 2026-09-26, F172) Every motion-driven surface follows the viewer's reduced-motion setting, as globals.css asks of the shell:
 * with it on, transforms and layout moves drop and only opacity eases; with it off nothing changes. Mounted once, in the root layout.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
