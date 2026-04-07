import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { readProjectVersion } from './lib/project-metadata.mjs';
import { fromRoot } from './lib/paths.mjs';

const supportedTargets = new Set(['chrome', 'firefox']);

async function ensureZipIsAvailable() {
  await new Promise((resolve, reject) => {
    const child = spawn('zip', ['-v'], {
      stdio: 'ignore',
    });

    child.on('error', (error) => {
      reject(
        new Error(
          'The `zip` command is required to package release assets. Install it and try again.',
          { cause: error },
        ),
      );
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`The \`zip\` command exited with code ${code ?? 'unknown'}.`));
    });
  });
}

async function createZipArchive(sourceDirectory, outputPath) {
  await new Promise((resolve, reject) => {
    const child = spawn('zip', ['-r', '-X', outputPath, '.'], {
      cwd: sourceDirectory,
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      reject(
        new Error(`Unable to create release archive for ${sourceDirectory}.`, { cause: error }),
      );
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`zip failed with exit code ${code ?? 'unknown'} for ${sourceDirectory}.`));
    });
  });
}

async function main() {
  const requestedTargets = process.argv.slice(2);
  const targets = requestedTargets.length > 0 ? requestedTargets : ['chrome', 'firefox'];
  const version = await readProjectVersion();
  const outputDirectory = fromRoot('build', 'release-assets');

  for (const target of targets) {
    if (!supportedTargets.has(target)) {
      throw new Error(
        `Unsupported release target "${target}". Expected one of: ${Array.from(supportedTargets).join(', ')}.`,
      );
    }
  }

  await ensureZipIsAvailable();
  await fs.rm(outputDirectory, { recursive: true, force: true });
  await fs.mkdir(outputDirectory, { recursive: true });

  for (const target of targets) {
    const sourceDirectory = fromRoot('dist', target);

    await fs.access(sourceDirectory);

    const archivePath = path.join(outputDirectory, `json-bolt-${target}-v${version}.zip`);
    await createZipArchive(sourceDirectory, archivePath);
  }

  console.log(`Packaged release assets in ${outputDirectory}`);
}

await main();
