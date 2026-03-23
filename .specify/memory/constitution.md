<!--
  Sync Impact Report
  ==================
  Version change: N/A → 1.0.0 (initial ratification)

  Added principles:
    - I. Code Quality & Type Safety
    - II. Testing Standards
    - III. User Experience Consistency
    - IV. Performance Requirements

  Added sections:
    - Technology & Architecture Constraints
    - Development Workflow & Quality Gates
    - Governance

  Templates requiring updates:
    - .specify/templates/plan-template.md        ✅ aligned (Constitution Check gates match principles)
    - .specify/templates/spec-template.md         ✅ aligned (success criteria cover UX + performance)
    - .specify/templates/tasks-template.md        ✅ aligned (phase structure supports testing + polish)

  Deferred items: none
-->

# Reelify Constitution

## Core Principles

### I. Code Quality & Type Safety

All production code MUST be written in TypeScript with `strict` mode enabled. The following rules are non-negotiable:

- **No `any` types**: Every value MUST have an explicit or inferable type. Use `unknown` with type guards when the type is genuinely uncertain.
- **No type assertions without justification**: `as` casts MUST include a code comment explaining why the assertion is safe. Prefer type narrowing via guards over assertions.
- **Function signatures MUST be explicit**: All exported functions MUST declare parameter types and return types. Internal helpers MAY rely on inference only when the return type is trivially obvious.
- **Shared types live in dedicated modules**: Types used across more than one file MUST be defined in `lib/types/` or a colocated `types.ts`. Inline type definitions MUST NOT be duplicated across files.
- **ESLint and Prettier MUST pass**: No code may be merged or deployed with unresolved lint errors. Warnings are treated as errors in CI.
- **Dead code removal**: Unused imports, variables, and unreachable branches MUST be removed before merge. No commented-out code blocks in production files.

**Rationale**: Reelify integrates multiple external APIs (Gemini, ElevenLabs, Supabase, Vercel Blob, YouTube, Facebook) and processes complex data flows (transcription segments, clip timing, FFmpeg commands). Strict typing prevents integration mismatches and makes refactoring safe at scale.

### II. Testing Standards

Every feature and bug fix MUST be accompanied by tests that verify correctness. The project follows a layered testing strategy:

- **Unit tests MUST cover**: All pure utility functions in `lib/utils/`, data transformation logic in `lib/gemini.ts` and `lib/elevenlabs.ts`, Zustand store actions, and any function with branching logic.
- **Integration tests MUST cover**: API route handlers (`app/api/*/route.ts`) with mocked external services, multi-step flows (upload → transcribe → process → result), and Supabase RPC interactions (credit checks, user operations).
- **End-to-end tests SHOULD cover**: The critical user journey (upload video → answer questions → receive clips) and the editor export flow.
- **Test framework**: Vitest for unit and integration tests. Playwright for E2E tests when added.
- **Test file colocation**: Test files MUST be colocated with source files using the `*.test.ts` / `*.test.tsx` naming convention, or placed in a `__tests__/` directory adjacent to the module under test.
- **External service mocking**: Tests MUST NOT make real API calls to ElevenLabs, Gemini, YouTube, Facebook, or Vercel Blob. Use dependency injection or module mocking to substitute controlled responses.
- **Coverage floor**: New code MUST maintain a minimum of 70% line coverage. Critical paths (credit charging, video processing pipeline) MUST have 90%+ coverage.

**Rationale**: Reelify currently has zero automated tests. Establishing testing discipline early prevents regression as the product grows and new integrations (publishing platforms, billing) are added.

### III. User Experience Consistency

All user-facing interfaces MUST deliver a predictable, accessible, and bilingual experience:

- **RTL-first design**: Arabic (`ar`) is the primary locale. All layouts MUST render correctly in RTL. LTR (`en`) MUST be verified as a secondary pass. Use logical CSS properties (`margin-inline-start`, `padding-inline-end`) instead of physical (`margin-left`, `padding-right`).
- **Component library discipline**: All interactive UI elements MUST use components from `components/ui/` (Radix + CVA pattern). Ad-hoc styled `<button>`, `<input>`, or `<select>` elements are prohibited in page-level code.
- **Loading and error states are mandatory**: Every async operation visible to the user MUST show a loading indicator (skeleton, spinner, or progress bar). Every failure MUST display a user-facing error message via Sonner toast or inline feedback — never a silent failure or raw error string.
- **Responsive breakpoints**: All pages MUST function on viewports from 375px (mobile) to 1440px (desktop). The editor page MAY set a minimum width of 768px with a clear message for smaller screens.
- **Accessibility baseline**: Interactive elements MUST be keyboard-navigable. Form inputs MUST have associated labels. Color contrast MUST meet WCAG 2.1 AA (4.5:1 for normal text, 3:1 for large text).
- **Consistent animation**: Use CSS transitions with `duration-200` or `duration-300` from Tailwind defaults. Avoid layout-shifting animations. Respect `prefers-reduced-motion`.
- **Translation completeness**: Every user-visible string MUST exist in both `messages/ar.json` and `messages/en.json`. Hardcoded Arabic or English strings in components are prohibited; use `useTranslations()`.

