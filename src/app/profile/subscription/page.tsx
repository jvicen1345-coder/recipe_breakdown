import { redirect } from "next/navigation";

import { SubscriptionClient } from "@/components/SubscriptionClient";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  return (
    <SubscriptionClient
      plan={user.plan}
      subscriptionInterval={user.subscriptionInterval}
      subscriptionRenewsAt={user.subscriptionRenewsAt?.toISOString() ?? null}
      subscriptionCancelAtPeriodEnd={user.subscriptionCancelAtPeriodEnd}
      ingredientsSavedByPantry={user.ingredientsSavedByPantry}
    />
  );
}
