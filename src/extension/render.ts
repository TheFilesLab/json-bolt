import { DEFAULT_RENDER_OPTIONS, MAX_RENDER_CHARS } from './core/constants.js';
import {
  escapeHtml,
  formatBytes,
  formatDuration,
  getIndent,
  getTopLevelType,
  stringifyJsonString,
  summarizeContainer,
  trimJsonText,
  valueIsPrimitive,
} from './core/helpers.js';
import type {
  DetectionProbe,
  JsonPrimitive,
  JsonValue,
  PreparedViewerModel,
  RenderOptions,
  RenderResult,
  RenderTask,
  ViewerMetadata,
} from './core/types.js';
import { collectTextContent, detectJsonDocument } from './detection.js';

function renderPrimitiveValue(value: JsonPrimitive): { html: string; text: string } {
  if (value === null) {
    return {
      html: '<span class="jb-null">null</span>',
      text: 'null',
    };
  }

  if (typeof value === 'string') {
    const text = stringifyJsonString(value);
    return {
      html: `<span class="jb-string">${escapeHtml(text)}</span>`,
      text,
    };
  }

  if (typeof value === 'number') {
    return {
      html: `<span class="jb-number">${String(value)}</span>`,
      text: String(value),
    };
  }

  return {
    html: `<span class="jb-boolean">${String(value)}</span>`,
    text: String(value),
  };
}

function renderLine(content: string, variant: 'close' | 'default' | 'open' = 'default'): string {
  const className =
    variant === 'default'
      ? 'jb-line'
      : `jb-line ${variant === 'open' ? 'jb-line-open' : 'jb-line-close'}`;

  return [
    `<div class="${className}">`,
    '<span class="jb-line-number" aria-hidden="true"></span>',
    `<span class="jb-line-text">${content}</span>`,
    '</div>',
  ].join('');
}

