import Link from "next/link";
import { Clause, LegalFooterNote, LegalHeader } from "@/components/site/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata = {
  title: "Terms & Conditions",
  alternates: { canonical: "/terms" },
  description: "The agreement between you and TrackMyself when you use the service.",
};

export default function TermsPage() {
  return (
    <>
      <LegalHeader
        title="Terms & Conditions"
        intro={`These terms govern your use of ${LEGAL.service} at ${LEGAL.site}. By creating an account or using the browser tools, you agree to them. If you do not agree, please do not use the service.`}
      />

      <Clause n={1} title="Who we are and what this is">
        <p>
          {LEGAL.service} is a job application tracker. It lets you record the roles you have
          applied for, track their progress through interview stages, build CV documents, and use a
          set of browser-based utilities. It is operated by {LEGAL.operator}.
        </p>
        <p>
          These terms form a binding agreement between you and {LEGAL.operator}. Where we say
          &ldquo;we&rdquo;, &ldquo;us&rdquo; or &ldquo;our&rdquo;, we mean the operator. Where we say
          &ldquo;you&rdquo;, we mean the person using the service.
        </p>
      </Clause>

      <Clause n={2} title="Your account">
        <ul>
          <li>You must be at least 16 years old to create an account.</li>
          <li>
            You may register with an email and password, or sign in with Google. You are responsible
            for keeping your credentials secure and for everything done through your account.
          </li>
          <li>
            Give accurate registration details. Do not impersonate anyone or create an account on
            someone else&apos;s behalf without their permission.
          </li>
          <li>Tell us promptly if you believe your account has been accessed without your authorisation.</li>
        </ul>
      </Clause>

      <Clause n={3} title="Free and Premium">
        <p>
          Tracking applications, interview stages, documents and the browser tools are available on
          the free plan. Premium adds AI-assisted CV tailoring, full-resolution image exports and
          additional file formats.
        </p>
        <p>
          There is currently no automated billing. Premium is granted manually by an administrator,
          and we do not collect or process payment card details. If we introduce paid subscriptions,
          we will publish the pricing and payment terms before charging anyone, and you will be free
          to decline.
        </p>
      </Clause>

      <Clause n={4} title="Your content">
        <p>
          Everything you enter or upload — application records, CV details, documents, images — is
          yours. You keep all rights in it. We claim no ownership.
        </p>
        <p>
          You grant us only the permission we need to run the service: to store your content, display
          it back to you, and process it to produce the documents you ask for. That permission ends
          when you delete the content or your account.
        </p>
        <p>
          You are responsible for what you upload. Do not upload content you have no right to use, or
          anything unlawful, malicious or infringing.
        </p>
      </Clause>

      <Clause n={5} title="AI-assisted features">
        <p>
          Premium accounts can ask the service to tailor a CV to a job description, or to draft a
          banner from a prompt. When you use these features, the text you submit is sent to our AI
          provider to generate that result. This only happens when you actively request it.
        </p>
        <p>
          AI output is a draft, not advice. It can be wrong, generic or unsuitable. Review anything
          it produces before you send it to an employer. You remain responsible for the accuracy of
          your own CV and applications.
        </p>
      </Clause>

      <Clause n={6} title="The browser tools">
        <p>
          The image optimizer, PDF splitter, JD analyser, background remover, profile image generator
          and banner generator run inside your browser. The files you open with them are processed on
          your own device and are not uploaded to us.
        </p>
        <p>
          The background remover and profile image generator download an open-source model file to
          your browser the first time you use them. Your images are never transmitted; only the model
          travels, and it travels to you.
        </p>
      </Clause>

      <Clause n={7} title="Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>break the law, or use the service to harm, harass or defraud anyone;</li>
          <li>attempt to access another user&apos;s account, data or documents;</li>
          <li>probe, scan or test the security of the service, or bypass its access controls;</li>
          <li>scrape the service, or automate access in a way that degrades it for others;</li>
          <li>resell or redistribute the service without our written permission;</li>
          <li>upload malware, or anything designed to interfere with the service.</li>
        </ul>
        <p>
          We apply rate limits to some public endpoints to keep the service available. Attempting to
          evade them is a breach of these terms.
        </p>
      </Clause>

      <Clause n={8} title="Availability and changes">
        <p>
          We work to keep the service running, but we do not promise uninterrupted availability. We
          may change, suspend or discontinue features, and we may perform maintenance that makes the
          service temporarily unavailable.
        </p>
        <p>
          If we make a material change to these terms, we will update the date at the top of this
          page and, where the change significantly affects your rights, give notice in the service.
          Continuing to use {LEGAL.service} after a change means you accept the updated terms.
        </p>
      </Clause>

      <Clause n={9} title="Ending your use">
        <p>
          You may stop using the service at any time. Two controls sit on your profile page:{" "}
          <strong>pause</strong>, which freezes application tracking while keeping every record and
          leaving the CV builder and tools available, and <strong>delete</strong>, which erases the
          account and everything attached to it as described in the{" "}
          <Link href="/privacy">Privacy Policy</Link>. Pausing is reversible in one click; deletion
          is immediate and permanent, so export what you want to keep before confirming it.
        </p>
        <p>
          We may pause, suspend or terminate an account that breaches these terms, that we are
          legally required to remove, or that is being used to harm others. Where it is reasonable to
          do so, we will tell you why.
        </p>
      </Clause>

      <Clause n={10} title="Disclaimers">
        <p>
          {LEGAL.service} is provided &ldquo;as is&rdquo;. We do not warrant that it will be
          error-free, that documents it generates will be accepted by any employer or applicant
          tracking system, or that using it will result in interviews or job offers.
        </p>
        <p>
          Nothing in the service is legal, immigration, financial or career advice. CV format
          conventions differ by country and employer; check the requirements that apply to you.
        </p>
      </Clause>

      <Clause n={11} title="Liability">
        <p>
          To the extent the law allows, we are not liable for indirect or consequential loss, lost
          opportunities, lost profits, or loss of data beyond what we are required to restore.
        </p>
        <p>
          Nothing here limits liability that cannot lawfully be limited — including for death or
          personal injury caused by negligence, or for fraud. Some jurisdictions do not allow certain
          exclusions, in which case only the exclusions permitted there apply to you.
        </p>
        <p>
          Keep your own copies of documents that matter to you. Do not rely on the service as your
          only copy.
        </p>
      </Clause>

      <Clause n={12} title="Governing law">
        <p>
          These terms are governed by the laws of {LEGAL.jurisdiction}, without regard to conflict of
          law rules. If you are a consumer resident elsewhere, you keep the benefit of any mandatory
          consumer protections of your country of residence.
        </p>
      </Clause>

      <Clause n={13} title="Contact">
        <p>
          Questions about these terms: <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </Clause>

      <LegalFooterNote />
    </>
  );
}
