import {
  DETECTION_RETRY_ATTEMPTS,
  DETECTION_RETRY_DELAY_MS,
  MAX_RENDER_CHARS,
  MAX_SNIFF_CHARS,
} from './core/constants.js';
import { sleep, trimJsonText } from './core/helpers.js';
import type { DetectionProbe, DetectionResult } from './core/types.js';

type ProbeMetadata = Pick<
  DetectionProbe,
  | 'bodyChildElementCount'
  | 'contentType'
  | 'hasJsonFormatterContainer'
  | 'hasLeadingPreElement'
  | 'readyState'
  | 'singleChildTagName'
  | 'url'
>;

function inspectTextContent(
  root: ParentNode,
  sampleLimit: number,
  renderLimit: number,
): {
  sampleText: string;
  totalChars: number;
  exceedsRenderLimit: boolean;
} {
  const textNodes = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const sampleParts: string[] = [];
  let sampleChars = 0;
  let totalChars = 0;
  let exceedsRenderLimit = false;

  while (true) {
    const currentNode = textNodes.nextNode();

    if (!(currentNode instanceof Text)) {
      break;
    }

    const currentValue = currentNode.data;

    if (currentValue.length === 0) {
      continue;
    }

    totalChars += currentValue.length;

    if (sampleChars < sampleLimit) {
      const remainingSampleChars = sampleLimit - sampleChars;
      sampleParts.push(currentValue.slice(0, remainingSampleChars));
      sampleChars += Math.min(currentValue.length, remainingSampleChars);
    }

    if (totalChars > renderLimit) {
      exceedsRenderLimit = true;
      break;
    }
  }

  return {
    sampleText: sampleParts.join(''),
    totalChars,
    exceedsRenderLimit,
  };
}

export function collectTextContent(root: ParentNode): string {
  const textNodes = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];

  while (true) {
    const currentNode = textNodes.nextNode();

    if (!(currentNode instanceof Text)) {
      break;
    }

    if (currentNode.data.length > 0) {
      parts.push(currentNode.data);
    }
  }

  return parts.join('');
}

export function isJsonLikeContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase();

  return normalized.includes('/json') || normalized.includes('+json') || normalized === 'text/json';
}

function isHtmlLikeContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase();

  return normalized.startsWith('text/html') || normalized.startsWith('application/xhtml+xml');
}

function isPlainTextLikeContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase();

  return normalized === '' || normalized.startsWith('text/plain');
}

