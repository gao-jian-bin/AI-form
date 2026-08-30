# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the lightweight forum safe to deploy, scalable beyond the demo dataset, recoverable for a beginner administrator, and easier to maintain without adding public accounts or replies.

**Architecture:** Keep the current single-node Nuxt/Nitro + SQLite design. Add small, testable server utilities for migrations, pagination, security, revisions, upload inventory, and feeds; keep persistence in one mounted `/data` directory so database and images move together. The public UI remains read-only while the authenticated studio gains recovery and media-management tools.

**Tech Stack:** Nuxt 4, Vue 3, TypeScript, Nitro/H3, better-sqlite3, Vitest, Playwright, Docker Compose, Cloudflare Tunnel or a local reverse proxy.

## Global Constraints

- Keep public registration, public posting, and public replies disabled.
- Keep SQLite and local image files; do not rewrite the application for Cloudflare Workers/D1/R2.
- Preserve all existing administrator content and URLs through additive migrations and redirects.
- Do not expose the Nitro port publicly in the default Compose configuration.
- New behavior follows red-green-refactor; configuration-only changes are verified by build and runtime checks.
- Do not push commits or contact the server from this local implementation.

---

### Task 1: Persistent and safe container runtime

**Files:**
- Create: `.dockerignore`
- Create: `scripts/docker-entrypoint.sh`
- Modify: `Dockerfile`
- Modify: `compose.yaml`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: `DATABASE_PATH` and `UPLOAD_DIR` environment variables.
- Produces: a container that initializes `/data/uploads`, writes both the SQLite database and images under `/data`, binds only to `127.0.0.1:3000`, and rotates logs.

- [ ] Add the runtime entrypoint that creates `/data/uploads`, fixes `/data` ownership, then drops to the `node` user before starting Nitro.
- [ ] Set `UPLOAD_DIR=/data/uploads` in the image and Compose environment, add `init`, a read-only root filesystem with writable `/tmp`, and bounded JSON logs.
- [ ] Bind the host port as `127.0.0.1:3000:3000` and retain `./data:/data` for beginner-friendly backup access.
- [ ] Ignore local data, build output, Git metadata, tests, and secrets from Docker build context.
- [ ] Update the environment table and whole-data backup/restore commands so `data/uploads` is never omitted.
- [ ] Run `npm.cmd run build` to verify the production artifact still builds.

### Task 2: Request security, trusted client addresses, and health

**Files:**
- Create: `server/utils/security.ts`
- Create: `server/middleware/security-headers.ts`
- Create: `server/api/health.get.ts`
- Modify: `server/utils/http.ts`
- Modify: `server/api/auth/login.post.ts`
- Modify: `.env.example`
- Test: `tests/security.test.ts`
- Test: `tests/auth.test.ts`

**Interfaces:**
- Produces: `securityHeaders(): Record<string, string>` and `clientAddress(event): string`.
- `clientAddress` trusts `CF-Connecting-IP`/`X-Forwarded-For` only when `TRUST_PROXY=true`; otherwise it uses the socket address.

- [ ] Write a failing test proving security headers include `frame-ancestors 'none'`, `nosniff`, a strict referrer policy, and disabled browser capabilities.
- [ ] Write a failing test proving untrusted forwarded headers do not affect the resolved client address while trusted proxy mode accepts Cloudflare's address.
- [ ] Implement the pure security-header map and Nitro middleware.
- [ ] Implement `clientAddress` and use it for login limiting and anonymous view fingerprints.
- [ ] Add a minimal `/api/health` response and point the container health check at it.
- [ ] Run the focused security/auth tests, then the full unit suite.

### Task 3: Versioned migrations, revision history, and housekeeping

**Files:**
- Modify: `server/utils/database.ts`
- Modify: `server/plugins/database.ts`
- Create: `server/api/studio/topics/[id]/revisions/index.get.ts`
- Create: `server/api/studio/topics/[id]/revisions/[revisionId].post.ts`
- Modify: `server/utils/http.ts`
- Modify: `app/types/forum.ts`
- Test: `tests/database.test.ts`

