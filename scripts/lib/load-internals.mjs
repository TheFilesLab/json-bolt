import fs from 'node:fs/promises';
import vm from 'node:vm';

import { fromRoot } from './paths.mjs';

async function loadJsonBoltInternals() {
  const sourcePath = fromRoot('build', 'compiled', 'extension', 'content-script.js');
  const code = await fs.readFile(sourcePath, 'utf8');

  const context = {
    console,
    TextEncoder,
    performance,
    URL,
    setTimeout,
    clearTimeout,
  };

  vm.createContext(context);
  vm.runInContext(code, context, { filename: sourcePath });

  const internals = context.__JSON_BOLT_TEST__;

  if (!internals) {
    throw new Error('Unable to load JSON Bolt test internals from compiled content script.');
  }

  return internals;
}

export { loadJsonBoltInternals };
