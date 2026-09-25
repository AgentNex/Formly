import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getViewer, requireOrgMembership } from "./auth_helpers";

export const getCurrent = query({
  args: {
    orgId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    if (!user) return null;

    let targetOrgId = args.orgId;
    let role = "owner";

    if (targetOrgId) {
      const membership = await ctx.db
        .query("memberships")
        .withIndex("by_org_user", (q) => q.eq("orgId", targetOrgId!).eq("userId", user._id))
        .first();
      if (membership) {
        role = membership.role;
      }
    } else {
      const membership = await ctx.db
        .query("memberships")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      if (membership) {
        targetOrgId = membership.orgId;
        role = membership.role;
      } else {
        const owned = await ctx.db
          .query("organizations")
          .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
          .first();
        if (owned) {
          targetOrgId = owned._id;
          role = "owner";
        }
      }
    }

    if (!targetOrgId) return null;

    const org = await ctx.db.get(targetOrgId);
    if (!org) return null;

    return {
      _id: org._id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      branding: org.branding,
      quotas: org.quotas || {
        maxForms: 50,
        maxSubmissionsPerMonth: 10000,
        maxMembers: 10,
      },
      userRole: role,
    };
  },
});

export const listMembers = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgMembership(ctx, args.orgId, "viewer");

    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    return await Promise.all(
      memberships.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          _id: m._id,
          userId: m.userId,
          name: user?.name || "Unknown User",
          email: user?.email || "",
          role: m.role,
          joinedAt: m.joinedAt,
        };
      })
    );
  },
});

export const inviteMember = mutation({
  args: {
    orgId: v.id("organizations"),
    email: v.string(),
    name: v.string(),
    role: v.string(), // "admin" | "editor" | "analyst" | "viewer"
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrgMembership(ctx, args.orgId, "admin");

    const email = args.email.toLowerCase().trim();

    // Check if user exists
    let targetUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    const now = Date.now();

    if (!targetUser) {
      const newUserId = await ctx.db.insert("users", {
        tokenIdentifier: `invited:${email}`,
        email,
        name: args.name.trim() || email.split("@")[0],
        role: args.role,
        createdAt: now,
        updatedAt: now,
      });
      targetUser = await ctx.db.get(newUserId);
    }

    // Check if already a member
    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_org_user", (q) => q.eq("orgId", args.orgId).eq("userId", targetUser!._id))
      .first();

    if (existingMembership) {
      throw new Error("This user is already a member of this organization.");
    }

    await ctx.db.insert("memberships", {
      orgId: args.orgId,
      userId: targetUser!._id,
      role: args.role,
      invitedBy: user._id,
      joinedAt: now,
    });

    await ctx.db.insert("audit_logs", {
      orgId: args.orgId,
      actorId: user._id,
      actorEmail: user.email || "user@formly.local",
      action: "member.invited",
      resourceType: "organization",
      resourceId: args.orgId,
      metadata: JSON.stringify({ invitedEmail: email, role: args.role }),
      timestamp: now,
    });

    return { success: true };
  },
});

export const updateRole = mutation({
  args: {
    membershipId: v.id("memberships"),
    newRole: v.string(),
  },
  handler: async (ctx, args) => {
    const targetMembership = await ctx.db.get(args.membershipId);
    if (!targetMembership) throw new Error("Membership not found");

    const { user } = await requireOrgMembership(ctx, targetMembership.orgId, "admin");

    await ctx.db.patch(args.membershipId, {
      role: args.newRole,
    });

    await ctx.db.insert("audit_logs", {
      orgId: targetMembership.orgId,
      actorId: user._id,
      actorEmail: user.email || "user@formly.local",
      action: "member.role_updated",
      resourceType: "membership",
      resourceId: args.membershipId,
      metadata: JSON.stringify({ targetUserId: targetMembership.userId, newRole: args.newRole }),
      timestamp: Date.now(),
    });

    return { success: true };
  },
});
