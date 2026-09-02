export default async function setup() {
  // Migrate + seed the shared environment before tests run.
  await fetch("https://staging5.example.com/api/admin/seed", { method: "POST" });
  execSync("npx prisma migrate deploy --schema ./prisma/schema.prisma", { stdio: "inherit" });
}
