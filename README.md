# JSON Bolt

![JSON Bolt cover image](./images/cover-image.png)

JSON Bolt is a zero-runtime-dependency browser extension for Chrome/Chromium and
Firefox that reformats raw JSON documents into a fast, readable, collapsible
viewer.

## Highlights

- Zero runtime dependencies in the shipped extension
- Native `JSON.parse` parsing with a single custom renderer
- Hand-written syntax highlighting with no third-party highlighter
- Collapsible object and array sections
- Raw and formatted copy actions
- JSON MIME detection plus safe sniffing for mislabelled plain-text responses

## Browser Support

- Chrome and Chromium-based browsers
- Firefox

## Project Structure

- `src/extension/`: modular runtime source for detection, rendering, viewer UI, and bootstrap
- `scripts/build.mjs`: TypeScript compilation and browser package generation
- `.github/workflows/`: CI and tagged release automation
- `tests/`: runtime behavior tests loaded against the compiled content script
- `fixtures/`: benchmark fixtures for repeatable performance checks

## Development

```bash
npm install
npm run build
npm test
```

Targeted builds:

```bash
npm run build:chrome
npm run build:firefox
```

Formatting:

```bash
npm run format
npm run format:check
```

Benchmarks:

```bash
npm run benchmark
```

Release packaging:

```bash
npm run package:release
```

## Debugging In The Browser

Chrome and Chromium browsers run content scripts in an isolated world, so page
console checks like `typeof globalThis.__JSON_BOLT_TEST__` will stay
`undefined` even when JSON Bolt is injected correctly.

Use these page-visible checks instead:

```js
document.documentElement.dataset.jsonBoltState;
document.documentElement.dataset.jsonBoltReason;
document.querySelector('.jb-app');
```

Typical values:

- `jsonBoltState = "activated"` when JSON Bolt mounted successfully
- `jsonBoltState = "skipped"` when the page was not eligible
- `jsonBoltReason = "oversized"` when a response exceeded the safe render limit
- `document.querySelector('.jb-app')` returns the mounted viewer root when the
  extension took over the page

## Security Posture

- No remote code, no `eval`, and no inline event handlers
- HTML-sensitive JSON content is escaped before rendering
- The extension requests only page access required for content scripts
- Invalid JSON leaves the original page untouched

## Packaging Output

Running `npm run build` generates unpacked extension packages in:

- `dist/chrome`
- `dist/firefox`

Load either folder as an unpacked extension during development.

Running `npm run package:release` creates versioned release archives in:

- `build/release-assets`

## CI/CD

- Every push to `main` and every pull request to `main` runs GitHub Actions CI
- Version tags like `v0.1.0` publish GitHub Releases with Chrome and Firefox zip assets

Typical release flow:

```bash
npm version patch
git push origin main --follow-tags
```

## License

MIT. See [LICENSE](./LICENSE).
