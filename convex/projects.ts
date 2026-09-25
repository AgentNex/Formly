import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getViewer, requireUser, requireOrgMembership } from "./auth_helpers";
import { Doc, Id } from "./_generated/dataModel";

// Canonical starter template nodes
const defaultStarterNodes = [
  {
    id: "node_start",
    type: "startNode",
    position: { x: 100, y: 180 },
    data: {
      title: "Customer Insights & Feedback",
      description: "Please take a moment to share your valuable thoughts with us.",
      buttonText: "Start Survey",
    },
  },
  {
    id: "node_email",
    type: "fieldNode",
    position: { x: 420, y: 160 },
    data: {
      fieldId: "field_email",
      fieldType: "email",
      label: "Work Email Address",
      placeholder: "name@company.com",
      description: "We will only reach out if you request follow-up assistance.",
      required: true,
      options: [],
    },
  },
  {
    id: "node_rating",
    type: "fieldNode",
    position: { x: 740, y: 160 },
    data: {
      fieldId: "field_rating",
      fieldType: "rating",
      label: "Overall Product Satisfaction",
      description: "How satisfied are you with our enterprise platform?",
      required: true,
      options: [],
    },
  },
  {
    id: "node_branch",
    type: "logicNode",
    position: { x: 1060, y: 150 },
    data: {
      label: "Satisfaction Branch",
      targetFieldId: "field_rating",
      condition: "greater_than",
      compareValue: "3",
    },
  },
  {
    id: "node_positive_feedback",
    type: "fieldNode",
    position: { x: 1380, y: 70 },
    data: {
      fieldId: "field_positive_detail",
      fieldType: "textarea",
      label: "What features impressed you most?",
      placeholder: "Tell us what you liked...",
      required: false,
      options: [],
    },
  },
  {
    id: "node_negative_feedback",
    type: "fieldNode",
    position: { x: 1380, y: 270 },
    data: {
      fieldId: "field_negative_detail",
      fieldType: "textarea",
      label: "Where can we improve your experience?",
      placeholder: "Let us know how we can do better...",
      required: false,
      options: [],
    },
  },
  {
    id: "node_end",
    type: "endNode",
    position: { x: 1720, y: 180 },
    data: {
      title: "Thank You!",
      description: "Your responses have been securely captured and routed to our team.",
    },
  },
];

const defaultStarterEdges = [
  {
    id: "e_start_email",
    source: "node_start",
    target: "node_email",
    animated: true,
    style: { stroke: "#e4e4e7", strokeWidth: 2 },
  },
  {
    id: "e_email_rating",
    source: "node_email",
    target: "node_rating",
    animated: true,
    style: { stroke: "#e4e4e7", strokeWidth: 2 },
  },
  {
    id: "e_rating_branch",
    source: "node_rating",
    target: "node_branch",
    animated: true,
    style: { stroke: "#e4e4e7", strokeWidth: 2 },
  },
  {
    id: "e_branch_true",
    source: "node_branch",
    sourceHandle: "true",
    target: "node_positive_feedback",
    animated: true,
    style: { stroke: "#10b981", strokeWidth: 2 },
  },
  {
    id: "e_branch_false",
    source: "node_branch",
    sourceHandle: "false",
    target: "node_negative_feedback",
    animated: true,
    style: { stroke: "#71717a", strokeWidth: 2 },
  },
  {
    id: "e_pos_end",
    source: "node_positive_feedback",
    target: "node_end",
    animated: true,
    style: { stroke: "#e4e4e7", strokeWidth: 2 },
  },
  {
    id: "e_neg_end",
    source: "node_negative_feedback",
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
  args: {
    orgId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    let targetOrgId = args.orgId;
    if (!targetOrgId) {
      const user = await getViewer(ctx);
      if (user) {
        // Find primary organization membership
        const membership = await ctx.db
          .query("memberships")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();

        if (membership) {
          targetOrgId = membership.orgId;
        } else {
          const ownedOrg = await ctx.db
            .query("organizations")
            .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
            .first();
          if (ownedOrg) targetOrgId = ownedOrg._id;
        }
      }
      if (!targetOrgId) {
        const primaryOrg = await ctx.db.query("organizations").order("desc").first();
        if (primaryOrg) targetOrgId = primaryOrg._id;
      }
    }

    if (!targetOrgId) return [];

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_org_updated", (q) => q.eq("orgId", targetOrgId!))
      .order("desc")
      .collect();

    const activeProjects = projects.filter((p) => p.status !== "deleted");

    // Enrich with primary form details and pre-aggregated analytics
    return await Promise.all(
      activeProjects.map(async (project) => {
        const form = await ctx.db
          .query("forms")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .first();

        let viewCount = 0;
        let submissionCount = 0;

        if (form) {
          const totalAgg = await ctx.db
            .query("analytics_aggregates")
            .withIndex("by_form_period", (q) => q.eq("formId", form._id).eq("period", "total"))
            .first();

          if (totalAgg) {
            viewCount = totalAgg.views;
            submissionCount = totalAgg.completions;
          } else {
            // Count from submissions table
            const subs = await ctx.db
              .query("submissions")
              .withIndex("by_form", (q) => q.eq("formId", form._id))
              .collect();
            submissionCount = subs.length;
          }
        }

        return {
          _id: project._id,
          orgId: project.orgId,
          name: project.name,
          description: project.description,
          status: project.status,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          formId: form?._id || null,
          slug: form?.slug || null,
          formStatus: form?.status || "draft",
          revision: form?.revision || 1,
          isPublished: form?.status === "published",
          viewCount,
          submissionCount,
          conversionRate:
            viewCount > 0 ? Math.round((submissionCount / viewCount) * 100) : 0,
        };
      })
    );
  },
});

