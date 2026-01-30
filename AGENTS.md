# Ski GPX Analyzer – Agent Handbook

This guide equips autonomous coding agents with everything needed to work effectively in this repository. Treat it as the definitive reference before running commands or editing files.

## 1. Build, Lint, and Test Commands
- `npm install`: install dependencies (required on fresh checkout).
- `npm run dev`: launch Vite dev server on http://localhost:5173.
- `npm run build`: run TypeScript type-check (`tsc`) then production build (`vite build`). Failures usually mean type or bundling errors—fix before shipping.
- `npm run preview`: serve the production build locally.
- Test commands (Vitest):
  - `npm test`: run tests in watch mode for development.
  - `npm run test:run`: run tests once (CI mode).
  - `npm run test:coverage`: run tests with coverage report.
  - `npm run test:ui`: open Vitest UI for interactive debugging.
  - **Running a single test**: `npm test -- src/path/to/file.test.ts` or `npm test -- --grep "test name"`
- Android workflow:
  - `npm run build:android`: build web bundle then `cap sync android` (syncs assets + native project).
  - `npm run android:dev`: build web bundle, sync, and run on connected device/emulator.
  - `npm run android:studio`: open Android Studio project.
  - `npx cap sync android`: resync native project after editing Capacitor config or web assets without rebuilding web bundle explicitly.
  - `npm run cap:init` / `npm run cap:add`: utility scripts; rarely needed after initial setup.
  - `npm run cap:icons`: regenerate Capacitor icons/splashes.
- No dedicated lint or formatting commands are configured; rely on TypeScript and build output.

## 2. Repo Overview
- React 18 + TypeScript + Vite web app with Capacitor Android wrapper.
- Key domains:
  - `src/features/*`: top-level feature views (track, map, analysis, profile, run detail).
  - `src/components/*`: reusable UI pieces (file upload, settings menu, language selector, tab navigation).
  - `src/utils/*`: parsing, native abstraction, network monitoring, persistence, Leaflet loader, etc.
  - `src/i18n/*`: translation setup, locale JSON files, and typed helpers.
  - `src/test/mocks/*`: Capacitor plugin mocks for testing.
  - `src/contexts/*`: React contexts (RecordingContext, UnitsContext).
- Entry point: `src/App.tsx`; mounts per-feature views, handles tab state, integrates analytics.
- Capacitor config lives in `capacitor.config.ts`. Android build artifacts excluded via `.gitignore`.

## 3. Execution Environment Expectations
- Target Node.js >= 16 with npm. Android tooling requires JDK 17+ and Android SDK (API 30+). Confirm actual versions via `README.md` and `ANDROID_SETUP.md` when prepping instructions.
- TypeScript strictness: review `tsconfig.json` (implicit: Vite defaults). Do not introduce `any` unless unavoidable; prefer explicit types.
- Browser environment: design for responsive layout; analytics should remain web-only (`@vercel/analytics` is gated via Capacitor detection).
- Test environment: Vitest with jsdom, @testing-library/react for component tests, custom mocks in `src/test/mocks/`.

## 4. Code Style Guidelines

### Imports
- Use absolute imports relative to `src` (as configured by Vite) where available; otherwise default to relative paths.
- Group imports: external packages first (React, libraries), blank line, internal modules, blank line, styles.
- Destructure React hooks (`useState`, `useEffect`, etc.) from `react` import.
- Keep import alphabetization loose but consistent; prioritize readability over strict ordering.

### Formatting
- Rely on repository conventions (Vite defaults). Follow existing patterns: two-space indentation. Use semicolons consistently (current code includes them). Keep trailing commas where TypeScript allows.
- JSX attributes go on new lines when component props exceed ~2 items. Align closing tags with start of element.
- Wrap long template literals or expressions across lines for readability.
- CSS uses kebab-case class names; continue this convention.

### Types & Interfaces
- Prefer explicit TypeScript interfaces/types for props and domain models. See `GPXData`, `Run`, `TrackPoint` in `src/utils/gpxParser.ts` as references.
- Avoid `any`. If typing is complex, document rationale and use generics or utility types instead.
- Use union string literal types for enums (e.g., `TabType` in `App.tsx`).
- When working with asynchronous Capacitor APIs, type return values using provided Capacitor types.

### State & Hooks
- Use React functional components with hooks. Memoize derived values with `useMemo` and callbacks with `useCallback` when they feed expensive computations or child props.
- Manage cross-component state via contexts (see `src/contexts/UnitsContext.tsx`). Extend contexts instead of lifting state unnecessarily.
- When adding side effects, include dependency arrays and guard against native/web differences (Capacitor vs browser).

### Naming Conventions
- Components: PascalCase (`MapView`, `SettingsMenu`).
- Hooks and functions: camelCase (`useTranslation`, `formatDistance`).
- Files: components (`ComponentName.tsx`), styles (`ComponentName.css`), utilities (`camelCase.ts`). Keep CSS and TSX filenames paired.
- CSS classes: kebab-case with feature prefixes (`analysis-card`, `run-detail-header`).
- Constants: UPPER_SNAKE_CASE only when truly constant (rare in repo). Otherwise camelCase.

