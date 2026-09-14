import { redirect } from "next/navigation";

import { NutritionLockedTeaser } from "@/components/NutritionLockedTeaser";
import { NutritionSnapshotPageClient } from "@/components/NutritionSnapshotPageClient";
import { getSessionUserId } from "@/lib/auth";
import { isPro } from "@/lib/plan";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NutritionPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");

  if (!isPro(user)) return <NutritionLockedTeaser />;

  return <NutritionSnapshotPageClient />;
}
