import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword, setSessionCookie } from "@/lib/auth";
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

  const passwordHash = hashPassword(password);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const priorUserCount = await tx.user.count();
      const created = await tx.user.create({ data: { email, passwordHash, name: name || null } });

      // The very first account ever created inherits any recipes/folders/pantry items/cook
      // logs saved before accounts existed (userId still null) — see the User model's doc
      // comment in schema.prisma for why this is safe to do unconditionally here.
      if (priorUserCount === 0) {
        await Promise.all([
          tx.recipe.updateMany({ where: { userId: null }, data: { userId: created.id } }),
          tx.folder.updateMany({ where: { userId: null }, data: { userId: created.id } }),
          tx.pantryItem.updateMany({ where: { userId: null }, data: { userId: created.id } }),
          tx.cookLog.updateMany({ where: { userId: null }, data: { userId: created.id } }),
        ]);
      }
      return created;
    });

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
