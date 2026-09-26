import { Icon } from '@/components/om/icon'
import styles from './visualizer-home.module.css'

/** A design's cover (1.0's mosaic, A B-15): one photo fills; two sit side by side; three lead with the first; four make a grid. */
export function DesignCover({ covers, name }: { covers: string[]; name: string }) {
  if (!covers.length) return <span className={styles.cover} data-empty=""><Icon name="add_photo_alternate" size={32} weight={300} /><span>No photo yet</span></span>
  return (
    <span className={styles.cover} data-n={Math.min(4, covers.length)}>
      {covers.slice(0, 4).map((c, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={`${c}-${i}`} src={c} alt={i === 0 ? name : ''} loading="lazy" decoding="async" />
      ))}
    </span>
  )
}
