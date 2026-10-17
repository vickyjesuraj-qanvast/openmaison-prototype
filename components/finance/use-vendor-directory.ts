'use client'

import { useCallback, useEffect, useState } from 'react'
import { vendorDirectory } from '@/app/finance/read-actions'
import { createVendor } from '@/app/finance/vendor-actions'
import { byVendorName, vendorNameOf, type VendorName } from '@/lib/finance/model'

/**
 * (one-home N-16) Company › Finance › Vendors as a picker reads it: the directory, loaded once `on` (null until it arrives — a failed load is
 * an empty list, so the field still takes a name as typed), and `add`: a new name into the directory — F1-Q4, anyone adds a vendor — answered
 * with the vendor, or the server's rule as `{ error }` (the caller keeps the name as typed).
 */
export function useVendorDirectory(on: boolean) {
  const [list, setList] = useState<VendorName[] | null>(null)
  useEffect(() => {
    if (!on) return
    let live = true
    vendorDirectory().then((l) => { if (live) setList(l) }, () => { if (live) setList((x) => x ?? []) })
    return () => { live = false }
  }, [on])
  const add = useCallback(async (name: string): Promise<{ vendor: VendorName } | { error: string }> => {
    const r = await createVendor({ name })
    if ('error' in r) return { error: r.error }
    const v = vendorNameOf(r.vendor)
    setList((l) => [...(l ?? []).filter((x) => x.id !== v.id), v].sort(byVendorName))
    return { vendor: v }
  }, [])
  return { list, add }
}
