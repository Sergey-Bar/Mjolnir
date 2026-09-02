import { execSync } from "node:child_process";

export default async function setup() {
  // Seeds the EPHEMERAL docker database for this CI run only.
  execSync("docker compose up -d test-db && npx prisma migrate deploy", { stdio: "inherit" });
}
