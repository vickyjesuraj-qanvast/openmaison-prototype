'use client'

import { Tooltip } from '@/components/om/tooltip'
import styles from './maison-fab.module.css'

/**
 * Maison AI floating button — 48px, bottom-right 24px, glow per mock asset.
 * A4 (approved): opens the scripted suggestion sheet; the sheet itself ships
 * with M1 (its content depends on the listing context). Until then the press
 * animates but takes no action — replaced within this same milestone train.
 */
export function MaisonFab({ onPress, raised = false }: { onPress?: () => void; raised?: boolean }) {
  return (
    <div className={styles.wrap} data-raised={raised || undefined}>
      <Tooltip label="Maison AI" side="left">
        <button type="button" className={styles.button} aria-label="Maison AI" onClick={onPress}>
          <span className={styles.glyph}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/figma-assets/maison-ai-fab.svg" alt="" />
          </span>
        </button>
      </Tooltip>
    </div>
  )
}
