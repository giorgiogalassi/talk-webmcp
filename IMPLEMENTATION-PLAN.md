# Implementation Plan — The Second Interface (WebMCP)

Living build doc for the deck and its demo app. Abstract, positioning and demo-tier rationale
live in the vault (`drafts/pieces/2026-06-15-angular-webmcp/talk/`), not here.

Last updated: 2026-09-30 (demo built, forms spike done, deck drafted against the final abstract).

## Demo app

- [x] Decide: reuse the article's expense dashboard → **reused**, extended (store, totals, form)
- [x] Working dashboard, pre-built: list + category filter, per-category totals, Signal Form with
      validators, signals state in a DI `@Service()` (`demo/src/app/expenses/`, no WebMCP imports)
- [x] WebMCP as one removable provider: `provideExpenseWebMcp()` (`demo/src/app/webmcp/`). The form
      reads its `experimentalWebMcpTool` options from an optional token, so it has no WebMCP code
- [x] Service tools via `provideExperimentalWebMcpTools()`: `getVisibleExpenses`,
      `getSpendingSummary`, `filterDashboard`, `prefillExpenseForm`; `inject()` inside `execute`
- [x] Form tool via `provideExperimentalWebMcpForms()` + `form(model, schema, { experimentalWebMcpTool })`:
      `addExpense`, `consequentialHint: true`
- [x] **Spike `provideExperimentalWebMcpForms()` end to end** (findings below, pinned as tests)
- [x] Sloppy vs precise descriptions, same code: `?descriptions=sloppy`
- [x] Human-in-the-loop pattern: `prefillExpenseForm` stages, a human presses "Add expense"
- [x] Tests: 26 specs (store, human form path, every tool, the spike). `npm test`, `npm run build` green
- [x] Real Chrome: 154.0.8037.58 with `--enable-features=WebMCPTesting`, driven over CDP
      (`WebMCP.enable` / `WebMCP.invokeTool`): 5 tools registered on `document.modelContext`
      (`navigator.modelContext` absent), invocations return the expected output, the form tool reports
      the validator messages, annotations surface as `readOnly` / `consequential`
- [ ] Eyeball the DevTools Application → WebMCP panel itself with both flags on (not done headless)

## Verified API facts (Angular 22.2.0, from node_modules; re-checked on 22.3.0 on 2026-11-24)

**22.3.0 changes:** API names unchanged, still `@experimental`. Angular now ships official WebMCP types
(`third_party/webmcp-types`): `inputSchema` is optional on the tool descriptor and `document.modelContext`
is typed, so `expense.tools.ts` uses `NonNullable<…['inputSchema']>` and the test fake casts
`document`. Form tools get one more forced annotation: `debugging: false`.

- `provideExperimentalWebMcpTools(tools)` / `declareExperimentalWebMcpTool(tool, injector?)` in
  `@angular/core`, `@experimental`. `execute(args, client)` is wrapped in
  `runInInjectionContext(injector, …)`; tools unregister (AbortSignal) when the injector is destroyed.
- Global: `globalThis.document.modelContext ?? globalThis.navigator.modelContext`. Missing, or no
  `registerTool` → silently registers nothing. The spec IDL (Draft CG Report, 30 Sep 2026) is on `Document`.
- `WebMcpClient` exposes only `signal: AbortSignal`. Annotations (22.2): `readOnlyHint`,
  `untrustedContentHint`, `consequentialHint`. No user-confirmation API in Angular or the spec IDL.
- `execute` result: typings say "typically just a raw string" (the June article used the MCP
  `{ content: [...] }` wrapper; the forms integration returns that wrapper itself).
- `provideExperimentalWebMcpForms()` in `@angular/forms/signals` only provides a registration hook;
  forms opt in with `FormOptions.experimentalWebMcpTool: { name, description, annotations?: { consequentialHint } }`.
  Opt-in without the provider throws in dev mode.

## Forms schema spike (2026-09-30)

`demo/src/app/webmcp/forms-schema.spike.spec.ts` pins each finding. The schema is inferred **once**,
at registration, from the model's **runtime value** (`typeof`), in `inferSchemaFromFieldNode()`:

- string/number/boolean → `{ "type": … }` only. **No enum** (union types lost), **no min/max/pattern**,
  **no per-field descriptions**, no `format`. Only `required()` validators populate `"required"`.
