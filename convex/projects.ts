import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Default start and end nodes for fresh forms
const defaultNodes = [
  {
    id: "node_start",
    type: "startNode",
    position: { x: 100, y: 180 },
    data: {
      title: "Welcome to Our Form",
      description: "Please fill out the following questions.",
      buttonText: "Start",
    },
  },
  {
    id: "node_email",
    type: "fieldNode",
    position: { x: 420, y: 160 },
    data: {
      fieldId: "field_email",
      fieldType: "email",
      label: "Email Address",
      placeholder: "name@example.com",
      description: "We will only use this to follow up with you.",
      required: true,
      options: [],
    },
  },
  {
    id: "node_feedback",
    type: "fieldNode",
    position: { x: 740, y: 160 },
    data: {
      fieldId: "field_feedback",
      fieldType: "textarea",
      label: "Your Feedback",
      placeholder: "Tell us about your experience...",
      description: "Any details you'd like to share.",
      required: false,
      options: [],
    },
  },
  {
    id: "node_end",
    type: "endNode",
    position: { x: 1060, y: 180 },
    data: {
      title: "Thank You!",
      description: "Your response has been submitted successfully.",
    },
  },
];

const defaultEdges = [
  {
    id: "e_start_email",
    source: "node_start",
    target: "node_email",
    animated: true,
    style: { stroke: "#e4e4e7", strokeWidth: 2 },
  },
  {
    id: "e_email_feedback",
    source: "node_email",
    target: "node_feedback",
    animated: true,
    style: { stroke: "#e4e4e7", strokeWidth: 2 },
  },
  {
    id: "e_feedback_end",
    source: "node_feedback",
    target: "node_end",
    animated: true,
    style: { stroke: "#e4e4e7", strokeWidth: 2 },
  },
];

function generateSlug(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let slug = "";
  for (let i = 0; i < 7; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user_updated", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Attach form counts and primary form info
    const enriched = await Promise.all(
      projects.map(async (project) => {
        const forms = await ctx.db
          .query("forms")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        const form = forms[0] || null;
        let viewCount = 0;
        let submissionCount = 0;

        if (form) {
          const views = await ctx.db
            .query("form_views")
            .withIndex("by_form", (q) => q.eq("formId", form._id))
            .collect();
          viewCount = views.length;

          const submissions = await ctx.db
            .query("submissions")
            .withIndex("by_form", (q) => q.eq("formId", form._id))
            .collect();
          submissionCount = submissions.length;
        }

        return {
          ...project,
          formId: form?._id || null,
          slug: form?.slug || null,
          isPublished: form?.isPublished ?? false,
          viewCount,
          submissionCount,
          conversionRate:
            viewCount > 0
              ? Math.round((submissionCount / viewCount) * 100)
              : 0,
        };
      })
    );

    return enriched;
  },
});

export const get = query({
  args: {
    projectId: v.id("projects"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== args.userId) {
      return null;
    }

    const forms = await ctx.db
      .query("forms")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();

    return {
      ...project,
      forms,
      primaryForm: forms[0] || null,
    };
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    template: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const projectId = await ctx.db.insert("projects", {
      userId: args.userId,
      name: args.name.trim() || "Untitled Project",
      description: args.description?.trim(),
      createdAt: now,
      updatedAt: now,
    });

    const slug = generateSlug();
    const formId = await ctx.db.insert("forms", {
      projectId,
      userId: args.userId,
      title: args.name.trim() || "Untitled Form",
      description: args.description?.trim(),
      slug,
      nodes: JSON.stringify(defaultNodes),
      edges: JSON.stringify(defaultEdges),
      compiledSchema: JSON.stringify({
        title: args.name,
        steps: defaultNodes,
      }),
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    });

    return { projectId, formId, slug };
  },
});

export const remove = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== args.userId) {
      throw new Error("Project not found or unauthorized");
    }

    // Find and delete all forms and their views and submissions
    const forms = await ctx.db
      .query("forms")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    for (const form of forms) {
      const views = await ctx.db
        .query("form_views")
        .withIndex("by_form", (q) => q.eq("formId", form._id))
        .collect();
      for (const view of views) {
        await ctx.db.delete(view._id);
      }

      const subs = await ctx.db
        .query("submissions")
        .withIndex("by_form", (q) => q.eq("formId", form._id))
        .collect();
      for (const sub of subs) {
        await ctx.db.delete(sub._id);
      }

      await ctx.db.delete(form._id);
    }

    await ctx.db.delete(args.projectId);
    return { success: true };
  },
});
