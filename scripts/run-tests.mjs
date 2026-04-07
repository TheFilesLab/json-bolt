import { spawn } from 'node:child_process';

import { runTypeScriptCompilation } from './lib/compile.mjs';
import { fromRoot } from './lib/paths.mjs';

async function main() {
  await runTypeScriptCompilation();

  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--test', fromRoot('tests', 'content-script.test.mjs')],
      {
        cwd: fromRoot(),
        stdio: 'inherit',
      },
    );

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Tests failed with exit code ${code ?? 'unknown'}.`));
    });
  });
}

await main();
