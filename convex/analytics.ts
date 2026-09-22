import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const recordView = mutation({
  args: {
    slug: v.string(),
    visitorId: v.string(),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db
      .query("forms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!form || !form.isPublished) return { recorded: false };

    await ctx.db.insert("form_views", {
      formId: form._id,
      slug: args.slug,
      visitorId: args.visitorId,
      userAgent: args.userAgent,
      viewedAt: Date.now(),
    });

    return { recorded: true };
  },
});

export const submitResponse = mutation({
  args: {
    slug: v.string(),
    respondentId: v.string(),
    answers: v.string(), // JSON stringified answers
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db
      .query("forms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!form || !form.isPublished) {
      throw new Error("Form is not published or no longer available.");
    }

    const subId = await ctx.db.insert("submissions", {
      formId: form._id,
      slug: args.slug,
      respondentId: args.respondentId,
      answers: args.answers,
      durationSeconds: args.durationSeconds,
      submittedAt: Date.now(),
    });

    return { success: true, submissionId: subId };
  },
});

export const getStats = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) return null;

    const views = await ctx.db
      .query("form_views")
      .withIndex("by_form", (q) => q.eq("formId", args.formId))
      .collect();

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_form", (q) => q.eq("formId", args.formId))
      .order("desc")
      .collect();

    const totalViews = views.length;
    const uniqueVisitors = new Set(views.map((v) => v.visitorId)).size;
    const totalSubmissions = submissions.length;
    const conversionRate =
      totalViews > 0 ? Math.round((totalSubmissions / totalViews) * 100) : 0;

    // Average duration in seconds
    const durations = submissions
      .map((s) => s.durationSeconds)
      .filter((d): d is number => typeof d === "number" && d > 0);
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

    // Field-level answer aggregates
    const fieldCounts: Record<string, Record<string, number>> = {};
    const fieldTextSamples: Record<string, string[]> = {};

    submissions.forEach((sub) => {
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
      } catch (e) {
        // Ignore unparseable
      }
    });

    return {
      totalViews,
      uniqueVisitors,
      totalSubmissions,
      conversionRate,
      avgDuration,
      fieldCounts,
      fieldTextSamples,
      recentSubmissionsCount: submissions.slice(0, 10).length,
    };
  },
});

export const listSubmissions = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_form", (q) => q.eq("formId", args.formId))
      .order("desc")
      .take(100);

    return submissions.map((s) => ({
      _id: s._id,
      submittedAt: s.submittedAt,
      durationSeconds: s.durationSeconds,
      respondentId: s.respondentId,
      answers: s.answers,
    }));
  },
});
