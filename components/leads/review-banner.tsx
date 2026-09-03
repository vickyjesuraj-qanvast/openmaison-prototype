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
  /* (REG-302) The banner owns `--bottom-dock`, the offset every bottom-docked overlay (FAB, snackbar, bulk bars,
     AI sheet, upload toast) lifts by while it shows. It used to be a constant 56 = the desktop banner's 50 + 6,
     which put the FAB INTO the banner at mobile, where the title and the duplicates tag wrap onto two lines. The
     banner's real height, measured and re-measured as it wraps, keeps the 50 → 56 desktop number to the pixel. */
  const banner = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const el = banner.current
    if (!el) return
    const root = document.documentElement.style
    const write = () => root.setProperty('--bottom-dock', `${Math.round(el.offsetHeight) + 6}px`)
    write()
    const ro = new ResizeObserver(write)
    ro.observe(el)
    return () => { ro.disconnect(); root.removeProperty('--bottom-dock') }
  }, [])
  return (
    <>
    {/* Canvas strip under the floating banner — a sibling behind it so the banner's shadow stays visible. */}
    <span className={styles.strip} data-stuck={stuck || undefined} aria-hidden />
    <motion.button ref={banner} type="button" className={styles.banner} data-stuck={stuck || undefined} variants={snackbarRise} initial="initial" animate="animate" exit="exit"
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