- `Date` → `{ "type": "object", "properties": {}, "required": [], "additionalProperties": false }` (useless).
- `undefined` field → silently dropped from the schema.
- `null` field or empty array at init → **no tool at all**; the error is an unhandled promise rejection,
  `form()` does not throw.
- Nested arrays of objects work if the array is non-empty at init.
- Annotations forced to `readOnlyHint: false, untrustedContentHint: false` (+ `debugging: false` since 22.3); `consequentialHint` is yours.
- `execute` = `node.value.set(args)` → `submit(form)`. Args are **not** validated against the schema:
  missing fields, `"12"` for a number, extra properties all reach the model and the submit handler.
- Validator errors come back as `Form submission failed:\n<field>: <message or kind>`.
- Async: default `ignoreValidators: 'pending'` → a **pending** async validator does not block an agent
  submit. `'none'` blocks it but the agent gets an empty failure list. A resolved async error blocks and
  is reported **only if the agent resends the value already checked**: `execute()` sets the agent's args
  and submits in the same turn, so a new value restarts the async check and it is still pending at submit
  (pinned 2026-11-24: default → submitted; `'none'` → `Form submission failed:\n`). In practice only
  **sync** validator errors reach the agent.

Adaptations in the demo (documented on the slides "Shape the model for the schema" and
"The validators are the contract"): flat primitive model, ISO date **string**, amount a number in EUR
(no per-expense currency), no line items, every field `required()`, explicit number/category/date
validators with agent-readable messages, submit handler copies known fields only,
`ignoreValidators: 'none'`, categories and limits carried in the tool description.

Generated schema for the demo's `addExpense` tool:

```json
{ "type": "object",
  "properties": { "description": { "type": "string" }, "amount": { "type": "number" },
                  "category": { "type": "string" }, "date": { "type": "string" } },
  "required": ["description", "amount", "category", "date"], "additionalProperties": false }
```

## Demo tiers (build around Tier 1, fall back to it on stage)

1. **Chrome DevTools WebMCP panel.** Chrome 149+, `#enable-webmcp-testing` **and**
   `#devtools-webmcp-support`; DevTools → Application → WebMCP; invoke tools manually. No LLM
2. **Model Context Tool Inspector extension.** Real model in the loop, low setup risk
3. **Claude in Chrome.** Highest wow, newest; dry-run close to the talk date, never depend on it live

- [ ] Confirm which tiers are stable enough to commit to, well before rehearsal
- [ ] **Record the Tier 2 backup** (`webmcp-tier2.mp4`) on the pinned Chrome build
- [ ] Rehearse the sloppy-vs-precise comparison with the real model and write the **observed** calls
      into the slide notes (currently a TODO: the slides claim no specific model behaviour)

## Deck

- [x] Structure and run of show (40 min, timings + 25-min cut markers in the first slide's notes)
- [x] Opening leads with direction of flow (agent calls into the app vs agent generates UI), no names
- [x] Closing builds to the takeaway: "second user, not a second client of your backend … prompt you're
      shipping to production"
- [x] Honest status slide, HITL slide, spike slides, backup Q&A slides
- [ ] Giorgio's pass on slide wording (drafted from the abstract + notes, not yet in his voice)
- [ ] Links/QR + bio slide once the repo is public
- [ ] Re-check the platform in January 2027 (origin trial window, API names); re-run the spike spec

## Risks

- Chrome release train / Origin Trial changes between now and the talk date
- Angular WebMCP APIs are Experimental and may change outside majors (the spike spec catches forms changes)
- Topic collision with agentic-UI talks at the same event: keep the reversed-direction framing first
- The DevTools panel UI and the Inspector extension haven't been exercised by hand yet

## Changelog

- 2026-09-30 — expense dashboard + WebMCP layer built; forms-schema spike (pinned as tests);
  deck restructured to the final abstract (run of show, payoff, description-as-prompt, HITL, status).
- 2026-09-28 — project scaffolded from the talk-a2ui layout; `slides.md` skeleton from the abstract.
- 2026-11-24 — demo moved to Angular 22.3.0. Type-only fixes for the new official WebMCP types
  (`expense.tools.ts`, `testing/fake-model-context.ts`); `debugging: false` added to the two annotation
  assertions; two new spike tests pin that a new agent value makes async validators pending at submit
  (only sync errors reach the agent). 28/28 green, build green. Slide text not changed: the Q&A slide
  ("A resolved error blocks the submit and is reported") and the 22.2 annotation slide need Giorgio's update.
