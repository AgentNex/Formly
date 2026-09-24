"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import {
  Play,
  Type,
  AlignLeft,
  Mail,
  Hash,
  ListFilter,
  CheckSquare,
  Star,
  Calendar,
  GitFork,
  CheckCircle2,
  Phone,
  SlidersHorizontal,
  Clock,
  UploadCloud,
  PenTool,
  DollarSign,
  MapPin,
  Globe,
  ShieldCheck,
  EyeOff,
  Calculator,
  Smile,
  Grid,
} from "lucide-react";
import { FieldNodeData, LogicNodeData, StartNodeData, EndNodeData } from "@/lib/types/flow";

// Icon lookup by field type
export function getFieldIcon(type?: string) {
  switch (type) {
    case "textarea":
      return <AlignLeft className="w-3.5 h-3.5" />;
    case "email":
      return <Mail className="w-3.5 h-3.5" />;
    case "phone":
      return <Phone className="w-3.5 h-3.5" />;
    case "number":
      return <Hash className="w-3.5 h-3.5" />;
    case "slider":
      return <SlidersHorizontal className="w-3.5 h-3.5" />;
    case "select":
    case "radio":
      return <ListFilter className="w-3.5 h-3.5" />;
    case "checkbox":
      return <CheckSquare className="w-3.5 h-3.5" />;
    case "rating":
      return <Star className="w-3.5 h-3.5" />;
    case "date":
      return <Calendar className="w-3.5 h-3.5" />;
    case "time":
      return <Clock className="w-3.5 h-3.5" />;
    case "file":
      return <UploadCloud className="w-3.5 h-3.5" />;
    case "signature":
      return <PenTool className="w-3.5 h-3.5" />;
    case "currency":
      return <DollarSign className="w-3.5 h-3.5" />;
    case "address":
      return <MapPin className="w-3.5 h-3.5" />;
    case "country":
      return <Globe className="w-3.5 h-3.5" />;
    case "consent":
      return <ShieldCheck className="w-3.5 h-3.5" />;
    case "hidden":
      return <EyeOff className="w-3.5 h-3.5" />;
    case "computed":
      return <Calculator className="w-3.5 h-3.5" />;
    case "nps":
      return <Smile className="w-3.5 h-3.5" />;
    case "matrix":
      return <Grid className="w-3.5 h-3.5" />;
    case "text":
    default:
      return <Type className="w-3.5 h-3.5" />;
  }
}

