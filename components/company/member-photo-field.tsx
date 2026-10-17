'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ds'
import { Avatar } from '@/components/om/avatar'
import { Icon } from '@/components/om/icon'
import { readFileAsDataUrl } from '@/lib/templates/files'
import { ABOUT_PHOTO_DATA_MAX } from '@/lib/portal/about-model'
import { lookUnder, photoIdOf, memberPhotoHref } from '@/lib/company/member-photo'
import styles from './member-photo-field.module.css'

/** What a photo field holds: `undefined` keeps the photo as it is · `null` takes it off · a data URL is a new one (the browser shrank it). */
export type PhotoDraft = string | null | undefined

/** The picture a member's photo field shows now — the draft's, else their own photo (the demo's portrait is no photo of theirs: their
    avatar shows it, with Add a photo). */
export function photoShown(member: { color: string; portalPhotoId?: string | null }, draft: PhotoDraft): string | null {
  if (draft !== undefined) return draft
  const own = photoIdOf(member.color) ?? member.portalPhotoId ?? null
  return own ? memberPhotoHref(own) : null
}

/**
 * (pending modules S01) A member's photo, picked — one piece for Your profile, Company › Members › Edit details and Members › About page (gaps
 * build H's row, moved here unchanged): the photo or the tinted initial, Add a photo / Change the photo, Take it off. The browser shrinks the
 * picture (800, JPEG, as the About page's portraits); a file that isn't a picture, or still too big, is refused under the row with the rule.
 */
export function MemberPhotoField({ member, draft, onChange, testId, locked }: {
  member: { name: string; color: string; portalPhotoId?: string | null }
  draft: PhotoDraft
  onChange: (next: PhotoDraft) => void
  /** the hidden file input's test id */
  testId?: string
  /** why this photo isn't the viewer's to change (an Owner's, for an Admin) — said in place of the presses */
  locked?: string | null
}) {
  const input = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const current = photoShown(member, draft)
  const pick = async (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/') || f.type === 'image/svg+xml') { setProblem(PHOTO_PROBLEM); return }
    const url = await readFileAsDataUrl(f, 800, { jpeg: true }).catch(() => null)
    if (!url || !/^data:image\/(jpeg|png|webp);base64,/.test(url) || url.length > ABOUT_PHOTO_DATA_MAX) { setProblem(PHOTO_PROBLEM); return }
    setProblem(null)
    onChange(url)
  }
  return (
    <div className={styles.field}>
      <div className={styles.photoRow}>
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.portrait} src={current} alt="" data-testid="member-photo-shown" />
        ) : <Avatar name={member.name || '?'} color={lookUnder(member.color)} size={40} tooltip={false} />}
        {locked ? <span className={styles.locked} data-testid="member-photo-locked">{locked}</span> : <>
        <Button variant="secondary" appearance="outlined" iconStart={<Icon name="add_photo_alternate" size={20} />} onPress={() => input.current?.click()}>{current ? 'Change the photo' : 'Add a photo'}</Button>
        {current ? <Button appearance="text" onPress={() => { setProblem(null); onChange(null) }}>Take it off</Button> : null}
        <input ref={input} className={styles.fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { void pick(e.target.files); e.target.value = '' }} data-testid={testId} />
        </>}
      </div>
      {problem ? <p className={styles.problem} role="alert">{problem}</p> : null}
    </div>
  )
}
/** The rule a picked file broke — the server's own words (lib/company/member-photo-store.ts). */
const PHOTO_PROBLEM = 'That photo didn’t read — pick a JPG or PNG under 2 MB'
