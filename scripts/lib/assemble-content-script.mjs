import fs from 'node:fs/promises';
import path from 'node:path';

import { fromRoot } from './paths.mjs';

const IMPORT_PATTERN = /^import\s+(?:[^'"]+from\s+)?['"]([^'"]+)['"];?\s*$/gm;

function normalizeModuleSource(code) {
  let normalized = code;

  normalized = normalized.replace(IMPORT_PATTERN, '');
  normalized = normalized.replace(/^export\s+async function\s+/gm, 'async function ');
  normalized = normalized.replace(/^export\s+function\s+/gm, 'function ');
  normalized = normalized.replace(/^export\s+const\s+/gm, 'const ');
  normalized = normalized.replace(/^export\s+let\s+/gm, 'let ');
  normalized = normalized.replace(/^export\s+class\s+/gm, 'class ');
  normalized = normalized.replace(/^export\s*\{[^}]*\};?\s*$/gm, '');
  normalized = normalized.replace(/^\/\/# sourceMappingURL=.*$/gm, '');

  if (/^\s*export\s+/m.test(normalized)) {
    throw new Error('Unsupported export syntax found while assembling the content script.');
  }

  return normalized.trim();
}

async function collectModules(modulePath, seen, ordered) {
  const resolvedPath = path.resolve(modulePath);

  if (seen.has(resolvedPath)) {
    return;
  }

  seen.add(resolvedPath);

  const source = await fs.readFile(resolvedPath, 'utf8');
  const moduleDirectory = path.dirname(resolvedPath);
  const importMatches = [...source.matchAll(IMPORT_PATTERN)];

  for (const match of importMatches) {
    const specifier = match[1];

    if (!specifier.startsWith('.')) {
      throw new Error(`Unsupported non-local import "${specifier}" in ${resolvedPath}.`);
    }

    await collectModules(path.resolve(moduleDirectory, specifier), seen, ordered);
  }

  ordered.push({
    path: resolvedPath,
    source: normalizeModuleSource(source),
  });
}

export async function assembleContentScript() {
  const entryPath = fromRoot('build', 'modules', 'extension', 'index.js');
  const outputPath = fromRoot('build', 'compiled', 'extension', 'content-script.js');
  const modules = [];

  await collectModules(entryPath, new Set(), modules);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const contents = [
    '(() => {',
    ...modules.map(
      ({ path: modulePath, source }) =>
        `// ${path.relative(fromRoot(), modulePath).replaceAll(path.sep, '/')}\n${source}`,
    ),
    '})();',
    '',
  ].join('\n\n');

  await fs.writeFile(outputPath, contents, 'utf8');
}
