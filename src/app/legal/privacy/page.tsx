import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — WELC Academy",
};

const UPDATED = "31 August 2026";

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: {UPDATED}</p>

      <p>
        This policy explains what personal data WELC Academy (위준성 영어 라이프
        컨설팅) collects and how it is used. It is written to align with common
        data-protection principles including Korea&rsquo;s PIPA and the GDPR.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li>
          <strong>Account details</strong> — name, email address, and optionally
          a phone number.
        </li>
        <li>
          <strong>Role &amp; enrolment</strong> — whether you are an owner,
          teacher, or student, and your class assignments.
        </li>
        <li>
          <strong>Activity data</strong> — attendance records, session hours,
          and messages exchanged through the platform.
        </li>
        <li>
          <strong>Technical data</strong> — sign-in timestamps and basic request
          metadata used for security and rate-limiting.
        </li>
      </ul>

      <h2>2. How we use it</h2>
      <p>
        Data is used solely to operate the academy: scheduling, tracking
        attendance and teacher hours, enabling academy communication, securing
        accounts, and producing summaries for the academy owner. We do not sell
        your data or use it for third-party advertising.
      </p>

      <h2>3. Message privacy</h2>
      <p>
        Messages are stored encrypted. The platform restricts who can contact
        whom: the academy owner may message members, members may reply to the
        owner, and members cannot message each other through the platform.
      </p>

      <h2>4. Processors</h2>
      <p>
        We use Supabase (database, authentication) and Vercel (hosting), and an
        AI provider to power the in-app assistant. These providers process data
        on our behalf under their own security commitments. Assistant
        conversations are subject to input sanitisation and rate limits.
      </p>

      <h2>5. Retention</h2>
      <p>
        We keep your data for as long as your account is active. When an account
        is deleted, associated personal data is removed or anonymised, except
        where we must retain limited records to meet legal obligations.
      </p>

      <h2>6. Your rights — access, export, deletion</h2>
      <p>
        You may request a copy of your data or ask us to delete your account and
        associated personal data. To do so, use the &ldquo;Download my
        data&rdquo; and &ldquo;Delete my account&rdquo; controls in{" "}
        <a href="/settings">Settings</a>, or contact the academy directly. We
        respond to verified requests within a reasonable period.
      </p>

      <h2>7. Security</h2>
      <p>
        Access to data is enforced at the database level (row-level security),
        privileged actions are authorised server-side, and the owner account is
        protected with two-factor authentication. No system is perfectly secure,
        but we work to protect your information and to detect issues quickly.
      </p>

      <h2>8. Children</h2>
      <p>
        Where students are minors, enrolment and data processing are carried out
        with the involvement of a parent or guardian as required by local law.
      </p>

      <h2>9. Contact</h2>
      <p>
        For any privacy request or question, contact the academy through the
        platform or at the contact details provided on enrolment.
      </p>
    </>
  );
}
