import { notFound } from 'next/navigation'

/* (pending modules S35) Any other /site address is the site's own 404 (app/site/not-found.tsx), inside the site's frame. */
export default function Unknown() {
  notFound()
}
