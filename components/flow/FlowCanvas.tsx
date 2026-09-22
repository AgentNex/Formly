"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  ReactFlowProvider,
  Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./CustomNodes";
import { ComponentPalette } from "./ComponentPalette";
import { NodeInspector } from "./NodeInspector";
import { FormNode, FormEdge, FieldType } from "@/lib/types/flow";
import { compileFlow } from "@/lib/flowCompiler";
import {
  Save,
  Play,
  RotateCcw,
  Sparkles,
  Share2,
  Check,
  AlertCircle,
  Eye,
} from "lucide-react";

interface FlowCanvasProps {
  initialNodes: FormNode[];
  initialEdges: FormEdge[];
  formTitle: string;
  formDescription?: string;
  isPublished: boolean;
  onSave: (
    title: string,
    nodes: FormNode[],
    edges: FormEdge[],
    compiledSchema: string
  ) => Promise<void>;
  onTogglePublish?: (published: boolean) => Promise<void>;
  onOpenPreview: () => void;
  onOpenShare: () => void;
}

function FlowCanvasInner({
  initialNodes,
  initialEdges,
  formTitle,
  formDescription,
  isPublished,
  onSave,
  onTogglePublish,
  onOpenPreview,
  onOpenShare,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [title, setTitle] = useState(formTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Selected node object
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  // Handle new edge connection
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: FormEdge = {
        ...params,
        id: `e_${params.source}_${params.target}_${Date.now()}`,
        animated: true,
        style: { stroke: "#e4e4e7", strokeWidth: 2 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Click on node selects it
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Click canvas background unselects node
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Update node data from inspector
  const handleUpdateNodeData = useCallback(
    (nodeId: string, updatedData: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: updatedData,
            };
          }
          return n;
        })
      );
    },
    [setNodes]
  );

  // Delete node
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
      setSelectedNodeId(null);
    },
    [setNodes, setEdges]
  );

  // Add node from palette
  const handleAddNode = useCallback(
    (type: "fieldNode" | "logicNode" | "endNode", fieldType?: FieldType) => {
      const id = `node_${Date.now()}`;
      // Stagger position
      const xPos = 200 + (nodes.length % 5) * 80;
      const yPos = 160 + (nodes.length % 5) * 60;

      let newNode: FormNode;

      if (type === "fieldNode") {
        const fKey = `field_${Date.now().toString(36).substring(4)}`;
        let label = "New Question";
        let placeholder = "Type your answer...";
        let options = undefined;

        if (fieldType === "email") {
          label = "Email Address";
          placeholder = "you@example.com";
        } else if (fieldType === "number") {
          label = "Age or Quantity";
          placeholder = "0";
        } else if (fieldType === "select" || fieldType === "radio" || fieldType === "checkbox") {
          label = "Choose an Option";
          options = [
            { id: "opt_1", label: "Option A", value: "option_a" },
            { id: "opt_2", label: "Option B", value: "option_b" },
          ];
        } else if (fieldType === "rating") {
          label = "How would you rate our service?";
        }

        newNode = {
          id,
          type: "fieldNode",
          position: { x: xPos, y: yPos },
          data: {
            fieldId: fKey,
            fieldType: fieldType || "text",
            label,
            placeholder,
            required: true,
            options,
          },
        };
      } else if (type === "logicNode") {
        newNode = {
          id,
          type: "logicNode",
          position: { x: xPos, y: yPos },
          data: {
            label: "Conditional Branch",
            targetFieldId: "",
            condition: "equals",
            compareValue: "",
          },
        };
      } else {
        newNode = {
          id,
          type: "endNode",
          position: { x: xPos, y: yPos },
          data: {
            title: "Thank You!",
            description: "Your responses have been successfully submitted.",
          },
        };
      }

      setNodes((nds) => [...nds, newNode]);
      setSelectedNodeId(id);
    },
    [nodes.length, setNodes]
  );

  // Auto-arrange layout (horizontal DAG order)
  const handleAutoLayout = useCallback(() => {
    setNodes((nds) => {
      return nds.map((n, idx) => ({
        ...n,
        position: {
          x: 100 + idx * 300,
          y: 200 + (idx % 2 === 0 ? 0 : 40),
        },
      }));
    });
  }, [setNodes]);

  // Handle Save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const compileRes = compileFlow(nodes, edges, title, formDescription);
      setWarnings(compileRes.warnings);

      await onSave(
        title,
        nodes,
        edges,
        JSON.stringify(compileRes.schema)
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-black text-white select-none">
      {/* Top Bar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950 px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-sm font-semibold text-white hover:bg-zinc-900 focus:bg-zinc-900 border border-transparent focus:border-zinc-700 rounded px-2 py-1 transition-colors outline-none max-w-xs truncate"
            placeholder="Form Title"
          />
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPublished ? "bg-white" : "bg-zinc-500"
              }`}
            />
            <span className="text-zinc-400">
              {isPublished ? "Published" : "Draft"}
            </span>
          </div>
        </div>

        {/* Warnings indicator if any */}
        {warnings.length > 0 && (
          <div className="hidden md:flex items-center gap-1 text-xs text-zinc-400 bg-zinc-900/90 border border-zinc-800 px-2.5 py-1 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 text-zinc-300" />
            <span>{warnings[0]}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoLayout}
            title="Auto Align Layout"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Align Flow</span>
          </button>

          <button
            onClick={onOpenPreview}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Test Preview</span>
          </button>

          <button
            onClick={onOpenShare}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share & QR</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-50 transition-all shadow-sm"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </>
            ) : isSaving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Flow Canvas with Sidebars */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Palette */}
        <ComponentPalette onAddNode={handleAddNode} />

        {/* Center React Flow Area */}
        <div className="flex-1 h-full relative bg-zinc-950">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: "#e4e4e7", strokeWidth: 2 },
            }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              color="#27272a"
              gap={18}
              size={1.5}
            />
            <Controls className="!bg-zinc-900 !border-zinc-800 !text-white [&>button]:!border-zinc-800 [&>button]:!bg-zinc-900 [&>button]:!fill-white [&>button:hover]:!bg-zinc-800" />
            <MiniMap
              className="!bg-zinc-950 !border-zinc-800 rounded-lg overflow-hidden"
              nodeColor="#3f3f46"
              maskColor="rgba(0, 0, 0, 0.75)"
            />
          </ReactFlow>
        </div>

        {/* Right Inspector */}
        <NodeInspector
          selectedNode={selectedNode}
          allNodes={nodes}
          onUpdateNodeData={handleUpdateNodeData}
          onDeleteNode={handleDeleteNode}
          onClose={() => setSelectedNodeId(null)}
        />
      </div>
    </div>
  );
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
