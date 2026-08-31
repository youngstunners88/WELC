import Link from "next/link";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-6 py-12">
      <Link
        href="/login"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← WELC Academy
      </Link>
      <article className="prose prose-sm mt-8 max-w-none prose-headings:font-bold prose-headings:text-[#0f1e4a]">
        {children}
      </article>
      <footer className="mt-12 flex gap-4 border-t pt-6 text-xs text-muted-foreground">
        <Link href="/legal/terms" className="hover:text-foreground">
          Terms of Service
        </Link>
        <Link href="/legal/privacy" className="hover:text-foreground">
          Privacy Policy
        </Link>
      </footer>
    </div>
  );
}
