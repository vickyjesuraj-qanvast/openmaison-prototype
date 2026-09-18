import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { templateKind } from '@/lib/company/sections'
import { TemplateKindSoon } from '@/components/company/templates/template-kind-soon'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params
  return { title: templateKind(kind)?.title ?? 'Templates' }
}

/** Company › Templates › {Tasks · T&Cs · Payments · Contracts}: their own pages, coming in a later build (REG-484). */
export default async function TemplateKindPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params
  const k = templateKind(kind)
  if (!k || k.key === 'quotes') notFound()
  return <TemplateKindSoon kind={k} />
}