export function renderParsedValue(
  value: JsonValue,
  rawText: string,
  options: RenderOptions,
  parseMs: number,
  renderMs: number,
  responseMs: number | null = null,
): RenderResult {
  const htmlParts: string[] = [];
  const formattedParts: string[] = [];
  const stack: RenderTask[] = [
    {
      kind: 'value',
      value,
      indentLevel: 0,
      propertyKey: null,
      isLast: true,
    },
  ];

  let collapseIndex = 0;
  let propertyCount = 0;
  let itemCount = 0;
  let nodeCount = 0;
  let lineCount = 0;

  const pushLine = (
    htmlContent: string,
    textContent: string,
    variant: 'close' | 'default' | 'open' = 'default',
  ): void => {
    htmlParts.push(renderLine(htmlContent, variant));
    formattedParts.push(textContent, '\n');
    lineCount += 1;
  };

  while (stack.length > 0) {
    const task = stack.pop();

    if (!task) {
      continue;
    }

    if (task.kind === 'close') {
      const commaHtml = task.isLast ? '' : '<span class="jb-punctuation">,</span>';
      const commaText = task.isLast ? '' : ',';
      const indent = getIndent(options.indentSize, task.indentLevel);

      htmlParts.push(
        '</div>',
        renderLine(
          `${indent}<span class="jb-brace">${task.closingBracket}</span>${commaHtml}`,
          'close',
        ),
        '</div>',
      );
      formattedParts.push(indent, task.closingBracket, commaText, '\n');
      lineCount += 1;
      continue;
    }

    nodeCount += 1;

    const indent = getIndent(options.indentSize, task.indentLevel);
    const keyPrefixHtml =
      task.propertyKey === null
        ? indent
        : `${indent}<span class="jb-key">${escapeHtml(stringifyJsonString(task.propertyKey))}</span><span class="jb-punctuation">: </span>`;
    const keyPrefixText =
      task.propertyKey === null ? indent : `${indent}${stringifyJsonString(task.propertyKey)}: `;
    const commaHtml = task.isLast ? '' : '<span class="jb-punctuation">,</span>';
    const commaText = task.isLast ? '' : ',';

    if (valueIsPrimitive(task.value)) {
      const primitive = renderPrimitiveValue(task.value);

      pushLine(
        keyPrefixHtml + primitive.html + commaHtml,
        keyPrefixText + primitive.text + commaText,
      );
      continue;
    }

    if (Array.isArray(task.value)) {
      itemCount += task.value.length;

      if (task.value.length === 0) {
        pushLine(
          keyPrefixHtml + '<span class="jb-brace">[]</span>' + commaHtml,
          keyPrefixText + '[]' + commaText,
        );
        continue;
      }

      const nodeId = collapseIndex;
      const collapsedClass = options.defaultExpanded ? '' : ' is-collapsed';
      const expandedState = options.defaultExpanded ? 'true' : 'false';

      collapseIndex += 1;

      htmlParts.push(
        `<div class="jb-node${collapsedClass}" data-node-id="${String(nodeId)}">`,
        renderLine(
          [
            keyPrefixHtml,
            `<button class="jb-toggle" type="button" data-node-id="${String(nodeId)}" aria-expanded="${expandedState}" aria-label="Toggle array">`,
            '<span class="jb-brace">[</span>',
            '</button>',
            `<span class="jb-summary">${escapeHtml(summarizeContainer(']', task.value.length))}</span>`,
          ].join(''),
          'open',
        ),
        '<div class="jb-children">',
      );
      formattedParts.push(keyPrefixText, '[\n');
      lineCount += 1;

      stack.push({
        kind: 'close',
        closingBracket: ']',
        indentLevel: task.indentLevel,
        isLast: task.isLast,
      });

      for (let index = task.value.length - 1; index >= 0; index -= 1) {
        stack.push({
          kind: 'value',
          value: task.value[index] as JsonValue,
          indentLevel: task.indentLevel + 1,
          propertyKey: null,
          isLast: index === task.value.length - 1,
        });
      }

      continue;
    }

    const entries = Object.entries(task.value);
    propertyCount += entries.length;

    if (entries.length === 0) {
      pushLine(
        keyPrefixHtml + '<span class="jb-brace">{}</span>' + commaHtml,
        keyPrefixText + '{}' + commaText,
      );
      continue;
    }

    const nodeId = collapseIndex;
    const collapsedClass = options.defaultExpanded ? '' : ' is-collapsed';
    const expandedState = options.defaultExpanded ? 'true' : 'false';

    collapseIndex += 1;

    htmlParts.push(
      `<div class="jb-node${collapsedClass}" data-node-id="${String(nodeId)}">`,
      renderLine(
        [
          keyPrefixHtml,
          `<button class="jb-toggle" type="button" data-node-id="${String(nodeId)}" aria-expanded="${expandedState}" aria-label="Toggle object">`,
          '<span class="jb-brace">{</span>',
          '</button>',
          `<span class="jb-summary">${escapeHtml(summarizeContainer('}', entries.length))}</span>`,
        ].join(''),
        'open',
      ),
      '<div class="jb-children">',
    );
    formattedParts.push(keyPrefixText, '{\n');
    lineCount += 1;

    stack.push({
      kind: 'close',
      closingBracket: '}',
      indentLevel: task.indentLevel,
      isLast: task.isLast,
    });

    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const [propertyKey, propertyValue] = entries[index] as [string, JsonValue];

      stack.push({
        kind: 'value',
        value: propertyValue,
        indentLevel: task.indentLevel + 1,
        propertyKey,
        isLast: index === entries.length - 1,
      });
    }
  }

  const formattedText = formattedParts.join('').replace(/\n$/, '');
  const html = htmlParts.join('').replace(/\n$/, '');

  return {
    value,
    rawText,
    html: `<div class="jb-json-tree">${html}</div>`,
    formattedText,
    lineCount,
    metadata: {
      topLevelType: getTopLevelType(value),
      bytes: new TextEncoder().encode(rawText).byteLength,
      propertyCount,
      itemCount,
      nodeCount,
      responseMs,
      parseMs,
      renderMs,
      totalMs: parseMs + renderMs,
    },
    collapseIndex,
  };
}

