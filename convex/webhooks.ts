import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgMembership } from "./auth_helpers";

export const list = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgMembership(ctx, args.orgId, "admin");

    return await ctx.db
      .query("webhooks")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    url: v.string(),
    events: v.string(), // JSON array of event names
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrgMembership(ctx, args.orgId, "admin");

    const secret = `whsec_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    const now = Date.now();

    const webhookId = await ctx.db.insert("webhooks", {
      orgId: args.orgId,
      url: args.url.trim(),
      secret,
      events: args.events,
      status: "active",
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("audit_logs", {
      orgId: args.orgId,
      actorId: user._id,
      actorEmail: user.email || "user@formly.local",
      action: "webhook.created",
      resourceType: "webhook",
      resourceId: webhookId,
      metadata: JSON.stringify({ url: args.url }),
      timestamp: now,
    });

    return {
      _id: webhookId,
      url: args.url,
      secret,
    };
  },
});

export const update = mutation({
  args: {
    webhookId: v.id("webhooks"),
    status: v.string(), // "active" | "disabled"
    events: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const wh = await ctx.db.get(args.webhookId);
    if (!wh) throw new Error("Webhook not found");

    await requireOrgMembership(ctx, wh.orgId, "admin");

    await ctx.db.patch(args.webhookId, {
      status: args.status,
      events: args.events || wh.events,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const remove = mutation({
  args: {
    webhookId: v.id("webhooks"),
  },
  handler: async (ctx, args) => {
    const wh = await ctx.db.get(args.webhookId);
    if (!wh) throw new Error("Webhook not found");

    await requireOrgMembership(ctx, wh.orgId, "admin");

    await ctx.db.delete(args.webhookId);

    return { success: true };
  },
});
