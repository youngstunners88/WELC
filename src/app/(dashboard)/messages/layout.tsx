import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guard";

// Member inbox — teachers and students only. The owner has the richer
// /owner/messages console, so bounce owners there.
export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await requireRole(["owner", "teacher", "student"]);
  if (role === "owner") redirect("/owner/messages");
  return <>{children}</>;
}
