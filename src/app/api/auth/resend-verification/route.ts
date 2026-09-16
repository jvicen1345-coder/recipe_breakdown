import { NextResponse, after } from "next/server";

import { getSessionUserId, issueVerificationToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { getRequestOrigin } from "@/lib/requestOrigin";

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (user.emailVerified) {
    return NextResponse.json({ error: "Your email is already confirmed." }, { status: 400 });
  }

  const origin = getRequestOrigin(request);
  after(async () => {
    try {
      const token = await issueVerificationToken(user.id);
      await sendVerificationEmail(user.email, `${origin}/api/auth/verify-email?token=${token}`);
    } catch (err) {
      console.error("[api/auth/resend-verification] failed to send verification email:", err);
    }
  });

  return NextResponse.json({ ok: true });
}
