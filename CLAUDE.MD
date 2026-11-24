# Slidev Presentation — The Second Interface (Angular WebMCP)

## Project
Slidev deck for the talk:
"The Second Interface: Turning Your Angular App Into an AI Tool with WebMCP"
by Giorgio Galassi. Intermediate–advanced, 40-min slot (25-min cut defined in the vault notes).

## Source of truth
- Abstract, positioning, demo tiers, open items: `~/second-brain/drafts/pieces/2026-06-15-angular-webmcp/talk/`
- Source article: `~/second-brain/published/pieces/2026-06-15-angular-webmcp/medium/article.md`
- Vault status: `~/second-brain/projects/talk-webmcp/status.md`

## Positioning (do not drift)
Lead with the direction of flow: the agent calls *into* the app, the app exposes itself as a tool.
This is the opposite of agent-generates-UI talks. Security/trust stays a brief aside.

## Demo app
`demo/` is a standalone Angular 22.3.0 CLI app (own package.json, `cd demo && npm start`). Keep the Angular version exact; don't bump it without updating IMPLEMENTATION-PLAN.md.

## Stack
- Slidev, Vue 3, UnoCSS, Shiki

## Conventions
- All slide content lives in `slides.md`; do not split across files unless asked
- Speaker notes go in `<!-- -->` blocks at the bottom of each slide
- `slides.md` is currently a SKELETON (section dividers + notes). Slide text is Giorgio's to write
- `IMPLEMENTATION-PLAN.md` is the living build doc (demo app, tiers, risks, changelog). Update it when a demo/scope decision changes

## Rules
- Never modify slide text or speaker notes unless explicitly asked
- Always preserve the `---` slide separators exactly
- If a layout change breaks a slide visually, report it before applying

## Commands
- `npm run dev` · `npm run build` · `npm run export` · `npm run export-dark`
