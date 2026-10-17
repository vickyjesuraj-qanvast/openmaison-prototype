'use client'

import { usePathname } from 'next/navigation'
import { isTrialTool } from '@/lib/visualizer/trial/policy'
import { TrialGhost } from './trial-ghost'

/**
 * (S42E, E-13 — REG-708) A tool page's loader knows its tool from the address (as the lead's tab ghost does, detail-tab-skeleton.tsx), so the
 * ghost draws that page — the sketch page's one sample sketch, not three rooms. An address it can't read keeps the generic tool ghost.
 */
export function TrialToolGhost() {
  const tool = usePathname().split('/').filter(Boolean).at(-1)
  return <TrialGhost tool={isTrialTool(tool) ? tool : true} />
}
