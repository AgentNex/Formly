"use client";

import { useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "./auth";
import { FormNode, FormEdge, CompiledFormSchema, FormSettings } from "./types/flow";
import { compileFlow } from "./flowCompiler";

export interface ProjectRecord {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  formId: string;
  slug: string;
  status: "draft" | "published" | "paused" | "archived";
  revision: number;
  isPublished: boolean;
  viewCount: number;
  submissionCount: number;
  conversionRate: number;
}

export interface FormRecord {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  description?: string;
  slug: string;
  status: "draft" | "published" | "paused" | "archived";
  revision: number;
  nodes: FormNode[];
  edges: FormEdge[];
  settings?: FormSettings;
  compiledSchema: CompiledFormSchema;
  isPublished: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SubmissionRecord {
  id: string;
  formId: string;
  slug: string;
  respondentId: string;
  answers: Record<string, unknown>;
  branchPath?: string[];
  durationSeconds?: number;
  status: "submitted" | "verified" | "flagged" | "archived";
  submittedAt: number;
}

export function generateSlug(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let slug = "";
  for (let i = 0; i < 7; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

// Canonical enterprise starter template nodes
export const initialDemoNodes: FormNode[] = [
  {
    id: "node_start",
    type: "startNode",
    position: { x: 80, y: 180 },
    data: {
      title: "Enterprise Product Experience Survey",
      description: "Help us shape the future of our platform with a 2-minute workflow feedback session.",
      buttonText: "Start Evaluation",
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
      description: "We will only contact you for direct product roadmap follow-up.",
      required: true,
    },
  },
  {
    id: "node_rating",
    type: "fieldNode",
    position: { x: 760, y: 160 },
    data: {
      fieldId: "field_rating",
      fieldType: "rating",
      label: "How would you rate your platform satisfaction?",
      description: "Rate from 1 (poor) to 5 (extraordinary).",
      required: true,
    },
  },
  {
    id: "node_branch",
    type: "logicNode",
    position: { x: 1100, y: 150 },
    data: {
      label: "Satisfaction Filter",
      targetFieldId: "field_rating",
      condition: "greater_than",
      compareValue: "3",
      combinator: "AND",
    },
  },
  {
    id: "node_positive_comment",
    type: "fieldNode",
    position: { x: 1440, y: 70 },
    data: {
      fieldId: "field_positive",
      fieldType: "textarea",
      label: "What capability stood out most favorably?",
      placeholder: "Tell us what you liked...",
      required: false,
    },
  },
  {
    id: "node_negative_comment",
    type: "fieldNode",
    position: { x: 1440, y: 270 },
    data: {
      fieldId: "field_improvement",
      fieldType: "textarea",
      label: "Where did we fall short of your expectations?",
      placeholder: "Share areas for improvement...",
      required: false,
    },
  },
  {
    id: "node_nps",
    type: "fieldNode",
    position: { x: 1780, y: 160 },
    data: {
      fieldId: "field_nps",
      fieldType: "nps",
      label: "How likely are you to recommend Formly to a colleague?",
      required: false,
    },
  },
  {
    id: "node_end",
    type: "endNode",
    position: { x: 2120, y: 180 },
    data: {
      title: "Thank You So Much!",
      description: "Your responses have been securely recorded and routed to our product engineering leads.",
    },
  },
];

export const initialDemoEdges: FormEdge[] = [
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
    target: "node_positive_comment",
    animated: true,
    style: { stroke: "#10b981", strokeWidth: 2 },
  },
  {
    id: "e_branch_false",
    source: "node_branch",
    sourceHandle: "false",
    target: "node_negative_comment",
    animated: true,
    style: { stroke: "#71717a", strokeWidth: 2 },
  },
  {
    id: "e_pos_nps",
    source: "node_positive_comment",
    target: "node_nps",
    animated: true,
    style: { stroke: "#e4e4e7", strokeWidth: 2 },
  },
  {
    id: "e_neg_nps",
    source: "node_negative_comment",
    target: "node_nps",
    animated: true,
    style: { stroke: "#e4e4e7", strokeWidth: 2 },
  },
  {
    id: "e_nps_end",
    source: "node_nps",
    target: "node_end",
    animated: true,
    style: { stroke: "#e4e4e7", strokeWidth: 2 },
  },
];

/**
 * Audit and purge any legacy mock tokens or identities from localStorage.
 */
export function initializeDefaultStore(_userId?: string) {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("formly_user_id");
      localStorage.removeItem("formly_store_projects");
    } catch {
      // ignore
    }
  }
}

/**
 * Authoritative Convex query & mutation hook for organization projects.
 */
export function useProjects(userId?: string) {
  const { currentOrganization, isAuthenticated } = useAuth();

  const convexProjects = useQuery(
    api.projects.list,
    isAuthenticated && currentOrganization ? { orgId: currentOrganization._id as any } : {}
  );

  const createProjectMutation = useMutation(api.projects.create);
  const archiveProjectMutation = useMutation(api.projects.archive);

  const projects = useMemo<ProjectRecord[]>(() => {
    if (!convexProjects) return [];
    return convexProjects.map((p) => ({
      id: p._id,
      userId: userId || "",
      name: p.name,
      description: p.description,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      formId: p.formId || "",
      slug: p.slug || "",
      status: (p.formStatus as any) || "draft",
      revision: p.revision || 1,
      isPublished: p.isPublished || false,
      viewCount: p.viewCount || 0,
      submissionCount: p.submissionCount || 0,
      conversionRate: p.conversionRate || 0,
    }));
  }, [convexProjects, userId]);

  const loading = convexProjects === undefined && isAuthenticated;

  const createProject = async (
    name: string,
    description?: string
  ): Promise<ProjectRecord> => {
    const result = await createProjectMutation({
      name: name.trim() || "Untitled Workflow",
      description,
      orgId: currentOrganization ? (currentOrganization._id as any) : undefined,
    });

    const newRecord: ProjectRecord = {
      id: result.projectId,
      userId: userId || "",
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      formId: result.formId,
      slug: result.slug,
      status: "draft",
      revision: 1,
      isPublished: false,
      viewCount: 0,
      submissionCount: 0,
      conversionRate: 0,
    };

    return newRecord;
  };

  const deleteProject = async (id: string) => {
    await archiveProjectMutation({
      projectId: id as any,
    });
  };

  return { projects, loading, createProject, deleteProject };
}

/**
 * Authoritative Convex hook for active project & form draft.
 */
export function useFormProject(projectId: string, userId?: string) {
  const projectData = useQuery(api.projects.get, { projectId: projectId as any });
  const saveDraftMutation = useMutation(api.forms.saveDraft);
  const publishMutation = useMutation(api.forms.publish);
  const unpublishMutation = useMutation(api.forms.unpublish);

  const loading = projectData === undefined;
  const projectDoc = projectData?.project;
  const formDoc = projectData?.form;

  const project = useMemo<ProjectRecord | null>(() => {
    if (!projectDoc) return null;
    return {
      id: projectDoc._id,
      userId: userId || "",
      name: projectDoc.name,
      description: projectDoc.description,
      createdAt: projectDoc.createdAt,
      updatedAt: projectDoc.updatedAt,
      formId: formDoc?._id || "",
      slug: formDoc?.slug || "",
      status: (formDoc?.status as any) || "draft",
      revision: formDoc?.revision || 1,
      isPublished: formDoc?.status === "published",
      viewCount: 0,
      submissionCount: 0,
      conversionRate: 0,
    };
  }, [projectDoc, formDoc, userId]);

  const form = useMemo<FormRecord | null>(() => {
    if (!formDoc || !projectDoc) return null;
    let nodes: FormNode[] = [];
    let edges: FormEdge[] = [];
    try {
      nodes = JSON.parse(formDoc.nodes || "[]");
      edges = JSON.parse(formDoc.edges || "[]");
    } catch {
      nodes = initialDemoNodes;
      edges = initialDemoEdges;
    }
    const comp = compileFlow(nodes, edges, formDoc.title, formDoc.description);
    return {
      id: formDoc._id,
      projectId: projectDoc._id,
      userId: userId || "",
      title: formDoc.title,
      description: formDoc.description,
      slug: formDoc.slug,
      status: formDoc.status as any,
      revision: formDoc.revision,
      nodes,
      edges,
      compiledSchema: comp.schema,
      isPublished: formDoc.status === "published",
      createdAt: formDoc.createdAt,
      updatedAt: formDoc.updatedAt,
    };
  }, [formDoc, projectDoc, userId]);

  const saveForm = async (
    title: string,
    nodes: FormNode[],
    edges: FormEdge[],
    _compiledSchemaString: string
  ) => {
    if (!formDoc) return;
    await saveDraftMutation({
      formId: formDoc._id,
      expectedRevision: formDoc.revision,
      title,
      description: formDoc.description,
      nodes: JSON.stringify(nodes),
      edges: JSON.stringify(edges),
    });
  };

  const togglePublish = async (isPublished: boolean) => {
    if (!formDoc) return;
    if (isPublished) {
      await publishMutation({
        formId: formDoc._id,
      });
    } else {
      await unpublishMutation({
        formId: formDoc._id,
      });
    }
  };

  return { project, form, loading, saveForm, togglePublish };
}

/**
 * Authoritative Convex hook for public form runner. Anonymous respondents.
 */
export function usePublicForm(slug: string) {
  const publicForm = useQuery(api.forms.getBySlug, { slug });
  const submitMutation = useMutation(api.submissions.submit);
  const recordEventMutation = useMutation(api.analytics.recordEvent);

  const loading = publicForm === undefined;

  // Record initial view event
  useEffect(() => {
    if (slug) {
      const sessionId = `sess_${Math.random().toString(36).substring(2, 10)}`;
      recordEventMutation({
        slug,
        sessionId,
        eventType: "form_viewed",
      }).catch(() => {});
    }
  }, [slug, recordEventMutation]);

  const form = useMemo<FormRecord | null>(() => {
    if (!publicForm || !publicForm.compiledSchema) return null;
    let compiled: CompiledFormSchema;
    try {
      compiled = JSON.parse(publicForm.compiledSchema);
    } catch {
      return null;
    }
    return {
      id: publicForm.formId,
      projectId: "",
      userId: "",
      title: publicForm.title,
      description: publicForm.description,
      slug: publicForm.slug,
      status: publicForm.status as any,
      revision: publicForm.versionNumber || 1,
      nodes: [],
      edges: [],
      compiledSchema: compiled,
      isPublished: publicForm.status === "published",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }, [publicForm]);

  const submitResponse = async (
    answers: Record<string, unknown>,
    durationSeconds: number,
    intentId: string,
    branchPath: string[]
  ): Promise<{ success: boolean; error?: string }> => {
    if (!form) return { success: false, error: "Form not loaded" };
    try {
      const res = await submitMutation({
        slug,
        intentId,
        respondentId: `resp_${intentId.slice(-8)}`,
        answers: JSON.stringify(answers),
        branchPath: JSON.stringify(branchPath),
        durationSeconds,
      });
      return { success: res.success };
    } catch (err: any) {
      return { success: false, error: err?.message || "Submission failed" };
    }
  };

  return { form, loading, submitResponse };
}

/**
 * Authoritative Convex hook for analytics and submission inbox.
 */
export function useFormAnalytics(formId: string) {
  const stats = useQuery(api.analytics.getStats, formId ? { formId: formId as any } : "skip");
  const rawSubs = useQuery(api.submissions.list, formId ? { formId: formId as any } : "skip");
  const updateStatusMutation = useMutation(api.submissions.updateStatus);

  const loading = (stats === undefined || rawSubs === undefined) && Boolean(formId);

  const submissions = useMemo<SubmissionRecord[]>(() => {
    if (!rawSubs) return [];
    return rawSubs.map((s) => {
      let parsedAnswers: Record<string, unknown> = {};
      try {
        parsedAnswers = JSON.parse(s.answers);
      } catch {
        parsedAnswers = {};
      }
      return {
        id: s._id,
        formId: s.formId,
        slug: "",
        respondentId: s.respondentId,
        answers: parsedAnswers,
        durationSeconds: s.durationSeconds,
        status: s.status as any,
        submittedAt: s.submittedAt,
      };
    });
  }, [rawSubs]);

  const updateSubmissionStatus = async (
    id: string,
    newStatus: "submitted" | "verified" | "flagged" | "archived"
  ) => {
    await updateStatusMutation({
      submissionId: id as any,
      status: newStatus,
    });
  };

  return { submissions, loading, updateSubmissionStatus, stats };
}
