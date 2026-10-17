import type { Metadata } from 'next'
import { SiteNotFound } from '@/components/site/company-pages'

/* (pending modules S35 — 1.0's (marketing)/not-found.tsx) An unknown site address — an old article, a module that isn't one — inside the site's own
   frame, never the app's. */
export const metadata: Metadata = { title: { absolute: 'Page not found — OpenMaison' }, robots: { index: false } }
export default function NotFound() {
  return <SiteNotFound />
}
