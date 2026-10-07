import { describe, expect, it } from "vitest";
import * as rules from "./rules.js";

// Guards against accidental edits: every value must match the table of SPEC §11.
describe("rules (SPEC §11)", () => {
  it("matches the constants table of the SPEC", () => {
    expect({ ...rules }).toEqual({
      FEED_WINDOW_HOURS: 48,
      TODAY_WINDOW_HOURS: 24,
      FEED_SPACING: 4,
      COMMENT_REPORT_THRESHOLD: 3,
      POST_REPORT_MIN_SCORE: 5,
      POST_REPORT_AUDIENCE_RATIO: 0.01,
      NEW_ACCOUNT_DAYS: 30,
      REPORT_WEIGHT_NEW_ACCOUNT: 0.2,
      REPORT_HISTORY_MIN_SAMPLE: 5,
      REPORT_WEIGHT_MIN: 0.1,
      REPORT_WEIGHT_MAX: 2.0,
      EDITOR_REPLY_HOURS: 48,
      TICKET_ASSIGN_TIMEOUT_HOURS: 24,
      SANCTION_RESET_MONTHS: 6,
      COMMENT_MAX_LENGTH: 2000,
      POST_TITLE_MAX_LENGTH: 200,
      POST_SUMMARY_MAX_LENGTH: 500,
      RETENTION_DAYS: 365,
    });
  });
});
