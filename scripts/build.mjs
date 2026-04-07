import fs from 'node:fs/promises';

import { readProjectVersion } from './lib/project-metadata.mjs';
import { runTypeScriptCompilation } from './lib/compile.mjs';
import { fromRoot } from './lib/paths.mjs';

function createManifest(target, extensionVersion) {
  const base = {
    manifest_version: 3,
    name: 'JSON Bolt',
    version: extensionVersion,
    description: 'Lightning-fast JSON formatter and syntax highlighter for raw JSON pages.',
    permissions: [],
    host_permissions: ['http://*/*', 'https://*/*'],
    content_scripts: [
      {
        matches: ['http://*/*', 'https://*/*'],
        js: ['content-script.js'],
        run_at: 'document_start',
      },
    ],
  };

  if (target === 'firefox') {
    return {
      ...base,
      browser_specific_settings: {
        gecko: {
          id: 'json-bolt@thefileslab.com',
          strict_min_version: '121.0',
        },
      },
    };
  }

  return {
    ...base,
    minimum_chrome_version: '114',
  };
}

async function prepareTarget(target) {
  const targetDirectory = fromRoot('dist', target);
  const extensionVersion = await readProjectVersion();

  await fs.rm(targetDirectory, { recursive: true, force: true });
  await fs.mkdir(targetDirectory, { recursive: true });
  await fs.copyFile(
    fromRoot('build', 'compiled', 'extension', 'content-script.js'),
    fromRoot('dist', target, 'content-script.js'),
  );
  await fs.writeFile(
    fromRoot('dist', target, 'manifest.json'),
    `${JSON.stringify(createManifest(target, extensionVersion), null, 2)}\n`,
    'utf8',
  );
}

async function main() {
  const requestedTargets = process.argv.slice(2);
  const targets = requestedTargets.length > 0 ? requestedTargets : ['chrome', 'firefox'];

  await fs.rm(fromRoot('build'), { recursive: true, force: true });
  await fs.rm(fromRoot('dist'), { recursive: true, force: true });
  await runTypeScriptCompilation();

  for (const target of targets) {
    if (target !== 'chrome' && target !== 'firefox') {
      throw new Error(`Unsupported target "${target}". Expected "chrome" or "firefox".`);
    }

    await prepareTarget(target);
  }

  console.log(`Built JSON Bolt for: ${targets.join(', ')}`);
}

await main();
