import { ListingGhost } from '@/components/leads/listing-ghost'

/** Streams instantly while the listing data loads; PageReveal takes over the same ghost — (REG-708) the view's own: the table, the kanban
    (`?view=kanban` or the remembered view) or, on a phone, the cards. Its own route group: a lead, Insights and the imports have their own. */
export default function Loading() {
  return <ListingGhost />
}
