import { PageGhost } from '@/components/site/site-ghosts'
import p from '@/components/site/pages.module.css'
export default function Loading() {
  return <PageGhost label="Loading Trust & Security" title="Your studio’s data is yours. Full stop." narrowTitle={p.max16} band="hero"
                    lede="OpenMaison holds the record of your entire business, and we take that seriously. Here’s exactly how your data is protected, and how we keep it that way." />
}
