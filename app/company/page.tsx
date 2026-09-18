import { redirect } from 'next/navigation'

/** There is no Company page (REG-484): the rail's item opens the sections panel. A direct hit lands on Templates › Quotes. */
export default function CompanyPage() {
  redirect('/company/templates/quotes')
}
