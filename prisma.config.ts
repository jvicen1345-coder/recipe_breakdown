import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // `env()` from "prisma/config" throws at config-load time (including for
  // `prisma generate`, which needs no live connection) when the variable is
  // unset — e.g. a fresh CI/deploy install before DATABASE_URL is configured
  // in the hosting provider's project settings. Fall back to a placeholder
  // connection string so `generate` never crashes the build; the real value
  // must still be set for `migrate deploy` and at runtime.
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/postgres",
  },
});
