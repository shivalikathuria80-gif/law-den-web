# Law Den — verified lawyer directory (prototype)

A private, interactive prototype of a two-sided lawyer directory:

- **Visitors** search and filter verified lawyer profiles by keyword, practice area, city, language,
  consultation fee, rating and review volume, and sort by recommended / rating / reviews / fee / experience.
- **Lawyers** submit a profile through a four-step form with credential uploads; nothing is published until review.
- **Admins** work a verification queue — submitted details, documents, a six-point checklist, and
  approve / request changes / reject with a recorded note and activity log.

Everything in the app is **fictional sample data**. No real advocate is represented or verified here.

## Premium placement, honestly

Promoted profiles appear in a separate labelled box that can be hidden in one click, and they keep the
position their ratings and reviews earn in the ranked list. Payment never changes organic ranking, the
verified badge, or any rating. Only verified profiles are eligible. No payments are connected.

## Stack

Vite + React 19 + TypeScript, hand-written CSS (light/dark), hash routing, `localStorage` persistence.
No backend: submissions and admin decisions live in the browser, which is what makes the prototype
end-to-end explorable on a static host.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run preview
```

## Layout

```
src/
  data/seed.ts        12 verified profiles, ~55 written reviews, 3 queued submissions
  lib/search.ts       filtering + the organic ranking score (paid placement is not an input)
  store.tsx           app state, verification checklist, audit log, persistence
  pages/              Directory, LawyerProfile, ForLawyers, Admin, Trust
  components/         UI primitives, lawyer card, filter panel
```

## Validating the core flows

`scripts/e2e-validate.mjs` drives the built app in Chromium and asserts the interactions that matter:
search and every filter, all five sort orders, the promoted-placement rules (a paid slot never enters
the ranking and hiding it leaves the list identical), review filtering and distribution, the four-step
submission with its validation guards, the admin passcode gate, checklist-gated approval, publication
into the directory, mobile layout with no horizontal overflow, and console hygiene.

```bash
npm run build && npm run preview &     # serves http://localhost:4173
npm i -D playwright && node scripts/e2e-validate.mjs
```

All 33 checks pass on the current build; screenshots land in `.e2e-shots/`.

## Accounts (Firebase Authentication)

The header's **Sign in** button opens a combined sign-in / create-account dialog backed by Firebase Auth
(`src/lib/firebase.ts`, `src/auth.tsx`): email + password, plus Google sign-in. Two things to know:

- **Google sign-in** needs the site's domain listed under Firebase console → Authentication → Settings →
  Authorized domains. Email/password works from any origin. The dialog says exactly this when the domain
  is not authorised rather than failing silently.
- **Sandboxed hosts** (the private artifact host, for instance) block outbound calls to Google. There the
  app falls back to a clearly-labelled local demo session so the flow stays explorable, and the account
  menu says which kind of session you are in.

The Firebase web config is a public client identifier, not a secret — protection comes from the console's
authorised domains, enabled providers, and security rules. Reviewer access is by email allowlist
(`ADMIN_EMAILS` in `src/auth.tsx`).

## Reviewer console — a separate document

`admin.html` is its own Vite entry (`src/admin-main.tsx` → `src/pages/AdminApp.tsx`) and is **not linked
from the public site** — a test asserts the public pages contain no link to it. It holds the operations
dashboard, the verification queue, lawyer/placement management, the public-user table and the activity log.
Open it directly at `/admin.html`.
