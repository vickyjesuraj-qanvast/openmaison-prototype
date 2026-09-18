'use client'

import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { Tooltip } from '@/components/om/tooltip'
import type { OutlineItem } from '@/lib/contracts/tokens'
import styles from './contract-editor.module.css'

/** The Outline pane (the reference's left panel): the document's headings, indented by level; a press scrolls to it. */
export function OutlinePane({ items, onPick, onClose }: { items: OutlineItem[]; onPick: (index: number) => void; onClose: () => void }) {
  return (
    <aside className={styles.outline} aria-label="Outline" data-testid="contract-outline">
      <div className={styles.outlineHead}>
        <Icon name="list" size={20} />
        <span className={styles.outlineTitle}>Outline</span>
        <Tooltip label="Hide outline"><IconButton icon="close" label="Hide outline" size={24} variant="bare" onClick={onClose} /></Tooltip>
      </div>
      {items.length === 0 ? (
        <p className={styles.outlineEmpty}>Headings you add appear here.</p>
      ) : (
        <ul className={styles.outlineList}>
          {items.map((it) => (
            <li key={it.index}>
              <button type="button" className={styles.outlineItem} data-level={it.level} onClick={() => onPick(it.index)} title={it.text}>{it.text}</button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
