import { SetMetadata } from "@nestjs/common";
import type { Permission } from "@fama/shared";

export const REQUIRED_PERMISSION_KEY = "requiredPermission";

/** Checked by PermissionGuard with can() from `shared` (SPEC §2.5). */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, permission);
