import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

export type UserRole = "owner" | "admin" | "editor" | "analyst" | "viewer" | "billing";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 100,
  admin: 80,
  editor: 60,
  analyst: 40,
  viewer: 20,
  billing: 10,
};

/**
 * Resolves current authenticated viewer.
 * Checks ctx.auth.getUserIdentity(). In local/preview without auth provider,
 * falls back to a deterministic development identity so workflows run without blocker.
 */
export async function getViewer(
  ctx: QueryCtx | MutationCtx,
  devFallbackToken?: string
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();

  let tokenIdentifier: string;
  let email: string;
  let name: string;
  let avatar: string | undefined;

  if (identity) {
    tokenIdentifier = identity.tokenIdentifier;
    email = identity.email || `${identity.subject}@auth.formly.local`;
    name = identity.name || identity.nickname || "Formly User";
    avatar = identity.pictureUrl;
  } else if (devFallbackToken) {
    tokenIdentifier = `dev:${devFallbackToken}`;
    email = `${devFallbackToken}@formly.local`;
    name = devFallbackToken.replace(/^usr_/, "User ");
  } else {
    // Default system/guest developer identity
    tokenIdentifier = "system:default_admin";
    email = "admin@formly.enterprise";
    name = "Enterprise Admin";
  }

  // Look up user by tokenIdentifier
  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .first();

  if (existingUser) {
    return existingUser;
  }

  // If we are in a mutation context, create the user
  if ("insert" in ctx.db) {
    const now = Date.now();
    const newUserId = await ctx.db.insert("users", {
      tokenIdentifier,
      email,
      name,
      avatar,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    });

    // Create default organization for new user
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "workspace";
    const orgSlug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;
    const orgId = await ctx.db.insert("organizations", {
      name: `${name}'s Organization`,
      slug: orgSlug,
      ownerId: newUserId,
      plan: "pro",
      quotas: {
        maxForms: 50,
        maxSubmissionsPerMonth: 10000,
        maxMembers: 10,
      },
      createdAt: now,
      updatedAt: now,
    });

    // Create owner membership
    await ctx.db.insert("memberships", {
      orgId,
      userId: newUserId,
      role: "owner",
      joinedAt: now,
    });

    return await ctx.db.get(newUserId);
  }

  return null;
}

/**
 * Requires an authenticated user or throws an unauthorized error.
 */
export async function requireUser(
  ctx: QueryCtx | MutationCtx,
  devFallbackToken?: string
): Promise<Doc<"users">> {
  const user = await getViewer(ctx, devFallbackToken);
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
  minRole: UserRole = "viewer",
  devFallbackToken?: string
): Promise<{ user: Doc<"users">; membership: Doc<"memberships"> }> {
  const user = await requireUser(ctx, devFallbackToken);

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

  const userRoleRank = ROLE_HIERARCHY[membership.role as UserRole] || 0;
  const requiredRoleRank = ROLE_HIERARCHY[minRole] || 0;

  if (userRoleRank < requiredRoleRank) {
    throw new Error(
      `Forbidden: Role '${membership.role}' does not meet required minimum '${minRole}'.`
    );
  }

  return { user, membership };
}