function urlLooksLikeJsonDocument(url: string): boolean {
  return /\.json(?:$|[?#])/i.test(url);
}

function looksLikeJsonStart(trimmedText: string): boolean {
  if (trimmedText.length === 0) {
    return false;
  }

  const firstCharacter = trimmedText.charAt(0);

  return (
    firstCharacter === '{' ||
    firstCharacter === '[' ||
    firstCharacter === '"' ||
    firstCharacter === '-' ||
    firstCharacter === 't' ||
    firstCharacter === 'f' ||
    firstCharacter === 'n' ||
    (firstCharacter >= '0' && firstCharacter <= '9')
  );
}

function isLikelyJsonCandidate(probe: DetectionProbe): boolean {
  return (
    isJsonLikeContentType(probe.contentType) ||
    isPlainTextLikeContentType(probe.contentType) ||
    urlLooksLikeJsonDocument(probe.url)
  );
}

function isInspectableDocumentShape(probe: ProbeMetadata): boolean {
  if (probe.bodyChildElementCount === 0) {
    return true;
  }

  if (probe.bodyChildElementCount === 1 && probe.singleChildTagName === 'PRE') {
    return true;
  }

  return (
    probe.bodyChildElementCount === 2 &&
    probe.hasLeadingPreElement &&
    probe.hasJsonFormatterContainer
  );
}

function shouldInspectProbeText(probe: ProbeMetadata): boolean {
  if (!isInspectableDocumentShape(probe)) {
    return false;
  }

  if (isJsonLikeContentType(probe.contentType) || isPlainTextLikeContentType(probe.contentType)) {
    return true;
  }

  if (urlLooksLikeJsonDocument(probe.url)) {
    return true;
  }

  return !isHtmlLikeContentType(probe.contentType);
}

export function createDetectionProbe(
  doc: Document,
  inspect: typeof inspectTextContent = inspectTextContent,
): DetectionProbe {
  const bodyChildElementCount = doc.body?.childElementCount ?? 0;
  const firstElement = doc.body?.firstElementChild;
  const singleChildTagName =
    bodyChildElementCount === 1 && firstElement ? firstElement.tagName.toUpperCase() : null;
  const hasJsonFormatterContainer =
    doc.body?.querySelector(':scope > .json-formatter-container') !== null;
  const hasLeadingPreElement = firstElement?.tagName.toUpperCase() === 'PRE';
  const probeMetadata = {
    contentType: doc.contentType ?? '',
    url: doc.URL,
    bodyChildElementCount,
    singleChildTagName,
    hasJsonFormatterContainer,
    hasLeadingPreElement,
    readyState: doc.readyState,
  };
  const probeRoot = doc.body ?? doc.documentElement;
  let sampleText = '';
  let totalChars = 0;
  let exceedsRenderLimit = false;

  if (probeRoot && shouldInspectProbeText(probeMetadata)) {
    const inspection = inspect(probeRoot, MAX_SNIFF_CHARS, MAX_RENDER_CHARS);
    sampleText = inspection.sampleText;
    totalChars = inspection.totalChars;
    exceedsRenderLimit = inspection.exceedsRenderLimit;
  }

  return {
    ...probeMetadata,
    sampleText,
    totalChars,
    exceedsRenderLimit,
  };
}

export function detectJsonDocument(probe: DetectionProbe): DetectionResult {
  if (!isInspectableDocumentShape(probe)) {
    return {
      matches: false,
      reasonCode: 'non-raw-document',
      reason: 'The page looks like an application document, not a raw JSON response.',
      sampleText: probe.sampleText,
      totalChars: probe.totalChars,
      exceedsRenderLimit: probe.exceedsRenderLimit,
    };
  }

  const trimmedText = trimJsonText(probe.sampleText);

  if (!looksLikeJsonStart(trimmedText)) {
    return {
      matches: false,
      reasonCode: 'non-json-start',
      reason: 'The document sample does not look like JSON.',
      sampleText: trimmedText,
      totalChars: probe.totalChars,
      exceedsRenderLimit: probe.exceedsRenderLimit,
    };
  }

  const detectedByContentType = isJsonLikeContentType(probe.contentType);
  const urlLooksJson = urlLooksLikeJsonDocument(probe.url);
  const sniffableDocument = isPlainTextLikeContentType(probe.contentType) || urlLooksJson;

  if (!detectedByContentType && !sniffableDocument) {
    return {
      matches: false,
      reasonCode: 'unsupported-content-type',
      reason: 'The document is not a raw JSON response candidate.',
      sampleText: trimmedText,
      totalChars: probe.totalChars,
      exceedsRenderLimit: probe.exceedsRenderLimit,
    };
  }

  if (probe.exceedsRenderLimit) {
    return {
      matches: false,
      reasonCode: 'oversized',
      reason: `The response exceeds JSON Bolt's safe render limit of ${String(MAX_RENDER_CHARS)} characters.`,
      sampleText: trimmedText,
      totalChars: probe.totalChars,
      exceedsRenderLimit: true,
    };
  }

  if (detectedByContentType) {
    return {
      matches: true,
      reasonCode: 'content-type',
      reason: 'Detected JSON by content type.',
      sampleText: trimmedText,
      totalChars: probe.totalChars,
      exceedsRenderLimit: false,
    };
  }

  return {
    matches: true,
    reasonCode: 'sniffed-json',
    reason: 'Detected JSON by content sniffing.',
    sampleText: trimmedText,
    totalChars: probe.totalChars,
    exceedsRenderLimit: false,
  };
}

export async function detectWithRetries(
  createProbe: () => DetectionProbe,
  wait: (durationMs: number) => Promise<void> = sleep,
): Promise<{
  detection: DetectionResult;
  probe: DetectionProbe;
}> {
  let probe = createProbe();
  let detection = detectJsonDocument(probe);

  if (
    detection.matches ||
    detection.reasonCode !== 'non-raw-document' ||
    !isLikelyJsonCandidate(probe)
  ) {
    return { detection, probe };
  }

  for (let attempt = 0; attempt < DETECTION_RETRY_ATTEMPTS; attempt += 1) {
    await wait(DETECTION_RETRY_DELAY_MS);
    probe = createProbe();
    detection = detectJsonDocument(probe);

    if (detection.matches || detection.reasonCode !== 'non-raw-document') {
      return { detection, probe };
    }
  }

  return { detection, probe };
}
