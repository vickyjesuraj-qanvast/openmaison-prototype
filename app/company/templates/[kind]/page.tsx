import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { templateKind } from '@/lib/company/sections'
import { TemplateKindSoon } from '@/components/company/templates/template-kind-soon'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params
  return { title: templateKind(kind)?.title ?? 'Templates' }
}

/** Company › Templates › {Tasks · T&Cs · Payments}: their own pages, coming in a later build (REG-484). Quotes and Contracts are live. */
export default async function TemplateKindPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  const k = templateKind(kind)
  if (!k || k.live) notFound()   // the live kinds have their own pages (quotes/, contracts/)
  return <TemplateKindSoon kind={k} />
}
