import { redirect } from "next/navigation";

import { AdminUsersClient } from "@/components/AdminUsersClient";
import { isAdminUser } from "@/lib/admin";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  if (!(await isAdminUser(userId))) redirect("/profile");

  return <AdminUsersClient />;
}
