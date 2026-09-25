import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgMembership } from "./auth_helpers";

export const list = query({
  args: {
    orgId: v.id("organizations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOrgMembership(ctx, args.orgId, "admin");

    const maxResults = args.limit || 100;
    const logs = await ctx.db
      .query("audit_logs")
      .withIndex("by_org_time", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(maxResults);

    return logs.map((l) => ({
      _id: l._id,
      actorEmail: l.actorEmail,
      action: l.action,
      resourceType: l.resourceType,
      resourceId: l.resourceId,
      metadata: l.metadata,
      timestamp: l.timestamp,
    }));
  },
});
