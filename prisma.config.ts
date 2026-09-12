import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // `env()` from "prisma/config" throws at config-load time (including for
  // `prisma generate`, which needs no live connection) when the variable is
  // unset — e.g. a fresh CI/deploy install before DATABASE_URL is configured.
  // Fall back to the local sqlite file so `generate` never crashes the build.
  datasource: {
    url: process.env.DATABASE_URL || "file:./dev.db",
  },
});
