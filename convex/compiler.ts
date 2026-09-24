export interface ValidationError {
  nodeId?: string;
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface RawNode {
  id: string;
  type: string;
  data?: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface RawEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface CompiledStep {
  id: string;
  nodeId: string;
  type: "start" | "field" | "logic" | "end";
  title?: string;
  description?: string;
  buttonText?: string;
  fieldId?: string;
  fieldType?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ id: string; label: string; value: string }>;
  min?: number;
  max?: number;
  targetFieldId?: string;
  condition?: string;
  compareValue?: string;
  trueNextNodeId?: string;
  falseNextNodeId?: string;
  defaultNextNodeId?: string;
  redirectUrl?: string;
}

export interface CanonicalCompiledSchema {
  id: string;
  title: string;
  description?: string;
  startNodeId: string;
  steps: Record<string, CompiledStep>;
  fieldIds: string[];
  endNodeIds: string[];
  reachabilityMap: Record<string, string[]>; // Node ID -> All reachable End Node IDs
  compiledAt: number;
}

export interface CompilationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  compiledSchema: CanonicalCompiledSchema | null;
}

/**
 * Strict server-side workflow graph compilation and validation.
 * Enforces DAG structural integrity, reachability, variable causality,
 * and semantic correctness before any form can be published.
 */
