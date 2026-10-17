import { Tooltip } from './tooltip'
import { avatarSrc } from '@/lib/company/member-photo'
import styles from './avatar.module.css'

/**
 * Member avatar — colored-initial rounded square, from "Filter - all
 * assignees" (781:54363). `color: 'photo'` renders the committed photo asset.
 * R2 in the register: replaces the mocks' grey placeholder silhouettes with
 * real member identities everywhere.
 * Sizes: 20 (Avatar Generic 20 r4, 14/Medium initial — Lead Details info column, LEAD RETURNED, task rows),
 * 24 (listing), 36 (task assignees / comments, r4, 14/Medium), 40 (assign popover / Move stage New).
 *
 * (REG-329, user 2026-09-04) An avatar that stands alone — a member stack in a table, a card or the task panel —
 * names its member in the DS tooltip on hover and carries the name for assistive tech (`role="img"`). Where the
 * name is printed beside it (pickers, filter lists, creator / owner cells, the info column) the caller passes
 * `tooltip={false}` and the avatar stays decorative. The native `title` it used to carry is gone: the browser's
 * own bubble is neither the DS's nor its timing.
 * (pending modules S01) A member's own photo — set in Your profile, or by an Owner or an Admin on Company › Members — rides in the same
 * `color` (`photo:<pictureId>|<look under it>`, lib/company/member-photo.ts), so every avatar here shows it.
 */
export function Avatar({
  name,
  color,
  size = 24,
  tooltip = true,
}: {
  name: string
  color: string
  size?: 20 | 24 | 36 | 40
  /** False where the name is already printed beside the avatar. */
  tooltip?: boolean
}) {
  const a11y = tooltip ? { role: 'img' as const, 'aria-label': name } : { 'aria-hidden': true as const }
  const src = avatarSrc(color)
  const avatar = src ? (
    <span className={styles.avatar} data-size={size} {...a11y}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.photo} src={src} alt="" />
    </span>
  ) : (
    <span className={styles.avatar} data-size={size} style={{ background: color }} {...a11y}>
      {name.charAt(0).toUpperCase()}
    </span>
  )
  return tooltip ? <Tooltip label={name}>{avatar}</Tooltip> : avatar
}
