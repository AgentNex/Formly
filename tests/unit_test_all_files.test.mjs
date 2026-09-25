import test from "node:test";
import assert from "node:assert/strict";
import { cn } from "../dist/lib/utils.js";
import { ROLE_HIERARCHY, hasMinimumRole, isPublicPath } from "../dist/lib/rbac.js";
import {
  applyDagLayout,
  evaluateLogicCondition,
  getNextStep
} from "../dist/lib/flowCompiler.js";
import { compileAndValidateGraph } from "../dist/convex/compiler.js";

test("lib/utils.ts - cn merges classes cleanly", () => {
  const result = cn("px-4 py-2", true && "bg-white", false && "bg-black", "text-black");
  assert.equal(result.includes("px-4"), true);
  assert.equal(result.includes("bg-white"), true);
  assert.equal(result.includes("bg-black"), false);
});

test("lib/rbac.ts - role hierarchy respects strict privilege ranking", () => {
  assert.ok(ROLE_HIERARCHY.owner > ROLE_HIERARCHY.admin);
  assert.ok(ROLE_HIERARCHY.admin > ROLE_HIERARCHY.editor);
  assert.ok(ROLE_HIERARCHY.editor > ROLE_HIERARCHY.analyst);
  assert.ok(ROLE_HIERARCHY.analyst > ROLE_HIERARCHY.viewer);
  assert.ok(ROLE_HIERARCHY.viewer > ROLE_HIERARCHY.billing);

  // hasMinimumRole checks
  assert.equal(hasMinimumRole("owner", "admin"), true);
  assert.equal(hasMinimumRole("owner", "viewer"), true);
  assert.equal(hasMinimumRole("admin", "owner"), false);
  assert.equal(hasMinimumRole("editor", "editor"), true);
  assert.equal(hasMinimumRole("editor", "admin"), false);
  assert.equal(hasMinimumRole("viewer", "editor"), false);
  assert.equal(hasMinimumRole("billing", "viewer"), false);
});

test("lib/rbac.ts - route authorization distinguishes public from protected paths", () => {
  // Public routes (respondents & auth)
  assert.equal(isPublicPath("/f/customer-survey"), true);
  assert.equal(isPublicPath("/signin"), true);
  assert.equal(isPublicPath("/signup"), true);
  assert.equal(isPublicPath("/forgot-password"), true);
  assert.equal(isPublicPath("/api/auth/callback"), true);

  // Private protected routes (fail-closed)
  assert.equal(isPublicPath("/"), false);
  assert.equal(isPublicPath("/project/p_12345"), false);
  assert.equal(isPublicPath("/project/p_12345/analytics"), false);
  assert.equal(isPublicPath("/project/p_12345/share"), false);
  assert.equal(isPublicPath("/dashboard"), false);
});

test("convex/compiler.ts - rejects loops and cycles", () => {
  const cyclicNodes = [
    { id: "start", type: "startNode", data: { title: "Start" } },
    { id: "step_a", type: "fieldNode", data: { fieldId: "a", label: "A", fieldType: "text" } },
    { id: "step_b", type: "fieldNode", data: { fieldId: "b", label: "B", fieldType: "text" } },
    { id: "end", type: "endNode", data: { title: "End" } }
  ];
  const cyclicEdges = [
    { id: "e1", source: "start", target: "step_a" },
    { id: "e2", source: "step_a", target: "step_b" },
    { id: "e3", source: "step_b", target: "step_a" }, // Cycle
    { id: "e4", source: "step_b", target: "end" }
  ];

  const result = compileAndValidateGraph(cyclicNodes, cyclicEdges);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some(e => e.code === "CYCLE_DETECTED"));
});

test("lib/flowCompiler.ts - evaluateLogicCondition tests operators", () => {
  assert.equal(evaluateLogicCondition(5, "greater_than", "3"), true);
  assert.equal(evaluateLogicCondition(2, "greater_than", "3"), false);
  assert.equal(evaluateLogicCondition(3, "less_than", "5"), true);
  assert.equal(evaluateLogicCondition("hello", "equals", "hello"), true);
  assert.equal(evaluateLogicCondition("hello", "not_equals", "world"), true);
  assert.equal(evaluateLogicCondition("enterprise form builder", "contains", "form"), true);
  assert.equal(evaluateLogicCondition("", "is_empty", ""), true);
  assert.equal(evaluateLogicCondition("has text", "is_not_empty", ""), true);
});

test("lib/flowCompiler.ts - getNextStep correctly branches based on answers", () => {
  const schema = {
    startNodeId: "start",
    steps: {
      start: { id: "start", type: "start", defaultNextNodeId: "gate" },
      gate: {
        id: "gate",
        type: "logic",
        targetFieldId: "score",
        condition: "greater_than",
        compareValue: "3",
        trueNextNodeId: "happy_path",
        falseNextNodeId: "unhappy_path"
      },
      happy_path: { id: "happy_path", type: "field", fieldId: "happy_comment" },
      unhappy_path: { id: "unhappy_path", type: "field", fieldId: "sad_comment" }
    }
  };

  const nextWhenHigh = getNextStep("start", { score: 5 }, schema);
  assert.equal(nextWhenHigh?.id, "happy_path");

  const nextWhenLow = getNextStep("start", { score: 1 }, schema);
  assert.equal(nextWhenLow?.id, "unhappy_path");
});

test("lib/flowCompiler.ts - applyDagLayout spaces nodes horizontally", () => {
  const nodes = [
    { id: "start", type: "startNode", position: { x: 0, y: 0 }, data: { title: "Start" } },
    { id: "f1", type: "fieldNode", position: { x: 0, y: 0 }, data: { fieldId: "f1", label: "F1", fieldType: "text" } },
    { id: "end", type: "endNode", position: { x: 0, y: 0 }, data: { title: "End" } }
  ];
  const edges = [
    { id: "e1", source: "start", target: "f1" },
    { id: "e2", source: "f1", target: "end" }
  ];

  const layouted = applyDagLayout(nodes, edges);
  const startNode = layouted.find(n => n.id === "start");
  const f1Node = layouted.find(n => n.id === "f1");
  const endNode = layouted.find(n => n.id === "end");

  assert.ok(startNode.position.x < f1Node.position.x);
  assert.ok(f1Node.position.x < endNode.position.x);
});

test("lib/insforge.ts - client initialized with valid base URL and anon key", async () => {
  const { insforge, INSFORGE_BASE_URL, INSFORGE_ANON_KEY } = await import("../dist/lib/insforge.js");

  assert.ok(INSFORGE_BASE_URL.includes("insforge.app"));
  assert.ok(INSFORGE_ANON_KEY.startsWith("anon_"));
  assert.equal(typeof insforge.auth.signInWithPassword, "function");
  assert.equal(typeof insforge.auth.signUp, "function");
  assert.equal(typeof insforge.auth.signInWithOAuth, "function");
  assert.equal(typeof insforge.auth.verifyEmail, "function");
  assert.equal(typeof insforge.auth.signOut, "function");
  assert.equal(typeof insforge.auth.getCurrentUser, "function");
});

