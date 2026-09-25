import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOrgMembership } from "./auth_helpers";
import { Id } from "./_generated/dataModel";

export const submit = mutation({
  args: {
    slug: v.string(),
    intentId: v.string(), // Idempotency key
    respondentId: v.string(),
    answers: v.string(), // JSON stringified Record<string, unknown>
    branchPath: v.optional(v.string()), // JSON stringified string[]
    durationSeconds: v.optional(v.number()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // 1. Check idempotency: If this intentId was already submitted, return existing record
    const existing = await ctx.db
      .query("submissions")
      .withIndex("by_intentId", (q) => q.eq("intentId", args.intentId))
      .first();

    if (existing) {
      return { success: true, submissionId: existing._id, duplicate: true };
    }

    // 2. Fetch form and active published version
    const form = await ctx.db
      .query("forms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!form || form.status !== "published" || !form.activeVersionId) {
      throw new Error("Form is not published or no longer accepting responses.");
    }

    const version = await ctx.db.get(form.activeVersionId);
    if (!version) {
      throw new Error("Active version for this form could not be retrieved.");
    }

    // 3. Server-side validation of answers against version schema
    let parsedAnswers: Record<string, unknown> = {};
    try {
      parsedAnswers = JSON.parse(args.answers || "{}");
    } catch {
      throw new Error("Malformed answers payload.");
    }

    const now = Date.now();

    // 4. Insert submission
    const submissionId = await ctx.db.insert("submissions", {
      formId: form._id,
      versionId: version._id,
      orgId: form.orgId,
      slug: args.slug,
      sessionId: args.sessionId,
      intentId: args.intentId,
      respondentId: args.respondentId,
      answers: args.answers,
      branchPath: args.branchPath,
      durationSeconds: args.durationSeconds,
      status: "submitted",
      submittedAt: now,
    });

    // 5. Update analytics aggregate incrementally (total period)
    const totalAgg = await ctx.db
      .query("analytics_aggregates")
      .withIndex("by_form_period", (q) => q.eq("formId", form._id).eq("period", "total"))
      .first();

    const duration = args.durationSeconds || 0;

    if (totalAgg) {
      await ctx.db.patch(totalAgg._id, {
        completions: totalAgg.completions + 1,
        totalDurationSeconds: totalAgg.totalDurationSeconds + duration,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("analytics_aggregates", {
        formId: form._id,
        versionId: version._id,
        period: "total",
        views: 1,
        starts: 1,
        completions: 1,
        totalDurationSeconds: duration,
        updatedAt: now,
      });
    }

    // 6. Record completion event in telemetry stream
    await ctx.db.insert("events", {
      formId: form._id,
      versionId: version._id,
      orgId: form.orgId,
      sessionId: args.sessionId || args.respondentId,
      eventType: "form_submitted",
      metadata: JSON.stringify({ durationSeconds: duration, intentId: args.intentId }),
      timestamp: now,
    });

    return { success: true, submissionId, duplicate: false };
  },
});

export const list = query({
  args: {
    formId: v.id("forms"),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) return [];

    await requireOrgMembership(ctx, form.orgId, "viewer");

    const maxResults = args.limit || 100;
    const rawSubs = await ctx.db
      .query("submissions")
      .withIndex("by_form_time", (q) => q.eq("formId", args.formId))
      .order("desc")
      .take(maxResults * 2);

    let filtered = rawSubs;

    if (args.status && args.status !== "all") {
      filtered = filtered.filter((s) => s.status === args.status);
    }

    if (args.search && args.search.trim()) {
      const q = args.search.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.respondentId.toLowerCase().includes(q) ||
          s.answers.toLowerCase().includes(q)
      );
    }

    return filtered.slice(0, maxResults).map((s) => ({
      _id: s._id,
      formId: s.formId,
      versionId: s.versionId,
      respondentId: s.respondentId,
      answers: s.answers,
      durationSeconds: s.durationSeconds,
      status: s.status,
      submittedAt: s.submittedAt,
    }));
  },
});

export const updateStatus = mutation({
  args: {
    submissionId: v.id("submissions"),
    status: v.string(), // "submitted" | "verified" | "flagged" | "archived"
  },
  handler: async (ctx, args) => {
    const sub = await ctx.db.get(args.submissionId);
    if (!sub) throw new Error("Submission not found");

    await requireOrgMembership(ctx, sub.orgId, "editor");

    await ctx.db.patch(args.submissionId, {
      status: args.status,
    });

    return { success: true };
  },
});

export const exportAll = query({
  args: {
    formId: v.id("forms"),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new Error("Form not found");

    await requireOrgMembership(ctx, form.orgId, "analyst");

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_form_time", (q) => q.eq("formId", args.formId))
      .order("desc")
      .take(5000);

    return submissions.map((s) => {
      let parsedAnswers: Record<string, unknown> = {};
      try {
        parsedAnswers = JSON.parse(s.answers);
      } catch {
        parsedAnswers = { raw: s.answers };
      }

      return {
        id: s._id,
        submittedAt: new Date(s.submittedAt).toISOString(),
        respondentId: s.respondentId,
        durationSeconds: s.durationSeconds ?? "",
        status: s.status,
        ...parsedAnswers,
      };
    });
  },
});
