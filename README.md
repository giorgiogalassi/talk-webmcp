# The Second Interface: Turning Your Angular App Into an AI Tool with WebMCP

A Slidev presentation by **Giorgio Galassi**, the talk version of
"Angular WebMCP — Your App is Now an AI Tool."

## Abstract

Most "agentic Angular" content points one way: the agent generates UI, your app renders it. This talk points the other way. With WebMCP, the agent calls *into* your app, and your app hands it real tools instead of a DOM to scrape.

An AI agent visiting your app today sees a DOM to guess at. It can click your buttons, but it has no idea what your app can actually do. WebMCP, a proposed standard incubated in the W3C Web Machine Learning Community Group, lets a page declare its own capabilities so WebMCP-aware agents in the browser can discover and call them directly. Angular 22 ships experimental support, backed by real services, real signals, real DI.

Starting from a working expense dashboard, we'll expose a service as a callable tool via `provideExperimentalWebMcpTools()`, executing inside its injector's context, and turn a Signal Form into a tool with a single option on `form()`, enabled app-wide by `provideExperimentalWebMcpForms()`: its JSON schema derived from the form model, its validators and submit handler wired in. We'll inspect every registered tool in Chrome DevTools' WebMCP panel, hand them to a real model against live signal state, and see why the tool description you write is part of the agent's prompt, not documentation for humans.

Your app has always had one interface: the DOM, for humans. This is the second one, for agents. Angular's half ships in v22, experimental and free to change; the browser's half is incubating in Chrome behind flags and an origin trial. You'll leave knowing how to give agents the same front door your users get: the same validators, the same services, the same rules. And why the words you write for them are code.

(Source of truth: the vault's `drafts/pieces/2026-06-15-angular-webmcp/talk/abstract.md`.)

## Format

40-minute talk · Intermediate–Advanced · live demo. A 25-minute cut drops the Signal Forms
section and the live-model tier, keeping the DevTools-panel inspection as the payoff. The run of
show and the cut markers are in the first slide's speaker notes.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3030.

Demo app, browser flags and on-stage setup: see [`demo/README.md`](demo/README.md).

## Structure

```
slides.md               — slide content and speaker notes
demo/                   — Angular 22.3.0 demo app (cd demo && npm start)
IMPLEMENTATION-PLAN.md  — living build doc: demo app, demo tiers, risks, changelog
src/                    — images used in slides
styles/                 — custom CSS
```

## Author

**Giorgio Galassi** — Senior Frontend Engineer (Freelancer) · GDG Roma Città Organizer

## License

ISC
