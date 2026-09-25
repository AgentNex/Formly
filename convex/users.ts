import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getViewer, requireUser, ensureUserOrganization } from "./auth_helpers";

/**
 * Returns current authenticated viewer, primary organization, and memberships.
 * Returns null if not authenticated.
 */
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) {
      return null;
    }

    // Get user's memberships and organizations
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const orgs = await Promise.all(
      memberships.map(async (m) => {
        const org = await ctx.db.get(m.orgId);
        return {
          organization: org,
          role: m.role,
        };
      })
    );

    const validOrgs = orgs.filter((item) => item.organization !== null);
    const primary = validOrgs[0] || null;

    return {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        image: user.image,
        avatar: user.avatar,
        role: user.role,
      },
      currentOrganization: primary ? primary.organization : null,
      currentRole: primary ? primary.role : null,
      organizations: validOrgs.map((o) => ({
        ...o.organization!,
        userRole: o.role,
      })),
    };
  },
});

/**
 * Ensures tenant workspace & membership are provisioned for viewer upon login.
 * Idempotent.
 */
export const syncViewer = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const { org, membership } = await ensureUserOrganization(ctx, user);

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const orgs = await Promise.all(
      memberships.map(async (m) => {
        const o = await ctx.db.get(m.orgId);
        return {
          organization: o,
          role: m.role,
        };
      })
    );

    return {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        image: user.image,
        avatar: user.avatar,
        role: user.role,
      },
      currentOrganization: org,
      currentRole: membership.role,
      organizations: orgs.filter((o) => o.organization).map((o) => ({
        ...o.organization!,
        userRole: o.role,
      })),
    };
  },
});

/**
 * Allows authenticated user to update their display profile.
 */
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const updates: Record<string, string> = {
      updatedAt: Date.now().toString(),
    };
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.avatar !== undefined) updates.avatar = args.avatar.trim();

    await ctx.db.patch(user._id, {
      ...(args.name !== undefined ? { name: args.name.trim() } : {}),
      ...(args.avatar !== undefined ? { avatar: args.avatar.trim() } : {}),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(user._id);
  },
});
