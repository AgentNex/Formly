"use client";

import React from "react";
import {
  Type,
  AlignLeft,
  Mail,
  Hash,
  ListFilter,
  CheckSquare,
  Star,
  GitFork,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";
import { FieldType } from "@/lib/types/flow";

interface ComponentPaletteProps {
  onAddNode: (type: "fieldNode" | "logicNode" | "endNode", fieldType?: FieldType) => void;
}

export function ComponentPalette({ onAddNode }: ComponentPaletteProps) {
  const items: {
    category: string;
    nodes: {
      label: string;
      icon: React.ReactNode;
      type: "fieldNode" | "logicNode" | "endNode";
      fieldType?: FieldType;
    }[];
  }[] = [
    {
      category: "Form Inputs",
      nodes: [
        { label: "Short Text", icon: <Type className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "text" },
        { label: "Paragraph", icon: <AlignLeft className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "textarea" },
        { label: "Email", icon: <Mail className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "email" },
        { label: "Number", icon: <Hash className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "number" },
        { label: "Date", icon: <Calendar className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "date" },
      ],
    },
    {
      category: "Choice & Rating",
      nodes: [
        { label: "Dropdown", icon: <ListFilter className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "select" },
        { label: "Single Choice", icon: <ListFilter className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "radio" },
        { label: "Multi Choice", icon: <CheckSquare className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "checkbox" },
        { label: "Star Rating", icon: <Star className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "rating" },
      ],
    },
    {
      category: "Logic & Flow",
      nodes: [
        { label: "Logic Branch", icon: <GitFork className="w-3.5 h-3.5" />, type: "logicNode" },
        { label: "Completion Screen", icon: <CheckCircle2 className="w-3.5 h-3.5" />, type: "endNode" },
      ],
    },
  ];

  return (
    <div className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
        <Layers className="w-4 h-4 text-zinc-300" />
        <span className="text-xs font-semibold text-white tracking-wider uppercase font-mono">Components</span>
      </div>

      <div className="p-3 space-y-5">
        {items.map((sec) => (
          <div key={sec.category} className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 px-2 font-semibold">
              {sec.category}
            </span>
            <div className="space-y-1">
              {sec.nodes.map((n, idx) => (
                <button
                  key={idx}
                  onClick={() => onAddNode(n.type, n.fieldType)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900/40 hover:bg-zinc-800/80 border border-zinc-800/60 hover:border-zinc-700 transition-all text-left group"
                >
                  <span className="p-1 rounded bg-zinc-800 text-zinc-300 group-hover:text-white group-hover:bg-zinc-700 transition-colors">
                    {n.icon}
                  </span>
                  <span className="truncate">{n.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
