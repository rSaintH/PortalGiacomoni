// ── Permission Logic ──
// Centralized permission checks extracted from UI components.

export type UserRole = "admin" | "supervisao" | "colaborador" | string;

export interface PermissionSetting {
  key: string;
  enabled?: boolean;
  allowed_roles?: string[];
  allowed_sectors?: string[];
}

/** Check if the user role is supervisor (handles accent variants). */
export function isSupervisorRole(role: string): boolean {
  return role === "supervisao" || role === "supervisão";
}

/** Check if the user can access the admin page. */
export function canAccessAdmin(isAdmin: boolean, role: string): boolean {
  return isAdmin || isSupervisorRole(role);
}

/** Check if the user can manage particularities (admin or supervisor). */
export function canManageParticularities(role: string): boolean {
  return role === "admin" || role === "supervisao";
}

/**
 * Check if a collaborator is restricted to their own sector.
 * Returns the sector ID they should be restricted to, or null if no restriction.
 */
export function getRestrictedSectorId(
  permissions: PermissionSetting[] | undefined,
  role: string,
  userSectorId: string | null | undefined,
): string | null {
  const restrict = permissions?.find((p) => p.key === "restrict_collaborator_sectors");
  if (restrict?.enabled && role === "colaborador" && userSectorId) {
    return userSectorId;
  }
  return null;
}

/** Check if a nav item with a permKey is visible to the current user. */
export function isNavItemVisible(
  permKey: string | null,
  isAdmin: boolean,
  role: string,
  userSectorId: string | null | undefined,
  permissions: PermissionSetting[] | undefined,
): boolean {
  if (!permKey) return true;
  if (isAdmin) return true;

  const perm = permissions?.find((p) => p.key === permKey);
  if (!perm) return true;

  // Sector-based permission (only restricts colaboradores)
  if (perm.allowed_sectors && perm.allowed_sectors.length > 0) {
    if (isSupervisorRole(role)) return true;
    return userSectorId ? perm.allowed_sectors.includes(userSectorId) : false;
  }

  // Role-based permission
  const allowedRoles: string[] = perm.allowed_roles || [];
  return allowedRoles.includes(role);
}

/**
 * Determine Reinf sector-based permissions from the sector name.
 * Normalizes sector name (removes accents, lowercases) then checks for keywords.
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

/** Check if a user role can fill profits based on permission settings. */
export function canFillReinfProfits(
  permissions: PermissionSetting[] | undefined,
  role: string,
  fallbackCanContabil: boolean,
): boolean {
  const perm = permissions?.find((p) => p.key === "reinf_fill_profits");
  if (perm) {
    return (perm.allowed_roles || []).includes(role);
  }
  return fallbackCanContabil;
}
