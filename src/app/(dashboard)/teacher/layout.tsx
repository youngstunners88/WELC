import { requireRole } from "@/lib/auth/guard";

// Teaching segment — open to teachers and to owners who also teach.
export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["owner", "teacher"]);
  return <>{children}</>;
}
