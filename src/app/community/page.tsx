import { redirect } from "next/navigation";

import { CommunityFeedClient } from "@/components/CommunityFeedClient";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CommunityFeedPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  return <CommunityFeedClient />;
}
