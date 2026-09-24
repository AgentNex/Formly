import { Node, Edge } from "@xyflow/react";

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "rating"
  | "slider"
  | "date"
  | "time"
  | "file"
  | "signature"
  | "currency"
  | "address"
  | "country"
  | "consent"
  | "hidden"
  | "computed"
  | "nps"
  | "matrix";

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
  step?: number;
  defaultValue?: string | number | boolean | string[];
  helpText?: string;
  validationRegex?: string;
  errorMessage?: string;
  currencySymbol?: string;
  rows?: string[];
  columns?: string[];
}

export type LogicCondition =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "greater_or_equal"
  | "less_or_equal"
  | "is_empty"
  | "is_not_empty"
  | "starts_with"
  | "ends_with";

export interface LogicRule {
  id: string;
  targetFieldId: string;
  condition: LogicCondition;
  compareValue: string;
}

export interface LogicNodeData extends Record<string, unknown> {
  label: string;
  targetFieldId?: string;
  condition?: LogicCondition;
  compareValue?: string;
  combinator?: "AND" | "OR";
  rules?: LogicRule[];
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
  step?: number;
  currencySymbol?: string;
  rows?: string[];
  columns?: string[];
  targetFieldId?: string;
  condition?: LogicCondition;
  compareValue?: string;
  combinator?: "AND" | "OR";
  rules?: LogicRule[];
  trueNextNodeId?: string;
  falseNextNodeId?: string;
  defaultNextNodeId?: string;
  redirectUrl?: string;
}

export interface CompiledFormSchema {
  id: string;
  title: string;
  description?: string;
  startNodeId: string;
  steps: Record<string, CompiledStep>;
  fieldIds: string[];
  endNodeIds: string[];
  reachabilityMap?: Record<string, string[]>;
}

export interface FormSettings {
  submitButtonText?: string;
  showProgressBar?: boolean;
  allowRestart?: boolean;
  theme?: "dark" | "light" | "system";
  brandColor?: string;
  redirectUrl?: string;
  closedMessage?: string;
  enableCaptcha?: boolean;
  passwordProtect?: boolean;
  password?: string;
}
