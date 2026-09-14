import { redirect } from "next/navigation";

import { ProfileClient } from "@/components/ProfileClient";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  return (
    <ProfileClient
      email={user.email}
      name={user.name}
      showThisWeekCard={user.showThisWeekCard}
      emailVerified={user.emailVerified}
      plan={user.plan}
    />
  );
}
