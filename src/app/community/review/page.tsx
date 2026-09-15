import { redirect } from "next/navigation";

import { CommunityReviewClient } from "@/components/CommunityReviewClient";
import { getSessionUserId } from "@/lib/auth";
import { getTrustInfo } from "@/lib/community";

export const dynamic = "force-dynamic";

export default async function CommunityReviewPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const trust = await getTrustInfo(userId);

  return <CommunityReviewClient isTrusted={trust.level === "trusted"} />;
}
