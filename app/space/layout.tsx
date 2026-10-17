import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { CLIENT_PAGE_METADATA } from '@/lib/links/client-page'

/* (pending modules S41b-2) `/space/[token]` — a client's 3D layout link: no OpenMaison mark in the tab, no "install OpenMaison" */
export const metadata: Metadata = { ...CLIENT_PAGE_METADATA }

export default function SpaceLinkLayout({ children }: { children: ReactNode }) {
  return children
}