### Error Handling & Edge Cases
- File parsing: gracefully handle invalid GPX/FIT content by showing user-friendly messages (see `FileUpload` logic). When adding new parsing logic, catch exceptions and surface via UI state, not console-only.
- Native features: always guard Capacitor-specific code with `Capacitor.isNativePlatform()` checks to avoid web crashes.
- Network/async operations: use try/catch around Capacitor plugin calls; log via `console.error` plus user feedback when appropriate.
- When computing derived stats, protect against division by zero and empty arrays (existing helper functions follow this pattern).
- Handle nullish state explicitly: avoid optional chaining chains that hide real null issues; prefer early returns.

### Internationalization
- Use `useTranslation` hook and locale keys defined in `src/i18n/locales/*.json`.
- Add new strings to all locale files, keeping keys synchronized. Update `src/i18n/types.ts` if type definitions require adjustments.
- Avoid hardcoded copy in components; leverage translation keys with emojis where existing design uses them.

### Styling
- Co-locate CSS modules per component (already used). Add new classes to relevant `.css` file.
- Follow established theme: gradient backgrounds, expressive color palette, purposeful layout. Preserve responsive design and meaningful animations.
- Prefer CSS variables defined in existing styles when expanding color usage.

### Data & Performance
- Use memoization for derived arrays/metrics (`useMemo` in `AnalysisView`).
- Avoid recomputing expensive metrics on every render; cache results keyed by dependencies.
- For map/Leaflet integration, load scripts via `src/utils/leafletLoader.ts` to keep bundling consistent.

## 5. Testing Guidelines
- Test files: co-locate as `ComponentName.test.tsx` or `utilityName.test.ts` next to source.
- Test structure: `describe('[Name]', () => { describe('feature', () => { it('should...') }) })`.
- Mock Capacitor plugins using `src/test/mocks/` (Geolocation, Filesystem, ForegroundService, etc.).
- Mock i18n in component tests to avoid translation dependencies.
- Cover: rendering, user interactions, state changes, error states, edge cases.
- Use `vi.mock()` at top of test file for module mocking; use `vi.fn()` for function mocks.
- Run tests frequently: `npm test -- --run` for quick CI-style check.

## 6. Repository Workflow
- Branch naming: the active branch is `preview` (feature branch) tracking PRs against `main`. Follow same workflow when adding features.
- Commit messages: short imperative, focused on intent (`Add web analytics integration`).
- Avoid committing build outputs (`dist/`, Android artifacts). `.gitignore` already excludes `android/`, `ios/`, `.capacitor/`.
- Run `npm run build` before opening PRs to ensure type safety.
- Run `npm run test:run` before opening PRs to ensure tests pass.
- Use GitHub CLI (`gh`) for PR management per existing automation.

## 7. Documentation & Agent Guidance
- Update `README.md` when features or setup steps change.
- `CLAUDE.md` mirrors architecture overview; keep it current when altering high-level flows.
- No Cursor or Copilot rule files present; if introduced later, reference them here.
- When adding new automation or linting, reflect updates in both this guide and `CLAUDE.md`.

## 8. Android-Specific Notes
- After modifying Capacitor plugins or native config (`capacitor.config.ts`), run `npm run build:android` or `npx cap sync android`.
- Keep `android/` directory excluded from version control; instructions for setup and signing live in `ANDROID_SETUP.md` and `ANDROID_IMPLEMENTATION_SUMMARY.md`.
- Use `initNativeApp()` in `src/utils/nativeInit.ts` for platform bootstrapping (status bar, splash screen, network monitoring). Extend this module when introducing new native concerns.
- File picker integration relies on `@capawesome/capacitor-file-picker`; ensure proper permission handling when modifying behavior.

## 9. Workflow Tips for Agents
- Before editing, skim related files to align with stylistic patterns.
- When adding translations, update all locale JSON files and keep alphabetical ordering of keys where present.
- Verify build and tests before submitting PR. Mention status in PR description.
- Document significant feature changes in PR body under `## Summary` and `## Testing` headings (per existing PR template style).
- Be mindful of CRLF vs LF warnings on Windows; respect repo `.gitattributes` if added later.

## 10. Troubleshooting
- Build fails with missing Capacitor platforms: run `npm install`, then `npm run cap:add` if platform directory absent locally.
- Leaflet CSS missing: ensure `src/utils/leafletLoader.ts` correctly injects assets; avoid reintroducing CDN links in `index.html`.
- Internationalization issues: confirm `useTranslation` context wraps component tree via provider in `src/index.tsx`.
- Native runtime errors: reproduce via `npm run android:dev`; check Android logcat for diagnostics.
- Test failures: check mock setup in `src/test/setup.ts`; ensure `vi.mock()` declarations are at top of test file before imports.

Keep this handbook updated whenever workflows, scripts, or style conventions evolve. Agents should cross-reference `README.md`, `CLAUDE.md`, and Android docs to stay aligned with project direction.
