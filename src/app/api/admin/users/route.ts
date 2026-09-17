import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/admin";
import { getSessionUserId } from "@/lib/auth";
import { getProSource } from "@/lib/plan";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId || !(await isAdminUser(userId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      emailVerified: true,
      plan: true,
      stripeSubscriptionId: true,
      subscriptionStatus: true,
      subscriptionInterval: true,
      subscriptionRenewsAt: true,
      subscriptionCancelAtPeriodEnd: true,
      proAccessUntil: true,
      points: true,
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt.toISOString(),
      emailVerified: u.emailVerified,
      plan: u.plan,
      proSource: getProSource(u),
      hasStripeSubscription: u.stripeSubscriptionId != null,
      subscriptionStatus: u.subscriptionStatus,
      subscriptionInterval: u.subscriptionInterval,
      subscriptionRenewsAt: u.subscriptionRenewsAt?.toISOString() ?? null,
      subscriptionCancelAtPeriodEnd: u.subscriptionCancelAtPeriodEnd,
      proAccessUntil: u.proAccessUntil?.toISOString() ?? null,
      points: u.points,
    })),
  });
}
