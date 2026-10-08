// Runs in every test worker: the API under test uses the test database and bucket, never the dev ones.
import "dotenv/config";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error("TEST_DATABASE_URL is not set (see apps/api/.env.example)");
}
process.env.DATABASE_URL = testUrl;

const testBucket = process.env.TEST_S3_PRIVATE_BUCKET;
if (!testBucket) {
  throw new Error("TEST_S3_PRIVATE_BUCKET is not set (see apps/api/.env.example)");
}
process.env.S3_PRIVATE_BUCKET = testBucket;

// Many accounts are created from the same address in the tests: rate limits are off, except in
// rate-limit.e2e-spec.ts.
process.env.RATE_LIMITS_ENABLED = "false";