**Interfaces:**
- Produces: `TopicRevision`, `listTopicRevisions(db, topicId)`, `restoreTopicRevision(db, topicId, revisionId)`, `purgeOperationalData(db, now)`, and `forumSchemaVersion(db)`.
- A revision stores the complete pre-edit topic snapshot and tags; restoring it creates a new safety revision before replacing the current topic.

- [ ] Write failing database tests for `PRAGMA user_version`, automatic pre-edit snapshots, revision restore, and removal of expired sessions/views.
- [ ] Replace the one-shot schema initializer with ordered idempotent migrations while preserving databases currently at version zero.
- [ ] Add the revision table and snapshot/restore transaction paths.
- [ ] Add administrator-only list and restore APIs.
- [ ] Purge view fingerprints older than 30 days and expired sessions at startup; keep aggregate view counts unchanged.
- [ ] Run focused database/auth tests and confirm migrations are repeatable.

### Task 4: Bounded validation and paginated public discovery

**Files:**
- Modify: `server/utils/validation.ts`
- Modify: `server/utils/database.ts`
- Modify: `server/api/topics/index.get.ts`
- Modify: `app/types/forum.ts`
- Create: `app/components/TopicPagination.vue`
- Modify: `app/components/ForumPage.vue`
- Modify: `app/pages/index.vue`
- Modify: `app/pages/c/[slug].vue`
- Modify: `app/pages/tag/[slug].vue`
- Modify: `app/pages/search.vue`
- Modify: `app/components/SidebarTagSection.vue`
- Modify: `app/components/ForumPage.vue`
- Test: `tests/database.test.ts`
- Test: `tests/validation.test.ts`
- Test: `tests/e2e/forum.spec.ts`

**Interfaces:**
- Produces: `TopicPage { items, page, pageSize, total, totalPages }` from `/api/topics`.
- Query contract: `page` is a positive integer, `pageSize` is clamped to 1-50, category uses category slug, and tag uses stable tag slug.

- [ ] Write failing tests proving 75 posts are reachable across pages and tags longer than 60 characters are rejected before database writes.
- [ ] Add a count query plus `LIMIT/OFFSET` topic page query with literal pagination metadata.
- [ ] Validate public query parameters and return the page object from the API.
- [ ] Update all discovery pages and related-topic loading to consume `TopicPage`.
- [ ] Add accessible previous/next and page-number navigation that retains filter/search query parameters.
- [ ] Move tag URLs to stable stored slugs and retain a permanent redirect for legacy name URLs.
- [ ] Run unit tests and an E2E pagination/navigation scenario.

### Task 5: Correct public routing and canonical SEO

**Files:**
- Modify: `app/pages/c/[slug].vue`
- Modify: `app/pages/tag/[slug].vue`
- Modify: `app/pages/t/[slug]/[id].vue`
- Modify: `server/utils/seo.ts`
- Modify: `server/routes/sitemap.xml.get.ts`
- Modify: `nuxt.config.ts`
- Create: `server/routes/feed.xml.get.ts`
- Test: `tests/seo.test.ts`
- Test: `tests/e2e/forum.spec.ts`

**Interfaces:**
- Produces: real 404 responses for unknown categories/tags, a 301 redirect for a mismatched topic slug, an unlimited database-backed sitemap, and an Atom feed at `/feed.xml`.

- [ ] Write failing tests for feed escaping and sitemap inclusion of home, category, tag, and topic URLs.
- [ ] Make category/tag pages throw server-side 404 when the resource does not exist.
- [ ] Redirect a valid topic ID with the wrong slug to its stored canonical path before rendering metadata.
- [ ] Build sitemap entries from all published topics/categories/tags without a hard-coded 100-item ceiling.
- [ ] Add the Atom feed and advertise it in the global document head.
- [ ] Add topic Article JSON-LD using only sanitized JSON serialization.
- [ ] Run SEO tests and E2E assertions for 404, 301, canonical, sitemap, and feed responses.

### Task 6: Local draft recovery and revision controls in the composer

