import { NextResponse } from "next/server";
import { z } from "zod";

import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.passwordHash || !verifyPassword(parsed.data.password, user.passwordHash)) {
    if (user && !user.passwordHash) {
      return NextResponse.json(
        { error: "This account uses Google sign-in — use the \"Continue with Google\" button below." },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  await setSessionCookie(user.id);
  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, showThisWeekCard: user.showThisWeekCard },
  });
}
