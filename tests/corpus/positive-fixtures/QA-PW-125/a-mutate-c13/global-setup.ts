import { execSync } from "node:child_process";

export default async function globalSetup(): Promise<void> {
  // Seeds the shared a stage DB before every run.
  execSync("npx prisma db seed --schema ./prisma/a.prisma", { stdio: "inherit" });
}
