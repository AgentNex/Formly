import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getViewer, requireOrgMembership } from "./auth_helpers";
import { compileAndValidateGraph, RawNode, RawEdge } from "./compiler";

export const getById = query({
  args: {
    formId: v.id("forms"),
    devToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) return null;

    // Verify tenant membership
    await requireOrgMembership(ctx, form.orgId, "viewer", args.devToken);

    return form;
  },
});

export const getBySlug = query({
  args: {
    slug: v.string(),
    preview: v.optional(v.boolean()),
    devToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db
      .query("forms")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!form) return null;

    // If preview mode requested, allow if authenticated with editor access
    if (args.preview) {
      const viewer = await getViewer(ctx, args.devToken);
      if (viewer) {
        // Return draft compilation for live previewing in editor
        const nodes: RawNode[] = JSON.parse(form.nodes || "[]");
        const edges: RawEdge[] = JSON.parse(form.edges || "[]");
        const comp = compileAndValidateGraph(nodes, edges, form.title, form.description);

        return {
          formId: form._id,
          versionId: null,
          versionNumber: 0,
          title: form.title,
          description: form.description,
          slug: form.slug,
          status: form.status,
          compiledSchema: comp.compiledSchema ? JSON.stringify(comp.compiledSchema) : null,
          settings: form.settings || "{}",
          validationErrors: comp.errors,
          isPreview: true,
        };
      }
    }

    // Public runtime: MUST be published and have active immutable version
    if (form.status !== "published" || !form.activeVersionId) {
      return null;
    }

    const version = await ctx.db.get(form.activeVersionId);
    if (!version) return null;

    return {
      formId: form._id,
      versionId: version._id,
      versionNumber: version.versionNumber,
      title: version.title,
      description: form.description,
      slug: version.slug,
      status: form.status,
      compiledSchema: version.compiledSchema,
      settings: version.settings || form.settings || "{}",
      isPreview: false,
    };
  },
});

export const saveDraft = mutation({
  args: {
    formId: v.id("forms"),
    expectedRevision: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    nodes: v.string(),
    edges: v.string(),
    settings: v.optional(v.string()),
    devToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new Error("Form not found");

    const { user } = await requireOrgMembership(ctx, form.orgId, "editor", args.devToken);

    // Optimistic Concurrency Control (OCC)
    if (form.revision !== args.expectedRevision) {
      return {
        conflict: true,
        currentRevision: form.revision,
        message: "Draft was modified by another session. Please reload or review changes.",
      };
    }

    const now = Date.now();
    const nextRevision = form.revision + 1;

    await ctx.db.patch(args.formId, {
      title: args.title.trim() || form.title,
      description: args.description,
      nodes: args.nodes,
      edges: args.edges,
      settings: args.settings,
      revision: nextRevision,
      updatedBy: user._id,
      updatedAt: now,
    });

    // Also update parent project's updatedAt
    await ctx.db.patch(form.projectId, {
      updatedAt: now,
      name: args.title.trim() || form.title,
    });

    return {
      conflict: false,
      newRevision: nextRevision,
      updatedAt: now,
    };
  },
});

