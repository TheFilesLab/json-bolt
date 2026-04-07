# Contributing

Thanks for contributing to JSON Bolt.

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
npm run build
npm test
```

## Standards

- Keep runtime code dependency-free
- Prefer simple data structures and low-allocation code paths
- Do not add browser permissions without a clear product need
- Run `npm run format` before opening a pull request
- Run `npm test` before opening a pull request

## Pull Requests

- Keep changes focused
- Include tests for behavior changes when practical
- Document any security or performance tradeoffs in the PR description
