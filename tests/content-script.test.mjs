import test from 'node:test';
import assert from 'node:assert/strict';

import { loadJsonBoltInternals } from '../scripts/lib/load-internals.mjs';

const internals = await loadJsonBoltInternals();

test('assembled single-file internals surface remains available', () => {
  assert.equal(typeof internals.detectJsonDocument, 'function');
  assert.equal(typeof internals.renderParsedValue, 'function');
});

test('detects JSON documents by content type', () => {
  const result = internals.detectJsonDocument(
    createProbe({
      contentType: 'application/json; charset=utf-8',
      sampleText: '{"ok":true}',
      totalChars: 11,
    }),
  );

  assert.equal(result.matches, true);
  assert.equal(result.reason, 'Detected JSON by content type.');
  assert.equal(result.reasonCode, 'content-type');
});

test('detects plain text JSON by sniffing a simple document shape', () => {
  const result = internals.detectJsonDocument(
    createProbe({
      contentType: 'text/plain',
      sampleText: ' [1,2,3] ',
      totalChars: 9,
    }),
  );

  assert.equal(result.matches, true);
  assert.equal(result.sampleText, '[1,2,3]');
  assert.equal(result.reasonCode, 'sniffed-json');
});

test('detects Brave-style JSON viewer shape with PRE plus formatter container', () => {
  const result = internals.detectJsonDocument(
    createProbe({
      contentType: 'application/json',
      bodyChildElementCount: 2,
      hasLeadingPreElement: true,
      hasJsonFormatterContainer: true,
      sampleText: '{"success":false}',
      totalChars: 17,
    }),
  );

  assert.equal(result.matches, true);
  assert.equal(result.reasonCode, 'content-type');
});

test('does not hijack large regular HTML-like documents', () => {
  const result = internals.detectJsonDocument(
    createProbe({
      contentType: 'text/html',
      url: 'https://example.com/',
      bodyChildElementCount: 2,
      totalChars: internals.MAX_RENDER_CHARS + 1,
      exceedsRenderLimit: true,
    }),
  );

  assert.equal(result.matches, false);
  assert.equal(result.reasonCode, 'non-raw-document');
});

test('createDetectionProbe skips text inspection for obvious HTML text documents', () => {
  let inspectCalled = false;

  const probe = internals.createDetectionProbe(
    createMockDocument({
      contentType: 'text/html; charset=utf-8',
      url: 'https://example.com/',
      bodyChildElementCount: 0,
      querySelectorResult: null,
    }),
    () => {
      inspectCalled = true;
      return {
        sampleText: '{"ok":true}',
        totalChars: 11,
        exceedsRenderLimit: false,
      };
    },
  );

  assert.equal(inspectCalled, false);
  assert.equal(probe.sampleText, '');
  assert.equal(probe.totalChars, 0);
});

test('createDetectionProbe still inspects .json URLs even when content type is HTML-like', () => {
  let inspectCalled = false;

  const probe = internals.createDetectionProbe(
    createMockDocument({
      contentType: 'text/html; charset=utf-8',
      url: 'https://example.com/data.json',
      bodyChildElementCount: 0,
      querySelectorResult: null,
    }),
    () => {
      inspectCalled = true;
      return {
        sampleText: '{"ok":true}',
        totalChars: 11,
        exceedsRenderLimit: false,
      };
    },
  );

  assert.equal(inspectCalled, true);
  assert.equal(probe.sampleText, '{"ok":true}');
  assert.equal(probe.totalChars, 11);
});

test('prepareViewerModel returns null for invalid JSON text', () => {
  const invalidJson = '{"unterminated":';
  const result = internals.prepareViewerModel(
    createProbe({
      contentType: 'application/json',
      url: 'https://example.com/bad.json',
      sampleText: invalidJson,
      totalChars: invalidJson.length,
    }),
    { indentSize: 2, defaultExpanded: true },
    createSteadyClock(),
    internals.renderParsedValue,
    () => invalidJson,
  );

  assert.equal(result, null);
});

test('prepareViewerModel never reads full text for HTML-like non-matches', () => {
  let fullTextRead = false;

  const result = internals.prepareViewerModel(
    createProbe({
      contentType: 'text/html',
      url: 'https://example.com/',
      bodyChildElementCount: 1,
      singleChildTagName: 'DIV',
    }),
    { indentSize: 2, defaultExpanded: true },
    createSteadyClock(),
    internals.renderParsedValue,
    () => {
      fullTextRead = true;
      return '{"ok":true}';
    },
  );

  assert.equal(result, null);
  assert.equal(fullTextRead, false);
});

