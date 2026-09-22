import { Node, Edge } from "@xyflow/react";

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "rating"
  | "date";

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export interface StartNodeData extends Record<string, unknown> {
  title: string;
  description: string;
  buttonText: string;
}

export interface FieldNodeData extends Record<string, unknown> {
  fieldId: string;
  fieldType: FieldType;
  label: string;
  placeholder?: string;
  description?: string;
  required: boolean;
  options?: FieldOption[];
  min?: number;
  max?: number;
  defaultValue?: string | number | boolean | string[];
}

export type LogicCondition =
  | "equals"
  | "not_equals"
  | "contains"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "is_not_empty";

export interface LogicNodeData extends Record<string, unknown> {
  label: string;
  targetFieldId: string;
  condition: LogicCondition;
  compareValue: string;
}

export interface EndNodeData extends Record<string, unknown> {
  title: string;
  description: string;
  redirectUrl?: string;
}

export type FormNodeData =
  | StartNodeData
  | FieldNodeData
  | LogicNodeData
  | EndNodeData;

export type FormNode = Node<FormNodeData>;
export type FormEdge = Edge;

export interface CompiledStep {
  id: string;
  nodeId: string;
  type: "start" | "field" | "logic" | "end";
  title?: string;
  description?: string;
  buttonText?: string;
  fieldId?: string;
  fieldType?: FieldType;
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: FieldOption[];
  min?: number;
  max?: number;
  targetFieldId?: string;
  condition?: LogicCondition;
  compareValue?: string;
  trueNextNodeId?: string;
  falseNextNodeId?: string;
  defaultNextNodeId?: string;
}

export interface CompiledFormSchema {
  id: string;
  title: string;
  description?: string;
  startNodeId: string;
  steps: Record<string, CompiledStep>;
  fieldIds: string[];
  endNodeIds: string[];
}
