'use client'

import { Button, Switch } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { fileSizeLabel } from '@/lib/templates/files'
import type { SourceFile } from '@/lib/templates/recreate'
import styles from './reference-pane.module.css'

/**
 * Reference (REG-491): the quote the template is being rebuilt from, beside the canvas — a PDF in its own viewer, a photo or
 * scan as a picture that can also lie under the first page at a chosen strength, to line the blocks up against it.
 */
export function ReferencePane({ file, underlay, onUnderlay, opacity, onOpacity, onDetach }: { file: SourceFile; underlay: boolean; onUnderlay: (v: boolean) => void; opacity: number; onOpacity: (v: number) => void; onDetach: () => void }) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  const isImage = !!file.data && file.type.startsWith('image/')
  return (
    <div className={styles.pane}>
      <div className={styles.head}>
        <Icon name={isPdf ? 'picture_as_pdf' : 'image'} size={20} weight={300} />
        <span className={styles.name}>{file.name}</span>
        <span className={styles.size}>{file.size ? fileSizeLabel(file.size) : ''}</span>
      </div>
      <div className={styles.viewer}>
        {file.data ? (
          isPdf ? <iframe className={styles.frame} src={`${file.data}#toolbar=0&view=FitH`} title={file.name} /> : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img className={styles.img} src={file.data} alt={file.name} />
          )
        ) : (
          <div className={styles.none}><Icon name="draft" size={32} weight={300} />The file was too large to keep. The match still applies.</div>
        )}
      </div>
      <div className={styles.foot}>
        {isImage ? (
          <>
            <label className={styles.row}><span>Lay it under the first page</span><Switch size="sm" isSelected={underlay} onChange={(v: boolean) => onUnderlay(v)} aria-label="Lay the reference under the first page" /></label>
            {underlay ? <label className={styles.row}><span>Strength</span><input type="range" min={10} max={80} value={Math.round(opacity * 100)} onChange={(e) => onOpacity(Number(e.target.value) / 100)} aria-label="Underlay strength" /></label> : null}
          </>
        ) : <span className={styles.hint}>Scroll the reference beside the canvas; a photo or scan can also lie under the first page.</span>}
        <span className={styles.detach}><Button appearance="text" onPress={onDetach}>Remove reference</Button></span>
      </div>
    </div>
  )
}
