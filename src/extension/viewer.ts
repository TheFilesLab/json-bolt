import { MAX_COPY_CHARS } from './core/constants.js';
import { escapeHtml } from './core/helpers.js';
import type { PreparedViewerModel } from './core/types.js';
import { createMetadataCards } from './render.js';
import { viewerStyles } from './viewer/styles.js';

const JSON_SELECTION_ATTRIBUTE = 'data-jb-selection';
const JSON_SELECTION_VALUE = 'json-content';

export function createViewerMarkup(
  model: PreparedViewerModel,
  currentDocumentUrl: string = document.URL,
): string {
  const currentUrl = new URL(currentDocumentUrl);
  const requestLabel = `${currentUrl.hostname}${currentUrl.pathname}${currentUrl.search}`;

  return [
    '<div class="jb-app">',
    '<section class="jb-toolbar">',
    '<div class="jb-toolbar-top">',
    '<div class="jb-brand">',
    '<div class="jb-brand-eyebrow">JSON Bolt</div>',
    '<div class="jb-brand-title">Formatted JSON response</div>',
    `<div class="jb-brand-subtitle"><span class="jb-brand-dot"></span><span>${escapeHtml(model.detection.reason)}</span><span class="jb-request-path">${escapeHtml(requestLabel)}</span></div>`,
    '</div>',
    '<div class="jb-actions">',
    `<button class="jb-button" type="button" data-action="expand-all"${model.collapseIndex === 0 ? ' disabled' : ''}>Expand all</button>`,
    `<button class="jb-button" type="button" data-action="collapse-all"${model.collapseIndex === 0 ? ' disabled' : ''}>Collapse all</button>`,
    '<button class="jb-button" type="button" data-action="copy-raw">Copy raw</button>',
    '<button class="jb-button" type="button" data-action="copy-formatted">Copy formatted</button>',
    '</div>',
    '</div>',
    `<div class="jb-stats">${createMetadataCards(model.metadata)}</div>`,
    '</section>',
    '<main class="jb-content">',
    `<div class="jb-json-pane" ${JSON_SELECTION_ATTRIBUTE}="${JSON_SELECTION_VALUE}">`,
    `<pre class="jb-viewer" tabindex="0">${model.html}</pre>`,
    '</div>',
    '</main>',
    '</div>',
  ].join('');
}

function setButtonTemporaryLabel(button: HTMLButtonElement, label: string): void {
  const originalLabel = button.dataset.originalLabel ?? button.textContent ?? '';

  if (!button.dataset.originalLabel) {
    button.dataset.originalLabel = originalLabel;
  }

  button.textContent = label;
  window.setTimeout(() => {
    button.textContent = originalLabel;
  }, 1400);
}

async function copyText(text: string): Promise<boolean> {
  if (text.length > MAX_COPY_CHARS) {
    return false;
  }

  if (typeof navigator.clipboard?.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;

  try {
    copied = document.execCommand('copy');
  } finally {
    textarea.remove();
  }

  return copied;
}

function toggleNode(node: HTMLElement, collapsed: boolean): void {
  node.classList.toggle('is-collapsed', collapsed);

  const button = node.querySelector<HTMLButtonElement>(':scope > .jb-toggle');

  if (button) {
    button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }
}

function toggleAllNodes(root: HTMLElement, collapsed: boolean): void {
  const nodes = root.querySelectorAll<HTMLElement>('.jb-node');

  for (const node of Array.from(nodes)) {
    toggleNode(node, collapsed);
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function getJsonSelectionContainer(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>(
    `.jb-json-pane[${JSON_SELECTION_ATTRIBUTE}="${JSON_SELECTION_VALUE}"]`,
  );
}

function selectJsonContent(root: HTMLElement): boolean {
  const jsonContainer = getJsonSelectionContainer(root);

  if (!jsonContainer) {
    return false;
  }

  const selection = window.getSelection();

  if (!selection) {
    return false;
  }

  const range = document.createRange();
  range.selectNodeContents(jsonContainer);
  selection.removeAllRanges();
  selection.addRange(range);

  return true;
}

function selectionTargetsJsonContent(root: HTMLElement): boolean {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const jsonContainer = getJsonSelectionContainer(root);

  if (!jsonContainer) {
    return false;
  }

  for (let index = 0; index < selection.rangeCount; index += 1) {
    const range = selection.getRangeAt(index);

    if (!jsonContainer.contains(range.commonAncestorContainer)) {
      return false;
    }
  }

  return true;
}

function attachViewerEvents(root: HTMLElement, model: PreparedViewerModel): void {
  root.addEventListener('keydown', (event) => {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    if (event.key.toLowerCase() !== 'a' || !(event.metaKey || event.ctrlKey) || event.altKey) {
      return;
    }

    if (isEditableTarget(event.target)) {
      return;
    }

    if (selectJsonContent(root)) {
      event.preventDefault();
    }
  });

  root.addEventListener('copy', (event) => {
    if (!(event instanceof ClipboardEvent)) {
      return;
    }

    if (!selectionTargetsJsonContent(root) || !event.clipboardData) {
      return;
    }

    event.preventDefault();
    event.clipboardData.setData('text/plain', model.formattedText);
  });

  root.addEventListener('click', async (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const toggleButton = target.closest<HTMLButtonElement>('.jb-toggle');

    if (toggleButton) {
      const node = toggleButton.closest<HTMLElement>('.jb-node');

      if (!node) {
        return;
      }

      const collapsed = !node.classList.contains('is-collapsed');
      toggleNode(node, collapsed);
      return;
    }

    const actionButton = target.closest<HTMLButtonElement>('[data-action]');

    if (!actionButton) {
      return;
    }

    const action = actionButton.dataset.action;

    if (action === 'expand-all') {
      toggleAllNodes(root, false);
      return;
    }

    if (action === 'collapse-all') {
      toggleAllNodes(root, true);
      return;
    }

    if (action === 'copy-raw') {
      const copied = await copyText(model.rawText);
      setButtonTemporaryLabel(actionButton, copied ? 'Copied raw' : 'Copy failed');
      return;
    }

    if (action === 'copy-formatted') {
      const copied = await copyText(model.formattedText);
      setButtonTemporaryLabel(actionButton, copied ? 'Copied formatted' : 'Copy failed');
    }
  });
}

export function mountViewer(model: PreparedViewerModel): void {
  document.head.innerHTML = '';

  const title = document.createElement('title');
  title.textContent = 'JSON Bolt';
  document.head.appendChild(title);

  const style = document.createElement('style');
  style.textContent = viewerStyles;
  document.head.appendChild(style);

  document.body.replaceChildren();

  const root = document.createElement('div');
  root.innerHTML = createViewerMarkup(model);
  document.body.appendChild(root);

  attachViewerEvents(root, model);
}
