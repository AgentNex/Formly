"use client";

import React from "react";
import { Trash2, Plus, X, Sliders } from "lucide-react";
import { FormNode, FieldType, LogicCondition, LogicRule } from "@/lib/types/flow";

interface NodeInspectorProps {
  selectedNode: FormNode | null;
  allNodes: FormNode[];
  onUpdateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

export function NodeInspector({
  selectedNode,
  allNodes,
  onUpdateNodeData,
  onDeleteNode,
  onClose,
}: NodeInspectorProps) {
  if (!selectedNode) {
    return (
      <aside className="w-80 bg-zinc-950 border-l border-zinc-800 p-6 flex flex-col items-center justify-center text-center text-zinc-500 text-xs">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
          <Sliders className="w-5 h-5" />
        </div>
        <p className="font-medium text-zinc-300">No Node Selected</p>
        <p className="mt-1 text-zinc-500">Click any component on the canvas to configure its properties.</p>
      </aside>
    );
  }

  const { id, type, data } = selectedNode;
  const nodeData = (data || {}) as Record<string, any>;

  const handleFieldChange = (key: string, value: any) => {
    onUpdateNodeData(id, {
      ...nodeData,
      [key]: value,
    });
  };

  // Find all predecessor or available field IDs for logic dropdown
  const availableFields = allNodes
    .filter((n) => n.type === "fieldNode" && n.id !== id)
    .map((n) => ({
      id: (n.data as any)?.fieldId || n.id,
      label: (n.data as any)?.label || n.id,
    }));

  return (
    <aside className="w-80 bg-zinc-950 border-l border-zinc-800 flex flex-col h-full overflow-y-auto text-zinc-200">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-950/90 backdrop-blur z-10">
        <div>
          <h3 className="text-xs font-semibold text-white tracking-wide uppercase font-mono">
            {type === "startNode" && "Start Node"}
            {type === "fieldNode" && "Field Properties"}
            {type === "logicNode" && "Logic Gate"}
            {type === "endNode" && "Completion Node"}
          </h3>
          <span className="text-[10px] text-zinc-500 font-mono">ID: {id}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* START NODE PROPERTIES */}
        {type === "startNode" && (
          <>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Title</label>
              <input
                type="text"
                value={nodeData.title || ""}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Description</label>
              <textarea
                rows={3}
                value={nodeData.description || ""}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Button Label</label>
              <input
                type="text"
                value={nodeData.buttonText || ""}
                onChange={(e) => handleFieldChange("buttonText", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
              />
            </div>
          </>
        )}

        {/* FIELD NODE PROPERTIES */}
        {type === "fieldNode" && (
          <>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Field Type</label>
              <select
                value={nodeData.fieldType || "text"}
                onChange={(e) => handleFieldChange("fieldType", e.target.value as FieldType)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
              >
                <option value="text">Single Line Text</option>
                <option value="textarea">Paragraph / Multiline</option>
                <option value="email">Email Address</option>
                <option value="phone">Phone Number</option>
                <option value="number">Numeric Input</option>
                <option value="date">Date Picker</option>
                <option value="time">Time Picker</option>
                <option value="address">Physical Address</option>
                <option value="country">Country Dropdown</option>
                <option value="select">Dropdown Select</option>
                <option value="radio">Radio Buttons (Single Choice)</option>
                <option value="checkbox">Checkboxes (Multiple Choice)</option>
                <option value="rating">Star Rating (1-5)</option>
                <option value="slider">Opinion Scale / Slider</option>
                <option value="nps">Net Promoter Score (0-10)</option>
                <option value="file">File Upload</option>
                <option value="signature">Digital Signature</option>
                <option value="currency">Currency / Price</option>
                <option value="consent">Legal Consent / GDPR</option>
                <option value="hidden">Hidden Metadata</option>
                <option value="computed">Computed Formula</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Field Identifier (Unique)</label>
              <input
                type="text"
                value={nodeData.fieldId || ""}
                onChange={(e) => handleFieldChange("fieldId", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Question / Label</label>
              <input
                type="text"
                value={nodeData.label || ""}
                onChange={(e) => handleFieldChange("label", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            {nodeData.fieldType !== "consent" && nodeData.fieldType !== "hidden" && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Placeholder Text</label>
                <input
                  type="text"
                  value={nodeData.placeholder || ""}
                  onChange={(e) => handleFieldChange("placeholder", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Helper Description</label>
              <input
                type="text"
                value={nodeData.description || ""}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Currency Symbol */}
            {nodeData.fieldType === "currency" && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={nodeData.currencySymbol || "$"}
                  onChange={(e) => handleFieldChange("currencySymbol", e.target.value)}
                  className="w-20 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                />
              </div>
            )}

            {/* Slider / Number Min & Max */}
            {["number", "slider", "rating", "nps"].includes(nodeData.fieldType) && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Min Value</label>
                  <input
                    type="number"
                    value={nodeData.min ?? 0}
                    onChange={(e) => handleFieldChange("min", Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Max Value</label>
                  <input
                    type="number"
                    value={nodeData.max ?? (nodeData.fieldType === "rating" ? 5 : nodeData.fieldType === "nps" ? 10 : 100)}
                    onChange={(e) => handleFieldChange("max", Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-zinc-300">Required Question</span>
              <input
                type="checkbox"
                checked={Boolean(nodeData.required)}
                onChange={(e) => handleFieldChange("required", e.target.checked)}
                className="w-4 h-4 accent-white rounded bg-zinc-900 border-zinc-700"
              />
            </div>

            {/* Options manager for Select / Radio / Checkbox */}
            {["select", "radio", "checkbox"].includes(nodeData.fieldType) && (
              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-400">Options</label>
                  <button
                    onClick={() => {
                      const opts = nodeData.options || [];
                      const nextNum = opts.length + 1;
                      handleFieldChange("options", [
                        ...opts,
                        { id: `opt_${Date.now()}`, label: `Option ${nextNum}`, value: `option_${nextNum}` },
                      ]);
                    }}
                    className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800"
                  >
                    <Plus className="w-3 h-3" /> Add Option
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(nodeData.options || []).map((opt: any, index: number) => (
                    <div key={opt.id || index} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={opt.label}
                        onChange={(e) => {
                          const updated = [...nodeData.options];
                          updated[index] = { ...opt, label: e.target.value, value: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") };
                          handleFieldChange("options", updated);
                        }}
                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-zinc-500"
                      />
                      <button
                        onClick={() => {
                          const updated = nodeData.options.filter((_: any, i: number) => i !== index);
                          handleFieldChange("options", updated);
                        }}
                        className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* LOGIC NODE PROPERTIES */}
        {type === "logicNode" && (
          <>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Gate Combinator</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFieldChange("combinator", "AND")}
                  className={`py-1.5 text-xs rounded border transition-colors ${
                    (nodeData.combinator || "AND") === "AND"
                      ? "bg-white text-black font-semibold border-white"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800"
                  }`}
                >
                  ALL Must Match (AND)
                </button>
                <button
                  type="button"
                  onClick={() => handleFieldChange("combinator", "OR")}
                  className={`py-1.5 text-xs rounded border transition-colors ${
                    nodeData.combinator === "OR"
                      ? "bg-white text-black font-semibold border-white"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800"
                  }`}
                >
                  ANY Can Match (OR)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Primary Target Field</label>
              <select
                value={nodeData.targetFieldId || ""}
                onChange={(e) => handleFieldChange("targetFieldId", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
              >
                <option value="">Select a field...</option>
                {availableFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} ({f.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Condition</label>
              <select
                value={nodeData.condition || "equals"}
                onChange={(e) => handleFieldChange("condition", e.target.value as LogicCondition)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Does Not Equal</option>
                <option value="contains">Contains</option>
                <option value="not_contains">Does Not Contain</option>
                <option value="starts_with">Starts With</option>
                <option value="ends_with">Ends With</option>
                <option value="greater_than">Greater Than (&gt;)</option>
                <option value="less_than">Less Than (&lt;)</option>
                <option value="greater_or_equal">Greater or Equal (&ge;)</option>
                <option value="less_or_equal">Less or Equal (&le;)</option>
                <option value="is_empty">Is Empty / Unanswered</option>
                <option value="is_not_empty">Is Answered / Filled</option>
              </select>
            </div>

            {!["is_empty", "is_not_empty"].includes(nodeData.condition) && (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Value to Compare</label>
                <input
                  type="text"
                  placeholder="e.g. Yes, 18, or Option A"
                  value={nodeData.compareValue || ""}
                  onChange={(e) => handleFieldChange("compareValue", e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                />
              </div>
            )}

            <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-lg text-xs space-y-1">
              <p className="text-zinc-400">
                Connect <strong className="text-emerald-400">True</strong> handle to the route when conditions are satisfied.
              </p>
              <p className="text-zinc-400">
                Connect <strong className="text-zinc-300">Else</strong> handle for the fallback route.
              </p>
            </div>
          </>
        )}

        {/* END NODE PROPERTIES */}
        {type === "endNode" && (
          <>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Thank You Title</label>
              <input
                type="text"
                value={nodeData.title || ""}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Confirmation Message</label>
              <textarea
                rows={3}
                value={nodeData.description || ""}
                onChange={(e) => handleFieldChange("description", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Redirect URL (Optional)</label>
              <input
                type="url"
                placeholder="https://company.com/success"
                value={nodeData.redirectUrl || ""}
                onChange={(e) => handleFieldChange("redirectUrl", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500"
              />
            </div>
          </>
        )}
      </div>

      {/* Footer / Delete */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/90">
        <button
          onClick={() => onDeleteNode(id)}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg bg-red-950/30 hover:bg-red-900/40 border border-red-900/40 text-red-300 hover:text-red-200 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete This Node</span>
        </button>
      </div>
    </aside>
  );
}
