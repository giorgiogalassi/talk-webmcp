---
theme: default
title: "The Second Interface"
author: Giorgio Galassi
highlighter: shiki
lineNumbers: false
drawings:
  persist: false
transition: slide-left
mdc: true
fonts:
  sans: Roboto
  mono: Roboto Mono
---

# The Second Interface

## Turning Your Angular App Into an AI Tool with WebMCP

Giorgio Galassi

<!--
Speaker notes:
Let the title sit. No preamble.
40-minute extended slot, Intermediate–Advanced. Everything on screen is pinned to Angular 22.2.0;
the demo app in demo/ runs on exactly that version.

RUN OF SHOW (40 min)                | 25-min cut
00:00  Cold open + direction of flow | keep
04:00  WebMCP in one slide           | keep
05:30  The app (live)                | keep
07:00  A service as a tool           | keep
14:00  Inspect: DevTools panel       | keep  ← the 25-min payoff
17:00  A form as a tool              | CUT (-6)
23:00  A real model (Tier 2)         | CUT (-5)
28:00  The description is a prompt   | keep, static slides only (-2)
33:00  "What stops the agent…?"      | keep, 2 min
36:00  Honest status                 | keep
37:30  Takeaway + close              | keep
40:00  Q&A (backup slides)

Before walking on (demo/README.md → "On stage"): pinned Chrome 149+ build, fresh profile, BOTH flags on
(#enable-webmcp-testing AND #devtools-webmcp-support), `npm start` in demo/, tab 1 on
http://localhost:4200/, tab 2 on http://localhost:4200/?descriptions=sloppy, DevTools docked on
Application → WebMCP, Model Context Tool Inspector extension pinned, Tier 2 backup video on the desktop.
-->

---

# An agent visiting your app sees a DOM to guess at

It can click your buttons.

It has no idea what your app can actually *do*.

<!--
Speaker notes:
~2 minutes with the next slide. Cold open, no bio (it's on the last slide).
Paint it: an agent in the browser, looking at the expense app. It reads text, finds a button
labelled "Add expense", guesses which input is the amount, hopes the date picker behaves.
Every selector it relies on is one refactor away from breaking. It's a second user with no
manual, working through the interface we built for the first one.
-->

---

# Most "agentic Angular" points one way

<div class="grid grid-cols-2 gap-8 mt-8">
<div>

### Agent → UI

The agent **generates UI**.<br>
Your app **renders** what it sends.

<p class="text-sm opacity-70">The app is a canvas for the agent.</p>

</div>
<div>

### Agent → **into** the app <span class="accent">(this talk)</span>

The agent **calls your app**.<br>
Your app **hands it real tools**.

<p class="text-sm opacity-70">The app is a capability for the agent.</p>

</div>
</div>

<div class="callout mt-8">Same buzzwords, opposite direction of flow. <span class="accent">Today the agent is the caller and your app is the callee.</span></div>

<!--
Speaker notes:
Lead with this. It's the frame for the whole talk, not a footnote.
Don't name other talks or speakers, and don't dismiss the other direction: both are real,
they answer different questions. Agent-generates-UI asks "how does an agent show me things?".
This talk asks "how does an agent use the app I already have, the way my users do?".
-->

---

# WebMCP in one slide

```ts
document.modelContext.registerTool({
  name: 'getVisibleExpenses',
  description: 'Returns the expenses currently listed in the dashboard…',
  inputSchema: { type: 'object', properties: { /* JSON Schema */ } },
  execute: async (args) => '…result for the agent…',
});
```

- A **proposed** standard, incubated in the **W3C Web Machine Learning Community Group**
- The page declares tools; WebMCP-aware agents **in the browser** discover and call them
- Chrome: **behind flags and an origin trial**. Angular 22: **experimental** support

<!--
Speaker notes:
~1.5 minutes. Keep "proposed" and "Community Group" together: it's a Draft Community Group Report,
not a W3C standard.
The spec IDL puts modelContext on `document` (partial interface Document, Draft CG Report dated
30 September 2026). Earlier drafts and articles, including my June one, used `navigator.modelContext`.
Angular 22.2 checks both: `globalThis.document.modelContext ?? globalThis.navigator.modelContext`
(@angular/core, declareExperimentalWebMcpTool). If neither exists it silently registers nothing.
No backend involved: tools run in the page, in the user's session.
-->

---

# The app: a working expense dashboard

- `ExpenseStore`: signals + `computed` totals, a DI-scoped `@Service()`
- A **Signal Form** to add an expense, with validators and one submit handler
- Zero AI anywhere

<div class="callout">Everything that follows is <span class="accent">one provider</span> on top of this app. Remove it and the app is unchanged.</div>

<!--
Speaker notes:
~1.5 minutes. SWITCH TO THE BROWSER (tab 1). Show the app working for a human: filter by
Transport, add "Coffee, 4.50, Meals", then try amount 7200 → "needs manager approval".
This is the app the agent is going to use, rules included.
Don't show code yet. The point: nothing here was built for agents.
Code: demo/src/app/expenses/ (domain + UI) vs demo/src/app/webmcp/ (the agent layer).
-->

---
layout: section
---

# A service as a tool

<!--
~7 minutes for this section.
-->

---

# One provider, real services

```ts {all|3|10|11-12|14-15}
// simplified from demo/src/app/webmcp/expense.tools.ts
export const appConfig: ApplicationConfig = {
  providers: [provideExperimentalWebMcpTools([{
    name: 'getVisibleExpenses',
    description: `Returns the expenses currently listed in the user's dashboard…`,
    inputSchema: {
      type: 'object',
      properties: { category: { type: 'string', enum: CATEGORIES } },
    },
    annotations: { readOnlyHint: true },
    execute: ({ category }) => {
      const store = inject(ExpenseStore);           // ← yes, inject()

      const rows = store.visible().filter(/* category */);
      return JSON.stringify(rows);                   // "typically just a raw string"
    },
  }])],
};
```

<!--
Speaker notes:
`provideExperimentalWebMcpTools()` from @angular/core. Experimental.
Walk the highlights: the provider; the annotation (readOnlyHint, @experimental 22.2, a hint to the
agent that this tool changes nothing); inject() inside execute; the return value.
Return value: Angular's typings say the result "is typically just a raw string". My June article
wrapped it in an MCP `{ content: [{ type: 'text', text }] }` object; a string is what 22.2 documents.
`category` is typed from the schema (InferArgsFromInputSchema), so the enum becomes a union.
-->

---

# `execute` runs in the injector's context

```ts
// @angular/core 22.2.0: declareExperimentalWebMcpTool(), trimmed
const wrappedTool = {
  ...tool,
  execute: (args, client) =>
    runInInjectionContext(currentInjector, () => tool.execute(args, { ...client, signal })),
};
destroyRef.onDestroy(() => abortCtrl.abort());          // unregisters with the injector
await modelContext.registerTool(wrappedTool, { signal: abortCtrl.signal });
```

- The agent gets the **same `ExpenseStore` instance** the UI renders from. No copy, no API
- Tools live and die with their injector: route providers → route-scoped tools
- `client.signal` aborts when the agent cancels **or** the injector is destroyed

<!--
Speaker notes:
This is the source, lightly trimmed, not a paraphrase. It's the design argument of the talk in a few
lines: the agent's call goes through your DI graph, so it gets whatever the current user's app has:
the same store, the same auth service, the same scoping.
provideExperimentalWebMcpTools = an environment initializer calling declareExperimentalWebMcpTool
for each tool. Put it in a lazy route's providers and the tools exist only while that route's
injector does.
-->

---

# Read tools, write tools

| Tool | Does | Annotation |
|---|---|---|
| `getVisibleExpenses` | reads `store.visible()` | `readOnlyHint` |
| `getSpendingSummary` | reads the `computed` totals | `readOnlyHint` |
| `filterDashboard` | writes `store.filter`, **the signal the buttons write** | none |

<div class="callout">The agent doesn't get a parallel API. <span class="accent">It gets the same state and the same actions a human has.</span></div>

<!--
Speaker notes:
filterDashboard is the moment the room gets it: the agent sets the same signal the filter buttons set,
so the UI updates itself. No special "agent mode".
Derived tools (getSpendingSummary) are cheaper for the agent than handing it a raw list to add up.
-->

---
layout: section
---

# Inspect: the DevTools WebMCP panel

<!--
~3 minutes. Tier 1: no LLM, fully deterministic. The guaranteed payoff, and the payoff of the
25-minute version.
-->

---

# Every registered tool, callable by hand

- Chrome **149+**, enable **both** flags:<br>
  `chrome://flags/#enable-webmcp-testing` · `chrome://flags/#devtools-webmcp-support`
