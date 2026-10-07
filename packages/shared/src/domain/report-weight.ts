import {
  NEW_ACCOUNT_DAYS,
  REPORT_HISTORY_MIN_SAMPLE,
  REPORT_WEIGHT_DEFAULT,
  REPORT_WEIGHT_MAX,
  REPORT_WEIGHT_MIN,
  REPORT_WEIGHT_NEW_ACCOUNT,
} from "../rules.js";
import { MILLISECONDS_PER_DAY } from "./time.js";

export type Reporter = {
  createdAt: Date;
  upheldReportCount: number;
  dismissedReportCount: number;
};

/**
 * SPEC §5.2: weight of a report, computed when the report is made and stored with it.
 * An account is "new" while less than NEW_ACCOUNT_DAYS × 24 h have elapsed since its creation.
 */
export function computeReportWeight(reporter: Reporter, now: Date): number {
  const accountAgeMs = now.getTime() - reporter.createdAt.getTime();
  if (accountAgeMs < NEW_ACCOUNT_DAYS * MILLISECONDS_PER_DAY) {
    return REPORT_WEIGHT_NEW_ACCOUNT;
  }

  const closedReportCount = reporter.upheldReportCount + reporter.dismissedReportCount;
  if (closedReportCount < REPORT_HISTORY_MIN_SAMPLE) {
    return REPORT_WEIGHT_DEFAULT;
  }

  // From REPORT_WEIGHT_MIN (never right) to REPORT_WEIGHT_MAX (always right): 0.1 + 1.9 × ratio.
  const ratio = reporter.upheldReportCount / closedReportCount;
  return REPORT_WEIGHT_MIN + (REPORT_WEIGHT_MAX - REPORT_WEIGHT_MIN) * ratio;
}
