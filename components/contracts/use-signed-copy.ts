'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { withFrom } from '@/lib/nav'
import { signedFileOf } from '@/lib/contracts/pdf'
import type { Contract } from '@/lib/db/schema'

/**
 * (pending modules S03) The Signed Copy cell's press, on every list: the kept signed copy opens in the file viewer (Files › Contract & VOs,
 * Back returns to the list); a contract signed with nothing attached opens Preview — the copy kept at signing, which prints.
 */
export function useOpenSignedCopy(from: string) {
  const router = useRouter()
  return useCallback((c: Contract) => {
    const fileId = signedFileOf(c)
    router.push(fileId ? withFrom(`/leads/${c.leadId}/files/${fileId}`, from) : withFrom(`/contracts/${c.id}/preview`, from))
  }, [router, from])
}
