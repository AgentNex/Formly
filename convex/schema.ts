import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users: Authenticated identity mapping
  users: defineTable({
    tokenIdentifier: v.string(), // Server-derived identity subject from ctx.auth
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
    role: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  // Organizations: Tenant workspaces
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    ownerId: v.id("users"),
    branding: v.optional(
      v.object({
        logoUrl: v.optional(v.string()),
        primaryColor: v.optional(v.string()),
        accentColor: v.optional(v.string()),
        customDomain: v.optional(v.string()),
      })
    ),
    plan: v.string(), // "free" | "pro" | "team" | "enterprise"
    quotas: v.optional(
      v.object({
        maxForms: v.number(),
        maxSubmissionsPerMonth: v.number(),
        maxMembers: v.number(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_owner", ["ownerId"]),

  // Memberships: User-Organization RBAC mapping
  memberships: defineTable({
    orgId: v.id("organizations"),
    userId: v.id("users"),
    role: v.string(), // "owner" | "admin" | "editor" | "analyst" | "viewer" | "billing"
    invitedBy: v.optional(v.id("users")),
    joinedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["orgId", "userId"]),

  // Projects: Form groups within an organization
  projects: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    status: v.string(), // "active" | "archived" | "deleted"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_status", ["orgId", "status"])
    .index("by_org_updated", ["orgId", "updatedAt"]),

  // Forms: Working drafts and metadata
  forms: defineTable({
    projectId: v.id("projects"),
    orgId: v.id("organizations"),
    title: v.string(),
    description: v.optional(v.string()),
    slug: v.string(),
    status: v.string(), // "draft" | "published" | "paused" | "archived"
    revision: v.number(), // Optimistic concurrency revision counter
    nodes: v.string(), // JSON stringified FormNode[]
    edges: v.string(), // JSON stringified FormEdge[]
    settings: v.optional(v.string()), // JSON stringified FormSettings
    activeVersionId: v.optional(v.id("form_versions")), // Pointer to immutable published snapshot
    publishedAt: v.optional(v.number()),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_org", ["orgId"])
    .index("by_slug", ["slug"])
    .index("by_slug_status", ["slug", "status"]),

  // Form Versions: Immutable published snapshots
  form_versions: defineTable({
    formId: v.id("forms"),
    orgId: v.id("organizations"),
    versionNumber: v.number(),
    schemaVersion: v.number(),
    title: v.string(),
    slug: v.string(),
    nodes: v.string(), // JSON stringified snapshot
    edges: v.string(), // JSON stringified snapshot
    compiledSchema: v.string(), // Server-compiled and validated canonical runtime JSON
    settings: v.optional(v.string()),
    publishedBy: v.id("users"),
    publishedAt: v.number(),
    changeSummary: v.optional(v.string()),
  })
    .index("by_form", ["formId"])
    .index("by_form_version", ["formId", "versionNumber"])
    .index("by_slug", ["slug"]),

  // Sessions: Public respondent runtime session state
  sessions: defineTable({
    formId: v.id("forms"),
    versionId: v.id("form_versions"),
    slug: v.string(),
    sessionId: v.string(),
    resumeToken: v.string(),
    status: v.string(), // "started" | "in_progress" | "completed" | "abandoned"
    currentStepId: v.string(),
    visitedStepIds: v.string(), // JSON array of step IDs visited
    answers: v.string(), // JSON object of collected answers
    startedAt: v.number(),
    lastActiveAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_form", ["formId"])
    .index("by_version", ["versionId"])
    .index("by_resumeToken", ["resumeToken"]),

  // Submissions: Durable, server-validated form responses
  submissions: defineTable({
    formId: v.id("forms"),
    versionId: v.id("form_versions"),
    orgId: v.id("organizations"),
    slug: v.string(),
    sessionId: v.optional(v.string()),
    intentId: v.string(), // Idempotency key to prevent duplicate submissions
    respondentId: v.string(),
    answers: v.string(), // Validated answers JSON
    branchPath: v.optional(v.string()), // JSON array of traversed nodes
    durationSeconds: v.optional(v.number()),
    status: v.string(), // "submitted" | "verified" | "flagged" | "archived"
    submittedAt: v.number(),
  })
    .index("by_form", ["formId"])
    .index("by_version", ["versionId"])
    .index("by_org", ["orgId"])
    .index("by_intentId", ["intentId"])
    .index("by_form_time", ["formId", "submittedAt"]),

  // Events: Real-time telemetry event stream
  events: defineTable({
    formId: v.id("forms"),
    versionId: v.optional(v.id("form_versions")),
    orgId: v.id("organizations"),
    sessionId: v.string(),
    eventType: v.string(), // "form_viewed" | "form_started" | "step_viewed" | "answer_changed" | "step_completed" | "branch_evaluated" | "form_abandoned" | "form_submitted" | "submission_failed"
    nodeId: v.optional(v.string()),
    fieldId: v.optional(v.string()),
    metadata: v.optional(v.string()), // JSON object
    timestamp: v.number(),
  })
    .index("by_form", ["formId"])
    .index("by_version", ["versionId"])
    .index("by_form_type", ["formId", "eventType"])
    .index("by_session", ["sessionId"])
    .index("by_time", ["timestamp"]),

  // Analytics Aggregates: Scalable pre-aggregated metrics
  analytics_aggregates: defineTable({
    formId: v.id("forms"),
    versionId: v.optional(v.id("form_versions")),
    period: v.string(), // "total" | YYYY-MM-DD
    views: v.number(),
    starts: v.number(),
    completions: v.number(),
    totalDurationSeconds: v.number(),
    nodeStats: v.optional(v.string()), // JSON stringified node funnel map
    branchStats: v.optional(v.string()), // JSON stringified branch conversion map
    fieldStats: v.optional(v.string()), // JSON stringified field distribution map
    updatedAt: v.number(),
  }).index("by_form_period", ["formId", "period"]),

  // Audit Logs: Security and compliance event trail
  audit_logs: defineTable({
    orgId: v.id("organizations"),
    actorId: v.id("users"),
    actorEmail: v.string(),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    metadata: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_org_time", ["orgId", "timestamp"])
    .index("by_actor_time", ["actorId", "timestamp"])
    .index("by_resource", ["resourceType", "resourceId"]),

  // API Keys: Hashed scoped keys for developer access
  api_keys: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    keyHash: v.string(), // SHA-256 hash of the API key
    keyPrefix: v.string(), // "fml_live_xxxx"
    scopes: v.string(), // JSON stringified string[]
    expiresAt: v.optional(v.number()),
    lastUsedAt: v.optional(v.number()),
    createdBy: v.id("users"),
    status: v.string(), // "active" | "revoked"
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_hash", ["keyHash"]),

  // Webhooks: Reliable event notification endpoints
  webhooks: defineTable({
    orgId: v.id("organizations"),
    url: v.string(),
    secret: v.string(), // HMAC signing secret
    events: v.string(), // JSON array of subscribed event names
    status: v.string(), // "active" | "disabled"
    failureCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]),
});
