import fs from 'node:fs/promises';

import { runTypeScriptCompilation } from './lib/compile.mjs';
import { loadJsonBoltInternals } from './lib/load-internals.mjs';
import { fromRoot } from './lib/paths.mjs';

async function main() {
  await runTypeScriptCompilation();

  const internals = await loadJsonBoltInternals();
  const fixtureNames = ['small', 'medium', 'large'];
  const htmlProbe = {
    contentType: 'text/html',
    url: 'https://example.com/',
    bodyChildElementCount: 1,
    singleChildTagName: 'DIV',
    hasJsonFormatterContainer: false,
    hasLeadingPreElement: false,
    readyState: 'complete',
    sampleText: '',
    totalChars: 0,
    exceedsRenderLimit: false,
  };

  for (const name of fixtureNames) {
    const raw = await fs.readFile(fromRoot('fixtures', `${name}.json`), 'utf8');
    const rounds = name === 'large' ? 20 : 100;

    let totalParse = 0;
    let totalRender = 0;
    let totalCombined = 0;

    for (let index = 0; index < rounds; index += 1) {
      const result = internals.prepareViewerModel(
        {
          contentType: 'application/json',
          url: `https://example.com/${name}.json`,
          bodyChildElementCount: 0,
          singleChildTagName: null,
          readyState: 'complete',
          sampleText: raw.slice(0, internals.MAX_SNIFF_CHARS),
          totalChars: raw.length,
          exceedsRenderLimit: raw.length > internals.MAX_RENDER_CHARS,
        },
        { indentSize: 2, defaultExpanded: true },
        () => performance.now(),
        internals.renderParsedValue,
        () => raw,
      );

      if (!result) {
        throw new Error(`Benchmark fixture "${name}" did not activate.`);
      }

      totalParse += result.metadata.parseMs;
      totalRender += result.metadata.renderMs;
      totalCombined += result.metadata.totalMs;
    }

    const averageParse = totalParse / rounds;
    const averageRender = totalRender / rounds;
    const averageTotal = totalCombined / rounds;

    console.log(
      [
        `${name.toUpperCase()}:`,
        `parse ${averageParse.toFixed(3)}ms`,
        `render ${averageRender.toFixed(3)}ms`,
        `total ${averageTotal.toFixed(3)}ms`,
      ].join(' | '),
    );
  }

  const htmlRounds = 500_000;
  const htmlStart = performance.now();

  for (let index = 0; index < htmlRounds; index += 1) {
    internals.detectJsonDocument(htmlProbe);
  }

  const htmlTotal = performance.now() - htmlStart;

  console.log(
    [
      'HTML_SKIP:',
      `rounds ${htmlRounds}`,
      `total ${htmlTotal.toFixed(3)}ms`,
      `per-call ${((htmlTotal * 1000) / htmlRounds).toFixed(3)}us`,
    ].join(' | '),
  );
}

await main();
