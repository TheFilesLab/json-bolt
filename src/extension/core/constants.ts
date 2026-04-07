import type { RenderOptions } from './types.js';

export const MAX_SNIFF_CHARS = 32_768;
export const MAX_RENDER_CHARS = 1_048_576;
export const MAX_COPY_CHARS = MAX_RENDER_CHARS;
export const DETECTION_RETRY_DELAY_MS = 50;
export const DETECTION_RETRY_ATTEMPTS = 10;

export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  indentSize: 2,
  defaultExpanded: true,
};
