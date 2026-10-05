# ROYA design reference

Imported from the claude.ai design canvas **“ROYA — Couture Storefront”** (artifact `6DdK777jxR6JdSESLJePx8`, 68 published files).
This folder is a read-only reference. The storefront in `apps/storefront` is the implementation; when the two disagree, change the code
only after the design here is updated on purpose.

## What is here

| File pattern | What it is |
|---|---|
| `source/<Page>-v2.dc.html` | **Current design**, dark theme. Pages: Main (home), Collection, Product, Bag, Checkout, Confirmation, Account (sign in), Dashboard (private client). |
| `source/<Page>-v2-Light.dc.html` | The same page in the light theme. Light is a role-for-role inversion of dark (see `docs/design-tokens.md`); hero, signature band and closing banner stay dark via `data-theme="keep"`. |
| `source/Main-v2-AR*.dc.html` | Arabic / RTL home. |
| `source/<Page>.dc.html`, `<Page>-Light.dc.html` | V1. **Superseded by V2**, kept for history. Its intro film (`a-new-chapter`) is the only V1-only asset. |
| `source/Main-v2-*-M.dc.html` | Phone-width (390px) renders. Not copied for every page: they are the same markup with only the title and sibling links rewritten, so mobile is the responsive behaviour of the same component. |
| `source/canvas.json` | Artboard index from the canvas (titles, frame sizes). |

The `.dc.html` files use the canvas’s own `{{hole}}` / `<sc-for>` / `<sc-if>` template syntax and a `support.js` runtime that is not part of this repository. Open them as text.

## Media

All 34 published assets (13 photographs, 7 films as mp4 + webm, 7 poster frames) live in `apps/storefront/public/media/`, renamed by role.
`apps/storefront/public/media/manifest.json` maps every file back to its original blob id with sha256, dimensions and duration.

## Placeholders the design left open

The design uses bracketed placeholders for facts that were not supplied. They are **not** invented here; each is a setting or a CMS field:
`[Designer name]`, `[ATELIER ADDRESS]`, `[BANK NAME] / [IBAN]`, `[X] weeks`, `[X] days`, `[ORDER NO.]`, `[Surname]`. See `docs/OPEN-QUESTIONS.md`.
