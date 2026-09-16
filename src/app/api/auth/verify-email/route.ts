import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getRequestOrigin } from "@/lib/requestOrigin";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const origin = getRequestOrigin(request);
  const redirectTo = (result: "verified" | "invalid") =>
    NextResponse.redirect(new URL(`/profile?verify=${result}`, origin));

  if (!token) return redirectTo("invalid");

  const user = await prisma.user.findUnique({ where: { verificationToken: token } });
  if (!user || !user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
    return redirectTo("invalid");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationToken: null, verificationTokenExpiresAt: null },
  });

  return redirectTo("verified");
}
