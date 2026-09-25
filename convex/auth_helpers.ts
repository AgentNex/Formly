import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

import { UserRole, ROLE_HIERARCHY, hasMinimumRole } from "../lib/rbac";
export { type UserRole, ROLE_HIERARCHY, hasMinimumRole } from "../lib/rbac";

/**
 * Ensures an authenticated user has at least one organization and owner membership.
 * Deterministic and idempotent.
 */
export async function ensureUserOrganization(
  ctx: MutationCtx,
  user: Doc<"users">
): Promise<{ org: Doc<"organizations">; membership: Doc<"memberships"> }> {
  // Check if user already has an active membership
  const existingMembership = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();

  if (existingMembership) {
    const org = await ctx.db.get(existingMembership.orgId);
    if (org) {
      return { org, membership: existingMembership };
    }
  }

  // Check if user owns an organization directly
  const ownedOrg = await ctx.db
    .query("organizations")
    .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
    .first();

  if (ownedOrg) {
    const memberDoc = await ctx.db
      .query("memberships")
      .withIndex("by_org_user", (q) => q.eq("orgId", ownedOrg._id).eq("userId", user._id))
      .first();

    if (memberDoc) {
      return { org: ownedOrg, membership: memberDoc };
    }

    const membershipId = await ctx.db.insert("memberships", {
      orgId: ownedOrg._id,
      userId: user._id,
      role: "owner",
      joinedAt: Date.now(),
    });
    const membership = (await ctx.db.get(membershipId))!;
    return { org: ownedOrg, membership };
  }

  // Create default organization
  const now = Date.now();
  const userName = user.name || (user.email ? user.email.split("@")[0] : "Workspace");
  const cleanBase = userName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "workspace";
  const orgSlug = `${cleanBase}-${Math.random().toString(36).substring(2, 6)}`;

  const orgId = await ctx.db.insert("organizations", {
    name: `${userName}'s Organization`,
    slug: orgSlug,
    ownerId: user._id,
    plan: "pro",
    quotas: {
      maxForms: 50,
      maxSubmissionsPerMonth: 10000,
      maxMembers: 10,
    },
    createdAt: now,
    updatedAt: now,
  });

  const membershipId = await ctx.db.insert("memberships", {
    orgId,
    userId: user._id,
    role: "owner",
    joinedAt: now,
  });

  const org = (await ctx.db.get(orgId))!;
  const membership = (await ctx.db.get(membershipId))!;
  return { org, membership };
}

/**
 * Resolves current authenticated viewer using genuine Convex Auth.
 * Returns null if not authenticated.
 * NO development fallback identities, NO default admin backdoors.
 */
export async function getViewer(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    return null;
  }

  // If in mutation context, ensure tenant organization is provisioned
  if ("insert" in ctx.db) {
    await ensureUserOrganization(ctx as MutationCtx, user);
  }

  return user;
}

/**
 * Requires an authenticated user or throws an unauthorized error.
 * Fail-closed security guarantee.
 */
export async function requireUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const user = await getViewer(ctx);
  if (!user) {
    throw new Error("Unauthorized: Identity could not be verified.");
  }
  return user;
}

/**
 * Validates that the current user belongs to the target organization
 * and holds at least the minimum required permission tier.
 */
export async function requireOrgMembership(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"organizations">,
  minRole: UserRole = "viewer"
): Promise<{ user: Doc<"users">; membership: Doc<"memberships"> }> {
  const user = await requireUser(ctx);

  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_org_user", (q) => q.eq("orgId", orgId).eq("userId", user._id))
    .first();

  if (!membership) {
    // If user is owner of the organization directly
    const org = await ctx.db.get(orgId);
    if (org && org.ownerId === user._id) {
      if ("insert" in ctx.db) {
        const newMId = await ctx.db.insert("memberships", {
          orgId,
          userId: user._id,
          role: "owner",
          joinedAt: Date.now(),
        });
        const createdMembership = await ctx.db.get(newMId);
        if (createdMembership) {
          return { user, membership: createdMembership };
        }
      }
    }
    throw new Error(`Forbidden: User does not belong to organization ${orgId}`);
  }

  if (!hasMinimumRole(membership.role as UserRole, minRole)) {
    throw new Error(
      `Forbidden: Role '${membership.role}' does not meet required minimum '${minRole}'.`
    );
  }

  return { user, membership };
}
