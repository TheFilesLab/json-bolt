import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

import { assembleContentScript } from './assemble-content-script.mjs';
import { fromRoot } from './paths.mjs';

async function ensureTypeScriptCompiler() {
  const compilerPath = fromRoot('node_modules', 'typescript', 'bin', 'tsc');

  try {
    await fs.access(compilerPath);
  } catch (error) {
    const message = [
      'TypeScript is not installed.',
      'Run `npm install` before building or testing JSON Bolt.',
    ].join(' ');

    throw new Error(message, { cause: error });
  }

  return compilerPath;
}

async function runTypeScriptCompilation() {
  const compilerPath = await ensureTypeScriptCompiler();

  await fs.rm(fromRoot('build', 'modules'), { recursive: true, force: true });
  await fs.rm(fromRoot('build', 'compiled'), { recursive: true, force: true });

  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [compilerPath, '-p', fromRoot('tsconfig.json')], {
      cwd: fromRoot(),
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`TypeScript compilation failed with exit code ${code ?? 'unknown'}.`));
    });
  });

  await assembleContentScript();
}

export { runTypeScriptCompilation };
