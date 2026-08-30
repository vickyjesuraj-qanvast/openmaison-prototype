import styles from './avatar.module.css'

/**
 * Member avatar — colored-initial rounded square, from "Filter - all
 * assignees" (781:54363). `color: 'photo'` renders the committed photo asset.
 * R2 in the register: replaces the mocks' grey placeholder silhouettes with
 * real member identities everywhere.
 * Sizes: 20 (Avatar Generic 20 r4, 14/Medium initial — Lead Details info column, LEAD RETURNED, task rows),
 * 24 (listing), 36 (task assignees / comments, r4, 14/Medium), 40 (assign popover / Move stage New).
 */
export function Avatar({
  name,
  color,
  size = 24,
}: {
  name: string
  color: string
  size?: 20 | 24 | 36 | 40
}) {
  if (color === 'photo') {
    return (
      <span className={styles.avatar} data-size={size} aria-hidden title={name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.photo} src="/figma-assets/avatar-user.png" alt="" />
      </span>
    )
  }
  return (
    <span className={styles.avatar} data-size={size} style={{ background: color }} aria-hidden title={name}>
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
