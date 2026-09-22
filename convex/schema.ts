import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  forms: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    slug: v.string(),
    nodes: v.string(),
    edges: v.string(),
    compiledSchema: v.string(),
    isPublished: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"]),

  form_views: defineTable({
    formId: v.id("forms"),
    slug: v.string(),
    visitorId: v.string(),
    userAgent: v.optional(v.string()),
    viewedAt: v.number(),
  })
    .index("by_form", ["formId"])
    .index("by_slug", ["slug"])
    .index("by_form_time", ["formId", "viewedAt"]),

  submissions: defineTable({
    formId: v.id("forms"),
    slug: v.string(),
    respondentId: v.string(),
    answers: v.string(),
    durationSeconds: v.optional(v.number()),
    submittedAt: v.number(),
  })
    .index("by_form", ["formId"])
    .index("by_slug", ["slug"])
    .index("by_form_time", ["formId", "submittedAt"]),
});
