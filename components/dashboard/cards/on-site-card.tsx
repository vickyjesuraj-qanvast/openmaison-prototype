'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/om/icon'
import { Tooltip } from '@/components/om/tooltip'
import { useSheetLayout } from '@/components/om/sheet'
import { SITE_SHOWN, SITE_SHOWN_PHONE, siteGroups, type SiteData } from '@/lib/dashboard/cards'
import { plural } from '@/lib/projects/schedule-model'
import { CardFrame } from './card-frame'
import styles from './cards.module.css'

/**
 * (the Dashboard redesigned, 2026-10-26 — his mark P-09; lane D3) **On site** — "What happened on site?": the photos of the site updates
 * published this week (the last seven days) on the projects this member sees, newest first; a photo opens its update on the project's Updates
 * tab, with the way back. An update published with no photo still shows, as its words. Nothing published this week — the card is left out.
 *
 * (the calm pass, 2026-10-26 — the Claude Design option, brief-calm.md § 1; lane C3) **The week's photos, large**: one row at rest — three across
 * in the column (two on a phone), each a 4 : 3 picture —, an update's photos side by side under its one caption ("Kitchen cabinets are in ·
 * Benjamin Han · yesterday"). "All n photos" in the head shows the rest in place (there is no studio-wide page of them to open).
 */
export function OnSiteCard({ data }: { data: SiteData | null }) {
  const phone = useSheetLayout()
  const [all, setAll] = useState(false)
  if (!data?.photos.length) return null
  const cap = phone ? SITE_SHOWN_PHONE : SITE_SHOWN
  const tiles = all ? data.photos : data.photos.slice(0, cap)
  const more = data.photos.length > cap
  return (
    /* (the calm UI build 2026-10-27 — the audit's 1-35, T-17) the title says the card's own window — the photos of the last seven days (was "On
       site this week", over a photo from the week before) */
    <CardFrame card="site" title="Site photos from the last 7 days" testId="on-site"
               legend={more ? (
                 <button type="button" className={styles.textLink} onClick={() => setAll((a) => !a)} aria-expanded={all} data-testid="site-all">
                   {all ? 'Show fewer' : data.photos.every((p) => p.src) ? `All ${data.photos.length} photos` : 'Show all'}
                 </button>
               ) : null}>
      <div className={styles.photos} data-testid="site-photos" style={{ ['--site-cols' as string]: String(cap) }}>
        {siteGroups(tiles).map((g) => {
          const head = g.photos[0]!
          const extra = head.photos > g.photos.length && !all ? ` · ${plural(head.photos, 'photo')}` : ''
          return (
            <div key={`${g.update}:${head.key}`} className={styles.photoGroup} style={{ ['--span' as string]: String(Math.min(g.photos.length, cap)) }} data-testid="site-update">
              <div className={styles.photoRow}>
                {g.photos.map((p) => (
                  <Link key={p.key} href={p.href} className={styles.photo} data-testid="site-photo" data-words={!p.src || undefined} aria-label={`${p.alt} · ${p.when} — open the update`}>
                    {p.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.src} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span className={styles.photoWords}><Icon name="article" size={20} weight={300} /><span>{p.alt}</span></span>
                    )}
                  </Link>
                ))}
              </div>
              <Tooltip label={head.caption} whenCut>
                <p className={styles.photoCaption} data-testid="site-caption"><span className={styles.photoTitle}>{head.title}</span> · {head.where} · {head.when}{extra}</p>
              </Tooltip>
            </div>
          )
        })}
      </div>
    </CardFrame>
  )
}
