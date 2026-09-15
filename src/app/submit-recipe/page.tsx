import { redirect } from "next/navigation";

import { SubmitRecipeWizard } from "@/components/SubmitRecipeWizard";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SubmitRecipePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  return <SubmitRecipeWizard />;
}
