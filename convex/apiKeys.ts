import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgMembership } from "./auth_helpers";

function pseudoHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `sha256_${Math.abs(hash).toString(16)}_${str.slice(0, 16)}`;
}

export const list = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgMembership(ctx, args.orgId, "admin");

    const keys = await ctx.db
      .query("api_keys")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();

    return keys.map((k) => ({
      _id: k._id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scopes: k.scopes,
      status: k.status,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
    }));
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    scopes: v.string(), // JSON stringified string[]
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrgMembership(ctx, args.orgId, "admin");

    const randomSuffix = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const prefix = `fml_live_${randomSuffix.slice(0, 6)}`;
    const fullRawKey = `${prefix}_${randomSuffix}`;
    const keyHash = pseudoHash(fullRawKey);
    const now = Date.now();

    const keyId = await ctx.db.insert("api_keys", {
      orgId: args.orgId,
      name: args.name.trim() || "API Key",
      keyHash,
      keyPrefix: prefix,
      scopes: args.scopes,
      status: "active",
      createdBy: user._id,
      createdAt: now,
    });

    await ctx.db.insert("audit_logs", {
      orgId: args.orgId,
      actorId: user._id,
      actorEmail: user.email || "user@formly.local",
      action: "api_key.created",
      resourceType: "api_key",
      resourceId: keyId,
      metadata: JSON.stringify({ keyPrefix: prefix, name: args.name }),
      timestamp: now,
    });

    return {
      _id: keyId,
      rawKey: fullRawKey,
      keyPrefix: prefix,
      name: args.name,
    };
  },
});

export const revoke = mutation({
  args: {
    keyId: v.id("api_keys"),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key) throw new Error("Key not found");

    const { user } = await requireOrgMembership(ctx, key.orgId, "admin");

    await ctx.db.patch(args.keyId, {
      status: "revoked",
    });

    await ctx.db.insert("audit_logs", {
      orgId: key.orgId,
      actorId: user._id,
      actorEmail: user.email || "user@formly.local",
      action: "api_key.revoked",
      resourceType: "api_key",
      resourceId: args.keyId,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});
