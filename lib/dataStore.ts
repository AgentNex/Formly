"use client";

import { useEffect, useState, useCallback } from "react";
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

const STORAGE_PREFIX = "formly_store_";

function getStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, val: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
    window.dispatchEvent(new Event("formly_storage_update"));
  } catch {
    // Ignore quota errors
  }
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

export function initializeDefaultStore(userId: string) {
  if (typeof window === "undefined") return;

  const projects = getStorage<ProjectRecord[]>("projects", []);
  if (projects.length === 0) {
    const pId = "proj_feedback_demo";
    const fId = "form_feedback_demo";
    const slug = "feedback";
    const now = Date.now();

    const compiled = compileFlow(
      initialDemoNodes,
      initialDemoEdges,
      "Enterprise Product Experience Survey",
      "Help us shape the future of our platform"
    );

    const demoProject: ProjectRecord = {
      id: pId,
      userId,
      name: "Enterprise Product Experience Survey",
      description: "Customer feedback workflow with intelligent rating branch and NPS metric",
      createdAt: now,
      updatedAt: now,
      formId: fId,
      slug,
      status: "published",
      revision: 1,
      isPublished: true,
      viewCount: 12,
      submissionCount: 8,
      conversionRate: 67,
    };

    const demoForm: FormRecord = {
      id: fId,
      projectId: pId,
      userId,
      title: "Enterprise Product Experience Survey",
      description: "Customer feedback workflow with intelligent rating branch and NPS metric",
      slug,
      status: "published",
      revision: 1,
      nodes: initialDemoNodes,
      edges: initialDemoEdges,
      compiledSchema: compiled.schema,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    };

    const demoSubs: SubmissionRecord[] = [
      {
        id: "sub_1",
        formId: fId,
        slug,
        respondentId: "resp_alex@enterprise.com",
        answers: {
          field_email: "alex@enterprise.com",
          field_rating: 5,
          field_positive: "The DAG auto-layout and node-based conditional logic saved hours of form design.",
          field_nps: 10,
        },
        durationSeconds: 42,
        status: "verified",
        submittedAt: now - 3600000 * 4,
      },
      {
        id: "sub_2",
        formId: fId,
        slug,
        respondentId: "resp_jordan@startup.io",
        answers: {
          field_email: "jordan@startup.io",
          field_rating: 4,
          field_positive: "Monochromatic black and zinc UI is sleek and exceptionally fast.",
          field_nps: 9,
        },
        durationSeconds: 38,
        status: "submitted",
        submittedAt: now - 3600000 * 2,
      },
      {
        id: "sub_3",
        formId: fId,
        slug,
        respondentId: "resp_dev@company.org",
        answers: {
          field_email: "dev@company.org",
          field_rating: 2,
          field_improvement: "Would love automated webhooks and Slack notifications for incoming leads.",
          field_nps: 7,
        },
        durationSeconds: 55,
        status: "submitted",
        submittedAt: now - 1800000,
      },
    ];

    setStorage("projects", [demoProject]);
    setStorage(`form_${fId}`, demoForm);
    setStorage(`form_by_slug_${slug}`, fId);
    setStorage(`subs_${fId}`, demoSubs);
  }
}

export function useProjects(userId: string) {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    initializeDefaultStore(userId);
    const list = getStorage<ProjectRecord[]>("projects", []);
    setProjects(list);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    reload();
    window.addEventListener("formly_storage_update", reload);
    return () => window.removeEventListener("formly_storage_update", reload);
  }, [reload]);

  const createProject = (name: string, description?: string): ProjectRecord => {
    const pId = `proj_${Date.now().toString(36)}`;
    const fId = `form_${Date.now().toString(36)}`;
    const slug = generateSlug();
    const now = Date.now();

    const compiled = compileFlow(initialDemoNodes, initialDemoEdges, name, description);

    const newProject: ProjectRecord = {
      id: pId,
      userId,
      name,
      description,
      createdAt: now,
      updatedAt: now,
      formId: fId,
      slug,
      status: "draft",
      revision: 1,
      isPublished: false,
      viewCount: 0,
      submissionCount: 0,
      conversionRate: 0,
    };

    const newForm: FormRecord = {
      id: fId,
      projectId: pId,
      userId,
      title: name,
      description,
      slug,
      status: "draft",
      revision: 1,
      nodes: initialDemoNodes,
      edges: initialDemoEdges,
      compiledSchema: compiled.schema,
      isPublished: false,
      createdAt: now,
      updatedAt: now,
    };

    const currentList = getStorage<ProjectRecord[]>("projects", []);
    setStorage("projects", [newProject, ...currentList]);
    setStorage(`form_${fId}`, newForm);
    setStorage(`form_by_slug_${slug}`, fId);
    setStorage(`subs_${fId}`, []);

    return newProject;
  };

  const deleteProject = (id: string) => {
    const currentList = getStorage<ProjectRecord[]>("projects", []);
    const proj = currentList.find((p) => p.id === id);
    if (proj) {
      localStorage.removeItem(STORAGE_PREFIX + `form_${proj.formId}`);
      localStorage.removeItem(STORAGE_PREFIX + `form_by_slug_${proj.slug}`);
      localStorage.removeItem(STORAGE_PREFIX + `subs_${proj.formId}`);
    }
    setStorage(
      "projects",
      currentList.filter((p) => p.id !== id)
    );
  };

  return { projects, loading, createProject, deleteProject };
}

