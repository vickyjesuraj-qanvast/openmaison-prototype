import { MoneyInLoading } from '@/components/finance/money-in/money-in-ghost'

/** (gaps build F1, REG-708) Streams instantly while Finance loads; PageReveal takes over the same ghost — the tab's own shape, read from the address.
    (parity map, FB-013 — P-A's branch) Money in draws its own ghost; every other tab Finance's (`MoneyInLoading` hands them to `FinanceGhost`). */
export default function Loading() {
  return <MoneyInLoading />
}
