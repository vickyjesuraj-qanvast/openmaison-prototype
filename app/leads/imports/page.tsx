import type { Metadata } from 'next'
import { fetchImports } from '@/lib/leads/queries'
import { ImportsView } from './imports-view'

export const metadata: Metadata = { title: 'Lead Import History' }
export const dynamic = 'force-dynamic'

export default async function ImportsPage() {
  const imports = await fetchImports()
  return <ImportsView imports={imports} />
}