export function useFormProject(projectId: string, userId: string) {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [form, setForm] = useState<FormRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    initializeDefaultStore(userId);
    const list = getStorage<ProjectRecord[]>("projects", []);
    const proj = list.find((p) => p.id === projectId) || null;
    setProject(proj);

    if (proj) {
      const f = getStorage<FormRecord | null>(`form_${proj.formId}`, null);
      setForm(f);
    }
    setLoading(false);
  }, [projectId, userId]);

  useEffect(() => {
    reload();
    window.addEventListener("formly_storage_update", reload);
    return () => window.removeEventListener("formly_storage_update", reload);
  }, [reload]);

  const saveForm = async (
    title: string,
    nodes: FormNode[],
    edges: FormEdge[],
    compiledSchemaString: string
  ) => {
    if (!form || !project) return;
    const now = Date.now();
    const compiled = JSON.parse(compiledSchemaString);
    const nextRevision = (form.revision || 1) + 1;

    const updatedForm: FormRecord = {
      ...form,
      title,
      nodes,
      edges,
      revision: nextRevision,
      compiledSchema: compiled,
      updatedAt: now,
    };

    const updatedProject: ProjectRecord = {
      ...project,
      name: title,
      revision: nextRevision,
      updatedAt: now,
    };

    setStorage(`form_${form.id}`, updatedForm);

    const list = getStorage<ProjectRecord[]>("projects", []);
    setStorage(
      "projects",
      list.map((p) => (p.id === project.id ? updatedProject : p))
    );
  };

  const togglePublish = async (isPublished: boolean) => {
    if (!form || !project) return;
    const status = isPublished ? "published" : "paused";
    const updatedForm = { ...form, isPublished, status };
    const updatedProject = { ...project, isPublished, status };
    setStorage(`form_${form.id}`, updatedForm);
    const list = getStorage<ProjectRecord[]>("projects", []);
    setStorage(
      "projects",
      list.map((p) => (p.id === project.id ? updatedProject : p))
    );
  };

  return { project, form, loading, saveForm, togglePublish };
}

export function usePublicForm(slug: string) {
  const [form, setForm] = useState<FormRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    initializeDefaultStore("usr_public");

    const fId = getStorage<string | null>(`form_by_slug_${slug}`, null);
    if (fId) {
      const f = getStorage<FormRecord | null>(`form_${fId}`, null);
      if (f && f.isPublished) {
        setForm(f);
        // Increment view count
        const projects = getStorage<ProjectRecord[]>("projects", []);
        setStorage(
          "projects",
          projects.map((p) => {
            if (p.formId === fId) {
              const v = (p.viewCount || 0) + 1;
              const s = p.submissionCount || 0;
              return {
                ...p,
                viewCount: v,
                conversionRate: Math.round((s / v) * 100),
              };
            }
            return p;
          })
        );
      }
    }
    setLoading(false);
  }, [slug]);

  const submitResponse = async (
    answers: Record<string, unknown>,
    durationSeconds: number,
    intentId: string,
    branchPath: string[]
  ): Promise<{ success: boolean; error?: string }> => {
    if (!form) return { success: false, error: "Form not loaded" };
    const now = Date.now();
    const sub: SubmissionRecord = {
      id: `sub_${Date.now().toString(36)}`,
      formId: form.id,
      slug: form.slug,
      respondentId: `resp_${intentId.slice(-6)}`,
      answers,
      branchPath,
      durationSeconds,
      status: "submitted",
      submittedAt: now,
    };

    const existing = getStorage<SubmissionRecord[]>(`subs_${form.id}`, []);
    setStorage(`subs_${form.id}`, [sub, ...existing]);

    // Increment submission count
    const projects = getStorage<ProjectRecord[]>("projects", []);
    setStorage(
      "projects",
      projects.map((p) => {
        if (p.formId === form.id) {
          const v = p.viewCount || 1;
          const s = (p.submissionCount || 0) + 1;
          return {
            ...p,
            submissionCount: s,
            conversionRate: Math.round((s / v) * 100),
          };
        }
        return p;
      })
    );

    return { success: true };
  };

  return { form, loading, submitResponse };
}

export function useFormAnalytics(formId: string) {
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    if (!formId) return;
    const list = getStorage<SubmissionRecord[]>(`subs_${formId}`, []);
    setSubmissions(list);
    setLoading(false);
  }, [formId]);

  useEffect(() => {
    reload();
    window.addEventListener("formly_storage_update", reload);
    return () => window.removeEventListener("formly_storage_update", reload);
  }, [reload]);

  const updateSubmissionStatus = (id: string, newStatus: "submitted" | "verified" | "flagged" | "archived") => {
    const updated = submissions.map((s) => (s.id === id ? { ...s, status: newStatus } : s));
    setStorage(`subs_${formId}`, updated);
    setSubmissions(updated);
  };

  return { submissions, loading, updateSubmissionStatus };
}