- DevTools → **Application → WebMCP**: tools, schemas, invocation log
- Invoke `getVisibleExpenses({ "category": "transport" })` → JSON from **live** signal state
- Invoke `filterDashboard({ "category": "meals" })` → **the UI changes**

<!--
Speaker notes:
SWITCH TO THE BROWSER. DevTools is already docked on Application → WebMCP.
1. Show the tool list: five tools (four service tools + addExpense from the form).
2. Invoke getVisibleExpenses with {"category":"transport"}: deterministic JSON.
3. Add an expense by hand in the form, invoke again: it's there. Live state, not a snapshot.
4. Invoke filterDashboard {"category":"meals"}: the table filters itself, and the dark "Agent calls"
   box bottom-right logs it (that box is the demo's WebMCP layer, not Chrome).
Only the first flag on = tools register but the panel doesn't show. Test on a fresh profile.
Console fallback: `await document.modelContext.getTools()` in the DevTools console (Chrome 154).
25-MIN VERSION: from here jump to "The description is part of the prompt".
-->

---
layout: section
---

# A form as a tool

<!--
~6 minutes. CUT IN THE 25-MIN VERSION.
-->

---

# One switch app-wide, one option per form

```ts {all|2|6|7-11}
// app.config.ts
provideExperimentalWebMcpForms(),        // @angular/forms/signals: exposes nothing by itself

// expense-form.ts
expenseForm = form(this.draft, expenseDraftSchema, {
  submission: { action: async (f) => { this.store.add(f().value()); } },
  experimentalWebMcpTool: {
    name: 'addExpense',
    description: `Adds an expense to the user's dashboard and saves it immediately…`,
    annotations: { consequentialHint: true },
  },
});
```

- The JSON schema is **derived from the form model**
- `execute` = set the form value → run **your validators** → call **your submit handler**

<!--
Speaker notes:
Per-form opt-in: `experimentalWebMcpTool` is a FormOptions property, third argument of form().
Without provideExperimentalWebMcpForms(), dev mode throws "Cannot register form … as a WebMCP tool".
The form tool lives with the component's injector: destroy the component, the tool unregisters.
In the demo the options come from an optional injection token so the form component has no WebMCP
import; on the slide it's inline for readability.
What execute really does (@angular/forms/signals): node.value.set(args); await submit(form); then
"Form submitted successfully." or "Form submission failed:" + one line per error.
SWITCH TO THE BROWSER: invoke addExpense from the DevTools panel with a valid payload, watch the row
appear and the form reset. Then with amount 7200 and category "tickets" (next slides).
-->

---

# What the agent actually gets

```json
{
  "type": "object",
  "properties": {
    "description": { "type": "string" },
    "amount":      { "type": "number" },
    "category":    { "type": "string" },
    "date":        { "type": "string" }
  },
  "required": ["description", "amount", "category", "date"],
  "additionalProperties": false
}
```

Types come from the model's **runtime values**. `required()` → `"required"`. **Nothing else**:
no enum, no `min`/`max`, no per-field descriptions, no date format.

<!--
Speaker notes:
The exact schema the demo registers (pinned in demo/src/app/webmcp/expense-webmcp.spec.ts).
The category union type, min/max, the date pattern: none of it reaches the agent through the schema.
The agent learns them from the description (later section) or by failing.
-->

---

# Shape the model for the schema

| In the model | The agent sees |
|---|---|
| `date: new Date()` | `{ "type": "object", "properties": {} }` |
| `note: undefined` | the field **disappears** |
| `note: null`, `items: []` | **no tool at all** (unhandled promise rejection) |
| `items: [{ label: '', amount: 0 }]` | `array` of `object`: works |
| async validator still pending | submission **goes through** (default) |

<div class="callout">So the demo model is flat and primitive: ISO date <b>string</b>, amount a <b>number</b> in EUR, no nulls, <code>ignoreValidators: 'none'</code>.</div>

<!--
Speaker notes:
Each row is a test in demo/src/app/webmcp/forms-schema.spike.spec.ts, against 22.2.0.
The inference runs once, at registration: an array that's empty at init never becomes a tool,
and the failure is an unhandled rejection in the console, not an exception from form().
Async: submit() defaults to ignoreValidators 'pending', so a pending async validator doesn't block.
With 'none' it blocks, but the agent gets "Form submission failed:" with no reason.
It's experimental: re-run the spike on every Angular update.
-->

---

# The validators are the contract

```text
addExpense({ description: "Conference ticket", amount: 7200,
             category: "tickets", date: "2999-01-01" })

