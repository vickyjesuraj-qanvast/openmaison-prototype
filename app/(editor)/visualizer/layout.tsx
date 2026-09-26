import type { ReactNode } from 'react'
import { ReducedMotion } from './reduced-motion'

/** The AI Visualizer's editor inside the `(editor)` group — the group's snackbar host and surface, with reduced motion honoured (F172). */
export default function VisualizerEditorLayout({ children }: { children: ReactNode }) {
  return <ReducedMotion>{children}</ReducedMotion>
}
