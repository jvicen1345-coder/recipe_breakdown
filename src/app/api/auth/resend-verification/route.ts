import { NextResponse } from "next/server";

import { getSessionUserId, issueVerificationToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (user.emailVerified) {
    return NextResponse.json({ error: "Your email is already confirmed." }, { status: 400 });
  }

  const token = await issueVerificationToken(user.id);
  const verifyUrl = `${new URL(request.url).origin}/api/auth/verify-email?token=${token}`;
  await sendVerificationEmail(user.email, verifyUrl);

  return NextResponse.json({ ok: true });
}