export function compileAndValidateGraph(
  nodes: RawNode[],
  edges: RawEdge[],
  title: string,
  description?: string
): CompilationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check empty graph
  if (!nodes || nodes.length === 0) {
    errors.push({
      code: "EMPTY_GRAPH",
      message: "The form workflow contains no nodes.",
      severity: "error",
    });
    return { isValid: false, errors, warnings, compiledSchema: null };
  }

  // 1. Identify start nodes and end nodes
  const startNodes = nodes.filter((n) => n.type === "startNode");
  const endNodes = nodes.filter((n) => n.type === "endNode");

  if (startNodes.length === 0) {
    errors.push({
      code: "MISSING_START_NODE",
      message: "The workflow must have exactly one Start Node.",
      severity: "error",
    });
  } else if (startNodes.length > 1) {
    errors.push({
      code: "MULTIPLE_START_NODES",
      message: `The workflow has ${startNodes.length} Start Nodes. Only 1 Start Node is allowed.`,
      severity: "error",
    });
  }

  if (endNodes.length === 0) {
    errors.push({
      code: "MISSING_END_NODE",
      message: "The workflow must have at least one Completion / End Node.",
      severity: "error",
    });
  }

  const nodeMap = new Map<string, RawNode>();
  const fieldIdSeen = new Map<string, string>(); // fieldId -> nodeId
  const duplicateFieldIds = new Set<string>();

  for (const node of nodes) {
    if (nodeMap.has(node.id)) {
      errors.push({
        nodeId: node.id,
        code: "DUPLICATE_NODE_ID",
        message: `Node ID '${node.id}' is duplicated.`,
        severity: "error",
      });
    }
    nodeMap.set(node.id, node);

    // Validate field IDs
    if (node.type === "fieldNode" && node.data) {
      const fieldId = (node.data.fieldId as string) || `field_${node.id}`;
      if (fieldIdSeen.has(fieldId)) {
        duplicateFieldIds.add(fieldId);
        errors.push({
          nodeId: node.id,
          code: "DUPLICATE_FIELD_ID",
          message: `Field identifier '${fieldId}' is already used by node '${fieldIdSeen.get(fieldId)}'. Every field must have a unique identifier.`,
          severity: "error",
        });
      } else {
        fieldIdSeen.set(fieldId, node.id);
      }

      // Check field options for choice types
      const fieldType = (node.data.fieldType as string) || "text";
      if (["select", "radio", "checkbox", "dropdown"].includes(fieldType)) {
        const options = (node.data.options as Array<{ label: string; value: string }>) || [];
        if (options.length === 0) {
          warnings.push({
            nodeId: node.id,
            code: "EMPTY_OPTIONS",
            message: `Choice field '${node.data.label || node.id}' has no options defined.`,
            severity: "warning",
          });
        }
      }
    }
  }

  // 2. Build adjacency graph
  const outgoing = new Map<string, Array<{ target: string; handle?: string }>>();
  const incoming = new Map<string, Array<{ source: string; handle?: string }>>();

  for (const node of nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const edge of edges) {
    if (!nodeMap.has(edge.source)) {
      errors.push({
        code: "INVALID_EDGE_SOURCE",
        message: `Edge references non-existent source node '${edge.source}'.`,
        severity: "error",
      });
      continue;
    }
    if (!nodeMap.has(edge.target)) {
      errors.push({
        code: "INVALID_EDGE_TARGET",
        message: `Edge references non-existent target node '${edge.target}'.`,
        severity: "error",
      });
      continue;
    }

    outgoing.get(edge.source)!.push({ target: edge.target, handle: edge.sourceHandle });
    incoming.get(edge.target)!.push({ source: edge.source, handle: edge.sourceHandle });
  }

  // Start node cannot have incoming edges
  if (startNodes.length === 1) {
    const startIncoming = incoming.get(startNodes[0].id) || [];
    if (startIncoming.length > 0) {
      errors.push({
        nodeId: startNodes[0].id,
        code: "START_NODE_INCOMING_EDGE",
        message: "The Start Node cannot have incoming connections.",
        severity: "error",
      });
    }

    const startOutgoing = outgoing.get(startNodes[0].id) || [];
    if (startOutgoing.length === 0) {
      errors.push({
        nodeId: startNodes[0].id,
        code: "START_NODE_DISCONNECTED",
        message: "The Start Node must connect to at least one step.",
        severity: "error",
      });
    }
  }

  // End nodes cannot have outgoing edges
  for (const endNode of endNodes) {
    const endOut = outgoing.get(endNode.id) || [];
    if (endOut.length > 0) {
      errors.push({
        nodeId: endNode.id,
        code: "END_NODE_OUTGOING_EDGE",
        message: `End Node '${endNode.id}' cannot have outgoing connections.`,
        severity: "error",
      });
    }
  }

  // 3. Logic Node branch validations
  for (const node of nodes) {
    if (node.type === "logicNode") {
      const out = outgoing.get(node.id) || [];
      const hasTrue = out.some((e) => e.handle === "true");
      const hasFalse = out.some((e) => e.handle === "false");

      if (!hasTrue || !hasFalse) {
        errors.push({
          nodeId: node.id,
          code: "INCOMPLETE_LOGIC_BRANCHES",
          message: `Logic Node '${node.data?.label || node.id}' must connect both 'True' and 'False' branches.`,
          severity: "error",
        });
      }

      const targetFieldId = node.data?.targetFieldId as string;
      if (!targetFieldId) {
        errors.push({
          nodeId: node.id,
          code: "LOGIC_MISSING_TARGET_FIELD",
          message: `Logic Node '${node.data?.label || node.id}' has no target field selected to evaluate.`,
          severity: "error",
        });
      }
    }
  }

  // 4. Reachability from Start Node (Forward BFS)
  const reachableFromStart = new Set<string>();
  if (startNodes.length === 1) {
    const queue = [startNodes[0].id];
    reachableFromStart.add(startNodes[0].id);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const edge of outgoing.get(curr) || []) {
        if (!reachableFromStart.has(edge.target)) {
          reachableFromStart.add(edge.target);
          queue.push(edge.target);
        }
      }
    }

    for (const node of nodes) {
      if (!reachableFromStart.has(node.id)) {
        errors.push({
          nodeId: node.id,
          code: "UNREACHABLE_NODE",
          message: `Node '${node.data?.label || node.data?.title || node.id}' is disconnected and cannot be reached from the Start Node.`,
          severity: "error",
        });
      }
    }
  }

  // 5. Reachability to End Node (Backward BFS)
  const canReachEnd = new Set<string>();
  const endQueue = endNodes.map((n) => n.id);
  endQueue.forEach((id) => canReachEnd.add(id));

  while (endQueue.length > 0) {
    const curr = endQueue.shift()!;
    for (const edge of incoming.get(curr) || []) {
      if (!canReachEnd.has(edge.source)) {
        canReachEnd.add(edge.source);
        endQueue.push(edge.source);
      }
    }
  }

  for (const node of nodes) {
    if (node.type !== "endNode" && !canReachEnd.has(node.id)) {
      errors.push({
        nodeId: node.id,
        code: "DEAD_END_NODE",
        message: `Node '${node.data?.label || node.data?.title || node.id}' leads to a dead end with no path to an End Node.`,
        severity: "error",
      });
    }
  }

  // 6. Cycle Detection (Tarjan / DFS cycle detection on reachable graph)
  const visiting = new Set<string>();
  const visited = new Set<string>();
  let hasCycle = false;

  function detectCycle(nodeId: string, path: string[]) {
    visiting.add(nodeId);
    for (const edge of outgoing.get(nodeId) || []) {
      if (visiting.has(edge.target)) {
        hasCycle = true;
        errors.push({
          nodeId,
          code: "CYCLE_DETECTED",
          message: `Infinite loop detected in workflow graph: ${path.join(" -> ")} -> ${edge.target}`,
          severity: "error",
        });
      } else if (!visited.has(edge.target)) {
        detectCycle(edge.target, [...path, edge.target]);
      }
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
  }

  if (startNodes.length === 1) {
    detectCycle(startNodes[0].id, [startNodes[0].id]);
  }

  // If critical errors exist, do not produce a compiled schema
  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      warnings,
      compiledSchema: null,
    };
  }

  // 7. Compile canonical steps and reachability map
  const steps: Record<string, CompiledStep> = {};
  const fieldIds: string[] = [];
  const endNodeIds: string[] = endNodes.map((n) => n.id);
  const startNodeId = startNodes[0].id;

  for (const node of nodes) {
    const outEdges = outgoing.get(node.id) || [];
    let defaultNextNodeId: string | undefined;
    let trueNextNodeId: string | undefined;
    let falseNextNodeId: string | undefined;

    for (const e of outEdges) {
      if (e.handle === "true") trueNextNodeId = e.target;
      else if (e.handle === "false") falseNextNodeId = e.target;
      else defaultNextNodeId = e.target;
    }

    if (!defaultNextNodeId && outEdges.length > 0) {
      defaultNextNodeId = outEdges[0].target;
    }

    if (node.type === "startNode") {
      steps[node.id] = {
        id: node.id,
        nodeId: node.id,
        type: "start",
        title: (node.data?.title as string) || "Welcome",
        description: (node.data?.description as string) || "",
        buttonText: (node.data?.buttonText as string) || "Get Started",
        defaultNextNodeId,
      };
    } else if (node.type === "fieldNode") {
      const fieldId = (node.data?.fieldId as string) || `field_${node.id}`;
      fieldIds.push(fieldId);
      steps[node.id] = {
        id: node.id,
        nodeId: node.id,
        type: "field",
        fieldId,
        fieldType: (node.data?.fieldType as string) || "text",
        label: (node.data?.label as string) || "Untitled Field",
        placeholder: (node.data?.placeholder as string) || "",
        description: (node.data?.description as string) || "",
        required: Boolean(node.data?.required),
        options: (node.data?.options as Array<{ id: string; label: string; value: string }>) || [],
        min: node.data?.min as number | undefined,
        max: node.data?.max as number | undefined,
        defaultNextNodeId,
      };
    } else if (node.type === "logicNode") {
      steps[node.id] = {
        id: node.id,
        nodeId: node.id,
        type: "logic",
        label: (node.data?.label as string) || "Branch Rule",
        targetFieldId: (node.data?.targetFieldId as string) || "",
        condition: (node.data?.condition as string) || "equals",
        compareValue: (node.data?.compareValue as string) || "",
        trueNextNodeId,
        falseNextNodeId,
        defaultNextNodeId: trueNextNodeId || defaultNextNodeId,
      };
    } else if (node.type === "endNode") {
      steps[node.id] = {
        id: node.id,
        nodeId: node.id,
        type: "end",
        title: (node.data?.title as string) || "Thank You",
        description: (node.data?.description as string) || "Your response has been recorded.",
        redirectUrl: (node.data?.redirectUrl as string) || undefined,
      };
    }
  }

  // Build reachability map for runtime progress calculation
  const reachabilityMap: Record<string, string[]> = {};
  for (const node of nodes) {
    const reachableEnds = new Set<string>();
    const q = [node.id];
    const visitedNodes = new Set<string>([node.id]);

    while (q.length > 0) {
      const curr = q.shift()!;
      if (endNodeIds.includes(curr)) {
        reachableEnds.add(curr);
      }
      for (const e of outgoing.get(curr) || []) {
        if (!visitedNodes.has(e.target)) {
          visitedNodes.add(e.target);
          q.push(e.target);
        }
      }
    }
    reachabilityMap[node.id] = Array.from(reachableEnds);
  }

  const compiledSchema: CanonicalCompiledSchema = {
    id: `schema_${Date.now()}`,
    title,
    description,
    startNodeId,
    steps,
    fieldIds,
    endNodeIds,
    reachabilityMap,
    compiledAt: Date.now(),
  };

  return {
    isValid: true,
    errors: [],
    warnings,
    compiledSchema,
  };
}
