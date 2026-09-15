import { NextResponse } from "next/server";

import { requireVerifiedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Returns unread notifications and immediately marks them read — this is a one-shot
// "toast on next open" mechanism, not a persistent inbox, so there's nothing to page
// through or leave unread on purpose.
export async function GET() {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const notifications = await prisma.notification.findMany({
    where: { userId: auth.userId, read: false },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  if (notifications.length > 0) {
    await prisma.notification.updateMany({
      where: { id: { in: notifications.map((n) => n.id) } },
      data: { read: true },
    });
  }

  return NextResponse.json({ messages: notifications.map((n) => n.message) });
}