Form submission failed:
amount: Amounts above 5000 EUR need manager approval and cannot be added here.
category: Category must be one of: accommodation, transport, meals, equipment.
date: Expenses cannot be dated in the future.
```

- Angular does **not** check the agent's args against the schema: `"12"` for a number, missing or extra fields all reach the form
- Your validators are the only gate: the **same one humans go through**
- Every validator `message` is text the agent reads. No message → it gets `min`

<!--
Speaker notes:
Real output from the demo. The business rule (5000 EUR cap) holds for the agent exactly as for
a human, because it's the same validator.
Angular's docs say it too: "Consider explicitly validating arguments to the execute function".
The demo adds a "must be a JSON number" validator for exactly this reason, and the submit handler
copies known fields only, so an `approvedByManager: true` from the agent is dropped.
-->

---
layout: section
---

# Hand it to a real model

<!--
~5 minutes. CUT IN THE 25-MIN VERSION. Tier 2 live, with a pre-recorded fallback.
-->

---

# Same tools, a real model, live state

Google's **Model Context Tool Inspector** extension lists the page's tools and runs them through a real model.

1. *"How much did I spend on getting around?"*
2. *"Show me only meals."*
3. *"I had an 18 euro lunch today. Put it in, but let me check it first."*

<!--
Speaker notes:
SWITCH TO THE BROWSER, open the Inspector extension (pinned, already configured).
1 → expect getSpendingSummary or getVisibleExpenses({category:"transport"}). "getting around" →
    transport comes from the description, not the schema.
2 → filterDashboard({category:"meals"}): the UI changes on screen, the Agent calls box logs it.
3 → should pick prefillExpenseForm, not addExpense: the form fills in, nothing is saved,
    I press "Add expense" myself.
The room should see natural language resolve to calls against live signal state.

BACKUP (rehearsed): if the extension, the network or the model misbehaves, say so in one line and play
the pre-recorded Tier 2 run (desktop: webmcp-tier2.mp4), then go back to the DevTools panel for
anything live. Never debug on stage.
Tier 3 (optional, only if it worked on the pinned Chrome build the week of the talk): the same three
prompts in Claude in Chrome. Don't depend on it.
-->

---
layout: section
---

# The description is part of the prompt

<!--
~5 minutes (3 in the 25-min version: static slides only, skip the live comparison).
-->

---

# Same code. Different words.

<div class="grid grid-cols-2 gap-6">
<div>

### Sloppy

```ts
description: 'Gets expenses.',
inputSchema: {
  properties: {
    category: { type: 'string' },
  },
},
```

</div>
<div>

### Precise

```ts
description:
  `Returns the expenses currently listed in the
   user's dashboard as JSON (… amount in EUR …).
   Respects the on-screen filter. Read-only.
   Categories: transport (trains, taxis,
   flights, fuel), meals (restaurants, …) …`,
