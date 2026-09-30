# Demo: expense dashboard + WebMCP

Angular 22.2.0 demo for "The Second Interface". A working expense dashboard (signals store, Signal
Form with validators) plus a thin, removable WebMCP layer that exposes it to in-browser agents.

```bash
npm install
npm start        # http://localhost:4200
npm test         # vitest via ng test (26 specs, incl. the forms-schema spike)
npm run build
```

## Layout

```
src/app/expenses/   domain + UI, no WebMCP imports (reusable as-is, e.g. for an A2UI demo)
  expense.model.ts      Expense, categories, currency, business limits
  expense.store.ts      ExpenseStore: @Service(), signals + computed totals, add/remove/filter
  expense-draft.ts      ExpenseDraft form model, validation schema, ExpenseDraftState
  expense-form.ts       Signal Form; opts in as an agent tool only if EXPENSE_FORM_AGENT_TOOL is provided
  expense-list.ts, expense-summary.ts
src/app/webmcp/     the agent layer
  provide-expense-webmcp.ts  provideExpenseWebMcp(): the ONE provider to add/remove
  expense.tools.ts           service tools (provideExperimentalWebMcpTools)
  tool-descriptions.ts       precise vs sloppy descriptions (same code behind both)
  agent-activity.ts          on-screen "Agent calls" log (demo aid)
  forms-schema.spike.spec.ts pins what provideExperimentalWebMcpForms() generates
  expense-webmcp.spec.ts     end-to-end tests of every tool against a fake document.modelContext
src/testing/fake-model-context.ts   test double for document.modelContext
```

Remove the agent layer: delete `provideExpenseWebMcp(...)` from `app.config.ts` and
`<app-agent-activity />` from `app.html`.

## Tools registered

| Tool | Source | Kind |
|---|---|---|
| `getVisibleExpenses` | `provideExperimentalWebMcpTools` | read (`readOnlyHint`) |
| `getSpendingSummary` | `provideExperimentalWebMcpTools` | read (`readOnlyHint`) |
| `filterDashboard` | `provideExperimentalWebMcpTools` | writes the on-screen filter signal |
| `prefillExpenseForm` | `provideExperimentalWebMcpTools` | stages a draft in the form, saves nothing (human in the loop) |
| `addExpense` | Signal Form + `provideExperimentalWebMcpForms` | validates + submits (`consequentialHint`) |

`?descriptions=sloppy` swaps in deliberately vague descriptions and drops the enums, for the
"description is part of the prompt" comparison.

Angular registers tools on `document.modelContext ?? navigator.modelContext` and silently does
nothing if neither exists, so in a browser without WebMCP the app is just the dashboard.

## Browser setup

### Tier 1: Chrome DevTools WebMCP panel (guaranteed, no LLM)

1. Chrome **149+**. Use a fresh profile for rehearsal.
2. Enable **both** flags, then relaunch:
   - `chrome://flags/#enable-webmcp-testing` (registers tools; no origin-trial token needed on localhost)
   - `chrome://flags/#devtools-webmcp-support` (without it the panel doesn't appear)
3. `npm start`, open http://localhost:4200, DevTools → **Application → WebMCP**.
4. You should see 5 tools. Invoke e.g. `getVisibleExpenses` with `{"category":"transport"}`, or
   `filterDashboard` with `{"category":"meals"}` and watch the table change.
5. Console fallback: `await document.modelContext.getTools()` (Chrome 154 also exposes
   `executeTool()` there).

Verified 2026-09-30 on Chrome 154.0.8037.58 launched with `--enable-features=WebMCPTesting`
(the command-line equivalent of the first flag): all 5 tools register on `document.modelContext`
(`navigator.modelContext` is absent), and invoking them over the DevTools protocol (`WebMCP.enable`,
`WebMCP.invokeTool`, the same domain the panel uses) returns the expected results. The panel UI
itself hasn't been eyeballed yet: check it with both flags on.

### Tier 2: Model Context Tool Inspector (real model)

Install Google's "Model Context Tool Inspector" Chrome extension on the same profile, open it on
the demo tab, and try:

- "How much did I spend on getting around?"
- "Show me only meals."
- "I had an 18 euro lunch today. Put it in, but let me check it first." (should use `prefillExpenseForm`)

Record a full run on the pinned Chrome build as the on-stage backup (`webmcp-tier2.mp4`).

### Tier 3: Claude in Chrome (optional)

Same prompts. Dry-run the week of the talk; never depend on it live.

## On stage

- Pinned Chrome build, fresh profile, both flags on, extension pinned
- `npm start`; tab 1 `http://localhost:4200/`, tab 2 `http://localhost:4200/?descriptions=sloppy`
- DevTools docked on Application → WebMCP in tab 1
- Tier 2 backup video on the desktop
