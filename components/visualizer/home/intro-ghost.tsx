'use client'

import { VisualizerIntro } from './intro'

/** (verify round 1, F166) The route's ghost of the landing's intro. (the calm UI build 2026-10-27, 6-10) The intro is one line now, with
    nothing to dismiss, so the ghost always draws it — the page always shows it above a gallery in use. */
export function VisualizerIntroGhost() {
  return <VisualizerIntro ghost />
}
