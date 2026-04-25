import type { Metadata } from 'next'
import {
  LegalDoc, Section, LegalTable, LegalList, Callout, LegalNav,
} from '@/components/legal/LegalComponents'

export const metadata: Metadata = {
  title: 'Privacy Policy — CineTrace',
  description:
    'How CineTrace collects, uses and protects your personal data, and your rights under Indian law.',
}

const LAST_UPDATED = '25 April 2026'

export default function PrivacyPage() {
  return (
    <>
      <LegalNav current="privacy" />

      <h1 className="text-2xl font-bold text-white mb-1">Privacy Policy</h1>
      <p className="text-xs text-white/35 mb-8">Last Updated: {LAST_UPDATED}</p>

      <LegalDoc>

        <Section title="1. Introduction">
          <p>
            This Privacy Policy explains how CineTrace ("we", "us", "our") handles information
            when you use our Site at cinetrace.in. We are committed to protecting your privacy
            in accordance with:
          </p>
          <LegalList items={[
            'The Information Technology Act, 2000 ("IT Act")',
            'The IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 ("SPDI Rules")',
            'The Digital Personal Data Protection Act, 2023 ("DPDP Act") and rules notified thereunder',
          ]} />
          <p>
            By using the Site, you acknowledge this Policy. Where specific consent is required,
            we ask for it explicitly.
          </p>
        </Section>

        <Section title="2. Who We Are">
          <p>
            CineTrace is a non-commercial fan platform. For data-protection purposes, we act as
            the <strong className="text-white">Data Fiduciary</strong> in respect of any personal
            data we process.
          </p>
          <p>
            Privacy contact:{' '}
            <a
              href="mailto:connectnarada@gmail.com"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              connectnarada@gmail.com
            </a>
          </p>
        </Section>

        <Section title="3. What Data We Collect and Why">
          <p>
            CineTrace is designed to collect the{' '}
            <strong className="text-white">minimum data necessary</strong>. You do not need to
            register an account to use the Site's core features.
          </p>

          <p className="mt-4 font-medium text-white/75">3a. Collected Automatically</p>
          <LegalTable
            headers={['Data', 'Purpose', 'Legal Basis']}
            rows={[
              ['IP address (anonymised within 24 hours)', 'Security and abuse prevention', 'Legitimate interest'],
              ['Browser type and operating system', 'Site optimisation', 'Legitimate interest'],
              ['Pages visited, time on page, referrer URL', 'Usage analytics', 'Consent (cookie)'],
              ['Approximate location — country / city, derived from IP', 'Regional analytics', 'Consent (cookie)'],
            ]}
          />

          <p className="mt-4 font-medium text-white/75">3b. Data You Provide Voluntarily</p>
          <p>If you use a contact form or email us directly:</p>
          <LegalTable
            headers={['Data', 'Purpose', 'Legal Basis']}
            rows={[
              ['Name', 'To address your query', 'Your consent'],
              ['Email address', 'To respond to your query', 'Your consent'],
              ['Message content', 'To handle your request', 'Your consent'],
            ]}
          />

          <Callout>
            We do <strong className="text-white">not</strong> collect sensitive personal data as
            defined under the SPDI Rules — including passwords, financial information, health data,
            biometric data, or government identity numbers. We collect no payment information.
          </Callout>

          <p className="mt-4 font-medium text-white/75">3c. Analytics Tools</p>
          <p>
            CineTrace uses the following analytics services to understand how the Site is used.
            No personally identifiable profiles are built for advertising purposes.
          </p>
          <LegalTable
            headers={['Tool', 'Provider', 'Purpose']}
            rows={[
              ['Google Analytics 4', 'Google LLC', 'Aggregate page-view and session metrics'],
              ['Microsoft Clarity', 'Microsoft Corp.', 'Session heatmaps and scroll behaviour (no PII stored)'],
              ['PostHog', 'PostHog Inc.', 'Product analytics and event tracking'],
            ]}
          />
          <p className="mt-2">
            Each provider operates under its own privacy policy. You can opt out of analytics
            cookies at any time via the Cookie Settings in the Site footer.
          </p>
        </Section>

        <Section title="4. Cookies">
          <p>
            Cookies are small text files stored on your device when you visit a website. We use
            them sparingly.
          </p>

          <LegalTable
            headers={['Cookie', 'Type', 'Purpose', 'Duration']}
            rows={[
              ['ct_consent', 'Essential', 'Records your cookie consent choice', '1 year'],
              ['_ga, _ga_*', 'Non-essential', 'Google Analytics 4 session and page metrics', '2 years'],
              ['_clck, _clsk', 'Non-essential', 'Microsoft Clarity session recording', '1 year / session'],
              ['ph_*', 'Non-essential', 'PostHog product analytics', 'Session / 1 year'],
            ]}
          />

          <p className="mt-3 font-medium text-white/75">Your Choices</p>
          <p>
            A consent banner appears on your first visit. You may{' '}
            <strong className="text-white">accept all cookies</strong> or{' '}
            <strong className="text-white">reject non-essential cookies</strong>. If you reject,
            only the essential consent cookie is stored and no analytics data is collected.
          </p>
          <p>
            You can change your preference at any time by clicking{' '}
            <strong className="text-white">"Cookie Settings"</strong> in the Site footer.
            Essential cookies are strictly necessary for the Site to function and cannot be
            disabled.
          </p>
        </Section>

        <Section title="5. Data Retention">
          <LegalTable
            headers={['Data Type', 'Retention Period']}
            rows={[
              ['Server logs (including raw IP addresses)', 'Deleted after 30 days'],
              ['Anonymised analytics data', 'Up to 24 months, then permanently deleted'],
              ['Contact-form submissions / emails', '12 months from submission, or until the matter is resolved — whichever is earlier'],
              ['Cookie consent records', '1 year'],
            ]}
          />
        </Section>

        <Section title="6. Sharing Your Data">
          <p>
            We do <strong className="text-white">not</strong> sell, rent or trade your personal
            data. We share data only in the following limited circumstances:
          </p>
          <LegalList items={[
            'With hosting and infrastructure providers (e.g. Vercel) under data-processing agreements, solely to operate and maintain the Site',
            'With analytics providers listed in Section 3c, under their respective data-processing terms',
            'With law enforcement or courts, only where required by applicable Indian law or a valid court order, or to protect the rights and safety of others',
          ]} />
        </Section>

        <Section title="7. Security">
          <p>
            We implement reasonable technical and organisational safeguards to protect your data:
          </p>
          <LegalList items={[
            'HTTPS encryption for all data in transit',
            'Access controls limiting who can reach backend systems and databases',
            'Regular dependency updates and security patching',
          ]} />
          <p>
            No system is completely secure. If you believe your data has been compromised, please
            contact us immediately at{' '}
            <a
              href="mailto:connectnarada@gmail.com"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              connectnarada@gmail.com
            </a>.
          </p>
        </Section>

        <Section title="8. Your Rights Under the DPDP Act 2023">
          <LegalTable
            headers={['Right', 'What It Means']}
            rows={[
              ['Access', 'Request a summary of the personal data we hold about you'],
              ['Correction', 'Ask us to correct inaccurate or incomplete data'],
              ['Erasure', 'Request deletion of your data, subject to legal obligations'],
              ['Withdrawal of consent', 'Withdraw previously given consent at any time; this does not affect the lawfulness of prior processing'],
              ['Grievance redressal', 'Lodge a complaint with our Grievance Officer'],
              ['Nomination', 'Nominate another individual to exercise rights on your behalf in the event of your death or incapacity'],
            ]}
          />
          <p className="mt-3">
            To exercise any right, email{' '}
            <a
              href="mailto:connectnarada@gmail.com"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              connectnarada@gmail.com
            </a>{' '}
            with the subject line{' '}
            <span className="text-white/70 font-mono text-xs bg-white/[0.06] px-1.5 py-0.5 rounded">
              Data Rights Request
            </span>
            . We will respond within <strong className="text-white">30 days</strong>.
          </p>
          <p>
            You may also lodge a complaint with the{' '}
            <strong className="text-white">Data Protection Board of India</strong> once formally
            constituted under the DPDP Act 2023.
          </p>
        </Section>

        <Section title="9. Grievance Officer">
          <Callout>
            <div className="space-y-1">
              <p><strong className="text-white">Grievance Officer:</strong> Mr Narada (Owner, CineTrace)</p>
              <p>
                <strong className="text-white">Email:</strong>{' '}
                <a href="mailto:connectnarada@gmail.com" className="text-indigo-400 hover:text-indigo-300">
                  connectnarada@gmail.com
                </a>
              </p>
              <p><strong className="text-white">Response time:</strong> Within 30 days of receiving a complaint</p>
            </div>
          </Callout>
        </Section>

        <Section title="10. Third-Party Services">
          <p>
            The Site displays content sourced through the TMDb API and from Wikipedia and Wikidata.
            When your browser loads that content, those providers may set their own cookies and
            collect data under their own privacy policies:
          </p>
          <LegalList items={[
            <a key="tmdb" href="https://www.themoviedb.org/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">TMDb Privacy Policy</a>,
            <a key="wiki" href="https://foundation.wikimedia.org/wiki/Privacy_policy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">Wikimedia Foundation Privacy Policy</a>,
            <a key="google" href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">Google Privacy Policy</a>,
            <a key="microsoft" href="https://privacy.microsoft.com/en-us/privacystatement" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">Microsoft Privacy Statement</a>,
            <a key="posthog" href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 transition-colors">PostHog Privacy Policy</a>,
          ]} />
          <p>CineTrace is not responsible for third-party data practices.</p>
        </Section>

        <Section title="11. Children's Privacy">
          <p>
            CineTrace is not directed at children under the age of 18. We do not knowingly collect
            personal data from minors. If you believe a child has submitted personal data through
            our Site, please contact{' '}
            <a href="mailto:connectnarada@gmail.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              connectnarada@gmail.com
            </a>{' '}
            and we will delete it promptly.
          </p>
        </Section>

        <Section title="12. Changes to This Policy">
          <p>
            We may update this Policy from time to time. The "Last Updated" date reflects the most
            recent revision. Material changes will be announced on the Site homepage for at least
            14 days. Continued use of the Site after changes are posted constitutes acceptance of
            the updated Policy.
          </p>
        </Section>

      </LegalDoc>
    </>
  )
}
