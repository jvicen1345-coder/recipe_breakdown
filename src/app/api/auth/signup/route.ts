import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword, isOwnerEmail, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // Invite-only: the owner's own email always gets in; everyone else needs an
  // AccessRequest already marked "approved" (see /api/admin/access-requests).
  const accessRequest = isOwnerEmail(email) ? null : await prisma.accessRequest.findUnique({ where: { email } });
  const isApproved = isOwnerEmail(email) || accessRequest?.status === "approved";

  if (!isApproved) {
    await prisma.accessRequest.upsert({ where: { email }, update: {}, create: { email } });
    return NextResponse.json(
      {
        pending: true,
        message: "This app is invite-only right now. Your request has been sent — you'll be able to sign in once it's approved.",
      },
      { status: 202 },
    );
  }

  const passwordHash = hashPassword(password);

  try {
    const user = await prisma.user.create({ data: { email, passwordHash, name: name || null } });
    await setSessionCookie(user.id);
    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name, showThisWeekCard: user.showThisWeekCard } },
      { status: 201 },
    );
  } catch (err) {
    console.error("[api/auth/signup] failed to create account:", err);
    return NextResponse.json({ error: "Couldn't create your account. Please try again." }, { status: 500 });
  }
}
