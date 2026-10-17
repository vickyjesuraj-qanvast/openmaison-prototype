'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { PageReveal } from '@/components/shell/page-reveal'
import { PageHeaderL2 } from '@/components/shell/page-header-l2'
import { Card } from '@/components/leads/detail/card'
import { Icon } from '@/components/om/icon'
import { IconButton } from '@/components/om/icon-button'
import { MetaChip } from '@/components/om/meta-chip'
import { Tooltip } from '@/components/om/tooltip'
import { useHere } from '@/components/om/use-here'
import { useMaisonAi, type MaisonSuggestion } from '@/lib/maison-ai'
import { fromLabel, withFrom } from '@/lib/nav'
import { phoneLocal } from '@/lib/format'
import { brandMessage, dealWhen, DEMO_ADDRESS, isDemoAddress, productPrice, reviewsWord, shortUrl, type BrandPageData, type DealView, type ProductView, type VendorLink } from '@/lib/marketplace/model'
import { waLink } from '@/lib/portal/model'
import { runsBook } from '@/lib/company/price-book-rules'
import { DealCard } from './cards'
import { DealDialog } from './deal-dialog'
import { AddProductDialog } from './add-product-dialog'
import { BrandGhost } from './brand-ghost'
import { useMarket, vendorHref } from './use-market'
import pageStyles from '@/app/leads/leads.module.css'
import styles from './brand-page.module.css'

/**
 * (pending modules S24 — 1.0's /marketplace/[id], "Brand page: gallery, services, links, socials, FAQs, its deals, WhatsApp the brand") A
 * brand's page: the L2 header (Back returns where it was opened from; the one filled button is WhatsApp — email when the brand gives no
 * WhatsApp; Add to my vendors while it isn't one), its pictures, and the lead Overview's cards in two stacks — About (its line, its
 * categories, its reviews, whether it is one of your vendors) · Contact (WhatsApp, email, its business addresses) · Web links (its sites and
 * socials) at the left; Services · Deals · Products · Questions at the right. A product goes to the Price book's My Items (the products 1.0's
 * API sent and its page never showed); from there it reaches a quote's Add Item and a client's Choices. *(invented copy: the cards' words)*
 */
