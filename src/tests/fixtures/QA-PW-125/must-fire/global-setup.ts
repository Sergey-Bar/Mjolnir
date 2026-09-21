import { execSync } from "node:child_process";

// Setup script for the e2e suite: bring the shared staging database up to date.
export function globalSetup(): void {
  execSync("npx prisma migrate deploy --schema ./prisma/staging.prisma");
  execSync("node scripts/seed-staging.js --env staging");
}