// 1. Start Node Component
export const StartNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as StartNodeData;
  return (
    <div
      className={`min-w-[240px] max-w-[280px] bg-zinc-950 rounded-xl border transition-all duration-200 shadow-xl ${
        selected ? "border-white ring-1 ring-white/30" : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-zinc-800/80 bg-zinc-900/60 rounded-t-xl">
        <div className="w-5 h-5 rounded-md bg-white text-black flex items-center justify-center">
          <Play className="w-3 h-3 fill-black" />
        </div>
        <span className="text-xs font-semibold tracking-wide text-zinc-200">Start / Entry</span>
      </div>

      <div className="p-3.5">
        <h4 className="text-sm font-semibold text-white tracking-tight line-clamp-1">
          {nodeData.title || "Welcome"}
        </h4>
        <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
          {nodeData.description || "Introductory screen for respondents."}
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-white !border-2 !border-zinc-950 !rounded-full transition-transform hover:scale-125"
      />
    </div>
  );
});
StartNode.displayName = "StartNode";

// 2. Form Field Node Component
export const FieldNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as FieldNodeData;
  return (
    <div
      className={`min-w-[260px] max-w-[300px] bg-zinc-950 rounded-xl border transition-all duration-200 shadow-xl ${
        selected ? "border-white ring-1 ring-white/30" : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-950 !rounded-full transition-transform hover:scale-125"
      />

      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-zinc-800/80 bg-zinc-900/60 rounded-t-xl">
        <div className="flex items-center gap-2 text-zinc-300">
          <div className="p-1 rounded bg-zinc-800 text-zinc-200">
            {getFieldIcon(nodeData.fieldType)}
          </div>
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            {nodeData.fieldType || "input"}
          </span>
        </div>
        {nodeData.required && (
          <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
            Required
          </span>
        )}
      </div>

      <div className="p-3.5 space-y-2">
        <div>
          <span className="text-sm font-semibold text-white tracking-tight block">
            {nodeData.label || "Untitled Question"}
          </span>
          {nodeData.description && (
            <span className="text-xs text-zinc-400 block line-clamp-1 mt-0.5">
              {nodeData.description}
            </span>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800/80 rounded-lg px-2.5 py-1.5 text-xs text-zinc-500 font-mono truncate">
          {nodeData.placeholder || "User input preview..."}
        </div>

        {nodeData.options && nodeData.options.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {nodeData.options.slice(0, 3).map((opt, i) => (
              <span
                key={opt.id || i}
                className="text-[10px] bg-zinc-900 text-zinc-300 border border-zinc-800 rounded px-1.5 py-0.5"
              >
                {opt.label}
              </span>
            ))}
            {nodeData.options.length > 3 && (
              <span className="text-[10px] text-zinc-500 font-mono self-center">
                +{nodeData.options.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-white !border-2 !border-zinc-950 !rounded-full transition-transform hover:scale-125"
      />
    </div>
  );
});
FieldNode.displayName = "FieldNode";

// 3. Logic Node Component
export const LogicNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as LogicNodeData;
  const isMultiRule = nodeData.rules && nodeData.rules.length > 0;

  return (
    <div
      className={`min-w-[260px] max-w-[300px] bg-zinc-950 rounded-xl border transition-all duration-200 shadow-xl ${
        selected ? "border-white ring-1 ring-white/30" : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-950 !rounded-full transition-transform hover:scale-125"
      />

      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-zinc-800/80 bg-zinc-900/60 rounded-t-xl">
        <div className="p-1 rounded bg-zinc-800 text-zinc-200">
          <GitFork className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-semibold text-zinc-200 tracking-wide">
          {nodeData.label || "Logic Gate"}
        </span>
      </div>

      <div className="p-3.5 space-y-2">
        <div className="text-xs text-zinc-400 font-mono bg-zinc-900/90 border border-zinc-800 rounded-lg p-2 space-y-1">
          {isMultiRule ? (
            <div>
              <span className="text-zinc-500 font-bold mr-1">{nodeData.combinator || "AND"}</span>
              <span>{nodeData.rules!.length} condition(s)</span>
            </div>
          ) : (
            <div>
              <span className="text-zinc-500">IF </span>
              <span className="text-zinc-200 font-semibold">{nodeData.targetFieldId || "..."}</span>
              <span className="text-zinc-400"> {nodeData.condition || "equals"} </span>
              <span className="text-white font-semibold">&quot;{nodeData.compareValue ?? ""}&quot;</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono pt-1 text-zinc-400">
          <span className="text-emerald-400 font-medium">True</span>
          <span className="text-zinc-400">Else</span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: "35%" }}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-zinc-950 !rounded-full transition-transform hover:scale-125"
      />

      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: "70%" }}
        className="!w-3 !h-3 !bg-zinc-500 !border-2 !border-zinc-950 !rounded-full transition-transform hover:scale-125"
      />
    </div>
  );
});
LogicNode.displayName = "LogicNode";

// 4. End Node Component
export const EndNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as EndNodeData;
  return (
    <div
      className={`min-w-[240px] max-w-[280px] bg-zinc-950 rounded-xl border transition-all duration-200 shadow-xl ${
        selected ? "border-white ring-1 ring-white/30" : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-zinc-400 !border-2 !border-zinc-950 !rounded-full transition-transform hover:scale-125"
      />

      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-zinc-800/80 bg-zinc-900/60 rounded-t-xl">
        <div className="p-1 rounded bg-zinc-800 text-zinc-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-semibold tracking-wide text-zinc-200">Completion</span>
      </div>

      <div className="p-3.5">
        <h4 className="text-sm font-semibold text-white tracking-tight line-clamp-1">
          {nodeData.title || "Thank You"}
        </h4>
        <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
          {nodeData.description || "Submission complete."}
        </p>
        {nodeData.redirectUrl && (
          <p className="text-[10px] text-zinc-500 font-mono truncate mt-2">
            Redirect: {nodeData.redirectUrl}
          </p>
        )}
      </div>
    </div>
  );
});
EndNode.displayName = "EndNode";

export const nodeTypes = {
  startNode: StartNode,
  fieldNode: FieldNode,
  logicNode: LogicNode,
  endNode: EndNode,
};
