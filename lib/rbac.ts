/**
 * Role-Based Access Control (RBAC) and Route Authorization Rules
 * Canonical role hierarchy and permissions for Formly enterprise.
 */

export type UserRole = "owner" | "admin" | "editor" | "analyst" | "viewer" | "billing";

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 100,
  admin: 80,
  editor: 60,
  analyst: 40,
  viewer: 20,
  billing: 10,
};

/**
 * Checks if a given role meets or exceeds the required threshold role.
 */
export function hasMinimumRole(userRole: UserRole | string, requiredRole: UserRole): boolean {
  const userRank = ROLE_HIERARCHY[userRole as UserRole] ?? 0;
  const reqRank = ROLE_HIERARCHY[requiredRole] ?? 0;
  return userRank >= reqRank;
}

/**
 * Defines which routes are completely public and accessible without authentication.
 * Form submissions (/f/[slug]) are public for respondents.
 * Auth flows (/signin, /signup, /forgot-password) are public.
 * All other routes (/, /project/*, /analytics/*) fail-closed to authenticated sessions.
 */
export function isPublicPath(pathname: string): boolean {
  if (
    pathname.startsWith("/f/") ||
    pathname.startsWith("/signin") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return true;
  }
  return false;
}
