'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Icon } from '@/components/om/icon'
import { snackbarRise } from '@/lib/motion'
import styles from './review-banner.module.css'

/** Bottom banner shown while imported leads await review (779:26186). The whole banner is the button. */
export function ReviewBanner({ count, duplicates, onOpen }: { count: number; duplicates: number; onOpen: () => void }) {
  // Stuck detection: a 1px sentinel sits right after the banner in the body's flow; while it is
  // below the viewport the banner is floating (canvas beneath it), otherwise it rests in the body.
  const sentinel = useRef<HTMLSpanElement>(null)
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setStuck(!e?.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <>
    {/* Canvas strip under the floating banner — a sibling behind it so the banner's shadow stays visible. */}
    <span className={styles.strip} data-stuck={stuck || undefined} aria-hidden />
    <motion.button type="button" className={styles.banner} data-stuck={stuck || undefined} variants={snackbarRise} initial="initial" animate="animate" exit="exit"
                   onClick={onOpen} aria-label={`Review imported leads (${count})${duplicates > 0 ? `, ${duplicates} duplicate${duplicates === 1 ? '' : 's'}` : ''}`}>
      <span className={styles.lead}>
        <span className={styles.title}>Review imported leads ({count})</span>
        {duplicates > 0 ? <span className={styles.tag}>{duplicates} Duplicate{duplicates === 1 ? '' : 's'}</span> : null}
      </span>
      <span className={styles.spacer} />
      <span className={styles.open} aria-hidden>
        <Icon name="keyboard_arrow_up" size={24} />
      </span>
    </motion.button>
    <span ref={sentinel} className={styles.sentinel} aria-hidden />
    </>
  )
}
