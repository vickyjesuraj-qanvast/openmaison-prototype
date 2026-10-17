import Link from 'next/link'
import type { ReactNode } from 'react'
import { COMPANY, site } from '@/lib/site/model'
import { Container, Eyebrow, Display, Lede, Rule, Section, cx } from './primitives'
import { Reveal } from './reveal'
import s from './site.module.css'
import p from './pages.module.css'

/*
 * (pending modules S35 — 1.0's privacy · terms · cookies pages) The legal pages. Privacy and Terms are 1.0's text word for word (23 March 2026,
 * Qanvast Pte. Ltd.) — a legal text changes only with the company's say. The Cookie Policy lists the cookies and the browser storage THIS app
 * keeps (1.0 named its own: qanvast_session, NEXT_LOCALE, the theme and skin — none of them 2.0's), so it is rewritten to the same headings and
 * dated today; flagged for the company to read before it is published.
 */

function LegalPage({ title, updated, lede, children }: { title: string; updated: string; lede?: string; children: ReactNode }) {
  return (
    <Section top label={title}>
      <Container size="narrow">
        <Reveal>
          <Eyebrow>Legal</Eyebrow>
          <Display as="h1" size="l" className={p.mt20}>{title}</Display>
          <p className={cx(s.label, p.updated)}>Last updated: {updated}</p>
          {lede ? <Lede className={p.mt24}>{lede}</Lede> : null}
        </Reveal>
        <Rule className={p.mt48} />
        <div className={p.legalBody}>{children}</div>
      </Container>
    </Section>
  )
}
function Part({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className={p.legalTitle}>{title}</h2><div className={p.legalText}>{children}</div></section>
}
function Sub({ children }: { children: ReactNode }) { return <h3 className={p.legalSub}>{children}</h3> }
function Mail() { return <a href={`mailto:${COMPANY.email}`} className={s.inlineLink}>{COMPANY.email}</a> }

export function PrivacyView() {
  return (
    <LegalPage title="Privacy Policy" updated="23 March 2026">
      <Part title="1. Introduction">
        <p>Qanvast Pte. Ltd. (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;) operates the OpenMaison platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service. We are committed to protecting your privacy in compliance with the Personal Data Protection Act 2012 (PDPA) of Singapore.</p>
      </Part>
      <Part title="2. Information We Collect">
        <Sub>2.1 Information You Provide</Sub>
        <ul>
          <li><strong>Account information:</strong> Name, email address, phone number, studio name, role</li>
          <li><strong>Business data:</strong> Lead details, project information, quotes, invoices, and client communications uploaded to the platform</li>
          <li><strong>Payment information:</strong> Billing details processed through our third-party payment provider</li>
          <li><strong>Communications:</strong> Messages sent through the platform&apos;s chat feature</li>
        </ul>
        <Sub>2.2 Information Collected Automatically</Sub>
        <ul>
          <li><strong>Usage data:</strong> Pages visited, features used, actions taken within the platform</li>
          <li><strong>Device information:</strong> Browser type, operating system, IP address, device identifiers</li>
          <li><strong>Cookies and similar technologies:</strong> See our <Link href={site('/cookies')} className={s.inlineLink}>Cookie Policy</Link> for details</li>
        </ul>
        <Sub>2.3 Third-Party Data</Sub>
        <ul>
          <li><strong>Gmail integration:</strong> When you connect your Gmail account for lead ingestion, we access email metadata and content from whitelisted sender domains only. OAuth tokens are encrypted with AES-256-GCM at rest.</li>
          <li><strong>AI processing:</strong> Content you submit for AI analysis (quotes, images, floor plans) is processed by third-party AI providers under data processing agreements.</li>
        </ul>
      </Part>
      <Part title="3. How We Use Your Information">
        <p>We use collected information to:</p>
        <ul>
          <li>Provide, operate, and maintain the Service</li><li>Process your transactions and manage your account</li><li>Generate AI-powered insights, suggestions, and analyses</li>
          <li>Improve and personalise your experience</li><li>Communicate with you about updates, security alerts, and support</li><li>Detect, prevent, and address technical issues and security threats</li><li>Comply with legal obligations</li>
        </ul>
      </Part>
      <Part title="4. Data Sharing and Disclosure">
        <p>We do not sell your personal data. We may share information with:</p>
        <ul>
          <li><strong>Service providers:</strong> Third-party vendors who assist in operating the Service (hosting, AI processing, email delivery, payment processing)</li>
          <li><strong>Within your studio:</strong> Team members within your studio workspace can access shared business data according to their role permissions</li>
          <li><strong>Legal requirements:</strong> When required by law, regulation, or legal process</li>
          <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
        </ul>
      </Part>
      <Part title="5. Data Security">
        <p>We implement industry-standard security measures to protect your data, including:</p>
        <ul><li>HMAC-SHA256 signed session cookies</li><li>AES-256-GCM encryption for sensitive credentials (e.g., OAuth tokens)</li><li>Rate limiting on authentication endpoints</li><li>HTTPS encryption for all data in transit</li><li>Role-based access control within studio workspaces</li></ul>
        <p>While we strive to protect your information, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.</p>
      </Part>
      <Part title="6. Data Retention">
        <p>We retain your personal data for as long as your account is active or as needed to provide the Service. Upon account deletion, we will delete or anonymise your personal data within 90 days, except where retention is required by law.</p>
      </Part>
      <Part title="7. Your Rights">
        <p>Under the PDPA and applicable data protection laws, you have the right to:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
          <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
          <li><strong>Withdrawal of consent:</strong> Withdraw consent for data processing (this may affect your ability to use certain features)</li>
          <li><strong>Data portability:</strong> Request your data in a structured, machine-readable format</li>
          <li><strong>Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements</li>
        </ul>
        <p>To exercise these rights, contact us at <Mail />.</p>
      </Part>
      <Part title="8. International Data Transfers">
        <p>Your data may be processed in jurisdictions outside Singapore where our service providers operate. We ensure that adequate safeguards are in place through data processing agreements that comply with the PDPA&apos;s transfer limitation obligation.</p>
      </Part>
      <Part title="9. Children’s Privacy">
        <p>The Service is not intended for individuals under 18 years of age. We do not knowingly collect personal data from children. If we become aware that we have collected data from a child, we will take steps to delete it.</p>
      </Part>
      <Part title="10. Changes to This Policy">
        <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or through a prominent notice on the Service. Your continued use after such notification constitutes acceptance.</p>
      </Part>
      <Part title="11. Contact Us">
        <p>For privacy-related enquiries or to exercise your data protection rights, contact our Data Protection Officer at <Mail />.</p>
        <p>Qanvast Pte. Ltd.<br />Singapore</p>
      </Part>
    </LegalPage>
  )
}

export function TermsView() {
  return (
    <LegalPage title="Terms of Service" updated="23 March 2026" lede="The agreement that governs your use of OpenMaison, the AI-powered Studio OS for interior design professionals.">
      <Part title="1. Acceptance of Terms"><p>By accessing or using the OpenMaison platform (&quot;Service&quot;), operated by Qanvast Pte. Ltd. (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not use the Service.</p></Part>
      <Part title="2. Description of Service"><p>OpenMaison is an AI-powered Studio OS for interior design professionals. The Service includes lead management, client communication, quote digitization, project tracking, AI-assisted tools, and related features accessible via web application.</p></Part>
      <Part title="3. Eligibility"><p>You must be at least 18 years of age and a registered business entity or an authorised representative of one to use the Service. By using the Service, you represent and warrant that you meet these requirements.</p></Part>
      <Part title="4. Account Registration"><p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorised access.</p></Part>
      <Part title="5. Acceptable Use">
        <p>You agree not to:</p>
        <ul><li>Use the Service for any unlawful purpose or in violation of any applicable laws</li><li>Upload, transmit, or share content that is defamatory, obscene, or infringing</li><li>Attempt to gain unauthorised access to any part of the Service or its systems</li><li>Interfere with or disrupt the integrity or performance of the Service</li><li>Reverse engineer, decompile, or disassemble any part of the Service</li><li>Use automated means (bots, scrapers) to access the Service without permission</li></ul>
      </Part>
      <Part title="6. Intellectual Property"><p>All content, features, and functionality of the Service, including but not limited to software, text, graphics, logos, and AI models, are owned by the Company and protected by intellectual property laws. You retain ownership of data you upload to the Service.</p></Part>
      <Part title="7. Data and Privacy"><p>Your use of the Service is also governed by our <Link href={site('/privacy')} className={s.inlineLink}>Privacy Policy</Link>. By using the Service, you consent to the collection and use of information as described therein.</p></Part>
      <Part title="8. AI-Generated Content"><p>The Service utilises artificial intelligence to generate suggestions, analyses, renders, and other outputs. AI-generated content is provided &quot;as is&quot; and may not always be accurate. You are responsible for reviewing and verifying any AI-generated content before relying on it for business decisions.</p></Part>
      <Part title="9. Payment and Billing"><p>Certain features of the Service require a paid subscription. All fees are quoted in Singapore Dollars (SGD) unless otherwise stated. Subscription fees are billed in advance on a monthly or annual basis. You authorise us to charge your designated payment method for all applicable fees.</p></Part>
      <Part title="10. Cancellation and Refunds"><p>You may cancel your subscription at any time through your account settings. Cancellation takes effect at the end of the current billing period. Refunds for Qanvast-sourced leads are subject to our lead return policy.</p></Part>
      <Part title="11. Service Availability"><p>We strive to maintain high availability but do not guarantee uninterrupted access to the Service. We may perform scheduled maintenance, updates, or modifications that temporarily affect availability. We will provide reasonable notice where possible.</p></Part>
      <Part title="12. Limitation of Liability"><p>To the maximum extent permitted by law, the Company shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability shall not exceed the amount paid by you to the Company in the twelve (12) months preceding the claim.</p></Part>
      <Part title="13. Indemnification"><p>You agree to indemnify and hold harmless the Company, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Service or violation of these Terms.</p></Part>
      <Part title="14. Modifications to Terms"><p>We reserve the right to modify these Terms at any time. We will notify you of material changes via email or through the Service. Continued use of the Service after such notification constitutes acceptance of the updated Terms.</p></Part>
      <Part title="15. Governing Law"><p>These Terms shall be governed by and construed in accordance with the laws of the Republic of Singapore. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Singapore.</p></Part>
      <Part title="16. Contact Us"><p>If you have any questions about these Terms, please contact us at <Mail />.</p></Part>
    </LegalPage>
  )
}

export function CookiesView() {
  return (
    <LegalPage title="Cookie Policy" updated="13 October 2026" lede="What cookies OpenMaison uses, why we use them, and how you can manage your preferences.">
      <Part title="1. What Are Cookies"><p>Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences, understand how you use the site, and improve your experience. OpenMaison uses cookies and similar technologies to operate and secure the platform.</p></Part>
      <Part title="2. Cookies We Use">
        <Sub>2.1 Strictly Necessary Cookies</Sub>
        <p>These cookies are essential for the Service to function and cannot be disabled.</p>
        <table className={p.legalTable} data-testid="cookie-table">
          <thead><tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr></thead>
          <tbody>
            <tr><td><code>om_session</code></td><td>Keeps you signed in to your studio</td><td>24 hours, or 30 days with Keep me signed in</td></tr>
            <tr><td><code>om_seen</code></td><td>Remembers that this browser has signed in or out before, so an ended session asks you to sign in again</td><td>400 days</td></tr>
            {/* (S42, REG-2249) S42B's mark — a studio member's own visit to a client's link is never the client's "Viewed" */}
            <tr><td><code>om_studio</code></td><td>Remembers that this browser has opened a studio page, so a studio member checking a client’s link isn’t counted as the client opening it</td><td>400 days</td></tr>
            <tr><td><code>om_portal</code></td><td>Keeps a client signed in to their studio’s client portal</td><td>30 days</td></tr>
            <tr><td><code>om_pv_…</code></td><td>Lets a studio member open their client portal as a test client</td><td>60 minutes</td></tr>
            <tr><td><code>om_trial</code></td><td>Counts the free renders you have made in the AI Visualizer trial, in this browser — signed, so it can’t be changed</td><td>24 hours after your last render</td></tr>
            {/* (pending modules S41b-3) the no-account tools' workspace */}
            <tr><td><code>om_anon</code></td><td>Names the leads, the quote and the comparison you make in the free trial of Leads, Upload a quote and Quote X-Ray, so they can move into your studio when you start it — signed, so it can’t be changed; it holds nothing else</td><td>7 days</td></tr>
          </tbody>
        </table>
        <Sub>2.2 Functional Cookies</Sub>
        <p>These cookies remember your preferences and choices to provide a personalised experience.</p>
        <table className={p.legalTable}>
          <thead><tr><th>Cookie / Storage</th><th>Purpose</th><th>Duration</th></tr></thead>
          <tbody>
            <tr><td><code>om_reports_tab</code> · <code>om_reports_finance</code></td><td>Remembers the report you last opened</td><td>1 year</td></tr>
            <tr><td><code>om.*</code></td><td>Remembers your table columns, views and filters, and the tips you have dismissed (localStorage); whether this website’s opening has played, and a room photo you take from the AI Visualizer trial into the studio you start (sessionStorage)</td><td>Until you clear them; the opening and the photo, until you close the tab (the photo, two hours at most)</td></tr>
          </tbody>
        </table>
        <Sub>2.3 Analytics Cookies</Sub>
        <p>We may use analytics cookies to understand how visitors interact with the Service. These help us improve performance and user experience. Analytics data is aggregated and does not personally identify you.</p>
      </Part>
      <Part title="3. Third-Party Cookies">
        <p>Some features of the Service may set cookies from third-party services:</p>
        <ul>
          <li><strong>Google OAuth:</strong> When connecting Gmail for email lead ingestion, Google may set cookies during the OAuth flow</li>
          <li><strong>Calendly:</strong> When you book a demo, Calendly’s booking page may set its own cookies</li>
        </ul>
        <p>We do not use advertising or tracking cookies. We do not share cookie data with advertising networks.</p>
      </Part>
      <Part title="4. Managing Cookies">
        <p>You can control cookies through your browser settings. Most browsers allow you to:</p>
        <ul><li>View and delete existing cookies</li><li>Block all cookies or only third-party cookies</li><li>Set preferences for specific websites</li></ul>
        <p>Please note that disabling strictly necessary cookies will prevent you from using the Service, as they are required for signing in.</p>
        <p>For preferences stored in localStorage (your columns, views and filters), you can clear these through your browser&apos;s site data settings.</p>
      </Part>
      <Part title="5. Cookie Lifespan"><p><strong>Session cookies</strong> are deleted when you close your browser. <strong>Persistent cookies</strong> remain on your device for a set period or until you manually delete them. Your sign-in lasts 24 hours, or 30 days when you choose Keep me signed in.</p></Part>
      <Part title="6. Updates to This Policy"><p>We may update this Cookie Policy to reflect changes in our practices or for operational, legal, or regulatory reasons. The &quot;Last updated&quot; date at the top indicates when the policy was last revised.</p></Part>
      <Part title="7. Contact Us"><p>If you have questions about our use of cookies, please contact us at <Mail />.</p></Part>
    </LegalPage>
  )
}
