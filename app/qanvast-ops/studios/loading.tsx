import { QanvastStudiosGhost } from '@/components/qanvast/qanvast-studios-ghost'

/** (REG-708) Qanvast Ops › Studios' ghost — the page's PageReveal draws the same one (the Leads page keeps its own, in its route group). */
export default function Loading() {
  return <QanvastStudiosGhost />
}
