import fs from 'node:fs/promises';

import { fromRoot } from './paths.mjs';

let cachedMetadataPromise;

async function readProjectMetadata() {
  if (!cachedMetadataPromise) {
    cachedMetadataPromise = fs
      .readFile(fromRoot('package.json'), 'utf8')
      .then((contents) => JSON.parse(contents));
  }

  return cachedMetadataPromise;
}

async function readProjectVersion() {
  const metadata = await readProjectMetadata();
  const version = metadata.version;

  if (typeof version !== 'string' || version.length === 0) {
    throw new Error('Unable to resolve a valid project version from package.json.');
  }

  return version;
}

export { readProjectMetadata, readProjectVersion };
