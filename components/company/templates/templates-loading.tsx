'use client'

import { usePathname } from 'next/navigation'
import { TemplateLibraryGhost } from '@/components/company/company-ghosts'
import { CompanyGhostFrame } from '@/components/company/company-ghost-frame'
import { ProLockedGhost, useLockedNow } from '@/components/credits/pro-locked-ghost'
import { TEMPLATE_KINDS } from '@/lib/company/sections'

/** (REG-708) Templates' galleries' ghost — and (pending modules S19) the Quotes tab's lock while the studio is on Free. */
export function TemplatesLoading() {
  const quotes = (usePathname() ?? '').startsWith('/company/templates/quotes')
  const locked = useLockedNow('template_editor')
  if (quotes && locked) return <CompanyGhostFrame title={100} tabs={TEMPLATE_KINDS.map((k) => k.label)} active={TEMPLATE_KINDS.findIndex((k) => k.key === 'quotes')} label="Loading templates"><ProLockedGhost feature="template_editor" /></CompanyGhostFrame>
  return <TemplateLibraryGhost />
}
