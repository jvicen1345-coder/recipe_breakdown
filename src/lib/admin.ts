import type { User } from "@/generated/prisma/client";

import { getSessionUserId, isOwnerEmail } from "./auth";
import { prisma } from "./prisma";

/** Returns the signed-in user if (and only if) they're the app owner, else null. */
export async function requireOwner(): Promise<User | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user && isOwnerEmail(user.email) ? user : null;
}
