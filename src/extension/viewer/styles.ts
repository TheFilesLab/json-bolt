export const viewerStyles = `
  :root {
    color-scheme: light dark;
    --jb-bg: #f6f7f9;
    --jb-surface: rgba(255, 255, 255, 0.9);
    --jb-surface-strong: rgba(255, 255, 255, 0.97);
    --jb-surface-muted: rgba(245, 247, 250, 0.98);
    --jb-border: rgba(15, 23, 42, 0.08);
    --jb-border-strong: rgba(15, 23, 42, 0.12);
    --jb-text: #111827;
    --jb-text-muted: #6b7280;
    --jb-text-subtle: #94a3b8;
    --jb-accent: #0f172a;
    --jb-header: #0f1010;
    --jb-header-border: rgba(255, 255, 255, 0.08);
    --jb-header-text: rgba(248, 250, 252, 0.98);
    --jb-header-muted: rgba(203, 213, 225, 0.78);
    --jb-header-subtle: rgba(148, 163, 184, 0.7);
    --jb-header-chip: rgba(255, 255, 255, 0.05);
    --jb-header-chip-border: rgba(255, 255, 255, 0.09);
    --jb-key: #1d4ed8;
    --jb-string: #0f766e;
    --jb-number: #c2410c;
    --jb-boolean: #7c3aed;
    --jb-null: #be185d;
    --jb-punctuation: #94a3b8;
    --jb-shadow: 0 16px 48px rgba(15, 23, 42, 0.08);
    --jb-button-bg: rgba(255, 255, 255, 0.82);
    --jb-button-hover: rgba(15, 23, 42, 0.04);
    --jb-focus: rgba(37, 99, 235, 0.18);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --jb-bg: #09090b;
      --jb-surface: rgba(17, 24, 39, 0.92);
      --jb-surface-strong: rgba(9, 9, 11, 0.98);
      --jb-surface-muted: rgba(24, 24, 27, 0.95);
      --jb-border: rgba(255, 255, 255, 0.08);
      --jb-border-strong: rgba(255, 255, 255, 0.12);
      --jb-text: #f3f4f6;
      --jb-text-muted: #a1a1aa;
      --jb-text-subtle: #71717a;
      --jb-accent: #fafafa;
      --jb-key: #93c5fd;
      --jb-string: #6ee7b7;
      --jb-number: #fb923c;
      --jb-boolean: #c4b5fd;
      --jb-null: #f9a8d4;
      --jb-punctuation: #71717a;
      --jb-shadow: 0 18px 56px rgba(0, 0, 0, 0.38);
      --jb-button-bg: rgba(255, 255, 255, 0.06);
      --jb-button-hover: rgba(255, 255, 255, 0.06);
      --jb-focus: rgba(96, 165, 250, 0.22);
    }
  }

  html, body {
    margin: 0;
    min-height: 100%;
    background:
      radial-gradient(circle at top, rgba(148, 163, 184, 0.08), transparent 32%),
      var(--jb-bg);
    color: var(--jb-text);
    font-family:
      'SF Pro Display',
      'IBM Plex Sans',
      -apple-system,
      BlinkMacSystemFont,
      sans-serif;
  }

  body {
    padding: 14px;
    box-sizing: border-box;
  }

  .jb-app {
    max-width: 1240px;
    margin: 0 auto;
    border: 1px solid var(--jb-border);
    border-radius: 20px;
    background: var(--jb-surface);
    box-shadow: var(--jb-shadow);
    overflow: hidden;
  }

  .jb-toolbar {
    display: grid;
    gap: 14px;
    padding: 14px 18px 12px;
    border-bottom: 1px solid var(--jb-header-border);
    background: var(--jb-header);
    user-select: none;
  }

  .jb-toolbar-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }

  .jb-brand {
    display: grid;
    gap: 5px;
    min-width: 0;
  }

  .jb-brand-eyebrow {
    color: var(--jb-header-subtle);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .jb-brand-title {
    color: var(--jb-header-text);
    font-size: 1.05rem;
    font-weight: 650;
    letter-spacing: -0.03em;
  }

  .jb-brand-subtitle {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    color: var(--jb-header-muted);
    font-size: 0.82rem;
    line-height: 1.35;
  }

  .jb-brand-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.82);
    flex: 0 0 auto;
  }

  .jb-request-path {
    max-width: 100%;
    padding: 0.18rem 0.5rem;
    border: 1px solid var(--jb-header-chip-border);
    border-radius: 999px;
    background: var(--jb-header-chip);
    color: var(--jb-header-text);
    font-family:
      'JetBrains Mono',
      'SFMono-Regular',
      ui-monospace,
      monospace;
    font-size: 0.74rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .jb-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 6px;
    margin-left: auto;
  }

  .jb-button {
    appearance: none;
    cursor: pointer;
    padding: 6px 10px;
    border: 1px solid var(--jb-header-chip-border);
    border-radius: 10px;
    background: var(--jb-button-bg);
    color: var(--jb-header-text);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 550;
    line-height: 1.2;
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      transform 150ms ease;
  }

  .jb-button:hover {
    background: var(--jb-button-hover);
    border-color: rgba(255, 255, 255, 0.14);
    transform: translateY(-1px);
  }

  .jb-button:focus-visible,
  .jb-toggle:focus-visible {
    outline: none;
    box-shadow: 0 0 0 4px var(--jb-focus);
  }

  .jb-button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    transform: none;
  }

  .jb-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 6px;
  }

  .jb-stat {
    display: grid;
    gap: 3px;
    min-height: 50px;
    padding: 8px 10px;
    border: 1px solid var(--jb-header-chip-border);
    border-radius: 12px;
    background: var(--jb-header-chip);
  }

  .jb-stat-label {
    color: var(--jb-header-subtle);
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .jb-stat-value {
    color: var(--jb-header-text);
    font-size: 0.92rem;
    font-weight: 620;
    letter-spacing: -0.015em;
  }

  .jb-content {
    padding: 0;
    overflow: auto;
    background: var(--jb-surface-strong);
  }

  .jb-json-pane {
    user-select: text;
  }

  .jb-viewer {
    margin: 0;
    padding: 16px 18px 22px;
    min-height: 68vh;
    box-sizing: border-box;
    overflow: auto;
    color: var(--jb-text);
    font-family:
      'JetBrains Mono',
      'SFMono-Regular',
      ui-monospace,
      monospace;
    font-size: 12.5px;
    line-height: 1.6;
    white-space: pre;
    tab-size: 2;
  }

  .jb-node.is-collapsed > .jb-children,
  .jb-node.is-collapsed > .jb-close {
    display: none;
  }

  .jb-node > .jb-summary {
    display: none;
    color: var(--jb-text-muted);
  }

  .jb-node.is-collapsed > .jb-summary {
    display: inline;
  }

  .jb-toggle {
    appearance: none;
    cursor: pointer;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
  }

  .jb-toggle:hover .jb-brace {
    color: var(--jb-text);
  }

  .jb-brace,
  .jb-punctuation {
    color: var(--jb-punctuation);
  }

  .jb-key {
    color: var(--jb-key);
  }

  .jb-string {
    color: var(--jb-string);
  }

  .jb-number {
    color: var(--jb-number);
  }

  .jb-boolean {
    color: var(--jb-boolean);
  }

  .jb-null {
    color: var(--jb-null);
  }

  @media (max-width: 720px) {
    body {
      padding: 10px;
    }

    .jb-toolbar,
    .jb-viewer {
      padding-left: 14px;
      padding-right: 14px;
    }

    .jb-toolbar {
      gap: 10px;
    }

    .jb-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .jb-actions {
      width: 100%;
      justify-content: flex-start;
      margin-left: 0;
    }

    .jb-button {
      flex: 0 0 auto;
    }
  }
`;
