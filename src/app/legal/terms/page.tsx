import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — WELC Academy",
};

const UPDATED = "31 August 2026";

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: {UPDATED}</p>

      <p>
        These Terms govern your use of the WELC Academy platform (&ldquo;the
        Service&rdquo;), operated by 위준성 영어 라이프 컨설팅 (Wejoonseong
        English Life Consulting). By creating an account or using the Service you
        agree to these Terms.
      </p>

      <h2>1. Accounts</h2>
      <p>
        You must provide accurate information when registering. You are
        responsible for keeping your login credentials secure and for all
        activity under your account. Owner and teacher roles are granted by the
        academy; requesting a role does not guarantee it.
      </p>

      <h2>2. Acceptable use</h2>
      <p>
        You agree not to misuse the Service, including attempting to access data
        that is not yours, disrupting other users, or using automated means to
        overload the platform. Teacher–student communication is limited to the
        features the platform provides and must remain appropriate and
        education-related.
      </p>

      <h2>3. Content</h2>
      <p>
        Messages, attendance records, and materials you submit remain associated
        with your account. You grant the academy the right to store and process
        this content solely to operate the Service.
      </p>

      <h2>4. Availability</h2>
      <p>
        The Service is provided on an &ldquo;as is&rdquo; basis. We work to keep
        it available and accurate but do not guarantee uninterrupted access or
        that it will be error-free.
      </p>

      <h2>5. Termination</h2>
      <p>
        The academy may suspend or remove accounts that violate these Terms. You
        may request deletion of your account at any time (see the{" "}
        <a href="/legal/privacy">Privacy Policy</a>).
      </p>

      <h2>6. Changes</h2>
      <p>
        We may update these Terms. Material changes will be reflected by the
        &ldquo;Last updated&rdquo; date above. Continued use after a change
        constitutes acceptance.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions about these Terms: contact the academy directly through the
        platform or at the contact details provided to you on enrolment.
      </p>
    </>
  );
}
