# Next.js — app patterns

> Version: next@^15.5 (App Router) | Last checked: 2026-09-30
>
> This file documents only how **this app** uses Next, not Next itself. For API questions,
> read the official docs for **v15**. Many LLM snippets assume v14 or v16.

---

## App rules

1. **Server Components by default.** `app/layout.tsx` stays a Server Component.
   `app/page.tsx` is a Client Component because the header's Reset button reads the store.
   Add `"use client"` only to components that read `useKbcStore` or use hooks/events.
2. **There's no data fetching.** Everything comes from the in-memory Zustand store. Don't add
   API routes, Server Actions, `fetch`, or `'use cache'` for transaction data (see
   [SECURITY.md](../SECURITY.md)).
3. **One page.** The whole demo is the three-column `app/page.tsx` (composer, reasoning,
   phone). In-app product flows are overlays inside the phone, not routes. Add routes only
   if a feature truly needs its own URL.
4. **Design tokens only** in `className`: `bg-kbc-blue`, `text-kbc-navy`, `border-kbc-line`,
   `bg-primary`. Never raw hex values or `bg-blue-500`.
5. **Default exports only where Next requires them** (special files). Everything else uses
   named exports ([CONVENTIONS.md](../CONVENTIONS.md#exports)).

---

## Canonical: page shell → store-driven columns

```tsx
// src/app/page.tsx
"use client";
import { KateReasoning } from "@/components/emulator/KateReasoning";
import { TransactionComposer } from "@/components/emulator/TransactionComposer";
import { KbcHomeScreen } from "@/components/phone/KbcHomeScreen";
import { useKbcStore } from "@/store/useKbcStore";

export default function Home() {
  const resetSimulation = useKbcStore((state) => state.resetSimulation);
  return (
    <main>
      {/* header with a Reset button calling resetSimulation */}
      <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)_auto]">
        <section aria-label="Transaction input"><TransactionComposer /></section>
        <section aria-label="Kate's reasoning"><KateReasoning /></section>
        <section aria-label="KBC Mobile preview"><KbcHomeScreen /></section>
      </div>
    </main>
  );
}
```

---

## Gotchas LLMs get wrong in this repo

- **Hydration:** the store is initialised at module load and rendered on the server. Keep
  first-render output deterministic. Never use `Date.now()`, `new Date()` without an
  argument, `Math.random()` or `toLocaleString()` without an explicit locale and time zone in
  render or `derive()`. Use `src/lib/format.ts` (`nl-BE`, `Europe/Brussels`).
- **`params` / `searchParams` are `Promise<…>`** in Next 15. Always `await` them if you
  ever add a dynamic route.
- **`next dev --turbopack`** is configured, and `next build` uses webpack. Don't add
  `--turbopack` to `build`.
- **Middleware is still `middleware.ts` in Next 15** (the `proxy.ts` rename is Next 16). The
  app doesn't use it.
- **No React Compiler** is configured (`next.config.ts` has no `reactCompiler`). See
  [react.md](./react.md) for memoisation guidance.
- **`redirect()` throws.** Never wrap it in try/catch.
- **`metadata` / `viewport`** are exported from `layout.tsx`, and `themeColor` lives on
  `viewport`, not `metadata`.

---

## Anti-patterns

```tsx
// WRONG: API route or Server Action carrying transaction data
export async function POST(req: Request) { /* never: data must stay client-side */ }

// WRONG: async Client Component
"use client";
export async function Panel() { /* invalid */ }

// WRONG: importing useKbcStore in a Server Component (layout.tsx)
// WRONG: bg-[#00A3E0] or bg-blue-500 (use bg-kbc-blue)
// WRONG: new Date() in render (hydration mismatch)
```
