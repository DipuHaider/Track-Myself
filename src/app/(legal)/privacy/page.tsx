import Link from "next/link";
import { Clause, LegalFooterNote, LegalHeader } from "@/components/site/LegalPage";
import { LEGAL, SUBPROCESSORS } from "@/lib/legal";

export const metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
  description: "What TrackMyself collects, why, who it is shared with, and how to get it deleted.",
};

export default function PrivacyPage() {
  return (
    <>
      <LegalHeader
        title="Privacy Policy"
        intro={`This policy explains what ${LEGAL.service} collects, why we collect it, who else can see it, and how to get it back or deleted. It describes what the software actually does, not what we might do one day.`}
      />

      <Clause n={1} title="Who is responsible">
        <p>
          {LEGAL.operator} operates {LEGAL.service} and decides how your data is handled — in data
          protection terms, we are the controller. For any privacy question or request, write to{" "}
          <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>.
        </p>
      </Clause>

      <Clause n={2} title="What we collect">
        <p><strong>Account details.</strong> Your name, email address, and either a password (stored only as a bcrypt hash — we never see the original) or a Google account identifier. If you sign in with Google we also store the profile picture URL Google gives us. We record your role and plan.</p>
        <p><strong>Application records.</strong> Whatever you enter about the jobs you apply for: company, role, platform, status, dates, salary, contact details, job post links, notes, and any attachments you add.</p>
        <p><strong>Interview records.</strong> Stage names, statuses, scheduled dates, feedback and notes.</p>
        <p><strong>CV profile.</strong> The details you enter in the CV builder. Depending on which formats you use, this can include your address, date of birth, nationality and photograph, because the Europass and Lebenslauf formats expect them. These fields are optional — the ATS CV never prints them.</p>
        <p><strong>Documents you upload.</strong> CVs, resumes, cover letters, certificates, a profile picture and a cover image. These are stored in our database.</p>
        <p><strong>Technical data.</strong> Standard server and hosting logs, including IP address and browser type, kept for security and troubleshooting.</p>
      </Clause>

      <Clause n={3} title="What we deliberately do not collect">
        <ul>
          <li><strong>Files you open in the browser tools.</strong> The image optimizer, PDF splitter, JD analyser, background remover, profile image generator and banner generator all run on your device. Those files are never uploaded to us.</li>
          <li><strong>Payment details.</strong> There is no billing system, so no card data reaches us.</li>
          <li><strong>Advertising or cross-site tracking.</strong> We run no advertising trackers and no third-party analytics profiling.</li>
          <li><strong>Special category data by design.</strong> We do not ask for health, religious, political or biometric information. Please do not put it in free-text notes.</li>
        </ul>
      </Clause>

      <Clause n={4} title="Why we use it, and our legal basis">
        <ul>
          <li><strong>To provide the service</strong> — storing your applications, generating your documents, signing you in. Basis: performance of our contract with you.</li>
          <li><strong>To keep the service secure</strong> — rate limiting, abuse prevention, logs. Basis: our legitimate interest in a working, safe service.</li>
          <li><strong>To operate AI features</strong> — only when you actively request a tailored CV or a banner draft. Basis: performance of the contract, at your request.</li>
          <li><strong>To meet legal obligations</strong> where they apply.</li>
        </ul>
        <p>We do not sell your personal data, and we do not use it to train AI models.</p>
      </Clause>

      <Clause n={5} title="Who else processes it">
        <p>
          We use a small number of service providers. They act on our instructions and may not use
          your data for their own purposes.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-xs">
            <thead className="surface-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Provider</th>
                <th className="px-3 py-2 font-medium">Purpose</th>
                <th className="px-3 py-2 font-medium">Data involved</th>
              </tr>
            </thead>
            <tbody>
              {SUBPROCESSORS.map((p) => (
                <tr key={p.name} className="border-t">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="text-muted px-3 py-2">{p.role}</td>
                  <td className="text-muted px-3 py-2">{p.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          Content you send to the AI features is used to answer that one request. It is not used to
          train models.
        </p>
      </Clause>

      <Clause n={6} title="Who can see your data inside the service">
        <p>
          Your applications and documents are private to your account. Other ordinary users cannot
          see them.
        </p>
        <p>
          Administrative roles exist so the platform can be maintained. Accounts with editor,
          administrator or superadministrator permissions can see application records across the
          platform, and can see which users hold CV documents together with counts and storage
          sizes. Administrators can change a user&apos;s role or plan, and can edit or delete
          application records. Permissions are configurable, and every administrative action is
          checked on the server.
        </p>
      </Clause>

      <Clause n={7} title="Cookies and local storage">
        <ul>
          <li><strong>Session cookie.</strong> Set when you sign in, so the service knows it is you. Strictly necessary; it expires after 30 days or when you sign out.</li>
          <li><strong>Local storage.</strong> Your theme choice and whether the sidebar is collapsed. These stay in your browser and are never sent to us.</li>
          <li><strong>Browser cache.</strong> The background-removal model file is cached by your browser after first use so it does not download again.</li>
        </ul>
        <p>We set no advertising or analytics cookies, which is why you are not asked to consent to any.</p>
      </Clause>

      <Clause n={8} title="How long we keep it, pausing, and deletion">
        <p>
          Account and application data is kept while your account exists. There is no automatic
          expiry and we do not delete inactive accounts on your behalf.
        </p>
        <p>
          <strong>Pausing.</strong> You can put your account on hold from your profile page. Pausing
          freezes application tracking — nothing can be added or edited — while leaving every record
          readable and the CV builder, document library and browser tools working. Pausing deletes
          nothing and changes nothing about what we hold; it is a state you can leave again with one
          click. An administrator can also pause an account where the service is being misused.
        </p>
        <p>
          <strong>Deletion.</strong> You can erase your account yourself, at any time, from your
          profile page — no request to us, no waiting period. You confirm by typing DELETE and, if
          your account has a password, by entering it. This removes the account record together with
          every application, interview record, reminder, CV profile and uploaded document attached to
          it, in a single operation. It is immediate and cannot be undone, so export anything you
          want to keep first. Superadministrator accounts are the one exception and must be removed
          by another superadministrator, because self-deletion would lock the platform. An
          administrator deleting an account from the dashboard erases the same records.
        </p>
        <p>
          Backups and server logs may retain copies for a short period before they age out.
        </p>
      </Clause>

      <Clause n={9} title="Your rights">
        <p>Depending on where you live, you may have the right to:</p>
        <ul>
          <li>ask what we hold about you, and get a copy;</li>
          <li>correct anything inaccurate;</li>
          <li>have your data deleted;</li>
          <li>receive your data in a portable format;</li>
          <li>restrict or object to certain processing;</li>
          <li>withdraw consent where processing relies on it;</li>
          <li>complain to your data protection authority.</li>
        </ul>
        <p>
          Much of this you can do yourself: edit or delete any application, remove any uploaded
          document, export your CV as a Word file, pause your account, or delete the account and
          everything in it from your profile page. For anything else, email{" "}
          <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a> and we will respond within
          30 days.
        </p>
      </Clause>

      <Clause n={10} title="Security">
        <p>
          Passwords are hashed with bcrypt and never stored in readable form. Sessions use signed
          tokens. Every route that returns your data checks your identity on the server and scopes
          the query to your account.
        </p>
        <p>
          No service can promise perfect security. Use a strong, unique password, and be careful
          about the personal detail you put into free-text notes.
        </p>
      </Clause>

      <Clause n={11} title="International transfers">
        <p>
          Our hosting and database providers operate globally, so your data may be processed outside
          your country. Where data protection law requires it, transfers rely on the appropriate
          safeguards those providers offer, such as standard contractual clauses.
        </p>
      </Clause>

      <Clause n={12} title="Children">
        <p>
          {LEGAL.service} is not intended for anyone under 16. If you believe a child has given us
          personal data, contact us and we will delete it.
        </p>
      </Clause>

      <Clause n={13} title="Changes to this policy">
        <p>
          If this policy changes we will update the date at the top of the page, and give notice in
          the service where the change materially affects you. Our{" "}
          <Link href="/terms">Terms &amp; Conditions</Link> apply alongside this policy.
        </p>
      </Clause>

      <LegalFooterNote />
    </>
  );
}
