import { execSync } from "node:child_process";

export default async function globalSetup(): Promise<void> {
  // Seeds the shared r stage DB before every run.
  execSync("npx prisma db seed --schema ./prisma/r.prisma", { stdio: "inherit" });
}
