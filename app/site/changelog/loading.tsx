import { PageGhost } from '@/components/site/site-ghosts'
import p from '@/components/site/pages.module.css'
export default function Loading() {
  return <PageGhost label="Loading what’s new" eyebrow="Product updates" title="Everything we’ve shipped lately." narrowTitle={p.max16} band="hero" gap={20}
                    lede="A running record of what’s new in OpenMaison — the features, the polish and the quiet fixes that make your studio run calmer. Something new lands every couple of weeks." />
}
