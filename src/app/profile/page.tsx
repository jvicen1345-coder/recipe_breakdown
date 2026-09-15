import { redirect } from "next/navigation";

import { ProfileClient } from "@/components/ProfileClient";
import { isAdminUser } from "@/lib/admin";
import { getSessionUserId } from "@/lib/auth";
import { getTrustInfo, POINTS_FOR_FREE_PRO_MONTH } from "@/lib/community";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  const [trust, isAdmin] = await Promise.all([getTrustInfo(userId), isAdminUser(userId)]);

  return (
    <ProfileClient
      email={user.email}
      name={user.name}
      showThisWeekCard={user.showThisWeekCard}
      emailVerified={user.emailVerified}
      plan={user.plan}
      points={user.points}
      pointsForFreePro={POINTS_FOR_FREE_PRO_MONTH}
      trustLevel={trust.level}
      trustBadge={trust.badge}
      isAdmin={isAdmin}
    />
  );
}