**Rationale**: Reelify targets Arabic-speaking content creators. Inconsistent RTL rendering, missing translations, or broken mobile layouts directly erode user trust and adoption.

### IV. Performance Requirements

The application MUST meet the following performance targets to ensure a responsive experience for video-heavy workflows:

- **Initial page load**: Largest Contentful Paint (LCP) MUST be under 2.5 seconds on a 4G connection for the landing page and app entry page.
- **FFmpeg WASM initialization**: The FFmpeg singleton (`lib/ffmpegWasm.ts`) MUST be loaded lazily — only when the user initiates a video operation, never on page mount. Loading MUST display a progress indicator.
- **API response times**: `/api/process` (the main pipeline) MUST return within 120 seconds for videos up to 2 hours. `/api/transcribe`, `/api/credits/check`, and `/api/me` MUST respond within 10 seconds. Timeouts MUST be surfaced as user-facing errors, not hangs.
- **Client memory**: IndexedDB usage (`lib/videoStorage.ts`) MUST implement cleanup — stored video blobs MUST be evicted after the user session ends or after 24 hours, whichever comes first. The editor page MUST NOT hold more than one decoded video in memory simultaneously.
- **Bundle size**: No single page's JavaScript bundle (after code splitting) SHOULD exceed 500KB gzipped. `@ffmpeg/ffmpeg` WASM binaries are excluded from this limit but MUST be loaded from CDN or a separate chunk.
- **No client-side memory leaks**: All `useEffect` hooks with subscriptions, event listeners, or Moveable instances MUST return cleanup functions. Object URLs created via `URL.createObjectURL` MUST be revoked when no longer needed.
- **Server-side efficiency**: API routes MUST NOT buffer entire video files in memory. Use streaming where the API design permits. Vercel Blob uploads MUST use the client upload pattern (presigned URLs), not server-side buffering.

**Rationale**: Reelify processes large video files in the browser. Without explicit performance constraints, FFmpeg WASM loading, IndexedDB bloat, and uncleaned object URLs will degrade the experience on mid-range devices common among the target audience.

## Technology & Architecture Constraints

The following constraints govern technology choices and architectural decisions:

- **Framework**: Next.js with App Router. Pages MUST use the `app/` directory convention. The Pages Router (`pages/`) MUST NOT be introduced.
- **Runtime**: API routes MUST specify `export const runtime = "nodejs"` when they require Node.js APIs (fs, streams, busboy). Client components MUST be marked with `"use client"` only when they use React hooks, browser APIs, or event handlers.
- **State management**: Global client state MUST use Zustand stores in `lib/store/`. React Context MAY be used for narrow, subtree-scoped state (e.g., locale provider). Prop drilling beyond 2 levels MUST be replaced with a store or context.
- **Styling**: Tailwind CSS is the primary styling system. CSS Modules MAY be used in `components/reel-editor/` for complex canvas/timeline styling. Inline `style` attributes are prohibited except for dynamically computed values (e.g., video dimensions, timeline positions).
- **External API keys**: All API keys and secrets MUST be stored in environment variables, never committed to the repository. The `.env.example` file MUST list every required variable with a placeholder value.
- **Database**: Supabase is the sole database. Schema changes MUST be captured in `supabase/schema.sql` or migration files. Direct table manipulation via the Supabase dashboard without a corresponding schema file update is prohibited.
- **Error reporting**: Sentry MUST remain configured for production error capture. PostHog MUST remain configured for product analytics. Neither may be removed without a documented replacement.

## Development Workflow & Quality Gates

The following workflow rules ensure consistent, reviewable, and deployable code:

- **Branch naming**: Feature branches MUST follow the pattern `feat/short-description` or `fix/short-description`. No direct commits to `main`.
- **Commit messages**: Follow Conventional Commits format: `type(scope): description`. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`.
- **Pre-merge checklist**:
  1. `npm run lint` passes with zero errors.
  2. `npm run build` completes without TypeScript or build errors.
  3. All new/modified API routes have corresponding integration tests (once testing infrastructure is established).
  4. All user-visible strings exist in both locale files.
  5. No `TODO` or `FIXME` comments introduced without a linked issue or ticket.
- **Code review**: All changes MUST be reviewed before merge. Reviewers MUST verify compliance with this constitution's principles.
- **Deployment**: Production deploys MUST go through Vercel's preview deployment. The preview URL MUST be manually verified for the primary user journey before promoting to production.

## Governance

This constitution is the authoritative reference for all development decisions in Reelify. When a practice conflicts with this document, this document prevails.

- **Amendment process**: Any principle change MUST be documented with rationale, reviewed by at least one other contributor, and reflected in a version bump to this file.
- **Versioning**: This constitution follows semantic versioning. MAJOR: principle removal or redefinition. MINOR: new principle or section added. PATCH: wording clarification or typo fix.
- **Compliance review**: Every pull request MUST be checked against the applicable principles. The reviewer MUST note which principles were verified in their review comment.
- **Runtime guidance**: Use `README.md` and `docs/` for operational guidance that supplements but does not override this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-03-23 | **Last Amended**: 2026-03-23