inputSchema: {
  properties: {
    category: { type: 'string', enum: CATEGORIES,
      description: 'Optional. Only return …' },
  },
},
```

</div>
</div>

<!--
Speaker notes:
Both variants live in demo/src/app/webmcp/tool-descriptions.ts, same execute code behind them.
?descriptions=sloppy in the URL swaps them in (tab 2).
Name, description and schema aren't documentation for humans: they go into the model's context and
steer which tool it picks and which arguments it invents. With "Gets expenses." and a bare string,
"getting around" has nowhere to land: the model has to guess a category name.
LIVE (40-min only): prompt 1 again, in tab 2, with the Inspector.
TODO before the talk: record what the pinned model actually does with each variant in rehearsal and
write the observed calls here. Don't claim a specific failure on stage that you haven't seen.
Always true, deterministic: open both tabs' WebMCP panels and compare what the agent receives.
-->

---

# Everything the agent reads is a prompt

- **Tool names and descriptions**: when to use it, and when *not* to (`prefill` vs `add`)
- **Parameter descriptions and enums**: the vocabulary it's allowed to use
- **Validator messages**: what it reads back when it's wrong, so make them fixable
- **Errors from `execute`**: `unknown category "travel". Use one of: …` beats `[]`

<div class="callout">Review them like code. <span class="accent">You're shipping them to production.</span></div>

<!--
Speaker notes:
The form tool's schema carries no enum and no ranges (form section), so its description has to:
the addExpense description lists the categories, the currency, the 5000 cap and the date format.
The flip side, briefly (not a security talk): anything that enters the model's context steers it,
including text your tools return. Don't echo unsanitised user content from execute, and set
`untrustedContentHint` when a tool returns content you didn't author.
-->

---

# "What stops the agent submitting an expense I didn't want?"

- **The spec**: no confirmation API. Annotations are **hints**: `readOnlyHint`, `consequentialHint`, `untrustedContentHint`
- **Angular 22.2**: passes the hints through; `execute`'s client exposes only an `AbortSignal`. Form tools are always `readOnlyHint: false`, `consequentialHint` is yours to set
- **You**: design for it
  - **stage, don't commit**: `prefillExpenseForm` fills the form, a human presses *Add*
  - business rules live in validators (the 5000 EUR cap)
  - only expose actions you'd accept being triggered for a logged-in user

<!--
Speaker notes:
~3 minutes (2 in the 25-min version). Checked against the spec IDL (Draft CG Report, 30 Sep 2026:
registerTool(tool, { exposedTo, signal }), ToolAnnotations) and Angular's .d.ts: neither has a
requestUserInteraction-style hook today. Whether an agent asks the user before a consequential call is
up to the agent or browser, and a hint is not a guarantee.
So human-in-the-loop is on the developer: the demo exposes both a staging tool and a committing tool,
and the descriptions tell the model when to prefer staging. Agents inherit the user's session,
so a write tool is a real write with the user's permissions.
-->

---

# Honest status

- **Angular**: `provideExperimentalWebMcpTools()` and `provideExperimentalWebMcpForms()` are **Experimental**, and may change *even outside major versions*
- **Browser**: incubating in Chrome **behind flags and an origin trial**
- **Standard**: a proposal in a W3C **Community Group**, not a W3C Recommendation
- Angular registers on `document.modelContext ?? navigator.modelContext`

<!--
Speaker notes:
~1.5 minutes. Say it plainly, it earns trust.
RECHECK IN JANUARY 2027: origin trial window (Chrome 149–156; third-party reports of token expiry
2026-11-17), whether it shipped or changed, and the Angular API names. The spike spec fails loudly if
the forms behaviour changes.
-->

---
layout: center
---

# Agents are a **second user** of your app,<br>not a second client of your backend.

<div class="mt-8">

Give them the same front door humans get:<br>
the same **validators**, the same **DI-scoped services**, the same **state**.

</div>

<div class="callout mt-8">Then treat every tool description as a <span class="accent">prompt you're shipping to production.</span></div>

<!--
Speaker notes:
~1.5 minutes. This is the sentence the whole talk was building. Slow down.
Tie it back: execute runs in the injector (same services), the form tool runs your validators and your
submit handler (same rules), the tools read and write the signals the UI renders (same state), and the
words you wrote are what the model reasons with.
The question to leave them with: which capabilities should my app offer an agent, and under which rules?
-->

---
layout: center
---

# The second interface

Your app has always had one interface: the DOM, for humans.<br>
This is the second one, for agents.

<!--
Speaker notes:
Close. Thank the room, open for questions. Backup slides follow, only if asked.
TODO: links/QR + bio slide (repo, article), like the other decks, once the repo is public.
-->

---
layout: section
---

# Backup

<!--
Q&A only.
-->

---

# Q&A · "Why not an MCP server on my backend?"

- A backend MCP server is a **second client of your backend**: new auth, new API, rules re-implemented
- WebMCP tools run **in the user's page**: their session, your DI graph, your validators, the state they're looking at
- Not either/or: server MCP for headless automation, WebMCP for "use the app I have open"

<!--
Speaker notes:
This is the takeaway, argued. The agent here is a user sitting in front of the app, so it should go
through the same front door.
-->

---

# Q&A · "Can I take it out again?"

```ts
// app.config.ts
providers: [
  provideBrowserGlobalErrorListeners(),
  provideExpenseWebMcp(descriptionModeFromUrl()),   // ← delete this line
],
```

The store, the form and the validators don't import anything from WebMCP.

<!--
Speaker notes:
In the demo the form reads its experimentalWebMcpTool options from an optional injection token that
provideExpenseWebMcp() provides, so the form component has no WebMCP code. Delete one line and it's a
plain Angular app again (the "Agent calls" box in app.html goes with it).
-->

---

# Q&A · "Nested line items? Async validators?"

- Arrays of objects work **if non-empty at init**: `items: [{ label: '', amount: 0 }]`
- The schema is inferred **once**, at registration; later model changes don't update it
- Async validators run, and a **resolved** error blocks the submit and is reported
- A **pending** one doesn't block by default: `submission: { ignoreValidators: 'none' }`

<!--
Speaker notes:
All pinned in demo/src/app/webmcp/forms-schema.spike.spec.ts.
-->
