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

- Reimplement the official Discourse source hierarchy instead of creating a separate blog identity.
- Use the default Discourse-like `#222`, `#fff`, and `#08c` palette with one-pixel table borders.
- Use a 17em desktop sidebar, an approximately 52px header, and an 1110px main content area.
- Render topics as semantic table rows with topic, views, and activity columns.
- Collapse the sidebar into a mobile drawer and stack row metadata under the topic title.

## Acceptance commands

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
npm.cmd run test:e2e
```
