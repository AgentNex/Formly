"use client";

import { useEffect, useState, useCallback } from "react";
import { FormNode, FormEdge, CompiledFormSchema } from "./types/flow";
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
  nodes: FormNode[];
  edges: FormEdge[];
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
  durationSeconds?: number;
  submittedAt: number;
}

const STORAGE_PREFIX = "nodeform_store_";

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
    window.dispatchEvent(new Event("nodeform_storage_update"));
  } catch {
    // Ignore quota errors
  }
}

// Generate random slug
export function generateSlug(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let slug = "";
  for (let i = 0; i < 7; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

// Default nodes
export const initialDemoNodes: FormNode[] = [
  {
    id: "node_start",
    type: "startNode",
    position: { x: 80, y: 160 },
    data: {
      title: "Product Feedback & Insights",
      description: "Help us shape the future of our product with a 1-minute survey.",
      buttonText: "Get Started",
    },
  },
  {
    id: "node_email",
    type: "fieldNode",
    position: { x: 380, y: 140 },
    data: {
      fieldId: "field_email",
      fieldType: "email",
      label: "What is your email address?",
      placeholder: "name@domain.com",
      description: "We'll only use this to send you product updates.",
      required: true,
    },
  },
  {
    id: "node_rating",
    type: "fieldNode",
    position: { x: 700, y: 140 },
    data: {
      fieldId: "field_rating",
      fieldType: "rating",
      label: "How would you rate your overall experience?",
      description: "Rate from 1 (poor) to 5 (extraordinary).",
      required: true,
    },
  },
  {
    id: "node_branch",
    type: "logicNode",
    position: { x: 1020, y: 130 },
    data: {
      label: "Rating Check",
      targetFieldId: "field_rating",
      condition: "greater_than",
      compareValue: "3",
    },
  },
  {
    id: "node_positive_comment",
    type: "fieldNode",
    position: { x: 1340, y: 60 },
    data: {
      fieldId: "field_favorite",
      fieldType: "textarea",
      label: "What feature did you enjoy the most?",
      placeholder: "Tell us what you liked...",
      required: false,
    },
  },
  {
    id: "node_negative_comment",
    type: "fieldNode",
    position: { x: 1340, y: 260 },
    data: {
      fieldId: "field_improvement",
      fieldType: "textarea",
      label: "How can we make your experience better?",
      placeholder: "Share what fell short...",
      required: false,
    },
  },
  {
    id: "node_end",
    type: "endNode",
    position: { x: 1680, y: 160 },
    data: {
      title: "Thank You So Much!",
      description: "Your responses have been recorded and will help our team directly.",
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
    id: "e_pos_end",
    source: "node_positive_comment",
    target: "node_end",
    animated: true,
    style: { stroke: "#e4e4e7", strokeWidth: 2 },
  },
  {
    id: "e_neg_end",
    source: "node_negative_comment",
    target: "node_end",
    animated: true,
    style: { stroke: "#e4e4e7", strokeWidth: 2 },
  },
];

/**
 * Ensures demo project exists on first run
 */
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
      "Product Feedback Survey",
      "Help us shape the future of our product"
    );

    const demoProject: ProjectRecord = {
      id: pId,
      userId,
      name: "Product Feedback Survey",
      description: "Customer feedback workflow with intelligent rating branch",
      createdAt: now,
      updatedAt: now,
      formId: fId,
      slug,
      isPublished: true,
      viewCount: 3,
      submissionCount: 2,
      conversionRate: 67,
    };

    const demoForm: FormRecord = {
      id: fId,
      projectId: pId,
      userId,
      title: "Product Feedback Survey",
      description: "Customer feedback workflow with intelligent rating branch",
      slug,
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
        respondentId: "resp_alex",
        answers: {
          field_email: "alex@example.com",
          field_rating: 5,
          field_favorite: "The node-based visual workflow editor is lightning fast.",
        },
        durationSeconds: 34,
        submittedAt: now - 3600000,
      },
      {
        id: "sub_2",
        formId: fId,
        slug,
        respondentId: "resp_jordan",
        answers: {
          field_email: "jordan@startup.io",
          field_rating: 4,
          field_favorite: "Monochromatic black and white theme looks exceptionally clean.",
        },
        durationSeconds: 42,
        submittedAt: now - 1800000,
      },
    ];

    setStorage("projects", [demoProject]);
    setStorage(`form_${fId}`, demoForm);
    setStorage(`form_by_slug_${slug}`, fId);
    setStorage(`subs_${fId}`, demoSubs);
  }
}

