import {
  DETECTION_RETRY_ATTEMPTS,
  DETECTION_RETRY_DELAY_MS,
  MAX_RENDER_CHARS,
  MAX_SNIFF_CHARS,
} from './core/constants.js';
import { escapeHtml, setDebugState, summarizeContainer } from './core/helpers.js';
import { createDetectionProbe, detectJsonDocument, detectWithRetries } from './detection.js';
import { prepareViewerModel, renderParsedValue, resolveResponseMs } from './render.js';
import { createViewerMarkup } from './viewer.js';

type JsonBoltInternals = {
  createDetectionProbe: typeof createDetectionProbe;
  detectJsonDocument: typeof detectJsonDocument;
  detectWithRetries: typeof detectWithRetries;
  escapeHtml: typeof escapeHtml;
  createViewerMarkup: typeof createViewerMarkup;
  DETECTION_RETRY_ATTEMPTS: number;
  DETECTION_RETRY_DELAY_MS: number;
  MAX_RENDER_CHARS: number;
  MAX_SNIFF_CHARS: number;
  prepareViewerModel: typeof prepareViewerModel;
  renderParsedValue: typeof renderParsedValue;
  resolveResponseMs: typeof resolveResponseMs;
  setDebugState: typeof setDebugState;
  summarizeContainer: typeof summarizeContainer;
};

type JsonBoltGlobal = typeof globalThis & {
  __JSON_BOLT_TEST__?: JsonBoltInternals;
};

export function registerTestInternals(): void {
  const globalScope = globalThis as JsonBoltGlobal;

  globalScope.__JSON_BOLT_TEST__ = {
    createDetectionProbe,
    createViewerMarkup,
    detectJsonDocument,
    detectWithRetries,
    DETECTION_RETRY_ATTEMPTS,
    DETECTION_RETRY_DELAY_MS,
    escapeHtml,
    MAX_RENDER_CHARS,
    MAX_SNIFF_CHARS,
    prepareViewerModel,
    renderParsedValue,
    resolveResponseMs,
    setDebugState,
    summarizeContainer,
  };
}
