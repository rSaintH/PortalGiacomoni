// Permission logic centralized outside UI components.

export type UserRole = "admin" | "supervisao" | "colaborador" | string;

export interface PermissionSetting {
  key: string;
  enabled?: boolean;
  allowed_roles?: string[];
  allowed_sectors?: string[];
}

const ROLE_ADMIN = "admin";
const ROLE_SUPERVISOR = "supervisao";
const ROLE_COLLABORATOR = "colaborador";

const PERM_VIEW_ACCOUNTING_READY = "view_accounting_ready";
const PERM_VIEW_MANAGEMENT = "view_management";
const PERM_RESTRICT_COLLABORATOR_SECTORS = "restrict_collaborator_sectors";
const PERM_REINF_FILL_PROFITS = "reinf_fill_profits";

/** Normalize role text to avoid accent/encoding variations. */
export function normalizeRole(role: string | null | undefined): string {
  const normalized = (role || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return normalized || ROLE_COLLABORATOR;
}

/** Check if the user role is supervisor. */
export function isSupervisorRole(role: string): boolean {
  return normalizeRole(role) === ROLE_SUPERVISOR;
}

/** Check if the user can access admin page. */
export function canAccessAdmin(isAdmin: boolean, role: string): boolean {
  return isAdmin || isSupervisorRole(role);
}

/** Check if user can manage particularities (admin or supervisor). */
export function canManageParticularities(role: string): boolean {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === ROLE_ADMIN || normalizedRole === ROLE_SUPERVISOR;
}

/** Check if user can see dashboard section. */
export function canSeeDashboard(isAdmin: boolean, role: string): boolean {
  return isAdmin || isSupervisorRole(role);
}

function getPermissionByKey(
  permissions: PermissionSetting[] | undefined,
  key: string,
): PermissionSetting | undefined {
  return permissions?.find((p) => p.key === key);
}

function hasRolePermission(permission: PermissionSetting | undefined, role: string): boolean {
  if (!permission) return false;
  const allowedRoles = (permission.allowed_roles || []).map(normalizeRole);
  return allowedRoles.length > 0 && allowedRoles.includes(normalizeRole(role));
}

function hasSectorPermission(
  permission: PermissionSetting | undefined,
  userSectorId: string | null | undefined,
): boolean {
  if (!permission) return false;
  const allowedSectors = permission.allowed_sectors || [];
  return allowedSectors.length > 0 && !!userSectorId && allowedSectors.includes(userSectorId);
}

/**
 * Check if a collaborator is restricted to own sector.
 * Returns restricted sector id or null.
 */
export function getRestrictedSectorId(
  permissions: PermissionSetting[] | undefined,
  role: string,
  userSectorId: string | null | undefined,
): string | null {
  const restrict = getPermissionByKey(permissions, PERM_RESTRICT_COLLABORATOR_SECTORS);
  if (restrict?.enabled && normalizeRole(role) === ROLE_COLLABORATOR && userSectorId) {
    return userSectorId;
  }
  return null;
}

/** Check access to Accounting Ready page by admin/supervisor or sector permission. */
export function canAccessAccountingReady(
  isAdmin: boolean,
  role: string,
  userSectorId: string | null | undefined,
  permissions: PermissionSetting[] | undefined,
): boolean {
  if (isAdmin || isSupervisorRole(role)) return true;
  const permission = getPermissionByKey(permissions, PERM_VIEW_ACCOUNTING_READY);
  return hasSectorPermission(permission, userSectorId);
}

/** Check access to Management page by admin or role permission. */
export function canAccessManagement(
  isAdmin: boolean,
  role: string,
  permissions: PermissionSetting[] | undefined,
): boolean {
  if (isAdmin) return true;
  const permission = getPermissionByKey(permissions, PERM_VIEW_MANAGEMENT);
  return hasRolePermission(permission, role);
}

/** Check if nav item with permKey is visible to current user. */
export function isNavItemVisible(
  permKey: string | null,
  isAdmin: boolean,
  role: string,
  userSectorId: string | null | undefined,
  permissions: PermissionSetting[] | undefined,
): boolean {
  if (!permKey) return true;
  if (isAdmin) return true;

  if (permKey === PERM_VIEW_ACCOUNTING_READY) {
    return canAccessAccountingReady(isAdmin, role, userSectorId, permissions);
  }
  if (permKey === PERM_VIEW_MANAGEMENT) {
    return canAccessManagement(isAdmin, role, permissions);
  }

  const perm = getPermissionByKey(permissions, permKey);
  if (!perm) return false;

  if (perm.allowed_sectors && perm.allowed_sectors.length > 0) {
    if (isSupervisorRole(role)) return true;
    return userSectorId ? perm.allowed_sectors.includes(userSectorId) : false;
  }

  if (perm.allowed_roles && perm.allowed_roles.length > 0) {
    return hasRolePermission(perm, role);
  }

  return false;
}

/**
 * Determine Reinf sector permissions from sector name.
 * Normalizes sector name (remove accents, lowercase) then checks keywords.
 */
export function getReinfSectorPermissions(
  isAdmin: boolean,
  userSectorName: string,
): { canContabil: boolean; canDP: boolean; canFiscal: boolean } {
  const normalized = userSectorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return {
    canContabil: isAdmin || normalized.includes("contab"),
    canDP: isAdmin || normalized.includes("dp") || normalized.includes("folha") || normalized.includes("pessoal"),
    canFiscal: isAdmin || normalized.includes("fiscal"),
  };
}

/** Check if user role can fill Reinf profits from permission settings. */
export function canFillReinfProfits(
  permissions: PermissionSetting[] | undefined,
  role: string,
  fallbackCanContabil: boolean,
): boolean {
  const perm = getPermissionByKey(permissions, PERM_REINF_FILL_PROFITS);
  if (perm) {
    return hasRolePermission(perm, role);
  }
  return fallbackCanContabil;
}