export function prepareViewerModel(
  probe: DetectionProbe,
  options: RenderOptions = DEFAULT_RENDER_OPTIONS,
  now: () => number = () => performance.now(),
  render: typeof renderParsedValue = renderParsedValue,
  readFullText: (() => string | null) | null = null,
  readResponseMs: (() => number | null) | null = null,
): PreparedViewerModel | null {
  const detection = detectJsonDocument(probe);

  if (!detection.matches) {
    return null;
  }

  const rawTextSource =
    readFullText ??
    (() => {
      const documentRoot = document.body ?? document.documentElement;

      if (!documentRoot) {
        return null;
      }

      return collectTextContent(documentRoot);
    });
  const fullText = rawTextSource();

  if (fullText === null) {
    return null;
  }

  const rawText = trimJsonText(fullText);

  if (rawText.length === 0 || rawText.length > MAX_RENDER_CHARS) {
    return null;
  }

  const parseStart = now();
  let parsedValue: JsonValue;

  try {
    parsedValue = JSON.parse(rawText) as JsonValue;
  } catch {
    return null;
  }

  const parseMs = now() - parseStart;
  const renderStart = now();
  const responseMs = readResponseMs ? readResponseMs() : resolveResponseMs();
  const rendered = render(parsedValue, rawText, options, parseMs, 0, responseMs);
  const renderMs = now() - renderStart;

  return {
    ...rendered,
    detection,
    metadata: {
      ...rendered.metadata,
      parseMs,
      renderMs,
      totalMs: parseMs + renderMs,
    },
  };
}

export function createMetadataCards(metadata: ViewerMetadata): string {
  const cards: Array<[string, string]> = [
    ['Payload', formatBytes(metadata.bytes)],
    ['Properties', String(metadata.propertyCount)],
    ['Items', String(metadata.itemCount)],
    ['Nodes', String(metadata.nodeCount)],
  ];

  if (metadata.responseMs !== null) {
    cards.push(['Response', formatDuration(metadata.responseMs)]);
  }

  cards.push(
    ['Parse', formatDuration(metadata.parseMs)],
    ['Render', formatDuration(metadata.renderMs)],
    ['Total', formatDuration(metadata.totalMs)],
  );

  return cards
    .map(
      ([label, value]) =>
        `<div class="jb-stat"><div class="jb-stat-label">${escapeHtml(label)}</div><div class="jb-stat-value">${escapeHtml(value)}</div></div>`,
    )
    .join('');
}

export function resolveResponseMs(
  perf: Pick<Performance, 'getEntriesByType'> = performance,
  currentUrl: string | null = typeof document !== 'undefined' ? document.URL : null,
): number | null {
  const navigationEntries = perf.getEntriesByType('navigation') as PerformanceEntry[];

  for (const entry of navigationEntries) {
    const navigationEntry = entry as PerformanceNavigationTiming;
    const requestStart =
      navigationEntry.requestStart > 0 ? navigationEntry.requestStart : navigationEntry.fetchStart;

    if (requestStart > 0 && navigationEntry.responseEnd >= requestStart) {
      return navigationEntry.responseEnd - requestStart;
    }
  }

  const resourceEntries = perf.getEntriesByType('resource') as PerformanceEntry[];

  for (const entry of resourceEntries) {
    if (currentUrl !== null && entry.name !== currentUrl) {
      continue;
    }

    const resourceEntry = entry as PerformanceResourceTiming;

    if (resourceEntry.responseEnd >= resourceEntry.startTime) {
      return resourceEntry.responseEnd - resourceEntry.startTime;
    }
  }

  return null;
}
