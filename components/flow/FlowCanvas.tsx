"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
import { FormNode, FormEdge, FieldType, FormNodeData } from "@/lib/types/flow";
import { compileFlow, applyDagLayout } from "@/lib/flowCompiler";
import {
  Save,
  RotateCcw,
  Sparkles,
  Share2,
  Check,
  AlertCircle,
  Eye,
  Undo2,
  Redo2,
  Copy,
  Layers,
  Sliders,
  CheckCircle2,
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

interface HistoryEntry {
  nodes: FormNode[];
  edges: FormEdge[];
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
  const [saveStatus, setSaveStatus] = useState<"clean" | "dirty" | "saving" | "conflict">("clean");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);

  // Mobile drawer states
  const [mobileTab, setMobileTab] = useState<"canvas" | "palette" | "inspector">("canvas");

  // Undo / Redo history stack
  const [history, setHistory] = useState<HistoryEntry[]>([
    { nodes: initialNodes, edges: initialEdges },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoAction = useRef(false);

  // Clipboard buffer
  const clipboardRef = useRef<FormNode | null>(null);

  // Push to history when changes occur (debounced for positions)
  const pushToHistory = useCallback((newNodes: FormNode[], newEdges: FormEdge[]) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, { nodes: newNodes, edges: newEdges }].slice(-30);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
    setSaveStatus("dirty");
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const target = history[historyIndex - 1];
      setNodes(target.nodes);
      setEdges(target.edges);
      setHistoryIndex((prev) => prev - 1);
      setSaveStatus("dirty");
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const target = history[historyIndex + 1];
      setNodes(target.nodes);
      setEdges(target.edges);
      setHistoryIndex((prev) => prev + 1);
      setSaveStatus("dirty");
    }
  }, [history, historyIndex, setNodes, setEdges]);

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
      setEdges((eds) => {
        const nextEdges = addEdge(newEdge, eds);
        pushToHistory(nodes, nextEdges);
        return nextEdges;
      });
    },
    [nodes, pushToHistory, setEdges]
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
      setNodes((nds) => {
        const nextNodes = nds.map((n) => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: { ...n.data, ...updatedData } as FormNodeData,
            };
          }
          return n;
        });
        pushToHistory(nextNodes, edges);
        return nextNodes;
      });
    },
    [edges, pushToHistory, setNodes]
  );

  // Delete node
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const nextNodes = nodes.filter((n) => n.id !== nodeId);
      const nextEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeId(null);
      pushToHistory(nextNodes, nextEdges);
    },
    [nodes, edges, pushToHistory, setNodes, setEdges]
  );

  // Add node from palette
  const handleAddNode = useCallback(
    (type: "fieldNode" | "logicNode" | "endNode", fieldType?: FieldType) => {
      const id = `node_${Date.now()}`;
      const xPos = 240 + (nodes.length % 5) * 60;
      const yPos = 160 + (nodes.length % 5) * 50;

      let newNode: FormNode;

      if (type === "fieldNode") {
        const fKey = `field_${Date.now().toString(36).substring(4)}`;
        let label = "New Question";
        let placeholder = "Type your answer...";
        let options = undefined;

        if (fieldType === "email") {
          label = "Email Address";
          placeholder = "you@company.com";
        } else if (fieldType === "phone") {
          label = "Phone Number";
          placeholder = "+1 (555) 000-0000";
        } else if (fieldType === "number") {
          label = "Quantity / Amount";
          placeholder = "0";
        } else if (fieldType === "currency") {
          label = "Estimated Budget";
          placeholder = "0.00";
        } else if (fieldType === "select" || fieldType === "radio" || fieldType === "checkbox") {
          label = "Choose an Option";
          options = [
            { id: "opt_1", label: "Option 1", value: "option_1" },
            { id: "opt_2", label: "Option 2", value: "option_2" },
          ];
        } else if (fieldType === "rating") {
          label = "Rating (1 to 5)";
        } else if (fieldType === "slider") {
          label = "Opinion Scale";
        } else if (fieldType === "nps") {
          label = "How likely are you to recommend us?";
        } else if (fieldType === "signature") {
          label = "Authorized Signature";
        } else if (fieldType === "consent") {
          label = "I agree to the privacy terms & conditions.";
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
            required: false,
            options,
            currencySymbol: fieldType === "currency" ? "$" : undefined,
          } as FormNodeData,
        };
      } else if (type === "logicNode") {
        newNode = {
          id,
          type: "logicNode",
          position: { x: xPos, y: yPos },
          data: {
            label: "Branch Gate",
            targetFieldId: "",
            condition: "equals",
            compareValue: "",
            combinator: "AND",
          } as FormNodeData,
        };
      } else {
        newNode = {
          id,
          type: "endNode",
          position: { x: xPos, y: yPos },
          data: {
            title: "Thank You",
            description: "Your responses have been securely recorded.",
          } as FormNodeData,
        };
      }

      const nextNodes = [...nodes, newNode];
      setNodes(nextNodes);
      setSelectedNodeId(id);
      pushToHistory(nextNodes, edges);
    },
    [nodes, edges, pushToHistory, setNodes]
  );

  // Duplicate selected node
  const handleDuplicateSelected = useCallback(() => {
    if (!selectedNode) return;
    const newId = `node_${Date.now()}`;
    const duplicated: FormNode = {
      ...selectedNode,
      id: newId,
      position: {
        x: selectedNode.position.x + 40,
        y: selectedNode.position.y + 40,
      },
      data: {
        ...selectedNode.data,
        fieldId: (selectedNode.data as any)?.fieldId
          ? `${(selectedNode.data as any).fieldId}_copy`
          : undefined,
      } as FormNodeData,
    };
    const nextNodes = [...nodes, duplicated];
    setNodes(nextNodes);
    setSelectedNodeId(newId);
    pushToHistory(nextNodes, edges);
  }, [selectedNode, nodes, edges, pushToHistory, setNodes]);

  // Copy & Paste keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "SELECT"
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (selectedNode) {
          clipboardRef.current = selectedNode;
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        if (clipboardRef.current) {
          e.preventDefault();
          const nodeToPaste = clipboardRef.current;
          const newId = `node_${Date.now()}`;
          const pasted: FormNode = {
            ...nodeToPaste,
            id: newId,
            position: {
              x: nodeToPaste.position.x + 50,
              y: nodeToPaste.position.y + 50,
            },
            data: {
              ...nodeToPaste.data,
              fieldId: (nodeToPaste.data as any)?.fieldId
                ? `${(nodeToPaste.data as any).fieldId}_${Math.random().toString(36).slice(2, 6)}`
                : undefined,
            } as FormNodeData,
          };
          const nextNodes = [...nodes, pasted];
          setNodes(nextNodes);
          setSelectedNodeId(newId);
          pushToHistory(nextNodes, edges);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        if (selectedNode) {
          e.preventDefault();
          handleDuplicateSelected();
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNode && selectedNode.type !== "startNode") {
          e.preventDefault();
          handleDeleteNode(selectedNode.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNode, handleUndo, handleRedo, handleDuplicateSelected, handleDeleteNode, nodes, edges, pushToHistory, setNodes]);

  // True DAG auto-layout
  const handleAutoLayout = useCallback(() => {
    const layouted = applyDagLayout(nodes, edges);
    setNodes(layouted);
    pushToHistory(layouted, edges);
  }, [nodes, edges, pushToHistory, setNodes]);

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("saving");
    const compilation = compileFlow(nodes, edges, title, formDescription);
    setWarnings(compilation.warnings);

    try {
      await onSave(
        title,
        nodes,
        edges,
        JSON.stringify(compilation.schema)
      );
      setSaveStatus("clean");
    } catch {
      setSaveStatus("dirty");
    } finally {
      setIsSaving(false);
    }
  };

  // Publish action with validation gate
  const handlePublishClick = async () => {
    const compilation = compileFlow(nodes, edges, title, formDescription);
    if (!compilation.isValid) {
      setWarnings(compilation.warnings);
      setShowValidationModal(true);
      return;
    }
    if (onTogglePublish) {
      await onTogglePublish(!isPublished);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white overflow-hidden select-none">
      {/* Top Toolbar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950 px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaveStatus("dirty");
            }}
            placeholder="Workflow Name"
            className="bg-transparent text-sm font-semibold text-white tracking-tight border-b border-transparent hover:border-zinc-700 focus:border-white focus:outline-none px-1 py-0.5 transition-colors"
          />

          {/* Autosave Status Badge */}
          <span
            className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
              saveStatus === "clean"
                ? "bg-zinc-900 text-zinc-400 border-zinc-800"
                : saveStatus === "saving"
                ? "bg-zinc-800 text-zinc-200 border-zinc-700 animate-pulse"
                : saveStatus === "conflict"
                ? "bg-red-950/60 text-red-300 border-red-800"
                : "bg-amber-950/40 text-amber-300 border-amber-800"
            }`}
          >
            {saveStatus === "clean" && "Saved"}
            {saveStatus === "dirty" && "Unsaved"}
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "conflict" && "Conflict"}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* History Controls */}
          <div className="hidden md:flex items-center border border-zinc-800 rounded-lg bg-zinc-900/60 p-0.5 mr-2">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo (Ctrl+Z)"
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo (Ctrl+Y)"
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* True DAG Auto-Layout */}
          <button
            onClick={handleAutoLayout}
            title="Auto-organize nodes into a clean DAG layout"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">DAG Layout</span>
          </button>

          {/* Live Preview Button */}
          <button
            onClick={onOpenPreview}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Test Preview</span>
          </button>

          {/* Share & QR Hub */}
          <button
            onClick={onOpenShare}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share & QR</span>
          </button>

          {/* Manual Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : "Save"}</span>
          </button>

          {/* Publish / Pause Toggle */}
          {onTogglePublish && (
            <button
              onClick={handlePublishClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isPublished
                  ? "bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800"
                  : "bg-white text-black hover:bg-zinc-200"
              }`}
            >
              {isPublished ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Published</span>
                </>
              ) : (
                <span>Publish</span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Main Canvas Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Component Palette */}
        <div className="hidden md:block">
          <ComponentPalette onAddNode={handleAddNode} />
        </div>

        {/* Central React Flow Canvas */}
        <div className="flex-1 h-full w-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={(changes) => {
              onNodesChange(changes);
              setSaveStatus("dirty");
            }}
            onEdgesChange={(changes) => {
              onEdgesChange(changes);
              setSaveStatus("dirty");
            }}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            className="bg-black"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#27272a"
            />
            <Controls className="!bg-zinc-950 !border-zinc-800 !text-white [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800 [&>button]:!text-zinc-300" />
            <MiniMap
              nodeColor={() => "#3f3f46"}
              maskColor="rgba(0, 0, 0, 0.8)"
              className="!bg-zinc-950 !border-zinc-800"
            />
          </ReactFlow>

          {/* Floating Mobile Dock */}
          <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-950/90 backdrop-blur border border-zinc-800 rounded-full px-4 py-2 flex items-center gap-3 z-30 shadow-2xl">
            <button
              onClick={() => setMobileTab(mobileTab === "palette" ? "canvas" : "palette")}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${
                mobileTab === "palette" ? "bg-white text-black" : "text-zinc-300"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Palette</span>
            </button>
            <button
              onClick={() => setMobileTab(mobileTab === "inspector" ? "canvas" : "inspector")}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${
                mobileTab === "inspector" ? "bg-white text-black" : "text-zinc-300"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Inspector</span>
            </button>
          </div>

          {/* Mobile Palette Overlay */}
          {mobileTab === "palette" && (
            <div className="md:hidden absolute inset-0 bg-black/80 backdrop-blur z-40 flex flex-col">
              <div className="flex-1 max-w-sm w-full bg-zinc-950 border-r border-zinc-800">
                <ComponentPalette
                  onAddNode={(type, fieldType) => {
                    handleAddNode(type, fieldType);
                    setMobileTab("canvas");
                  }}
                />
              </div>
            </div>
          )}

          {/* Mobile Inspector Overlay */}
          {mobileTab === "inspector" && (
            <div className="md:hidden absolute inset-0 bg-black/80 backdrop-blur z-40 flex justify-end">
              <div className="max-w-sm w-full bg-zinc-950 border-l border-zinc-800">
                <NodeInspector
                  selectedNode={selectedNode}
                  allNodes={nodes}
                  onUpdateNodeData={handleUpdateNodeData}
                  onDeleteNode={(id) => {
                    handleDeleteNode(id);
                    setMobileTab("canvas");
                  }}
                  onClose={() => setMobileTab("canvas")}
                />
              </div>
            </div>
          )}
        </div>

        {/* Desktop Right Node Inspector */}
        <div className="hidden md:block">
          <NodeInspector
            selectedNode={selectedNode}
            allNodes={nodes}
            onUpdateNodeData={handleUpdateNodeData}
            onDeleteNode={handleDeleteNode}
            onClose={() => setSelectedNodeId(null)}
          />
        </div>
      </div>

      {/* Validation Gate Dialog */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-white">Validation Warnings</h3>
            </div>
            <p className="text-xs text-zinc-400">
              The workflow canvas has structural issues that should be addressed before publishing:
            </p>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {warnings.map((w, idx) => (
                <li
                  key={idx}
                  className="text-xs bg-zinc-900 border border-zinc-800/80 rounded-lg p-2.5 text-zinc-300"
                >
                  {w}
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowValidationModal(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-white text-black hover:bg-zinc-200 transition-colors"
              >
                Close & Fix
              </button>
            </div>
          </div>
        </div>
      )}
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
