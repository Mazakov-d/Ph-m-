// Creates the test database if needed and applies the migrations, once before all API tests.
import "dotenv/config";
import { execSync } from "node:child_process";
import { Client } from "pg";

export default async function setup(): Promise<void> {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error("TEST_DATABASE_URL is not set (see apps/api/.env.example)");
  }
  const databaseName = new URL(testUrl).pathname.slice(1);

  // Connect to the default "postgres" database to create the test one.
  const adminUrl = new URL(testUrl);
  adminUrl.pathname = "/postgres";
  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
    databaseName,
  ]);
  if (existing.rowCount === 0) {
    await client.query(`CREATE DATABASE "${databaseName}"`);
  }
  await client.end();

  execSync("pnpm exec prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: "ignore",
  });
}
