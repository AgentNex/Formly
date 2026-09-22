import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getById = query({
  args: { formId: v.id("forms") },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) return null;
    return form;
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const form = await ctx.db
      .query("forms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!form || !form.isPublished) {
      return null;
    }

    return {
      _id: form._id,
      title: form.title,
      description: form.description,
      slug: form.slug,
      compiledSchema: form.compiledSchema,
      nodes: form.nodes,
      edges: form.edges,
      isPublished: form.isPublished,
    };
  },
});

export const save = mutation({
  args: {
    formId: v.id("forms"),
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    nodes: v.string(),
    edges: v.string(),
    compiledSchema: v.string(),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form || form.userId !== args.userId) {
      throw new Error("Form not found or unauthorized");
    }

    const now = Date.now();
    await ctx.db.patch(args.formId, {
      title: args.title.trim() || form.title,
      description: args.description,
      nodes: args.nodes,
      edges: args.edges,
      compiledSchema: args.compiledSchema,
      updatedAt: now,
    });

    // Also update parent project's updatedAt
    await ctx.db.patch(form.projectId, {
      updatedAt: now,
      name: args.title.trim() || form.title,
    });

    return { success: true };
  },
});

export const publish = mutation({
  args: {
    formId: v.id("forms"),
    userId: v.string(),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form || form.userId !== args.userId) {
      throw new Error("Form not found or unauthorized");
    }

    await ctx.db.patch(args.formId, {
      isPublished: args.isPublished,
      updatedAt: Date.now(),
    });

    return { success: true, isPublished: args.isPublished };
  },
});

export const remove = mutation({
  args: {
    formId: v.id("forms"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form || form.userId !== args.userId) {
      throw new Error("Form not found or unauthorized");
    }

    // Delete associated views
    const views = await ctx.db
      .query("form_views")
      .withIndex("by_form", (q) => q.eq("formId", form._id))
      .collect();
    for (const view of views) {
      await ctx.db.delete(view._id);
    }

    // Delete associated submissions
    const subs = await ctx.db
      .query("submissions")
      .withIndex("by_form", (q) => q.eq("formId", form._id))
      .collect();
    for (const sub of subs) {
      await ctx.db.delete(sub._id);
    }

    await ctx.db.delete(args.formId);
    return { success: true };
  },
});
