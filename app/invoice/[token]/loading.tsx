import { PublicDocGhost } from '@/components/projects/money/public-doc-page'

/** (REG-708) The client's link streams the page's own ghost while the invoice loads. */
export default function Loading() {
  return <PublicDocGhost />
}
