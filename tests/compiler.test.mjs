import test from "node:test";
import assert from "node:assert/strict";
import { compileAndValidateGraph } from "../dist/convex/compiler.js";
import { applyDagLayout, evaluateLogicCondition } from "../dist/lib/flowCompiler.js";

// Helper to make test nodes
function makeNode(id, type, data = {}) {
  return { id, type, data, position: { x: 0, y: 0 } };
}

function makeEdge(id, source, target, sourceHandle) {
  return { id, source, target, sourceHandle };
}

test("Valid DAG flow passes compilation", () => {
  const nodes = [
    makeNode("start", "startNode", { title: "Welcome" }),
    makeNode("q1", "fieldNode", { fieldId: "field_q1", fieldType: "text", label: "Question 1" }),
    makeNode("end", "endNode", { title: "Done" }),
  ];

  const edges = [
    makeEdge("e1", "start", "q1"),
    makeEdge("e2", "q1", "end"),
  ];

  const result = compileAndValidateGraph(nodes, edges, "Test Form");
  assert.equal(result.isValid, true);
  assert.equal(result.errors.length, 0);
  assert.ok(result.compiledSchema);
  assert.equal(result.compiledSchema.startNodeId, "start");
  assert.equal(result.compiledSchema.fieldIds.includes("field_q1"), true);
});

test("Missing start node is rejected", () => {
  const nodes = [
    makeNode("q1", "fieldNode", { fieldId: "field_q1", label: "Question 1" }),
    makeNode("end", "endNode", {}),
  ];
  const edges = [makeEdge("e1", "q1", "end")];

  const result = compileAndValidateGraph(nodes, edges, "No Start");
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((e) => e.code === "MISSING_START_NODE"));
});

test("Multiple start nodes are rejected", () => {
  const nodes = [
    makeNode("s1", "startNode", {}),
    makeNode("s2", "startNode", {}),
    makeNode("end", "endNode", {}),
  ];
  const edges = [
    makeEdge("e1", "s1", "end"),
    makeEdge("e2", "s2", "end"),
  ];

  const result = compileAndValidateGraph(nodes, edges, "Dual Start");
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((e) => e.code === "MULTIPLE_START_NODES"));
});

test("Missing end node is rejected", () => {
  const nodes = [
    makeNode("start", "startNode", {}),
    makeNode("q1", "fieldNode", { fieldId: "f1", label: "Q1" }),
  ];
  const edges = [makeEdge("e1", "start", "q1")];

  const result = compileAndValidateGraph(nodes, edges, "No End");
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((e) => e.code === "MISSING_END_NODE"));
});

test("Disconnected unreachable node is rejected", () => {
  const nodes = [
    makeNode("start", "startNode", {}),
    makeNode("q1", "fieldNode", { fieldId: "f1", label: "Q1" }),
    makeNode("orphan", "fieldNode", { fieldId: "orphan_field", label: "Orphan" }),
    makeNode("end", "endNode", {}),
  ];
  const edges = [
    makeEdge("e1", "start", "q1"),
    makeEdge("e2", "q1", "end"),
  ];

  const result = compileAndValidateGraph(nodes, edges, "Unreachable");
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((e) => e.code === "UNREACHABLE_NODE" && e.nodeId === "orphan"));
});

test("Dead end node is rejected", () => {
  const nodes = [
    makeNode("start", "startNode", {}),
    makeNode("branch", "logicNode", { label: "Gate", targetFieldId: "f1" }),
    makeNode("dead", "fieldNode", { fieldId: "f_dead", label: "Dead End" }),
    makeNode("alive", "fieldNode", { fieldId: "f_alive", label: "Alive" }),
    makeNode("end", "endNode", {}),
  ];
  const edges = [
    makeEdge("e1", "start", "branch"),
    makeEdge("e2", "branch", "alive", "true"),
    makeEdge("e3", "branch", "dead", "false"),
    makeEdge("e4", "alive", "end"),
    // dead node has no path to end!
  ];

  const result = compileAndValidateGraph(nodes, edges, "Dead End");
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((e) => e.code === "DEAD_END_NODE" && e.nodeId === "dead"));
});

test("Cyclic infinite loop is detected and rejected", () => {
  const nodes = [
    makeNode("start", "startNode", {}),
    makeNode("a", "fieldNode", { fieldId: "fa", label: "A" }),
    makeNode("b", "fieldNode", { fieldId: "fb", label: "B" }),
    makeNode("end", "endNode", {}),
  ];
  const edges = [
    makeEdge("e1", "start", "a"),
    makeEdge("e2", "a", "b"),
    makeEdge("e3", "b", "a"), // cycle!
    makeEdge("e4", "b", "end"),
  ];

  const result = compileAndValidateGraph(nodes, edges, "Cycle");
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((e) => e.code === "CYCLE_DETECTED"));
});

test("Duplicate field IDs are rejected", () => {
  const nodes = [
    makeNode("start", "startNode", {}),
    makeNode("q1", "fieldNode", { fieldId: "user_email", label: "Email 1" }),
    makeNode("q2", "fieldNode", { fieldId: "user_email", label: "Email 2" }),
    makeNode("end", "endNode", {}),
  ];
  const edges = [
    makeEdge("e1", "start", "q1"),
    makeEdge("e2", "q1", "q2"),
    makeEdge("e3", "q2", "end"),
  ];

  const result = compileAndValidateGraph(nodes, edges, "Duplicate Fields");
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((e) => e.code === "DUPLICATE_FIELD_ID"));
});

test("Logic condition evaluation operators", () => {
  assert.equal(evaluateLogicCondition("hello", "equals", "hello"), true);
  assert.equal(evaluateLogicCondition("hello", "equals", "world"), false);
  assert.equal(evaluateLogicCondition("hello world", "contains", "world"), true);
  assert.equal(evaluateLogicCondition(25, "greater_than", "18"), true);
  assert.equal(evaluateLogicCondition(15, "greater_than", "18"), false);
  assert.equal(evaluateLogicCondition("", "is_empty", ""), true);
  assert.equal(evaluateLogicCondition("some", "is_not_empty", ""), true);
  assert.equal(evaluateLogicCondition("https://formly.dev", "starts_with", "https"), true);
});

test("DAG Auto-Layout assigns ascending horizontal layers", () => {
  const nodes = [
    makeNode("start", "startNode"),
    makeNode("step1", "fieldNode"),
    makeNode("step2", "fieldNode"),
    makeNode("end", "endNode"),
  ];
  const edges = [
    makeEdge("e1", "start", "step1"),
    makeEdge("e2", "step1", "step2"),
    makeEdge("e3", "step2", "end"),
  ];

  const layouted = applyDagLayout(nodes, edges);
  assert.equal(layouted.length, 4);

  const startX = layouted.find((n) => n.id === "start").position.x;
  const step1X = layouted.find((n) => n.id === "step1").position.x;
  const step2X = layouted.find((n) => n.id === "step2").position.x;
  const endX = layouted.find((n) => n.id === "end").position.x;

  assert.ok(startX < step1X);
  assert.ok(step1X < step2X);
  assert.ok(step2X < endX);
});
