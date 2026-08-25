import { execSync } from "node:child_process";

export default async function globalSetup() {
  execSync("npx prisma migrate deploy --schema ./prisma", {
    env: { ...process.env, DATABASE_URL: process.env.STAGING_DB_URL },
  });
  execSync("npm run seed:staging");
}
