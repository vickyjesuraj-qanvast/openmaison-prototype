'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ds'
import { Dialog } from '@/components/om/dialog'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { MSG } from '@/lib/forms'
import { withFrom } from '@/lib/nav'
import { UNITS } from '@/lib/quotes/items-model'
import { productPrice, tradeFor, type ProductView, type VendorLink } from '@/lib/marketplace/model'
import { addProductToPriceBook } from '@/app/marketplace/actions'
import styles from './brand-page.module.css'

const NO_CATEGORY = 'No trade'   // (calm-build regression fix F, R3 — the UI audit's 4-01 · §2 Trade) the line's grouping reads Trade, as the Price book's own dialogs; display only — the sentinel is sent as `category: null`, the stored field stays `category`

/**
 * (pending modules S24 — the card's question "Should a brand link to Finance › Vendors or the Price book?": a product to the Price book) Add a
 * brand's product to My Items — the Choices' Save to the Price book dialog's shape (REG gaps build D): the product's square and name, then
 * what the book needs that the product doesn't carry — its category (one of the studio's trades, guessed from the brand's), its unit, the
 * cost (the brand's listed price to start) and the markup. Its words, picture and page travel; its vendor is the brand (joining the studio's
 * vendors if it isn't one — said here, before the press). A Designer's is a proposal an Owner or an Admin approves (REG-652). It closes only
 * once the save lands; the snackbar opens the new item. A form dialog: a bottom sheet on a phone. *(invented copy: the dialog's lines)*
 */
export function AddProductDialog({ product, brand, vendor, trades, units = UNITS, proposes, onClose, onAdded, here, costs = true }: {
  /** (S44I — M9) the studio's units */ units?: readonly string[]
  /** (pending modules S41b-1) the member sees costs — else one Unit price box (it starts at the brand's listed price; the studio's cost isn't theirs to set) */
  costs?: boolean
  product: ProductView | null
  brand: { name: string; categories: string[] }
  vendor: VendorLink | null
  trades: string[]
  /** the viewer's addition waits for an Owner or an Admin */
  proposes: boolean
  onClose: () => void
  onAdded: (r: { itemId: string; vendor: VendorLink | null }) => void
  here: string
}) {
  const snack = useSnackbar()
  const router = useRouter()
  const [name, setName] = useState('')
  const [category, setCategory] = useState(NO_CATEGORY)
  const [unit, setUnit] = useState('Pieces')
  const [cost, setCost] = useState('')
  const [markup, setMarkup] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  /* each opening starts from the product (render-phase adjust) */
  const [seen, setSeen] = useState<string | null>(null)
  const key = product?.id ?? null
  if (key !== seen) {
    setSeen(key)
    if (product) {
      setName(product.name); setCategory(tradeFor(brand.categories, trades) ?? NO_CATEGORY); setUnit(product.unit ? units.find((u) => u.toLowerCase() === product.unit!.toLowerCase()) ?? units[0] ?? 'Pieces' : units[0] ?? 'Pieces')
      setCost(product.priceMinor != null ? (product.priceMinor / 100).toFixed(2) : ''); setMarkup(''); setTried(false)
    }
  }
  const [last, setLast] = useState<ProductView | null>(product)
  if (product && product !== last) setLast(product)
  const shown = product ?? last
  const toMinor = (v: string) => { const n = Number(v.replace(/,/g, '')); return Number.isFinite(n) ? Math.round(n * 100) : 0 }
  const nameError = tried && !name.trim() ? MSG.required : undefined
  const save = async () => {
    if (!product || busy) return
    if (!name.trim()) { setTried(true); return }
    setBusy(true)
    try {
      const r = await addProductToPriceBook(product.id, { name, category: category === NO_CATEGORY ? null : category, unit, costMinor: toMinor(cost), markupMinor: toMinor(markup) })
      if ('error' in r) { snack({ message: couldnt('add it to the Price book', refusalOf(r.error)) }); return }
      onAdded({ itemId: r.item.id, vendor: r.vendor })
      router.refresh()
      const also = r.vendor.added ? `, and ${r.vendor.name} is in your vendors` : ''
      snack({ message: r.item.proposed ? `${r.item.name} is proposed for My Items${also}` : `${r.item.name} is in My Items${also}`, actionLabel: 'Open', onAction: () => router.push(withFrom(`/company/price-book?open=${encodeURIComponent(r.item.id)}`, here)) })
    } catch (e) {
      snack({ message: couldnt('add it to the Price book', refusalOf(e)) })
    } finally { setBusy(false) }
  }
  const price = shown ? productPrice(shown) : null
  /* (the calm UI build 2026-10-27, 6-25 · W-220) what the press does, in the studio's words: the vendor it gets (and joins, when it isn't one) */
  const subtitle = [
    vendor ? `${vendor.name} becomes its vendor.` : `${brand.name} becomes its vendor and joins your vendors.`,
    proposes ? 'An Owner or an Admin approves it before the studio uses it.' : null,
  ].filter(Boolean).join(' ')
  return (
    <Dialog open={!!product} onClose={onClose} closeOnScrim={false} size="form" width={600} title="Add to Price book" subtitle={subtitle}
            footer={<>
              <Button variant="secondary" appearance="outlined" onPress={onClose} isDisabled={busy}>Cancel</Button>
              <Button onPress={() => { void save() }} isDisabled={busy} data-testid="product-save">{busy ? 'Adding…' : proposes ? 'Propose it' : 'Add'}</Button>
            </>}>
      {shown ? (
        <div className={styles.fields} data-testid="product-dialog">
          <div className={styles.picked}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className={styles.productPic}>{shown.picture ? <img src={shown.picture} alt="" /> : <Icon name="chair" size={24} weight={300} />}</span>
            <span className={styles.productText}>
              <span className={styles.productName}>{shown.name}</span>
              <span className={styles.productDesc}>{[brand.name, price ? `Listed at ${price}` : null].filter(Boolean).join(' · ')}</span>
            </span>
          </div>
          <TextField label="Name" required value={name} onChange={setName} maxLength={120} error={nameError} autoFocus />
          <div className={styles.row2}>
            <TextField label="Trade" mode="select" options={[NO_CATEGORY, ...trades]} value={category} onChange={setCategory} helper="Your trades, from Settings" />
            <TextField label="Unit" mode="select" options={[...units]} value={unit} onChange={setUnit} searchable={units.length > 8} />
          </div>
          {costs ? (
            <div className={styles.row2}>
              <TextField label="Cost (S$)" numeric="money" value={cost} onChange={setCost} trailingIcon={null} helper={`${brand.name}’s listed price — put in your trade price if you have one`} />
              <TextField label="Markup (S$)" numeric="money" value={markup} onChange={setMarkup} trailingIcon={null} helper="The unit price is the two together" />
            </div>
          ) : (
            <div className={styles.row2}>
              <TextField label="Unit price (S$)" numeric="money" value={cost} onChange={setCost} trailingIcon={null} helper={`${brand.name}’s listed price to start — what a quote line starts at`} />
            </div>
          )}
        </div>
      ) : null}
    </Dialog>
  )
}