export function BrandPage({ data, from }: { data: BrandPageData; from?: string }) {
  const b = data.brand
  const router = useRouter()
  const here = useHere(`/marketplace/${b.id}`)
  const back = from ?? '/marketplace'
  const backName = from && !from.startsWith('/marketplace') ? fromLabel(from) : null
  const market = useMarket({ viewer: data.viewer, studioName: data.studioName, here })
  const [vendor, setVendor] = useState<VendorLink | null>(b.vendor)
  const [was, setWas] = useState(b.vendor)
  if (was !== b.vendor) { setWas(b.vendor); setVendor(b.vendor) }
  const [deal, setDeal] = useState<DealView | null>(null)
  const [adding, setAdding] = useState<ProductView | null>(null)
  const pictures = [b.cover, ...b.gallery].filter((p): p is string => !!p)
  const addVendor = async () => { const v = await market.addToVendors(b); if (v) setVendor(v) }
  const email = b.email ? `mailto:${b.email}?subject=${encodeURIComponent(`From ${data.studioName}`)}&body=${encodeURIComponent(brandMessage(b.name, data.viewer.name, data.studioName))}` : null

  /* (S10's rule) Maison AI acts here: WhatsApp the brand, make it a vendor — each through the page's own press */
  const firstDeal = [...b.deals].filter((d) => d.endsAt != null).sort((x, y) => x.endsAt! - y.endsAt!)[0] ?? b.deals[0] ?? null
  const suggestions: MaisonSuggestion[] = [
    ...(b.whatsapp ? [{ label: `WhatsApp ${b.name}`, propose: { title: `WhatsApp ${b.name}`, text: `WhatsApp opens with a message to ${b.name} from you at ${data.studioName}, ready to send.`, lines: [phoneLocal(b.whatsapp)], confirm: 'Open WhatsApp',
        run: async () => { window.open(waLink(b.whatsapp!, brandMessage(b.name, data.viewer.name, data.studioName)), '_blank', 'noopener'); return true } } }] : []),
    vendor
      ? { label: `Is ${b.name} one of my vendors?`, answer: { title: `${b.name} is in your vendors`, text: `As ${vendor.name} in Company › Finance › Vendors.`, link: { label: 'Open in Vendors', href: vendorHref(vendor, here) } } }
      : { label: `Add ${b.name} to my vendors`, propose: { title: `Add ${b.name} to your vendors`, text: `${b.name} joins Company › Finance › Vendors with its mobile and email — purchase orders and the Price book can then name it.`, confirm: 'Add to my vendors', run: async () => { const v = await market.addToVendors(b); if (v) setVendor(v); return !!v } } },
    firstDeal
      ? { label: `What deals does ${b.name} have?`, answer: { title: `${b.name}’s deals`, rows: b.deals.map((d) => ({ id: d.id, label: d.title, meta: dealWhen(d, data.now) ?? undefined, run: () => setDeal(d) })) } }
      : { label: `What deals does ${b.name} have?`, answer: { title: `${b.name} has no deal right now`, text: 'Its deals show on this page, and in the Marketplace’s Deals, when it has one.' } },
  ]
  useMaisonAi(suggestions)

  const links = [
    ...b.websites.map((w) => ({ key: w.url, icon: 'link', label: w.title, url: w.url })),
    ...(b.instagram ? [{ key: 'ig', icon: 'photo_camera', label: 'Instagram', url: b.instagram }] : []),
    ...(b.facebook ? [{ key: 'fb', icon: 'share', label: 'Facebook', url: b.facebook }] : []),
    ...(b.youtube ? [{ key: 'yt', icon: 'tv', label: 'YouTube', url: b.youtube }] : []),
  ]
  const primary = b.whatsapp
    ? <Button iconStart={<Icon name="chat" size={20} />} onPress={() => market.whatsapp(b)} data-testid="brand-whatsapp">WhatsApp</Button>
    : email ? <Button iconStart={<Icon name="mail" size={20} />} onPress={() => { window.location.href = email }} data-testid="brand-email">Email</Button> : null

  return (
    <PageReveal skeleton={<BrandGhost />}>
      <div className={pageStyles.body} data-testid="market-brand-page">
        <PageHeaderL2 backHref={back} crumbs={[{ label: 'Marketplace', href: '/marketplace' }]} title={b.name} backLabel={backName ? `Back to ${backName}` : undefined}
                      chips={b.featuredRank != null ? <MetaChip icon="star">Featured</MetaChip> : undefined}
                      actions={<>
                        {vendor ? null : <Button variant="secondary" appearance="outlined" onPress={() => { void addVendor() }} isDisabled={market.adding === b.id} data-testid="brand-add-vendor">Add to my vendors</Button>}
                        {primary}
                      </>} />
        <div className={styles.content}>
          <Pictures pictures={pictures} name={b.name} />
          <div className={styles.grid}>
            <div className={styles.side}>
              <Card title="About" testId="brand-about">
                <div className={styles.cardBody}>
                  <div className={styles.identity}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <span className={styles.logo}>{b.logo ? <img src={b.logo} alt={`${b.name} logo`} /> : <Icon name="storefront" size={24} weight={300} />}</span>
                    <span className={styles.identityText}>
                      {b.tagline ? <span className={styles.tagline}>{b.tagline}</span> : null}
                      <span className={styles.small}>{[b.categories.join(' · '), b.reviews ? `${reviewsWord(b.reviews)} on Qanvast` : null].filter(Boolean).join(' · ')}</span>
                    </span>
                  </div>
                  {vendor ? (
                    <div className={styles.state} data-testid="brand-vendor">
                      <span className={styles.stateIcon}><Icon name="check_circle" size={16} weight={300} /></span>
                      <span>{vendor.name === b.name ? 'In your vendors' : `In your vendors as ${vendor.name}`}</span>
                      <Link className={styles.textLink} href={vendorHref(vendor, here)} data-testid="brand-vendor-open">Open in Vendors</Link>
                    </div>
                  ) : <span className={styles.small} data-testid="brand-not-vendor">Not in your vendors yet</span>}
                </div>
              </Card>
              {b.whatsapp || b.email || b.addresses.length ? (
                <Card title="Contact" testId="brand-contact">
                  <div className={styles.rows}>
                    {b.whatsapp ? <a className={styles.row} href={waLink(b.whatsapp, brandMessage(b.name, data.viewer.name, data.studioName))} target="_blank" rel="noopener noreferrer"><span className={styles.rowIcon}><Icon name="chat" size={20} weight={300} /></span><span className={styles.rowText}><span className={styles.rowLabel}>WhatsApp</span><span className={styles.small}>{phoneLocal(b.whatsapp)}</span></span></a> : null}
                    {email ? <a className={styles.row} href={email}><span className={styles.rowIcon}><Icon name="mail" size={20} weight={300} /></span><span className={styles.rowText}><span className={styles.rowLabel}>Email</span><span className={styles.small}>{b.email}</span></span></a> : null}
                    {b.addresses.map((a) => <div key={a} className={styles.row}><span className={styles.rowIcon}><Icon name="domain" size={20} weight={300} /></span><span className={styles.rowText}><span className={styles.rowLabel}>Business address</span><span className={styles.small}>{a}</span></span></div>)}
                  </div>
                </Card>
              ) : null}
              {links.length ? (
                <Card title="Web links" testId="brand-links">
                  <div className={styles.rows}>
                    {links.map((l) => isDemoAddress(l.url) ? (
                      <div key={l.key} className={styles.row} data-testid="brand-link" data-demo-address="">
                        <span className={styles.rowIcon}><Icon name={l.icon} size={20} weight={300} /></span>
                        <span className={styles.rowText}><span className={styles.rowLabel}>{l.label}</span><span className={styles.small}>{DEMO_ADDRESS}</span></span>
                      </div>
                    ) : (
                      <a key={l.key} className={styles.row} href={l.url} target="_blank" rel="noopener noreferrer" data-testid="brand-link">
                        <span className={styles.rowIcon}><Icon name={l.icon} size={20} weight={300} /></span>
                        <span className={styles.rowText}><span className={styles.rowLabel}>{l.label}</span><span className={styles.small}>{shortUrl(l.url)}</span></span>
                        <span className={styles.rowEnd}><Icon name="open_in_new" size={16} weight={300} /></span>
                      </a>
                    ))}
                  </div>
                </Card>
              ) : null}
            </div>
            <div className={styles.mainCol}>
              {b.services ? <Card title="Services" testId="brand-services"><div className={styles.cardBody}><p className={styles.text}>{b.services}</p></div></Card> : null}
              {b.deals.length ? (
                <Card title="Deals" meta={`· ${b.deals.length}`} testId="brand-deals">
                  <div className={styles.deals} role="list" aria-label={`${b.name}’s deals`} data-kb-list="deal">
                    {b.deals.map((d) => <DealCard key={d.id} d={d} now={data.now} viewerId={data.viewer.id} onOpen={setDeal} />)}
                  </div>
                </Card>
              ) : null}
              {b.products.length ? (
                <Card title="Products" meta={`· ${b.products.length}`} testId="brand-products">
                  <div className={styles.rows}>
                    {b.products.map((p) => <ProductRow key={p.id} p={p} brand={b.name} onAdd={() => setAdding(p)} onOpen={(id) => router.push(withFrom(`/company/price-book?open=${encodeURIComponent(id)}`, here))} />)}
                  </div>
                </Card>
              ) : null}
              {b.faqs.length ? (
                <Card title="Questions" meta={`· ${b.faqs.length}`} testId="brand-faqs">
                  <div className={styles.rows}>
                    {b.faqs.map((f) => <div key={f.question} className={styles.faq}><h3 className={styles.faqQ}>{f.question}</h3><p className={styles.faqA}>{f.answer}</p></div>)}
                  </div>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <DealDialog deal={deal} onClose={() => setDeal(null)} viewer={data.viewer} now={data.now} here={here} onBrandPage onGet={market.getDeal} />
      <AddProductDialog product={adding} brand={b} vendor={vendor} trades={data.trades} units={data.units} proposes={!runsBook(data.viewer)} costs={data.viewer.costs !== false} onClose={() => setAdding(null)}
                        onAdded={(r) => { setAdding(null); if (r.vendor) setVendor(r.vendor) }} here={here} />
    </PageReveal>
  )
}

/** A product: its picture, its words, its listed price and page, and its one press — Add to Price book, or the door to the item made from it. */
function ProductRow({ p, brand, onAdd, onOpen }: { p: ProductView; brand: string; onAdd: () => void; onOpen: (itemId: string) => void }) {
  const price = productPrice(p)
  return (
    <div className={styles.product} data-testid="brand-product" data-product={p.id}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <span className={styles.productPic}>{p.picture ? <img src={p.picture} alt="" loading="lazy" /> : <Icon name="chair" size={24} weight={300} />}</span>
      <span className={styles.productText}>
        <span className={styles.productName}>{p.name}</span>
        {p.description ? <span className={styles.productDesc}>{p.description}</span> : null}
        <span className={styles.productLinks}>
          {price ? <span className={styles.productPrice}>{price}</span> : null}
          {p.link && !isDemoAddress(p.link) ? <a className={styles.textLink} href={p.link} target="_blank" rel="noopener noreferrer">{`On ${brand}’s site`}</a> : null}
        </span>
      </span>
      <span className={styles.productAct}>
        {p.inBook ? (
          p.inBook.visible ? (
            <>
              <Button variant="secondary" appearance="text" size="sm" onPress={() => onOpen(p.inBook!.id)} data-testid="product-open">Open in My Items</Button>
              <span className={styles.productState}>{p.inBook.proposed ? 'Proposed — waits for an Owner or an Admin' : 'In your Price book'}</span>
            </>
          ) : <span className={styles.productState}>{`Proposed for My Items${p.inBook.by ? ` by ${p.inBook.by}` : ''}`}</span>
        ) : (
          <Button variant="secondary" appearance="outlined" size="sm" iconStart={<Icon name="add" size={16} />} onPress={onAdd} data-testid="product-add">Add to Price book</Button>
        )}
      </span>
    </div>
  )
}

/** The brand's pictures (1.0's gallery): the main one with Previous · Next and its place, the next four beside it (a strip under it on a phone). */
function Pictures({ pictures, name }: { pictures: string[]; name: string }) {
  const [at, setAt] = useState(0)
  if (!pictures.length) return null
  const n = pictures.length
  const i = Math.min(at, n - 1)
  const others = pictures.map((src, k) => ({ src, k })).filter((x) => x.k !== i).slice(0, 4)
  const step = (by: number) => setAt((x) => (Math.min(x, n - 1) + by + n) % n)
  return (
    <section className={styles.gallery} data-single={n === 1 || undefined} aria-label={`${name}’s pictures`} data-testid="brand-gallery">
      <div className={styles.main}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pictures[i]} alt={`${name}, picture ${i + 1} of ${n}`} data-testid="brand-picture" />
        {n > 1 ? (
          <>
            <span className={`${styles.step} ${styles.stepPrev}`}><Tooltip label="Previous picture"><IconButton icon="chevron_left" label="Previous picture" variant="bare" onClick={() => step(-1)} /></Tooltip></span>
            <span className={`${styles.step} ${styles.stepNext}`}><Tooltip label="Next picture"><IconButton icon="chevron_right" label="Next picture" variant="bare" onClick={() => step(1)} data-testid="brand-picture-next" /></Tooltip></span>
            <span className={styles.count} data-testid="brand-picture-count">{i + 1} / {n}</span>
          </>
        ) : null}
      </div>
      {n > 1 ? (
        <div className={styles.thumbs} data-count={others.length}>
          {others.map((o) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <button key={o.k} type="button" className={styles.thumbBtn} onClick={() => setAt(o.k)} aria-label={`Show picture ${o.k + 1} of ${n}`}><img src={o.src} alt="" loading="lazy" /></button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
