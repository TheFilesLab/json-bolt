import type {
  DebugReasonCode,
  DebugState,
  JsonPrimitive,
  JsonTopLevelType,
  JsonValue,
} from './types.js';

export function getTopLevelType(value: JsonValue): JsonTopLevelType {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  return typeof value as JsonTopLevelType;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function isTopLevelWindow(): boolean {
  try {
    return window.top === window;
  } catch {
    return false;
  }
}

export function getIndent(indentSize: number, indentLevel: number): string {
  return ' '.repeat(indentSize * indentLevel);
}

export function stringifyJsonString(value: string): string {
  return JSON.stringify(value);
}

export function trimJsonText(value: string): string {
  let start = 0;
  let end = value.length;

  while (start < end && /\s/u.test(value.charAt(start))) {
    start += 1;
  }

  while (end > start && /\s/u.test(value.charAt(end - 1))) {
    end -= 1;
  }

  if (start === 0 && end === value.length) {
    return value;
  }

  return value.slice(start, end);
}

export function setDebugState(
  state: DebugState,
  reason: DebugReasonCode,
  doc: Pick<Document, 'documentElement'> = document,
): void {
  const rootElement = doc.documentElement;

  if (!rootElement) {
    return;
  }

  rootElement.dataset.jsonBoltState = state;
  rootElement.dataset.jsonBoltReason = reason;
}

export function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

export function valueIsPrimitive(value: JsonValue): value is JsonPrimitive {
  return value === null || typeof value !== 'object';
}

export function formatDuration(value: number): string {
  if (value >= 100) {
    return `${value.toFixed(0)} ms`;
  }

  if (value >= 10) {
    return `${value.toFixed(1)} ms`;
  }

  return `${value.toFixed(2)} ms`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function summarizeContainer(closingBracket: ']' | '}', size: number): string {
  const noun =
    closingBracket === '}' ? (size === 1 ? 'key' : 'keys') : size === 1 ? 'item' : 'items';
  const openingBracket = closingBracket === '}' ? '{' : '[';

  return `${openingBracket} ${size} ${noun} ... ${closingBracket}`;
}
