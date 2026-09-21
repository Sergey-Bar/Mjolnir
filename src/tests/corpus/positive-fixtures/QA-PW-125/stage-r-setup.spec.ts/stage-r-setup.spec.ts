import { execSync } from "node:child_process";

// NIGHTLY-ONLY: this pipeline owns the shared r stage database.
// Running it against the stage DB drops every other team's data.
test("stage r schema is current", () => {
  execSync("npx prisma migrate deploy --schema ./prisma/r.prsma");
});
