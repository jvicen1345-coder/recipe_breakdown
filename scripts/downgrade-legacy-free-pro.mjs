#!/usr/bin/env node
// One-off cleanup for the removed Stripe "test mode" bug: before it was closed,
// clicking "Upgrade" with no Stripe keys configured flipped an account straight
// to plan="pro" without ever creating a real Stripe subscription. This finds
// every account still sitting on that free grant (plan="pro" with no
// stripeSubscriptionId) and drops it back to "free" — real paying subscribers
// and OWNER_EMAILS accounts are left untouched.
//
// Uses raw SQL via `pg` (already a dependency) rather than the generated Prisma
// client, since that client is emitted as TypeScript and this is a plain script.
//
// Usage:
//   node scripts/downgrade-legacy-free-pro.mjs --dry-run   # list affected accounts only
//   node scripts/downgrade-legacy-free-pro.mjs             # apply the downgrade
//
// Requires DATABASE_URL (and optionally OWNER_EMAILS) in the environment, e.g.
// via a .env file — same as running the app itself.
import "dotenv/config";
import { Client } from "pg";

const dryRun = process.argv.includes("--dry-run");

function getOwnerEmails() {
  return (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — point it at your Postgres database (see .env.example).");
  }

  const ownerEmails = getOwnerEmails();
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const { rows } = await client.query(
      `SELECT id, email, "createdAt", "subscriptionStatus", "subscriptionInterval"
       FROM "User"
       WHERE plan = 'pro' AND "stripeSubscriptionId" IS NULL
       ORDER BY "createdAt" ASC`,
    );

    const toDowngrade = rows.filter((u) => !ownerEmails.includes(u.email.toLowerCase()));
    const skippedOwners = rows.length - toDowngrade.length;

    if (toDowngrade.length === 0) {
      console.log("No legacy free-Pro accounts found. Nothing to do.");
      if (skippedOwners > 0) {
        console.log(`(${skippedOwners} owner-allowlisted account(s) matched but were left alone.)`);
      }
      return;
    }

    console.log(`Found ${toDowngrade.length} account(s) with Pro access but no real Stripe subscription:`);
    for (const u of toDowngrade) {
      console.log(
        `  - ${u.email} (signed up ${u.createdAt.toISOString().slice(0, 10)}, ` +
          `status=${u.subscriptionStatus ?? "—"}, interval=${u.subscriptionInterval ?? "—"})`,
      );
    }
    if (skippedOwners > 0) {
      console.log(`(${skippedOwners} owner-allowlisted account(s) matched but were left alone.)`);
    }

    if (dryRun) {
      console.log("\nDry run — no changes made. Re-run without --dry-run to downgrade these accounts.");
      return;
    }

    const ids = toDowngrade.map((u) => u.id);
    const result = await client.query(
      `UPDATE "User"
       SET plan = 'free',
           "subscriptionStatus" = NULL,
           "subscriptionInterval" = NULL,
           "subscriptionRenewsAt" = NULL,
           "subscriptionCancelAtPeriodEnd" = false
       WHERE id = ANY($1::text[])`,
      [ids],
    );

    console.log(`\nDowngraded ${result.rowCount} account(s) to the free plan.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
