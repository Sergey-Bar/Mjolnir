import { execSync } from "node:child_process";

export default async function globalSetup() {
  // Ephemeral per-run database via testcontainers.
  execSync("docker compose up -d test-db", {
    env: { ...process.env, DB_HOST: "127.0.0.1" },
  });
  // migrate against the ephemeral localhost instance only
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: "postgresql://localhost:5433/test" },
  });
}