export const get = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || project.status === "deleted") return null;

    await requireOrgMembership(ctx, project.orgId, "viewer");

    const form = await ctx.db
      .query("forms")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .first();

    return {
      project,
      form,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    orgId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    let targetOrgId = args.orgId;
    if (!targetOrgId) {
      const membership = await ctx.db
        .query("memberships")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (membership) {
        targetOrgId = membership.orgId;
      } else {
        const ownedOrg = await ctx.db
          .query("organizations")
          .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
          .first();
        if (ownedOrg) targetOrgId = ownedOrg._id;
      }
    }

    if (!targetOrgId) throw new Error("No organization found for user.");

    await requireOrgMembership(ctx, targetOrgId, "editor");

    const now = Date.now();
    const slug = generateSlug();

    // 1. Create project
    const projectId = await ctx.db.insert("projects", {
      orgId: targetOrgId,
      name: args.name.trim() || "Untitled Workflow",
      description: args.description,
      createdBy: user._id,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create primary form with initial starter nodes
    const formId = await ctx.db.insert("forms", {
      projectId,
      orgId: targetOrgId,
      title: args.name.trim() || "Untitled Workflow",
      description: args.description,
      slug,
      status: "draft",
      revision: 1,
      nodes: JSON.stringify(defaultStarterNodes),
      edges: JSON.stringify(defaultStarterEdges),
      settings: JSON.stringify({
        submitButtonText: "Submit",
        showProgressBar: true,
        allowRestart: true,
      }),
      updatedBy: user._id,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Initialize analytics aggregate
    await ctx.db.insert("analytics_aggregates", {
      formId,
      period: "total",
      views: 0,
      starts: 0,
      completions: 0,
      totalDurationSeconds: 0,
      updatedAt: now,
    });

    // 4. Record audit log
    await ctx.db.insert("audit_logs", {
      orgId: targetOrgId,
      actorId: user._id,
      actorEmail: user.email || "user@formly.local",
      action: "project.created",
      resourceType: "project",
      resourceId: projectId,
      metadata: JSON.stringify({ name: args.name, formId, slug }),
      timestamp: now,
    });

    return { projectId, formId, slug };
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const { user } = await requireOrgMembership(ctx, project.orgId, "editor");
    const now = Date.now();

    await ctx.db.patch(args.projectId, {
      name: args.name.trim(),
      description: args.description,
      updatedAt: now,
    });

    // Sync with primary form title
    const form = await ctx.db
      .query("forms")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .first();

    if (form) {
      await ctx.db.patch(form._id, {
        title: args.name.trim(),
        description: args.description,
        updatedAt: now,
        updatedBy: user._id,
      });
    }

    return { success: true };
  },
});

export const archive = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const { user } = await requireOrgMembership(ctx, project.orgId, "admin");
    const now = Date.now();

    await ctx.db.patch(args.projectId, {
      status: "archived",
      updatedAt: now,
    });

    await ctx.db.insert("audit_logs", {
      orgId: project.orgId,
      actorId: user._id,
      actorEmail: user.email || "user@formly.local",
      action: "project.archived",
      resourceType: "project",
      resourceId: project._id,
      timestamp: now,
    });

    return { success: true };
  },
});
