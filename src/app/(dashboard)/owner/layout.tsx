import { requireRole } from "@/lib/auth/guard";

// Owner-only segment. Wrong-role users are bounced to their own home.
export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["owner"]);
  return <>{children}</>;
}
