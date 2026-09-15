import { redirect } from "next/navigation";

import { AdminCommunityClient } from "@/components/AdminCommunityClient";
import { isAdminUser } from "@/lib/admin";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminCommunityPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  if (!(await isAdminUser(userId))) redirect("/profile");

  return <AdminCommunityClient />;
}