**Files:**
- Create: `app/utils/composer-draft.ts`
- Modify: `app/components/TopicEditor.vue`
- Modify: `app/components/AdminComposerHost.vue`
- Modify: `app/assets/css/main.css`
- Test: `tests/composer-draft.test.ts`
- Test: `tests/e2e/forum.spec.ts`

**Interfaces:**
- Produces: versioned `ComposerDraft` serialization keyed by `new` or topic ID; a saved post clears its draft.
- Revision endpoints from Task 3 are exposed inside the editor as a compact history drawer with explicit restore confirmation.

- [ ] Write failing tests for malformed local data, per-topic isolation, stale draft rejection, and successful recovery.
- [ ] Implement pure serialization/selection helpers and debounce browser storage writes from the editor.
- [ ] Show Restore and Discard actions when a newer recoverable draft exists; never silently overwrite server content.
- [ ] Clear local recovery data only after a successful API save.
- [ ] Add a revision history drawer with timestamp, status, preview summary, and restore action.
- [ ] Run utility/component tests and E2E recovery/restore scenarios.

### Task 7: Upload inventory, quota, and safe orphan cleanup

**Files:**
- Modify: `server/utils/uploads.ts`
- Create: `server/api/studio/uploads/index.get.ts`
- Create: `server/api/studio/uploads/[...path].delete.ts`
- Create: `app/pages/studio/uploads.vue`
- Modify: `app/layouts/studio.vue`
- Modify: `app/types/forum.ts`
- Modify: `app/assets/css/main.css`
- Modify: `.env.example`
- Test: `tests/uploads.test.ts`
- Test: `tests/e2e/forum.spec.ts`

**Interfaces:**
- Produces: `UploadInventory { items, usedBytes, quotaBytes }`; each item reports path, URL, size, modified time, and whether any post references it.
- DELETE succeeds only for an existing, unreferenced generated upload path.

- [ ] Write failing tests for recursively listing only generated image paths, detecting Markdown references, quota rejection, and refusing to delete referenced files.
- [ ] Implement inventory and reference helpers with path traversal protection.
- [ ] Enforce `UPLOAD_QUOTA_MB` before new writes and return an actionable 507 error.
- [ ] Add authenticated inventory/delete APIs.
- [ ] Add a studio Media page with preview, Markdown copy button, usage status, disk totals, and delete action only for unused files.
- [ ] Run upload tests and an E2E media-management scenario.

### Task 8: Accessibility, CI, deployment handoff, and final verification

**Files:**
- Modify: `app/app.vue`
- Modify: `app/layouts/default.vue`
- Modify: `app/assets/css/main.css`
- Create: `.github/workflows/verify.yml`
- Modify: `README.md`

**Interfaces:**
- Produces: a keyboard skip link, automated Node 24 verification, and a beginner-safe Cloudflare/VPS runbook.

- [ ] Add a skip-to-content link and a stable `#main-content` target in public and studio layouts.
- [ ] Add CI jobs for `npm ci`, unit tests, typecheck, production build, and Playwright E2E.
- [ ] Document Ubuntu + Docker setup, Cloudflare nameserver onboarding, Tunnel routing, environment setup, update, rollback, complete data backup, and restore without including secrets.
- [ ] Explain which non-sensitive server facts the user may send for a tailored deployment review.
- [ ] Run `npm.cmd audit --omit=dev --audit-level=moderate`, `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build`, and `npm.cmd run test:e2e` from a clean worktree.
- [ ] Review the final diff for secrets, accidental demo-data changes, oversized scope, and migration compatibility; then create local commits without pushing.

## Self-review

- Spec coverage: every launch blocker and first-release recommendation from the 2026-08-30 audit maps to Tasks 1-8; public accounts/replies remain explicitly excluded.
- Placeholder scan: the plan contains no deferred implementation placeholders.
- Type consistency: `TopicPage`, `TopicRevision`, `ComposerDraft`, and `UploadInventory` have one producer and named consumers.
- Risk boundary: the plan changes only the local project. Server and Cloudflare operations remain a later, user-observed deployment session.
