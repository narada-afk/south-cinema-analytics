import type { Metadata } from 'next'
import {
  LegalDoc, Section, LegalList, Callout, Warning, LegalNav,
} from '@/components/legal/LegalComponents'

export const metadata: Metadata = {
  title: 'Copyright Policy — CineTrace',
  description:
    'How to submit a copyright takedown notice or counter-notice to CineTrace, and our repeat-infringer policy.',
}

const LAST_UPDATED = '25 April 2026'
const COPYRIGHT_EMAIL = 'copyright@cinetrace.in'

export default function CopyrightPage() {
  return (
    <>
      <LegalNav current="copyright" />

      <h1 className="text-2xl font-bold text-white mb-1">Copyright & Takedown Policy</h1>
      <p className="text-xs text-white/35 mb-8">Last Updated: {LAST_UPDATED}</p>

      <LegalDoc>

        <Section title="1. Our Commitment">
          <p>
            CineTrace respects the intellectual property rights of creators, studios,
            photographers and all rights-holders. We respond promptly to valid and complete
            copyright complaints, and will remove or disable access to allegedly infringing
            content in accordance with this Policy.
          </p>
        </Section>

        <Section title="2. What We Display and Why">
          <p>
            Most visual assets on CineTrace — including film posters and actor photographs —
            are sourced through the <strong className="text-white">TMDb API</strong>. Textual
            and structured data comes from{' '}
            <strong className="text-white">Wikipedia</strong> and{' '}
            <strong className="text-white">Wikidata</strong> under their respective open licences.
          </p>
          <p>
            All content is displayed for{' '}
            <strong className="text-white">
              non-commercial, fan, educational and informational purposes only
            </strong>
            . CineTrace does not sell, modify or commercially exploit any third-party content.
          </p>
        </Section>

        <Section title="3. Submitting a Takedown Notice">
          <p>
            If you are a copyright owner or authorised agent and believe that content on CineTrace
            infringes your copyright, please send a written notice to:
          </p>

          <Callout>
            <p>
              <strong className="text-white">Email:</strong>{' '}
              <a
                href={`mailto:${COPYRIGHT_EMAIL}`}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {COPYRIGHT_EMAIL}
              </a>
            </p>
            <p className="mt-1">
              <strong className="text-white">Subject line:</strong>{' '}
              <span className="font-mono text-xs text-white/60 bg-white/[0.06] px-1.5 py-0.5 rounded">
                Copyright Takedown Notice — [brief description of content]
              </span>
            </p>
          </Callout>

          <p className="mt-4">
            Your notice <strong className="text-white">must include all of the following</strong>.
            Incomplete notices may not be processed.
          </p>

          <LegalList ordered items={[
            <><strong className="text-white/80">Your identity</strong> — full name, organisation (if applicable), postal address, email address and telephone number</>,
            <><strong className="text-white/80">Identification of the copyrighted work</strong> — a clear description of the work you claim has been infringed, or a representative list if multiple works are affected</>,
            <><strong className="text-white/80">Identification of the infringing material</strong> — the specific URL or URLs on cinetrace.in where the allegedly infringing content appears, with enough detail for us to locate it</>,
            <><strong className="text-white/80">Statement of good faith</strong> — a statement that you have a good-faith belief the use of the material is not authorised by the copyright owner, its agent, or applicable law</>,
            <><strong className="text-white/80">Statement of accuracy</strong> — a statement that the information in your notice is accurate and, under penalty of perjury, that you are the copyright owner or authorised to act on their behalf</>,
            <><strong className="text-white/80">Signature</strong> — your physical or electronic signature</>,
          ]} />
        </Section>

        <Section title="4. Our Response Process">
          <p>Upon receiving a complete and valid notice, we will:</p>
          <LegalList ordered items={[
            <>Acknowledge receipt within <strong className="text-white">5 business days</strong></>,
            'Review the notice for completeness and apparent validity',
            <>If valid, remove or disable access to the identified content within <strong className="text-white">10 business days</strong> of acknowledgement</>,
            'Notify the submitter once the content has been removed or disabled',
          ]} />
        </Section>

        <Section title="5. Filing a Counter-Notice">
          <p>
            If you believe content was removed as a result of a mistaken or misidentified
            takedown notice, you may file a counter-notice to:
          </p>

          <Callout>
            <p>
              <strong className="text-white">Email:</strong>{' '}
              <a
                href={`mailto:${COPYRIGHT_EMAIL}`}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {COPYRIGHT_EMAIL}
              </a>
            </p>
            <p className="mt-1">
              <strong className="text-white">Subject line:</strong>{' '}
              <span className="font-mono text-xs text-white/60 bg-white/[0.06] px-1.5 py-0.5 rounded">
                Copyright Counter-Notice — [description of removed content]
              </span>
            </p>
          </Callout>

          <p className="mt-4">Your counter-notice must include:</p>
          <LegalList ordered items={[
            'Your full name, postal address, email address and telephone number',
            'The specific URL(s) and a description of the content that was removed',
            <>A statement, under penalty of perjury, that you have a good-faith belief the content was removed or disabled as a result of a mistake or misidentification of the material</>,
            <>A statement that you consent to the jurisdiction of the <strong className="text-white">courts in India</strong> for any legal proceedings arising from the counter-notice</>,
            'Your physical or electronic signature',
          ]} />

          <p>
            Upon receiving a valid counter-notice, we will forward it to the original complainant
            and restore the content within{' '}
            <strong className="text-white">10–14 business days</strong>, unless the complainant
            notifies us they have commenced legal proceedings in a court of competent jurisdiction
            in India.
          </p>
        </Section>

        <Section title="6. Repeat-Infringer Policy">
          <p>
            CineTrace maintains a strict policy regarding repeat infringers. Any user or
            contributor who is the subject of{' '}
            <strong className="text-white">
              three or more valid copyright complaints within any 12-month period
            </strong>{' '}
            may have their access to the Site permanently suspended or terminated.
          </p>
        </Section>

        <Section title="7. False or Fraudulent Notices">
          <Warning>
            Submitting a materially false or fraudulent takedown notice or counter-notice may
            expose you to civil liability under applicable law. Please ensure that all statements
            in your notice are accurate and made in good faith before submitting.
          </Warning>
        </Section>

        <Section title="8. Content Originating on TMDb">
          <p>
            If the content you are concerned about originated on the TMDb platform — for example,
            a poster or photograph uploaded by a TMDb contributor — we encourage you to contact
            TMDb directly through their designated copyright contact, in addition to notifying us.
            CineTrace will cooperate fully with any coordinated removal process.
          </p>
        </Section>

      </LegalDoc>
    </>
  )
}
