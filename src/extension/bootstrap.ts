import { isTopLevelWindow, setDebugState } from './core/helpers.js';
import { createDetectionProbe, detectWithRetries } from './detection.js';
import { prepareViewerModel } from './render.js';
import { mountViewer } from './viewer.js';

async function waitForInspectableDocument(): Promise<void> {
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    return;
  }

  await new Promise<void>((resolve) => {
    document.addEventListener('DOMContentLoaded', () => resolve(), {
      once: true,
    });
  });
}

export async function bootstrap(): Promise<void> {
  if (!isTopLevelWindow()) {
    return;
  }

  if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
    return;
  }

  await waitForInspectableDocument();

  if (!document.body) {
    return;
  }

  setDebugState('booting', 'non-json-start');

  try {
    const { detection, probe } = await detectWithRetries(() => createDetectionProbe(document));

    if (!detection.matches) {
      setDebugState('skipped', detection.reasonCode);
      return;
    }

    const model = prepareViewerModel(probe);

    if (!model) {
      setDebugState('error', 'prepare-failed');
      return;
    }

    mountViewer(model);
    setDebugState('activated', model.detection.reasonCode);
  } catch {
    setDebugState('error', 'prepare-failed');
  }
}
