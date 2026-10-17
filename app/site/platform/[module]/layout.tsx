import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getModule } from '@/lib/site/platform'

/* (pending modules S41b-2) An address that is none of the eight modules is the site's own 404 — said here, above the page's streamed ghost
   (loading.tsx), as S36's tool pages do. `dynamicParams = false` answered it at the routing level only while the app's not-found page was
   static; the app-wide one (app/not-found.tsx) reads the address, so the check is the segment's own now. */
export default async function ModuleLayout({ children, params }: { children: ReactNode; params: Promise<{ module: string }> }) {
  if (!getModule((await params).module)) notFound()
  return children
}
