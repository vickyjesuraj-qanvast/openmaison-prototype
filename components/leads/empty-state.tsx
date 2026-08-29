'use client'

import { motion } from 'motion/react'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import styles from './empty-state.module.css'

/** "No leads yet" — copy and layout verbatim from frame 116 (780:94126). */
export function LeadsEmptyState({
  onImport,
  onCreate,
}: {
  onImport: () => void
  onCreate: () => void
}) {
  return (
    <div className={styles.card}>
      <motion.div className={styles.stack} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.15 } }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.illo} src="/figma-assets/empty-add-leads.svg" alt="" />
        <div className={styles.text}>
          <p className={styles.title}>Add your first lead</p>
          <p className={styles.sub}>Manually add or import leads from other sources.</p>
        </div>
        <div className={styles.ctas}>
          <Button variant="secondary" appearance="outlined" iconStart={<Icon name="upload_file" size={20} />} onPress={onImport}>
            Import from File
          </Button>
          <Button iconStart={<Icon name="add" size={20} />} onPress={onCreate}>
            Create New Lead
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
