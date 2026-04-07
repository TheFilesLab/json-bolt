import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const scriptsDirectory = path.dirname(scriptDirectory);
const projectRoot = path.dirname(scriptsDirectory);

function fromRoot(...segments) {
  return path.join(projectRoot, ...segments);
}

export { fromRoot, projectRoot };
