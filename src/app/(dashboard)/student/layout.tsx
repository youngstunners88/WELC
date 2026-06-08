import { requireRole } from "@/lib/auth/guard";

// Student segment. Pending teachers carry the 'student' role and use these
// pages until an owner approves them, so 'student' is the correct gate.
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["student"]);
  return <>{children}</>;
}
