import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/admin";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MIN_DAYS = 1;
const MAX_DAYS = 365;
const DEFAULT_DAYS = 30;

// Manual admin override for granting Pro without a real Stripe subscription — the
// /admin/users equivalent of the community points reward (see redeemFreeProIfEligible
// in lib/community.ts), but for one account at a time from the UI. Extends
// proAccessUntil rather than setting plan="pro" directly, so a grant here can never
// be mistaken for the legacy free-Pro bug that scripts/downgrade-legacy-free-pro.mjs
// cleans up.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUserId = await getSessionUserId();
  if (!adminUserId || !(await isAdminUser(adminUserId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const daysInput = Number(body?.days);
  const days = Number.isFinite(daysInput) ? Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(daysInput))) : DEFAULT_DAYS;

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const base = user.proAccessUntil && user.proAccessUntil.getTime() > Date.now() ? user.proAccessUntil : new Date();
  const proAccessUntil = new Date(base);
  proAccessUntil.setDate(proAccessUntil.getDate() + days);

  await prisma.user.update({ where: { id: user.id }, data: { proAccessUntil } });

  return NextResponse.json({ ok: true, proAccessUntil: proAccessUntil.toISOString() });
}