/**
 * Reactive hook for project list
 */
export function useProjects(userId: string) {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    initializeDefaultStore(userId);
    const list = getStorage<ProjectRecord[]>("projects", []);
    setProjects(list.filter((p) => p.userId === userId || p.userId === "usr_server_guest"));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    reload();
    window.addEventListener("nodeform_storage_update", reload);
    return () => window.removeEventListener("nodeform_storage_update", reload);
  }, [reload]);

  const createProject = (name: string, description?: string) => {
    const now = Date.now();
    const pId = `proj_${Date.now().toString(36)}`;
    const fId = `form_${Date.now().toString(36)}`;
    const slug = generateSlug();

    const compiled = compileFlow(initialDemoNodes, initialDemoEdges, name, description);

    const newProj: ProjectRecord = {
      id: pId,
      userId,
      name: name.trim() || "Untitled Project",
      description,
      createdAt: now,
      updatedAt: now,
      formId: fId,
      slug,
      isPublished: true,
      viewCount: 0,
      submissionCount: 0,
      conversionRate: 0,
    };

    const newForm: FormRecord = {
      id: fId,
      projectId: pId,
      userId,
      title: name.trim() || "Untitled Project",
      description,
      slug,
      nodes: initialDemoNodes,
      edges: initialDemoEdges,
      compiledSchema: compiled.schema,
      isPublished: true,
      createdAt: now,
      updatedAt: now,
    };

    const current = getStorage<ProjectRecord[]>("projects", []);
    setStorage("projects", [newProj, ...current]);
    setStorage(`form_${fId}`, newForm);
    setStorage(`form_by_slug_${slug}`, fId);
    setStorage(`subs_${fId}`, []);

    return newProj;
  };

  const deleteProject = (projectId: string) => {
    const list = getStorage<ProjectRecord[]>("projects", []);
    const proj = list.find((p) => p.id === projectId);
    if (proj) {
      localStorage.removeItem(STORAGE_PREFIX + `form_${proj.formId}`);
      localStorage.removeItem(STORAGE_PREFIX + `form_by_slug_${proj.slug}`);
      localStorage.removeItem(STORAGE_PREFIX + `subs_${proj.formId}`);
    }
    setStorage("projects", list.filter((p) => p.id !== projectId));
  };

  return { projects, loading, createProject, deleteProject };
}

/**
 * Hook to retrieve and save a single form project
 */
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
    window.addEventListener("nodeform_storage_update", reload);
    return () => window.removeEventListener("nodeform_storage_update", reload);
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

    const updatedForm: FormRecord = {
      ...form,
      title,
      nodes,
      edges,
      compiledSchema: compiled,
      updatedAt: now,
    };

    const updatedProject: ProjectRecord = {
      ...project,
      name: title,
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
    const updatedForm = { ...form, isPublished };
    const updatedProject = { ...project, isPublished };
    setStorage(`form_${form.id}`, updatedForm);
    const list = getStorage<ProjectRecord[]>("projects", []);
    setStorage(
      "projects",
      list.map((p) => (p.id === project.id ? updatedProject : p))
    );
  };

  return { project, form, loading, saveForm, togglePublish };
}

/**
 * Hook to retrieve public form by slug
 */
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
        // Record view count
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
    durationSeconds: number
  ) => {
    if (!form) return;
    const now = Date.now();
    const sub: SubmissionRecord = {
      id: `sub_${Date.now().toString(36)}`,
      formId: form.id,
      slug: form.slug,
      respondentId: `resp_${Date.now().toString(36)}`,
      answers,
      durationSeconds,
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
  };

  return { form, loading, submitResponse };
}

/**
 * Hook for form analytics
 */
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
    window.addEventListener("nodeform_storage_update", reload);
    return () => window.removeEventListener("nodeform_storage_update", reload);
  }, [reload]);

  return { submissions, loading };
}
