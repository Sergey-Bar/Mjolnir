import { execSync } from "node:child_process";

// NIGHTLY-ONLY: this pipeline owns the shared d stage database.
// Running it against the stage DB drops every other team's data.
test("stage d schema is current", () => {
  execSync("npx prisma migrate deploy --schema ./prisma/d.prsma");
});
