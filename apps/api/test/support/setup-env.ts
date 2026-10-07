// Runs in every test worker: the API under test talks to the test database, never the dev one.
import "dotenv/config";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error("TEST_DATABASE_URL is not set (see apps/api/.env.example)");
}
process.env.DATABASE_URL = testUrl;
