'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { waLink } from '@/lib/portal/model'
import { withFrom } from '@/lib/nav'
import { askWay, brandMessage, dealMessage, type DealAsk, type DealView, type MarketViewer, type VendorLink } from '@/lib/marketplace/model'
import { addBrandToVendors, askForDeal } from '@/app/marketplace/actions'

/** Finance › Vendors, opened on this vendor, with the way back (REG-465). */
export const vendorHref = (v: VendorLink, here: string) => withFrom(`/company/finance/vendors?open=${encodeURIComponent(v.id)}`, here)

/**
 * (pending modules S24) The Marketplace's presses, shared by the page and a brand's page: WhatsApp a brand (wa.me opens on the press with the
 * studio's line drafted — nothing recorded, as 1.0), Add to my vendors (Finance › Vendors, one home; the snackbar opens it) and Get deal
 * (the brand's page, WhatsApp or email opens on the press, before the record lands; the deal then says who asked). A refusal says the rule.
 */
export function useMarket({ viewer, studioName, here }: { viewer: MarketViewer; studioName: string; here: string }) {
  const snackbar = useSnackbar()
  const router = useRouter()
  const [adding, setAdding] = useState<string | null>(null)
  const whatsapp = (b: { name: string; whatsapp: string | null }) => {
    if (!b.whatsapp) return
    window.open(waLink(b.whatsapp, brandMessage(b.name, viewer.name, studioName)), '_blank', 'noopener')
    snackbar({ message: `Your message to ${b.name} is in WhatsApp` })
  }
  const addToVendors = async (b: { id: string; name: string }): Promise<VendorLink | null> => {
    if (adding) return null
    setAdding(b.id)
    try {
      const r = await addBrandToVendors(b.id)
      if ('error' in r) { snackbar({ message: couldnt('add it to your vendors', refusalOf(r.error)) }); return null }
      router.refresh()
      /* (invented copy) a vendor of the same name is the brand: linked, never doubled */
      const message = r.how === 'created' ? `${b.name} is in your vendors` : r.how === 'linked' ? `${r.vendor.name} was one of your vendors already — it’s linked to ${r.vendor.name === b.name ? 'this brand' : b.name} now` : `${r.vendor.name} is in your vendors already`
      snackbar({ message, actionLabel: 'Open', onAction: () => router.push(vendorHref(r.vendor, here)) })
      return r.vendor
    } catch (e) { snackbar({ message: couldnt('add it to your vendors', refusalOf(e)) }); return null } finally { setAdding(null) }
  }
  /** Get deal: the way opens on the press itself (a browser blocks a window opened after a round trip), then the ask is recorded. */
  const getDeal = async (d: DealView): Promise<DealAsk | null> => {
    const way = askWay(d)
    if (!way) return null
    const text = dealMessage(d.brandName, d.title, viewer.name, studioName)
    if (way === 'link' && d.ctaUrl) window.open(d.ctaUrl, '_blank', 'noopener')
    else if (way === 'whatsapp' && d.brandWhatsapp) window.open(waLink(d.brandWhatsapp, text), '_blank', 'noopener')
    else if (way === 'email' && d.brandEmail) window.location.href = `mailto:${d.brandEmail}?subject=${encodeURIComponent(d.title)}&body=${encodeURIComponent(text)}`
    try {
      const r = await askForDeal(d.id, { how: way })
      if ('error' in r) { snackbar({ message: couldnt('note that you asked for it', refusalOf(r.error)) }); return null }
      snackbar({ message: way === 'whatsapp' ? `Your message to ${d.brandName} is in WhatsApp` : way === 'email' ? `Your email to ${d.brandName} is ready to send` : `${d.brandName}’s page for the deal is open in a new tab` })
      router.refresh()
      return r.ask
    } catch (e) { snackbar({ message: couldnt('note that you asked for it', refusalOf(e)) }); return null }
  }
  return { whatsapp, addToVendors, adding, getDeal }
}
