import { PageGhost } from '@/components/site/site-ghosts'
import p from '@/components/site/pages.module.css'
export default function Loading() {
  return <PageGhost label="Loading the platform" title="One connected platform for your entire studio." narrowTitle={p.max18} band="hub" buttons={1}
                    lede="Replace disconnected apps with OpenMaison. When owners, designers and finance work together, projects run smoother, clients stay happier and margins stay healthier." />
}
