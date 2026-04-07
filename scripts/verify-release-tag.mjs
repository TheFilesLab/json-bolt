import { readProjectVersion } from './lib/project-metadata.mjs';

async function main() {
  const providedTag = process.argv[2];

  if (!providedTag) {
    throw new Error('Usage: node ./scripts/verify-release-tag.mjs <tag>');
  }

  const version = await readProjectVersion();
  const expectedTag = `v${version}`;

  if (providedTag !== expectedTag) {
    throw new Error(
      `Release tag mismatch: expected "${expectedTag}" from package.json but received "${providedTag}".`,
    );
  }

  console.log(`Verified release tag ${providedTag}`);
}

await main();
