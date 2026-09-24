"use client";

import React, { useState, useMemo } from "react";
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
  Search,
} from "lucide-react";
import { FieldType } from "@/lib/types/flow";

interface ComponentPaletteProps {
  onAddNode: (type: "fieldNode" | "logicNode" | "endNode", fieldType?: FieldType) => void;
}

const categories: {
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
      { label: "Email Address", icon: <Mail className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "email" },
      { label: "Phone Number", icon: <Phone className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "phone" },
      { label: "Number", icon: <Hash className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "number" },
      { label: "Date Picker", icon: <Calendar className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "date" },
      { label: "Time Picker", icon: <Clock className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "time" },
      { label: "Address", icon: <MapPin className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "address" },
      { label: "Country", icon: <Globe className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "country" },
    ],
  },
  {
    category: "Choice & Rating",
    nodes: [
      { label: "Dropdown", icon: <ListFilter className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "select" },
      { label: "Single Choice", icon: <ListFilter className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "radio" },
      { label: "Multi Choice", icon: <CheckSquare className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "checkbox" },
      { label: "Opinion Slider", icon: <SlidersHorizontal className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "slider" },
      { label: "Star Rating", icon: <Star className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "rating" },
      { label: "Net Promoter (NPS)", icon: <Smile className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "nps" },
      { label: "Matrix Grid", icon: <Grid className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "matrix" },
    ],
  },
  {
    category: "Advanced & Security",
    nodes: [
      { label: "File Upload", icon: <UploadCloud className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "file" },
      { label: "Digital Signature", icon: <PenTool className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "signature" },
      { label: "Currency / Price", icon: <DollarSign className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "currency" },
      { label: "Legal Consent", icon: <ShieldCheck className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "consent" },
      { label: "Hidden Variable", icon: <EyeOff className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "hidden" },
      { label: "Formula / Calc", icon: <Calculator className="w-3.5 h-3.5" />, type: "fieldNode", fieldType: "computed" },
    ],
  },
  {
    category: "Logic & Flow",
    nodes: [
      { label: "Logic Branch Gate", icon: <GitFork className="w-3.5 h-3.5" />, type: "logicNode" },
      { label: "Completion Screen", icon: <CheckCircle2 className="w-3.5 h-3.5" />, type: "endNode" },
    ],
  },
];

export function ComponentPalette({ onAddNode }: ComponentPaletteProps) {
  const [search, setSearch] = useState("");

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const query = search.toLowerCase().trim();
    return categories
      .map((cat) => ({
        ...cat,
        nodes: cat.nodes.filter((n) => n.label.toLowerCase().includes(query)),
      }))
      .filter((cat) => cat.nodes.length > 0);
  }, [search]);

  return (
    <div className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col h-full overflow-y-auto">
      <div className="p-4 border-b border-zinc-800 space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-zinc-300" />
          <span className="text-xs font-semibold text-white tracking-wider uppercase font-mono">
            Palette (20+ Types)
          </span>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search components..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
          />
        </div>
      </div>

      <div className="p-3 space-y-5 flex-1">
        {filteredCategories.map((sec) => (
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
