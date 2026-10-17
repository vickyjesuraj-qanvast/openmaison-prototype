'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ds'
import { Icon } from '@/components/om/icon'
import { TextField } from '@/components/om/text-field'
import { useSnackbar } from '@/components/om/snackbar'
import { couldnt, refusalOf } from '@/components/leads/tasks/use-run'
import { hasErrors, withServer, type FieldErrors } from '@/lib/forms'
import { COMPANY } from '@/lib/site/model'
import { CONTACT_FAILED, MESSAGE_MAX, NAME_MAX, checkContact, type ContactField } from '@/lib/site/forms'
import { sendContactMessage } from '@/app/site/actions'
import { Container, Display, Eyebrow, Lede, Section, cx } from './primitives'
import { Reveal } from './reveal'
import s from './site.module.css'
import p from './pages.module.css'

/*
 * (pending modules S35 — 1.0's contact/page-client.tsx · api/contact) Contact: the three ways in (email, WhatsApp, the office by appointment) and
 * the form — name, email, an optional subject, the message (up to 5,000 characters, 1.0's). Sent, it is kept (`contact_messages`) and reaches the
 * team at hello@openmaison.ai through the house outbox with the visitor as the one to answer; the form turns into 1.0's thank-you.
 */

const CHANNELS = [
  { icon: 'mail', title: 'Email', description: 'For general enquiries and partnerships', value: COMPANY.email, href: `mailto:${COMPANY.email}` },
  { icon: 'chat', title: 'WhatsApp', description: 'Chat with our team directly', value: COMPANY.whatsapp, href: COMPANY.whatsappHref },
  { icon: 'store', title: 'Office', description: 'Visit us by appointment', value: COMPANY.office, href: null },
]

type Fields = { name: string; email: string; subject: string; message: string }

export function ContactView() {
  return (
    <>
      <Section top label="Contact">
        <Container size="narrow" className={s.center}>
          <Reveal><Display as="h1" size="xl">Let’s talk.</Display></Reveal>
          <Reveal delay={80}><Lede className={cx(s.centerBlock, p.mt24)}>Studio owners, potential partners, anyone curious about what we’re doing. We’re easy to reach.</Lede></Reveal>
        </Container>
      </Section>
      <Section spacing="major" label="Ways to reach us">
        <Container>
          <div className={p.contactGrid}>
            <div>
              <Reveal>
                <Eyebrow>Ways to reach us</Eyebrow>
                <Display size="s" className={p.mt16}>Pick whatever’s easiest.</Display>
                <p className={cx(s.bodyM, p.mt16)}>No phone trees. No ticket queue. A real person reads every message.</p>
              </Reveal>
              <div className={p.channels}>
                {CHANNELS.map((c, i) => (
                  <Reveal key={c.title} delay={i * 80}>
                    <div className={p.channel}>
                      <span className={p.channelIcon}><Icon name={c.icon} size={18} /></span>
                      <div>
                        <p className={p.channelTitle}>{c.title}</p>
                        <p className={p.channelDesc}>{c.description}</p>
                        {c.href ? <a href={c.href} className={p.channelValue} {...(c.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{c.value}</a> : <span className={p.channelValue}>{c.value}</span>}
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
              <Reveal delay={240}><p className={p.reply}><Icon name="schedule" size={16} />We typically respond within 24 hours.</p></Reveal>
            </div>
            <Reveal delay={120}><div className={p.formCard}><ContactForm /></div></Reveal>
          </div>
        </Container>
      </Section>
    </>
  )
}

function ContactForm() {
  const path = usePathname()
  const snackbar = useSnackbar()
  const [f, setF] = useState<Fields>({ name: '', email: '', subject: '', message: '' })
  const [tried, setTried] = useState(false)
  const [server, setServer] = useState<FieldErrors<ContactField>>({})
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const errors = tried ? withServer(checkContact(f), server) : {}
  const set = (k: keyof Fields, max: number) => (v: string) => { setF((x) => ({ ...x, [k]: v.slice(0, max) })); setServer((e) => ({ ...e, [k]: undefined })) }
  const submit = async () => {
    setTried(true)
    if (hasErrors(checkContact(f)) || busy) return
    setBusy(true)
    try {
      const r = await sendContactMessage({ ...f, sourcePage: path })
      if ('error' in r) { if (r.fields) setServer(r.fields); else snackbar({ message: couldnt('send your message', refusalOf(r.error)) }); return }
      setSent(true)
    } catch { snackbar({ message: CONTACT_FAILED }) } finally { setBusy(false) }
  }
  if (sent) {
    return (
      <div role="status" className={p.sent} data-testid="contact-sent">
        <Icon name="check_circle" size={40} className={p.sentIcon} />
        <h3 className={p.sentTitle}>Message sent!</h3>
        <p className={s.bodyM}>Thanks for reaching out. We’ll get back to you within 24 hours.</p>
      </div>
    )
  }
  return (
    <form className={p.form} noValidate onSubmit={(e) => { e.preventDefault(); void submit() }} data-testid="contact-form">
      <div className={p.formRow}>
        <TextField label="Name" required value={f.name} onChange={set('name', NAME_MAX)} error={errors.name} autoComplete="name" name="name" />
        <TextField label="Email" required type="email" inputMode="email" value={f.email} onChange={set('email', 200)} error={errors.email} autoComplete="email" name="email" />
      </div>
      <TextField label="Subject (optional)" value={f.subject} onChange={set('subject', 200)} name="subject" />
      <TextField label="Message" required multiline={5} value={f.message} onChange={set('message', MESSAGE_MAX)} error={errors.message} name="message" maxLength={MESSAGE_MAX} />
      <div className={p.formFoot}>
        <Button size="lg" onPress={() => { void submit() }} isDisabled={busy} iconEnd={<Icon name="send" size={16} />} data-testid="contact-submit">{busy ? 'Sending…' : 'Send message'}</Button>
      </div>
      <button type="submit" hidden aria-hidden tabIndex={-1} />
    </form>
  )
}