test('renderer escapes HTML-sensitive content and exposes metadata', () => {
  const unsafeJson = '{"payload":"<script>alert(1)</script>","safe":true}';
  const result = internals.prepareViewerModel(
    createProbe({
      contentType: 'application/json',
      url: 'https://example.com/unsafe.json',
      sampleText: unsafeJson,
      totalChars: unsafeJson.length,
    }),
    { indentSize: 2, defaultExpanded: true },
    createSteadyClock(),
    internals.renderParsedValue,
    () => unsafeJson,
  );

  assert.ok(result);
  assert.match(result.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(result.html, /<script>/);
  assert.equal(result.metadata.topLevelType, 'object');
  assert.equal(result.metadata.propertyCount, 2);
});

test('renderer creates collapsible nodes for nested objects and arrays', () => {
  const parsed = JSON.parse('{"items":[{"id":1},{"id":2}],"meta":{"count":2}}');
  const result = internals.renderParsedValue(
    parsed,
    '{"items":[{"id":1},{"id":2}],"meta":{"count":2}}',
    { indentSize: 2, defaultExpanded: true },
    1.5,
    0,
  );

  assert.ok(result.html.includes('class="jb-node"'));
  assert.ok(result.html.includes('class="jb-line-number"'));
  assert.ok(result.html.includes('aria-label="Toggle array"'));
  assert.ok(result.html.includes('aria-label="Toggle object"'));
  assert.equal(result.collapseIndex, 5);
  assert.equal(result.lineCount, result.formattedText.split('\n').length);
  assert.match(result.formattedText, /"items": \[/);
});

test('rendered markup exposes a dedicated JSON content selection target', () => {
  const markup = internals.createViewerMarkup(
    {
      html: '<div class="jb-json-tree"><div class="jb-line"><span class="jb-line-number" aria-hidden="true"></span><span class="jb-line-text"><span class="jb-number">1</span></span></div></div>',
      rawText: '{"ok":true}',
      formattedText: '{\n  "ok": true\n}',
      lineCount: 3,
      collapseIndex: 0,
      detection: {
        matches: true,
        reasonCode: 'content-type',
        reason: 'Detected JSON by content type.',
        sampleText: '{"ok":true}',
        totalChars: 11,
        exceedsRenderLimit: false,
      },
      metadata: {
        topLevelType: 'object',
        bytes: 11,
        propertyCount: 1,
        itemCount: 0,
        nodeCount: 1,
        responseMs: null,
        parseMs: 0.1,
        renderMs: 0.1,
        totalMs: 0.2,
      },
      value: { ok: true },
    },
    'https://example.com/data.json',
  );

  assert.match(markup, /data-jb-selection="json-content"/);
  assert.match(markup, /<div class="jb-viewer" tabindex="0" data-jb-selection="json-content">/);
  assert.match(markup, /class="jb-line-number"/);
});

test('renderer metadata includes response timing when available', () => {
  const result = internals.renderParsedValue(
    JSON.parse('{"ok":true}'),
    '{"ok":true}',
    { indentSize: 2, defaultExpanded: true },
    1.25,
    0.75,
    48.6,
  );

  assert.equal(result.metadata.responseMs, 48.6);
});

test('renderer metadata leaves response timing null when unavailable', () => {
  const result = internals.renderParsedValue(
    JSON.parse('{"ok":true}'),
    '{"ok":true}',
    { indentSize: 2, defaultExpanded: true },
    1.25,
    0.75,
  );

  assert.equal(result.metadata.responseMs, null);
});

test('collapsed summaries are generated with counts', () => {
  assert.equal(internals.summarizeContainer('}', 1), '{ 1 key ... }');
  assert.equal(internals.summarizeContainer(']', 4), '[ 4 items ... ]');
});

test('oversized JSON fails closed and never reaches the renderer', () => {
  let rendererCalled = false;
  let fullTextRead = false;

  const result = internals.prepareViewerModel(
    createProbe({
      contentType: 'application/json',
      url: 'https://example.com/huge.json',
      sampleText: '{"items":[',
      totalChars: internals.MAX_RENDER_CHARS + 1,
      exceedsRenderLimit: true,
    }),
    { indentSize: 2, defaultExpanded: true },
    createSteadyClock(),
    () => {
      rendererCalled = true;
      throw new Error('renderer should not run for oversized payloads');
    },
    () => {
      fullTextRead = true;
      return '{"items":[]}';
    },
  );

  const detection = internals.detectJsonDocument(
    createProbe({
      contentType: 'application/json',
      url: 'https://example.com/huge.json',
      sampleText: '{"items":[',
      totalChars: internals.MAX_RENDER_CHARS + 1,
      exceedsRenderLimit: true,
    }),
  );

  assert.equal(result, null);
  assert.equal(detection.matches, false);
  assert.equal(detection.reasonCode, 'oversized');
  assert.equal(rendererCalled, false);
  assert.equal(fullTextRead, false);
});

test('debug marker is written for successful activation', () => {
  const dataset = {};
  internals.setDebugState('activated', 'content-type', {
    documentElement: {
      dataset,
    },
  });

  assert.equal(dataset.jsonBoltState, 'activated');
  assert.equal(dataset.jsonBoltReason, 'content-type');
});

test('debug marker can represent skipped oversized payloads', () => {
  const dataset = {};
  internals.setDebugState('skipped', 'oversized', {
    documentElement: {
      dataset,
    },
  });

  assert.equal(dataset.jsonBoltState, 'skipped');
  assert.equal(dataset.jsonBoltReason, 'oversized');
});

test('debug marker can represent prepare failures', () => {
  const dataset = {};
  internals.setDebugState('error', 'prepare-failed', {
    documentElement: {
      dataset,
    },
  });

  assert.equal(dataset.jsonBoltState, 'error');
  assert.equal(dataset.jsonBoltReason, 'prepare-failed');
});

test('resolveResponseMs reads navigation timing when available', () => {
  const responseMs = internals.resolveResponseMs(
    {
      getEntriesByType(entryType) {
        if (entryType === 'navigation') {
          return [
            {
              requestStart: 25,
              fetchStart: 20,
              responseEnd: 143,
            },
          ];
        }

        return [];
      },
    },
    'https://example.com/data',
  );

  assert.equal(responseMs, 118);
});

test('resolveResponseMs returns null when no trustworthy timing exists', () => {
  const responseMs = internals.resolveResponseMs(
    {
      getEntriesByType() {
        return [];
      },
    },
    'https://example.com/data',
  );

  assert.equal(responseMs, null);
});

test('detectWithRetries activates when a likely JSON page settles into a PRE shape', async () => {
  const probes = [
    createProbe({
      contentType: 'application/json',
      bodyChildElementCount: 2,
      totalChars: 10,
      sampleText: '',
    }),
    createProbe({
      contentType: 'application/json',
      bodyChildElementCount: 1,
      singleChildTagName: 'PRE',
      totalChars: 10,
      sampleText: '{"ok":true}',
    }),
  ];

  const waits = [];
  const result = await internals.detectWithRetries(
    () => {
      const probe = probes.shift();

      if (!probe) {
        throw new Error('expected another probe');
      }

      return probe;
    },
    async (durationMs) => {
      waits.push(durationMs);
    },
  );

  assert.equal(result.detection.matches, true);
  assert.equal(result.detection.reasonCode, 'content-type');
  assert.equal(result.probe.singleChildTagName, 'PRE');
  assert.deepEqual(waits, [internals.DETECTION_RETRY_DELAY_MS]);
});

test('detectWithRetries does not retry normal HTML pages', async () => {
  let probeCalls = 0;
  const waits = [];

  const result = await internals.detectWithRetries(
    () => {
      probeCalls += 1;
      return createProbe({
        contentType: 'text/html',
        url: 'https://example.com/',
        bodyChildElementCount: 2,
        totalChars: 200,
      });
    },
    async (durationMs) => {
      waits.push(durationMs);
    },
  );

  assert.equal(result.detection.matches, false);
  assert.equal(result.detection.reasonCode, 'non-raw-document');
  assert.equal(probeCalls, 1);
  assert.deepEqual(waits, []);
});

test('detectWithRetries stops after retry limit exhaustion', async () => {
  let probeCalls = 0;
  const waits = [];

  const result = await internals.detectWithRetries(
    () => {
      probeCalls += 1;
      return createProbe({
        contentType: 'application/json',
        bodyChildElementCount: 2,
        totalChars: 10,
        sampleText: '',
      });
    },
    async (durationMs) => {
      waits.push(durationMs);
    },
  );

  assert.equal(result.detection.matches, false);
  assert.equal(result.detection.reasonCode, 'non-raw-document');
  assert.equal(probeCalls, internals.DETECTION_RETRY_ATTEMPTS + 1);
  assert.equal(waits.length, internals.DETECTION_RETRY_ATTEMPTS);
  assert.ok(waits.every((durationMs) => durationMs === internals.DETECTION_RETRY_DELAY_MS));
});

function createSteadyClock() {
  let current = 0;

  return () => {
    current += 1.25;
    return current;
  };
}

function createProbe(overrides = {}) {
  return {
    contentType: 'application/json',
    url: 'https://example.com/data',
    bodyChildElementCount: 0,
    singleChildTagName: null,
    hasJsonFormatterContainer: false,
    hasLeadingPreElement: false,
    readyState: 'complete',
    sampleText: '',
    totalChars: 0,
    exceedsRenderLimit: false,
    ...overrides,
  };
}

function createMockDocument({
  contentType,
  url,
  bodyChildElementCount,
  querySelectorResult,
  firstElementTagName = null,
}) {
  const firstElementChild =
    firstElementTagName === null
      ? null
      : {
          tagName: firstElementTagName,
        };

  return {
    contentType,
    URL: url,
    readyState: 'complete',
    body: {
      childElementCount: bodyChildElementCount,
      firstElementChild,
      querySelector() {
        return querySelectorResult;
      },
    },
    documentElement: {},
  };
}