export const publish = mutation({
  args: {
    formId: v.id("forms"),
    changeSummary: v.optional(v.string()),
    devToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new Error("Form not found");

    const { user } = await requireOrgMembership(ctx, form.orgId, "editor", args.devToken);

    // 1. Strict Server Compilation Gate
    let nodes: RawNode[] = [];
    let edges: RawEdge[] = [];
    try {
      nodes = JSON.parse(form.nodes || "[]");
      edges = JSON.parse(form.edges || "[]");
    } catch {
      throw new Error("Invalid graph JSON stored in draft.");
    }

    const compilation = compileAndValidateGraph(nodes, edges, form.title, form.description);

    if (!compilation.isValid || !compilation.compiledSchema) {
      return {
        success: false,
        errors: compilation.errors,
        warnings: compilation.warnings,
      };
    }

    // 2. Compute next immutable version number
    const previousVersions = await ctx.db
      .query("form_versions")
      .withIndex("by_form", (q) => q.eq("formId", form._id))
      .collect();

    const versionNumber = previousVersions.length + 1;
    const now = Date.now();

    // 3. Create immutable version snapshot
    const versionId = await ctx.db.insert("form_versions", {
      formId: form._id,
      orgId: form.orgId,
      versionNumber,
      schemaVersion: 1,
      title: form.title,
      slug: form.slug,
      nodes: form.nodes,
      edges: form.edges,
      compiledSchema: JSON.stringify(compilation.compiledSchema),
      settings: form.settings,
      publishedBy: user._id,
      publishedAt: now,
      changeSummary: args.changeSummary || `Version ${versionNumber} published`,
    });

    // 4. Update form to published status pointing to active version
    await ctx.db.patch(form._id, {
      status: "published",
      activeVersionId: versionId,
      publishedAt: now,
      updatedAt: now,
      updatedBy: user._id,
    });

    // 5. Record audit log
    await ctx.db.insert("audit_logs", {
      orgId: form.orgId,
      actorId: user._id,
      actorEmail: user.email,
      action: "form.published",
      resourceType: "form",
      resourceId: form._id,
      metadata: JSON.stringify({ versionNumber, versionId }),
      timestamp: now,
    });

    return {
      success: true,
      versionId,
      versionNumber,
      warnings: compilation.warnings,
    };
  },
});

export const unpublish = mutation({
  args: {
    formId: v.id("forms"),
    devToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new Error("Form not found");

    const { user } = await requireOrgMembership(ctx, form.orgId, "editor", args.devToken);
    const now = Date.now();

    await ctx.db.patch(form._id, {
      status: "paused",
      updatedAt: now,
      updatedBy: user._id,
    });

    await ctx.db.insert("audit_logs", {
      orgId: form.orgId,
      actorId: user._id,
      actorEmail: user.email,
      action: "form.unpublished",
      resourceType: "form",
      resourceId: form._id,
      timestamp: now,
    });

    return { success: true };
  },
});

export const listVersions = query({
  args: {
    formId: v.id("forms"),
    devToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) return [];

    await requireOrgMembership(ctx, form.orgId, "viewer", args.devToken);

    const versions = await ctx.db
      .query("form_versions")
      .withIndex("by_form", (q) => q.eq("formId", form._id))
      .order("desc")
      .collect();

    return versions.map((v) => ({
      _id: v._id,
      versionNumber: v.versionNumber,
      title: v.title,
      publishedAt: v.publishedAt,
      changeSummary: v.changeSummary,
      isActive: form.activeVersionId === v._id,
    }));
  },
});

export const rollbackToVersion = mutation({
  args: {
    formId: v.id("forms"),
    versionId: v.id("form_versions"),
    devToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const form = await ctx.db.get(args.formId);
    if (!form) throw new Error("Form not found");

    const { user } = await requireOrgMembership(ctx, form.orgId, "editor", args.devToken);
    const version = await ctx.db.get(args.versionId);
    if (!version || version.formId !== form._id) {
      throw new Error("Target version does not exist for this form.");
    }

    const now = Date.now();
    const nextRevision = form.revision + 1;

    // Restores draft from the chosen snapshot
    await ctx.db.patch(form._id, {
      title: version.title,
      nodes: version.nodes,
      edges: version.edges,
      settings: version.settings,
      revision: nextRevision,
      updatedAt: now,
      updatedBy: user._id,
    });

    await ctx.db.insert("audit_logs", {
      orgId: form.orgId,
      actorId: user._id,
      actorEmail: user.email,
      action: "form.rollback",
      resourceType: "form",
      resourceId: form._id,
      metadata: JSON.stringify({ restoredVersionNumber: version.versionNumber }),
      timestamp: now,
    });

    return {
      success: true,
      newRevision: nextRevision,
      restoredVersionNumber: version.versionNumber,
    };
  },
});
