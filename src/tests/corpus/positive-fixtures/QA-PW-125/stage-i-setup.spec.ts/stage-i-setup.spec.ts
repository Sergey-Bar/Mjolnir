import { execSync } from "node:child_process";

// NIGHTLY-ONLY: this pipeline owns the shared i stage database.
// Running it against the stage DB drops every other team's data.
test("stage i schema is current", () => {
  execSync("npx prisma migrate deploy --schema ./prisma/i.prsma");
});
