# React — app patterns

> Version: react@^19.3 | Last checked: 2026-09-30
>
> This file documents only how **this app** uses React 19, not React itself.

---

## App rules

1. **`"use client"` only for interactivity.** Store readers, sliders, buttons and animations
   need it. `page.tsx` / `layout.tsx` and pure presentational wrappers (`PhoneFrame`,
   `MobileApp`) stay Server-compatible.
2. **State ladder:** `useState` for local UI glue (a hover or an open accordion) → the
   **Zustand store** for anything shared between panes or anything that affects the
   simulation. There's no server state, no URL state and no Context-based state here.
3. **Components render and don't decide.** Business logic lives in `src/engine/` and
   derivation lives in the store. A component that computes whether an alert should show
   is a bug. Read `activeAlerts` instead.
4. **No React Compiler** is configured. Don't sprinkle `useMemo` / `useCallback` / `memo()`
   by default. Add them only for a measured problem. Derived data already comes precomputed
   from the store.
5. **Refs are plain props in React 19.** New components take `ref` as a prop, with no
   `forwardRef`. (The shadcn primitives in `components/ui/` are generated and may still use
   it. Leave them as they are.)
6. **Accessibility:** use landmarks with `aria-label` (as the panes do), `aria-hidden` on
   decorative icons, and real `<button>` elements for actions. The Kate slide-down must be
   dismissible with a keyboard.

---

## Canonical: store-driven Client Component

```tsx
"use client";
import { useKbcStore } from "@/store/useKbcStore";

export function KateInsightList() {
  const activeAlerts = useKbcStore((state) => state.activeAlerts);
  const dismissAlert = useKbcStore((state) => state.dismissAlert);

  if (activeAlerts.length === 0) return null;
  return (
    <ul>
      {activeAlerts.map((alert) => (
        <li key={alert.id}>
          {alert.title}
          <button type="button" onClick={() => dismissAlert(alert.id)}>
            Dismiss
          </button>
        </li>
      ))}
    </ul>
  );
}
```

---

## Gotchas LLMs get wrong in this repo

- **Key by stable ids:** `transaction.transactionId` and `alert.id`. Never use the array
  index. The lists reorder when you inject transactions or jump in time.
- **Don't mirror store state in `useState` + `useEffect`.** Read it with a selector. Copying
  it causes stale UI after a persona switch.
- **Animations keyed on `alert.id`** re-run only for new alerts. Key them on something else
  and the slide-down replays on every store update.
- **Context is rendered as `<Context value={…}>`** (no `.Provider`) in React 19, if you ever
  need it.
- **`useOptimistic` / `useActionState`** have no use here, because there are no async
  mutations.

---

## Anti-patterns

```tsx
// WRONG: business rule in a component
const showPamper = transactions.some((t) => t.merchantCategoryCode === "8011");

// WRONG: hooks in a Server Component
export default function Home() {
  const persona = useKbcStore((s) => s.activePersona); // throws / breaks SSR boundary
}

// WRONG: syncing store into local state
const [alerts, setAlerts] = useState([]);
useEffect(() => setAlerts(useKbcStore.getState().activeAlerts), []);

// WRONG: index keys on reorderable lists
{transactions.map((t, i) => <Row key={i} {...t} />)}
```
