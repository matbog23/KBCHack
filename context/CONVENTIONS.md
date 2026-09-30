# Code conventions

Mirrors [biome.json](../biome.json) and [tsconfig.json](../tsconfig.json). When this doc and
the tooling disagree, the tooling wins. Fix the doc.

> **Org source of truth (humans only):** [(WIP) Dashdot 2026 — How we build
> applications](https://app.notion.com/p/dashdotdigital/WIP-Dashdot-2026-How-we-build-applications-36ca55a5366480a1a5c6d02159c1b73b).
> This repo is a hackathon prototype and follows a lighter subset, documented here.
> Agents: don't fetch Notion. Work from the repo docs.

## Naming

Follow the existing `src/` code. Use one casing per kind and never mix casings within a name.

| Kind | Convention | Example |
|------|-----------|---------|
| Folders | lowercase | `engine/`, `emulator/`, `components/ui/` |
| React component files | PascalCase, matching the component | `KateSheet.tsx`, `TransactionComposer.tsx` |
| Hook / store files | camelCase with a `use` prefix | `useKbcStore.ts` |
| Other modules | camelCase | `kateEngine.ts`, `format.ts`, `psd2.ts` |
| shadcn/ui primitives | kebab-case, as generated | `components/ui/button.tsx` |
| Interfaces & types | PascalCase, **no** `I`/`T` prefix | `PSD2Transaction`, `KateAlert`, `KateRuleId` |
| Functions & variables | camelCase | `evaluateKateRules`, `formatEuroRounded` |
| Module-level constants | SCREAMING_SNAKE_CASE | `KATE_THRESHOLDS`, `DEMO_ANCHOR_DATE`, `MCC` |
| Env vars | SCREAMING_SNAKE_CASE (none used yet) | |

- Domain terms keep their banking names: `creditorName`,
  `remittanceInformationUnstructured`, `merchantCategoryCode`, `bookingDate`. Don't rename
  Berlin Group fields.
- Belgian product names keep their Dutch spelling in ids and copy (`pamperrekening`,
  `successieplanning`).

## Exports

**Named exports only.** Default exports drift into different names, break IDE
rename/auto-import, and don't forward through barrel re-exports.

The only exceptions are files the framework *requires* to default-export:

- Next.js special files: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`,
  `global-error.tsx`, `not-found.tsx`, `template.tsx`, `default.tsx`
- Tool configs: `next.config.ts`, `vitest.config.ts`, `tailwind.config.ts`,
  `postcss.config.mjs`

Everything else (components, hooks, the store, the engine, `lib/`, `config/`) uses named
exports.

## TypeScript

- `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` and `isolatedModules` are
  all on. `npm run typecheck` must pass.
- Import types with `import type` / inline `type` specifiers. Biome's `useImportType`
  enforces this.
- No `any` (`noExplicitAny: error`) and no non-null assertions (`noNonNullAssertion: error`).
  Narrow with guards instead, e.g. `(alert): alert is KateAlert => alert !== null`.
- Prefer `readonly` arrays for inputs (`readonly PSD2Transaction[]`) and `as const` for
  lookup tables.
- Use unions over enums (`KateRuleId`, `BookingStatus`) and `(string & {})` to keep
  autocomplete on open-ended string types.
- Import from `src/` through `@/…`, not relative paths across folders.

## Formatting (Biome)

- 2-space indent, **100-char lines**, LF, double quotes, semicolons, trailing commas, and
  parentheses around arrow parameters.
- Imports are organised automatically (`assist.organizeImports`).
- `noUnusedImports` / `noUnusedVariables` are errors. `useExhaustiveDependencies` is a
  warning, so treat it as a bug unless you can explain why it isn't.

```sh
npm run lint        # biome check .
npm run lint:fix    # biome check --write .
npm run format      # biome format --write .
```

## Code structure

- **Keep the engine pure.** `src/engine/` imports only from `@/types` and `@/lib`. React,
  Zustand, `config/` and wall-clock time stay out of it.
- **Keep the store thin.** Actions compute new `SimulationInputs` and call `withDerived()`.
  Business rules belong in the engine, not in store actions or components.
- **Keep config static.** Personas, seed transactions and presets are data only, with no
  logic beyond small builders like `seed()`.
- **Comments explain *why*.** Use JSDoc on exported types and fields that carry domain
  meaning (sign conventions, Berlin Group semantics). Don't narrate obvious code.

## Git

- Branch off `main`. Use short-lived branches named `feat/…`, `fix/…`, `chore/…`, `docs/…`.
- Commit messages are imperative and scoped, following Conventional Commits:
  `feat(engine): add renovation rule`, `fix(psd2): validate IBAN checksum`,
  `docs(context): describe PSD2 model`.
- One logical change per commit. Keep generated or lock-file churn in its own commit
  where practical.
- Run **`npm run verify`** (typecheck + Biome + Vitest) before every commit and PR. Don't
  commit red.
- Never commit `.env*`, real customer data, real IBANs or real transaction exports (see
  [SECURITY.md](SECURITY.md)).
- Adding a dependency or changing tool config (`biome.json`, `tsconfig.json`,
  `vitest.config.ts`, `next.config.ts`) needs explicit human approval. Say why in the PR.
