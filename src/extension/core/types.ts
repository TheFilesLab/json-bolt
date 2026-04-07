export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;
export type DebugState = 'activated' | 'booting' | 'error' | 'skipped';

export type JsonTopLevelType = 'array' | 'boolean' | 'null' | 'number' | 'object' | 'string';
export type DetectionReasonCode =
  | 'content-type'
  | 'non-json-start'
  | 'non-raw-document'
  | 'oversized'
  | 'sniffed-json'
  | 'unsupported-content-type';
export type DebugReasonCode = DetectionReasonCode | 'prepare-failed';

export interface DetectionProbe {
  contentType: string;
  url: string;
  bodyChildElementCount: number;
  singleChildTagName: string | null;
  hasJsonFormatterContainer: boolean;
  hasLeadingPreElement: boolean;
  readyState: DocumentReadyState;
  sampleText: string;
  totalChars: number;
  exceedsRenderLimit: boolean;
}

export interface DetectionResult {
  matches: boolean;
  reasonCode: DetectionReasonCode;
  reason: string;
  sampleText: string;
  totalChars: number;
  exceedsRenderLimit: boolean;
}

export interface RenderOptions {
  indentSize: number;
  defaultExpanded: boolean;
}

export interface ViewerMetadata {
  topLevelType: JsonTopLevelType;
  bytes: number;
  propertyCount: number;
  itemCount: number;
  nodeCount: number;
  responseMs: number | null;
  parseMs: number;
  renderMs: number;
  totalMs: number;
}

export interface RenderResult {
  value: JsonValue;
  rawText: string;
  html: string;
  formattedText: string;
  metadata: ViewerMetadata;
  collapseIndex: number;
}

export interface PreparedViewerModel extends RenderResult {
  detection: DetectionResult;
}

export interface RenderTaskValue {
  kind: 'value';
  value: JsonValue;
  indentLevel: number;
  propertyKey: string | null;
  isLast: boolean;
}

export interface RenderTaskClose {
  kind: 'close';
  closingBracket: ']' | '}';
  indentLevel: number;
  isLast: boolean;
}

export type RenderTask = RenderTaskValue | RenderTaskClose;
