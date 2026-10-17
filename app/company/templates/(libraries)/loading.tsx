import { TemplatesLoading } from '@/components/company/templates/templates-loading'

/** Templates' galleries (Quotes · Contracts · Tasks · T&Cs & Notes · Payments) share this ghost (REG-708): the tab strip, the gallery's toolbar,
    the Folders row and a row of cards. The route group keeps it off Brand kit, which has its own. */
export default function Loading() {
  return <TemplatesLoading />
}
