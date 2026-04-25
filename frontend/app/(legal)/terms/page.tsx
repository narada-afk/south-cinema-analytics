import type { Metadata } from 'next'
import {
  LegalDoc, Section, LegalTable, LegalList, Callout, LegalNav,
} from '@/components/legal/LegalComponents'

export const metadata: Metadata = {
  title: 'Terms of Use — CineTrace',
  description:
    'CineTrace Terms of Use: your rights, responsibilities and the rules that govern use of the platform.',
}

const LAST_UPDATED = '25 April 2026'

export default function TermsPage() {
  return (
    <>
      <LegalNav current="terms" />

      <h1 className="text-2xl font-bold text-white mb-1">Terms of Use</h1>
      <p className="text-xs text-white/35 mb-8">Last Updated: {LAST_UPDATED}</p>

      <LegalDoc>

        <Section title="1. About CineTrace">
          <p>
            CineTrace is a non-commercial, fan-run analytics and discovery platform dedicated to
            South Indian cinema. We aggregate publicly available data to help enthusiasts explore,
            compare and discover films, actors and directors across Telugu, Tamil, Malayalam and
            Kannada cinema.
          </p>
          <p>
            CineTrace is an <strong className="text-white">independent project</strong>. It is
            not affiliated with, sponsored by, endorsed by, or officially connected to any film
            studio, production house, actor, director, The Movie Database (TMDb), Wikipedia, the
            Wikimedia Foundation, or any other third-party source referenced on this platform.
          </p>
        </Section>

        <Section title="2. Acceptance of These Terms">
          <p>
            By accessing or using cinetrace.in ("the Site"), you agree to be bound by these Terms
            of Use ("Terms"). <strong className="text-white">Continued use of the Site constitutes
            your acceptance</strong> of the most current version of these Terms (browse-wrap
            acceptance).
          </p>
          <p>
            Where the Site offers interactive features — such as contact forms — you will be asked
            to click <strong className="text-white">"I Agree"</strong> before proceeding. That
            click is your express, affirmative consent (click-wrap acceptance) to these Terms and
            our Privacy Policy.
          </p>
          <p>If you do not agree, please stop using the Site immediately.</p>
        </Section>

        <Section title="3. Third-Party Data Sources">
          <LegalTable
            headers={['Source', 'What We Use']}
            rows={[
              ['The Movie Database (TMDb)', 'Film metadata, cast lists, box-office estimates, poster images, actor photographs'],
              ['Wikipedia', 'Biographical summaries, filmography records, career timelines'],
              ['Wikidata', 'Structured film and person data'],
            ]}
          />
          <p className="mt-3">
            Our use of TMDb data is subject to the{' '}
            <a
              href="https://www.themoviedb.org/terms-of-use"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              TMDb Terms of Use
            </a>
            . CineTrace is not endorsed or certified by TMDb. Wikipedia text is used under
            CC BY-SA; Wikidata content is used under CC0.
          </p>
        </Section>

        <Section title="4. Images and Posters">
          <p>
            Film posters, actor photographs and other visual assets are sourced from TMDb and
            other publicly accessible repositories.{' '}
            <strong className="text-white">
              All rights in those images remain with their respective original owners
            </strong>{' '}
            — including studios, distributors, photographers and other rights-holders who created
            or commissioned them.
          </p>
          <p>
            CineTrace displays these images solely for non-commercial, informational and fan
            purposes. We do not claim ownership over any third-party image. Rights-holders may
            write to{' '}
            <a href="mailto:copyright@cinetrace.in" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              copyright@cinetrace.in
            </a>.
          </p>
        </Section>

        <Section title="5. CineTrace Intellectual Property">
          <p>
            Except for third-party content described above, the following are owned by or licensed
            to CineTrace and protected by applicable Indian and international intellectual property
            law:
          </p>
          <LegalList items={[
            'The CineTrace name, logo and brand identity',
            'Site design, layout, UI components and visual language',
            'Original editorial text, insight descriptions and analytical commentary',
            'Underlying software code and algorithms',
          ]} />
          <p>
            You may not copy, reproduce, modify, distribute or create derivative works from
            CineTrace's original content without prior written permission, except for personal,
            non-commercial use (for example, sharing a screenshot with clear attribution to
            "CineTrace — cinetrace.in").
          </p>
        </Section>

        <Section title="6. Permitted Uses">
          <LegalList items={[
            'Personal, non-commercial browsing and exploration',
            'Sharing links to pages on the Site',
            'Screenshots or short excerpts in personal blogs, reviews or social media posts, attributed to "CineTrace (cinetrace.in)"',
            'Personal academic or research use with appropriate attribution',
          ]} />
        </Section>

        <Section title="7. Prohibited Uses">
          <LegalList ordered items={[
            'Scraping, crawling or systematically extracting data from the Site using automated tools',
            'Reproducing, redistributing or reselling any content for commercial purposes',
            'Posting, transmitting or linking to defamatory, abusive, obscene or unlawful content about any person',
            'Attempting to reverse-engineer or gain unauthorised access to the Site\'s backend systems or databases',
            'Using the Site in any manner that violates applicable Indian law',
            'Impersonating CineTrace, its contributors, any actor, studio or third party',
            'Uploading, injecting or transmitting malware, viruses or harmful code',
          ]} />
        </Section>

        <Section title="8. Third-Party Links">
          <p>
            The Site may contain links to external websites such as TMDb, Wikipedia and YouTube.
            These links are provided for convenience only. CineTrace has no control over and
            accepts no responsibility for the content, privacy practices or availability of any
            external site. Inclusion of a link does not imply endorsement.
          </p>
        </Section>

        <Section title="9. Accuracy Disclaimer">
          <Callout>
            <strong className="text-white">Important:</strong> Box-office figures are estimates
            from publicly available data and do not reflect official, audited or certified results.
            Film rankings, ratings and career statistics are analytical outputs only.{' '}
            <strong className="text-white">The Platform is for informational and entertainment
            purposes only. CineTrace does not guarantee the accuracy, completeness or reliability
            of any data displayed.</strong>
          </Callout>
        </Section>

        <Section title="10. Disclaimers and Warranties">
          <p className="uppercase text-[10px] tracking-wide text-white/40 leading-loose">
            The site is provided on an "as is" and "as available" basis without warranties of
            any kind, express or implied. To the fullest extent permitted by applicable law,
            CineTrace disclaims all warranties including implied warranties of merchantability,
            fitness for a particular purpose and non-infringement. We do not warrant that the
            Site will be uninterrupted, error-free, or free of harmful components.
          </p>
        </Section>

        <Section title="11. Limitation of Liability">
          <p className="uppercase text-[10px] tracking-wide text-white/40 leading-loose">
            To the maximum extent permitted by applicable Indian law, CineTrace and its
            contributors shall not be liable for any indirect, incidental, special, consequential
            or punitive damages arising out of your use of the Site. Our total aggregate liability
            for any claim shall not exceed ₹1,000 (Indian Rupees One Thousand).
          </p>
        </Section>

        <Section title="12. Indemnification">
          <p>
            You agree to indemnify, defend and hold harmless CineTrace and its contributors from
            any claims, liabilities, damages, losses, costs and expenses (including reasonable
            legal fees) arising from your breach of these Terms, your violation of any third
            party's rights, or any content you submit to the Site.
          </p>
        </Section>

        <Section title="13. Governing Law and Jurisdiction">
          <p>
            These Terms are governed by and construed in accordance with the{' '}
            <strong className="text-white">laws of India</strong>, including the Information
            Technology Act, 2000 and the Copyright Act, 1957. Any dispute arising from or in
            connection with these Terms shall be subject to the exclusive jurisdiction of the{' '}
            <strong className="text-white">courts in India</strong>.
          </p>
        </Section>

        <Section title="14. Modifications to These Terms">
          <p>
            We may update these Terms at any time. The "Last Updated" date at the top of this
            page will change to reflect revisions. For material changes, we will display a
            prominent notice on the Site homepage for at least 14 days. Continued use of the
            Site after updated Terms are posted constitutes your acceptance.
          </p>
        </Section>

        <Section title="15. Contact">
          <LegalTable
            headers={['Purpose', 'Contact']}
            rows={[
              ['General legal enquiries', 'legal@cinetrace.in'],
              ['Grievance Officer (Owner)', 'Mr Narada — connectnarada@gmail.com'],
              ['Copyright complaints', 'copyright@cinetrace.in'],
            ]}
          />
        </Section>

      </LegalDoc>
    </>
  )
}
