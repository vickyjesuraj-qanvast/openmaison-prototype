'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { setFlagPref, useFlagPref } from '@/lib/prefs'
import { ContractSkeleton } from './contract-skeleton'

/*
 * (S42 B-17 — the loader drew a written contract over a PDF one, a jump at the hand-off) The contract pages open in two shapes: a written
 * document (the formatting bar, the Outline, the paper) or a PDF (its file in the paper's place). The page's reveal knows which; the route's
 * loader streams before the page's data, so it asks what this browser was told — the page remembers its own shape on arrival, and the lists
 * that open it (Templates › Contracts, the Contracts lists) remember the PDF ones as they draw them (REG-817's remembered shape). A contract
 * this browser has never met draws the written shape, the common one. Key: `om.shape.contract-pdf.<id>` (Reset clears every `om.*` key).
 */
const keyOf = (id: string) => `om.shape.contract-pdf.${id}`
/** A PDF contract or standard PDF: remembered for its loader (a written one stores nothing — it is the default). */
export function rememberContractPdf(id: string, pdf: boolean) { if (pdf) setFlagPref(keyOf(id), true) }
/** The page, once it has shown its shape. */
export function useRememberContractPdf(id: string, pdf: boolean) { useEffect(() => { rememberContractPdf(id, pdf) }, [id, pdf]) }
/** The lists that open contracts: each PDF one they draw. */
export function useRememberContractPdfs(rows: { id: string; pdf: boolean }[]) {
  const ids = rows.filter((r) => r.pdf).map((r) => r.id).join(',')
  useEffect(() => { for (const id of ids ? ids.split(',') : []) rememberContractPdf(id, true) }, [ids])
}

/** The route's loader: the page's own ghost in the shape this browser remembers for the address's record. */
export function ContractRouteGhost({ kind = 'editor' }: { kind?: 'editor' | 'template' }) {
  const path = usePathname() ?? ''
  const id = /\/contracts\/([^/?#]+)/.exec(path)?.[1] ?? '_none'
  const [pdf] = useFlagPref(keyOf(id), false)
  return <ContractSkeleton kind={kind} pdf={pdf} />
}
