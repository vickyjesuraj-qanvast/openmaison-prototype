import { ldText } from '@/lib/site/seo'

/** (pending modules S35) Structured data for search engines — one script per object, `<` escaped (lib/site/seo.ts `ldText`). */
export function Ld({ data }: { data: unknown | unknown[] }) {
  const list = Array.isArray(data) ? data : [data]
  return <>{list.map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldText(d) }} />)}</>
}
