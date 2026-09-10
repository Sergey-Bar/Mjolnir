import { execSync } from "node:child_process";

export default async function globalSetup(): Promise<void> {
  // Seeds the shared n stage DB before every run.
  execSync("npx prisma db seed --schema ./prisma/n.prisma", { stdio: "inherit" });
}
