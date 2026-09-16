import { NextResponse, after } from "next/server";
import { z } from "zod";

import { hashPassword, issueVerificationToken, setSessionCookie } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { getRequestOrigin } from "@/lib/requestOrigin";

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().trim().max(60).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  const passwordHash = hashPassword(password);

  try {
    const user = await prisma.user.create({ data: { email, passwordHash, name: name || null } });
    await setSessionCookie(user.id);

    // Deferred so the response (and the client's redirect to the homepage) doesn't
    // wait on a network round-trip to Resend — the account already exists and the
    // session cookie is already set, so there's nothing left that needs this first.
    const origin = getRequestOrigin(request);
    after(async () => {
      try {
        const token = await issueVerificationToken(user.id);
        await sendVerificationEmail(user.email, `${origin}/api/auth/verify-email?token=${token}`);
      } catch (err) {
        console.error("[api/auth/signup] failed to send verification email:", err);
      }
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          showThisWeekCard: user.showThisWeekCard,
          emailVerified: user.emailVerified,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[api/auth/signup] failed to create account:", err);
    return NextResponse.json({ error: "Couldn't create your account. Please try again." }, { status: 500 });
  }
}
