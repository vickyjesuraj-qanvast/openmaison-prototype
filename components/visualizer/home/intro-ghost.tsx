'use client'

import { useFlagPref } from '@/lib/prefs'
import { INTRO_PREF, VisualizerIntro } from './intro'

/** (verify round 1, F166) The route's ghost can't know the member's choice on the server, so the intro's bone asks the browser: on a soft
    navigation (Tools › AI Visualizer, a Back) the dismissed intro is never drawn; on a cold load the server's first frame keeps it. */
export function VisualizerIntroGhost({ hasDesigns }: { hasDesigns: boolean }) {
  const [hidden] = useFlagPref(INTRO_PREF, false)
  return hidden ? null : <VisualizerIntro ghost hasDesigns={hasDesigns} />
}
