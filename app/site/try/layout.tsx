import type { ReactNode } from 'react'

/* (pending modules S36 · S41b-3) The trial's home on the website: the AI Visualizer's pages (/site/try, its six tool pages) and — beside them —
   the no-account tools (Leads, Upload a quote, Quote X-Ray). Each family is switched on and off on its own (1.0 shipped them on their own:
   TRIAL_VISUALIZER_ENABLED for the Visualizer, the gated platform's anonymous workspace for the three), so each says its own real 404 in its own
   layout, above its pages' streamed ghosts: (home)/layout.tsx · [tool]/layout.tsx · leads · upload-a-quote · quote-x-ray. */
export default function TryLayout({ children }: { children: ReactNode }) {
  return children
}
