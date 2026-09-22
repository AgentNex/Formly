import { FormNode, FormEdge, CompiledFormSchema, CompiledStep, FieldNodeData, LogicNodeData, StartNodeData, EndNodeData } from "./types/flow";

export interface CompileResult {
  schema: CompiledFormSchema;
  warnings: string[];
  isValid: boolean;
}

export function compileFlow(
  nodes: FormNode[],
  edges: FormEdge[],
  title: string = "Custom Flow Form",
  description?: string
): CompileResult {
  const warnings: string[] = [];
  const steps: Record<string, CompiledStep> = {};
  const fieldIds: string[] = [];
  const endNodeIds: string[] = [];

  // 1. Find Start Node
  const startNode = nodes.find((n) => n.type === "startNode");
  if (!startNode) {
    warnings.push("Missing Start node in workflow canvas.");
  }
  const startNodeId = startNode ? startNode.id : nodes[0]?.id || "node_start";

  // 2. Build edge connection lookups
  // For each source node, map handle -> target
  const edgeMap: Record<string, { default?: string; truePath?: string; falsePath?: string }> = {};

  for (const edge of edges) {
    if (!edge.source || !edge.target) continue;
    if (!edgeMap[edge.source]) {
      edgeMap[edge.source] = {};
    }

    if (edge.sourceHandle === "true") {
      edgeMap[edge.source].truePath = edge.target;
    } else if (edge.sourceHandle === "false") {
      edgeMap[edge.source].falsePath = edge.target;
    } else {
      // Standard or first edge
      if (!edgeMap[edge.source].default) {
        edgeMap[edge.source].default = edge.target;
      }
    }
  }

  // 3. Process each node
  for (const node of nodes) {
    const conn = edgeMap[node.id] || {};

    if (node.type === "startNode") {
      const data = (node.data || {}) as StartNodeData;
      steps[node.id] = {
        id: node.id,
        nodeId: node.id,
        type: "start",
        title: data.title || "Welcome",
        description: data.description || "",
        buttonText: data.buttonText || "Begin",
        defaultNextNodeId: conn.default,
      };
    } else if (node.type === "fieldNode") {
      const data = (node.data || {}) as FieldNodeData;
      const fId = data.fieldId || `field_${node.id}`;
      fieldIds.push(fId);

      steps[node.id] = {
        id: node.id,
        nodeId: node.id,
        type: "field",
        fieldId: fId,
        fieldType: data.fieldType || "text",
        label: data.label || "Untitled Field",
        placeholder: data.placeholder || "",
        description: data.description || "",
        required: Boolean(data.required),
        options: data.options || [],
        min: data.min,
        max: data.max,
        defaultNextNodeId: conn.default,
      };
    } else if (node.type === "logicNode") {
      const data = (node.data || {}) as LogicNodeData;
      steps[node.id] = {
        id: node.id,
        nodeId: node.id,
        type: "logic",
        label: data.label || "Branch Condition",
        targetFieldId: data.targetFieldId || "",
        condition: data.condition || "equals",
        compareValue: data.compareValue || "",
        trueNextNodeId: conn.truePath || conn.default,
        falseNextNodeId: conn.falsePath || conn.default,
        defaultNextNodeId: conn.default,
      };
    } else if (node.type === "endNode") {
      const data = (node.data || {}) as EndNodeData;
      endNodeIds.push(node.id);
      steps[node.id] = {
        id: node.id,
        nodeId: node.id,
        type: "end",
        title: data.title || "Thank You",
        description: data.description || "Your submission has been received.",
        redirectUrl: data.redirectUrl,
      };
    }
  }

  if (endNodeIds.length === 0) {
    warnings.push("Missing Completion / End node in workflow canvas.");
  }

  const schema: CompiledFormSchema = {
    id: `schema_${Date.now()}`,
    title,
    description,
    startNodeId,
    steps,
    fieldIds,
    endNodeIds,
  };

  return {
    schema,
    warnings,
    isValid: warnings.length === 0,
  };
}

/**
 * Evaluates the next step to execute, automatically resolving logic gates.
 */
export function getNextStep(
  currentStepId: string,
  answers: Record<string, unknown>,
  schema: CompiledFormSchema,
  visited: Set<string> = new Set()
): CompiledStep | null {
  if (visited.has(currentStepId)) {
    // Prevent infinite cycles
    return null;
  }
  visited.add(currentStepId);

  const current = schema.steps[currentStepId];
  if (!current) return null;

  // If current is logic node, evaluate immediately and traverse
  if (current.type === "logic") {
    const isTrue = evaluateLogicCondition(
      answers[current.targetFieldId || ""],
      current.condition || "equals",
      current.compareValue || ""
    );

    const nextId = isTrue
      ? current.trueNextNodeId || current.defaultNextNodeId
      : current.falseNextNodeId || current.defaultNextNodeId;

    if (!nextId) return null;
    return getNextStep(nextId, answers, schema, visited);
  }

  // If standard node, look at defaultNextNodeId
  const nextId = current.defaultNextNodeId;
  if (!nextId) return null;

  const nextStep = schema.steps[nextId];
  if (!nextStep) return null;

  // If next step is a logic node, resolve it immediately
  if (nextStep.type === "logic") {
    return getNextStep(nextId, answers, schema, visited);
  }

  return nextStep;
}

export function evaluateLogicCondition(
  actualValue: unknown,
  condition: string,
  targetValue: string
): boolean {
  if (condition === "is_empty") {
    return actualValue === undefined || actualValue === null || actualValue === "";
  }
  if (condition === "is_not_empty") {
    return actualValue !== undefined && actualValue !== null && actualValue !== "";
  }

  const strActual = String(actualValue ?? "").trim().toLowerCase();
  const strTarget = String(targetValue ?? "").trim().toLowerCase();

  switch (condition) {
    case "equals":
      return strActual === strTarget;
    case "not_equals":
      return strActual !== strTarget;
    case "contains":
      return strActual.includes(strTarget);
    case "greater_than":
      return Number(actualValue) > Number(targetValue);
    case "less_than":
      return Number(actualValue) < Number(targetValue);
    default:
      return false;
  }
}
