import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgMembership } from "./auth_helpers";

export const recordEvent = mutation({
  args: {
    slug: v.string(),
    sessionId: v.string(),
    eventType: v.string(),
    nodeId: v.optional(v.string()),
    fieldId: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db
      .query("forms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!form) return { success: false };

    const now = Date.now();

    // 1. Ingest event
    await ctx.db.insert("events", {
      formId: form._id,
      versionId: form.activeVersionId,
      orgId: form.orgId,
      sessionId: args.sessionId,
      eventType: args.eventType,
      nodeId: args.nodeId,
      fieldId: args.fieldId,
      metadata: args.metadata,
      timestamp: now,
    });

    // 2. Incrementally update pre-aggregated totals
    const totalAgg = await ctx.db
      .query("analytics_aggregates")
      .withIndex("by_form_period", (q) => q.eq("formId", form._id).eq("period", "total"))
      .first();

    const isView = args.eventType === "form_viewed";
    const isStart = args.eventType === "form_started";

    if (totalAgg) {
      await ctx.db.patch(totalAgg._id, {
        views: totalAgg.views + (isView ? 1 : 0),
        starts: totalAgg.starts + (isStart ? 1 : 0),
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("analytics_aggregates", {
        formId: form._id,
        versionId: form.activeVersionId,
        period: "total",
        views: isView ? 1 : 0,
        starts: isStart ? 1 : 0,
        completions: 0,
        totalDurationSeconds: 0,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

export const getStats = query({
  args: {
    formId: v.id("forms"),
    devToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) return null;

    await requireOrgMembership(ctx, form.orgId, "viewer", args.devToken);

    // 1. Fetch pre-aggregated total metrics
    const totalAgg = await ctx.db
      .query("analytics_aggregates")
      .withIndex("by_form_period", (q) => q.eq("formId", args.formId).eq("period", "total"))
      .first();

    const totalViews = totalAgg?.views || 0;
    const totalStarts = totalAgg?.starts || 0;
    const totalCompletions = totalAgg?.completions || 0;
    const totalDurationSeconds = totalAgg?.totalDurationSeconds || 0;

    const conversionRate =
      totalViews > 0 ? Math.round((totalCompletions / totalViews) * 100) : 0;
    const completionRate =
      totalStarts > 0 ? Math.round((totalCompletions / totalStarts) * 100) : 0;
    const avgDuration =
      totalCompletions > 0
        ? Math.round(totalDurationSeconds / totalCompletions)
        : 0;

    // 2. Fetch sample of recent submissions for response distributions
    const recentSubs = await ctx.db
      .query("submissions")
      .withIndex("by_form_time", (q) => q.eq("formId", args.formId))
      .order("desc")
      .take(100);

    const fieldCounts: Record<string, Record<string, number>> = {};
    const fieldTextSamples: Record<string, string[]> = {};

    recentSubs.forEach((sub) => {
      try {
        const parsed = JSON.parse(sub.answers);
        for (const [key, val] of Object.entries(parsed)) {
          if (val === undefined || val === null || val === "") continue;

          if (typeof val === "string" || typeof val === "number") {
            const strVal = String(val);
            if (strVal.length < 50) {
              if (!fieldCounts[key]) fieldCounts[key] = {};
              fieldCounts[key][strVal] = (fieldCounts[key][strVal] || 0) + 1;
            } else {
              if (!fieldTextSamples[key]) fieldTextSamples[key] = [];
              if (fieldTextSamples[key].length < 5) {
                fieldTextSamples[key].push(strVal);
              }
            }
          } else if (Array.isArray(val)) {
            val.forEach((item) => {
              const strItem = String(item);
              if (!fieldCounts[key]) fieldCounts[key] = {};
              fieldCounts[key][strItem] = (fieldCounts[key][strItem] || 0) + 1;
            });
          }
        }
      } catch {
        // ignore malformed
      }
    });

    return {
      totalViews,
      totalStarts,
      totalSubmissions: totalCompletions,
      conversionRate,
      completionRate,
      avgDuration,
      fieldCounts,
      fieldTextSamples,
      recentSubmissionsCount: recentSubs.length,
    };
  },
});

export const getFunnel = query({
  args: {
    formId: v.id("forms"),
    devToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) return [];

    await requireOrgMembership(ctx, form.orgId, "viewer", args.devToken);

    // Bounded query for recent step_viewed events
    const events = await ctx.db
      .query("events")
      .withIndex("by_form_type", (q) =>
        q.eq("formId", args.formId).eq("eventType", "step_viewed")
      )
      .take(500);

    const nodeViews: Record<string, number> = {};
    events.forEach((e) => {
      if (e.nodeId) {
        nodeViews[e.nodeId] = (nodeViews[e.nodeId] || 0) + 1;
      }
    });

    return Object.entries(nodeViews).map(([nodeId, views]) => ({
      nodeId,
      views,
    }));
  },
});
