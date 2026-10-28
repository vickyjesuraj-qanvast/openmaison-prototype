'use client'

import { IconButton } from './icon-button'
import { Tooltip } from './tooltip'
import { useSnackbar } from './snackbar'

/**
 * InfoTip — an info glyph whose words are its tooltip and, on a press, the house snackbar (a finger has no hover, so the press is how a phone
 * reads it). (the calm UI build 2026-10-27 — 6-01 · 6-22 · W-125 · W-114, T-05 "explanations off the page") Where a page's records come from, or
 * a prototype's note, said once beside the page's title instead of a line under every list. Born as the Marketplace's `SourceInfo`; one house
 * piece for the Marketplace, Market Insights and Floorplan to 3D Isometric.
 */
export function InfoTip({ text, label, testId }: { text: string; label: string; testId?: string }) {
  const say = useSnackbar()
  return (
    <Tooltip label={text}>
      <IconButton icon="info" label={label} variant="bare" iconSize={24} iconWeight={300} onClick={() => say({ message: text, key: 'info-tip' })} data-testid={testId} />
    </Tooltip>
  )
}
