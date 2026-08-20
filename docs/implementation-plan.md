# AI Forum Implementation Plan

## Outcome

Deliver a standalone, deployable forum-style knowledge site for public reading and private owner publishing, with `ChatGPT` and `工具箱` as its initial sections.

## Build sequence

1. Establish the Nuxt/TypeScript project, test runner, environment contract, and database boundary.
2. Implement and test content normalization, Markdown safety, SQLite migrations, queries, and seed data.
3. Implement and test owner-only session authentication and protected topic mutations.
4. Build the public forum shell, topic stream, category/search filters, and topic reader.
5. Build the private studio sign-in, topic table, and Markdown publishing editor.
6. Add responsive and dark themes, accessibility states, Docker deployment, and operator documentation.
7. Run unit, integration, type, build, and browser checks before handoff.

## Visual system

- Canvas: `#f5f7fa`; ink: `#172033`; primary: `#2563eb`; ChatGPT: `#0f9f7f`; Toolbox: `#d97706`.
- Dense three-column forum layout on desktop and a single topic stream on mobile.
- Chinese system sans-serif body typography with tighter display headings and tabular utility metadata.
- A continuous category-colored “knowledge rail” anchors topic rows; other decoration stays quiet.
- Motion is limited to state transitions and is removed when `prefers-reduced-motion` is active.

## Acceptance commands

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:e2e
```
