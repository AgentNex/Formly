import {
  FormNode,
  FormEdge,
  CompiledFormSchema,
  CompiledStep,
  FieldNodeData,
  LogicNodeData,
  StartNodeData,
  EndNodeData,
  LogicRule,
} from "./types/flow";

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
        step: data.step,
        currencySymbol: data.currencySymbol,
        rows: data.rows,
        columns: data.columns,
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
        combinator: data.combinator || "AND",
        rules: data.rules || [],
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
 * True DAG Auto-Layout Algorithm.
 * Computes topological layers (longest path) and assigns balanced coordinates.
 */
export function applyDagLayout(nodes: FormNode[], edges: FormEdge[]): FormNode[] {
  if (nodes.length === 0) return [];

  const nodeMap = new Map<string, FormNode>(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  }

  for (const e of edges) {
    if (nodeMap.has(e.source) && nodeMap.has(e.target)) {
      outgoing.get(e.source)!.push(e.target);
      incoming.get(e.target)!.push(e.source);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  }

  // Find root nodes (inDegree === 0, preferring startNode)
  const ranks = new Map<string, number>();
  const startNode = nodes.find((n) => n.type === "startNode");

  function computeRank(nodeId: string, visited: Set<string>): number {
    if (visited.has(nodeId)) return ranks.get(nodeId) || 0;
    visited.add(nodeId);

    const inc = incoming.get(nodeId) || [];
    if (inc.length === 0) {
      ranks.set(nodeId, 0);
      return 0;
    }

    let maxPredRank = -1;
    for (const pred of inc) {
      const predRank = computeRank(pred, visited);
      if (predRank > maxPredRank) maxPredRank = predRank;
    }

    const rank = maxPredRank + 1;
    ranks.set(nodeId, rank);
    return rank;
  }

  for (const n of nodes) {
    computeRank(n.id, new Set());
  }

  // Force startNode to layer 0
  if (startNode) {
    ranks.set(startNode.id, 0);
  }

  // Group nodes by layer
  const layers = new Map<number, FormNode[]>();
  for (const n of nodes) {
    const r = ranks.get(n.id) || 0;
    if (!layers.has(r)) layers.set(r, []);
    layers.get(r)!.push(n);
  }

  // Layout parameters
  const X_SPACING = 340;
  const Y_SPACING = 210;
  const BASE_X = 80;
  const BASE_Y = 180;

  const updatedNodes: FormNode[] = [];
  const sortedRanks = Array.from(layers.keys()).sort((a, b) => a - b);

  for (const r of sortedRanks) {
    const layerNodes = layers.get(r)!;
    const layerCount = layerNodes.length;
    const startY = BASE_Y - ((layerCount - 1) * Y_SPACING) / 2;

    layerNodes.forEach((node, idx) => {
      updatedNodes.push({
        ...node,
        position: {
          x: BASE_X + r * X_SPACING,
          y: Math.max(40, Math.round(startY + idx * Y_SPACING)),
        },
      });
    });
  }

  return updatedNodes;
}

/**
 * Evaluates the next step to execute, automatically resolving single and multi-rule logic gates.
 */
export function getNextStep(
  currentStepId: string,
  answers: Record<string, unknown>,
  schema: CompiledFormSchema,
  visited: Set<string> = new Set()
): CompiledStep | null {
  if (visited.has(currentStepId)) {
    return null;
  }
  visited.add(currentStepId);

  const current = schema.steps[currentStepId];
  if (!current) return null;

  // If current is logic node, evaluate immediately and traverse
  if (current.type === "logic") {
    let isTrue = false;

    if (current.rules && current.rules.length > 0) {
      if (current.combinator === "OR") {
        isTrue = current.rules.some((rule) =>
          evaluateLogicCondition(
            answers[rule.targetFieldId],
            rule.condition,
            rule.compareValue
          )
        );
      } else {
        isTrue = current.rules.every((rule) =>
          evaluateLogicCondition(
            answers[rule.targetFieldId],
            rule.condition,
            rule.compareValue
          )
        );
      }
    } else {
      isTrue = evaluateLogicCondition(
        answers[current.targetFieldId || ""],
        current.condition || "equals",
        current.compareValue || ""
      );
    }

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
    case "not_contains":
      return !strActual.includes(strTarget);
    case "starts_with":
      return strActual.startsWith(strTarget);
    case "ends_with":
      return strActual.endsWith(strTarget);
    case "greater_than":
      return Number(actualValue) > Number(targetValue);
    case "less_than":
      return Number(actualValue) < Number(targetValue);
    case "greater_or_equal":
      return Number(actualValue) >= Number(targetValue);
    case "less_or_equal":
      return Number(actualValue) <= Number(targetValue);
    default:
      return false;
  }
}
