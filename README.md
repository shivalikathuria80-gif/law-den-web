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

Next.js 16 (App Router) + React 19 + TypeScript, hand-written CSS (light/dark), `localStorage`
persistence. No backend of its own: submissions and admin decisions live in the browser, which is
what makes the prototype explorable end to end. Deploying to Vercel needs no configuration —
import the repo, `next build`, done.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm start        # production server on :3000
```

## Routes

| Route | What it is |
| --- | --- |
| `/` | Landing page (liquid-glass treatment) |
| `/find` | Directory: search, filters, sorting, promoted placements |
| `/lawyer/[slug]` | Profile: overview, credentials, reviews |
| `/for-lawyers` | Four-step submission with document attachment |
| `/admin` | Reviewer console — **not linked from anywhere on the site** |

## Layout

```
src/
  app/            App Router: (site) group for public pages, admin/ for the console
  data/seed.ts    12 verified profiles, ~55 written reviews, 3 queued submissions
  lib/search.ts   filtering + the organic ranking score (paid placement is not an input)
  store.tsx       app state, verification checklist, audit log, persistence
  views/          Landing, Directory, LawyerProfile, ForLawyers, Trust, AdminApp
  components/     UI primitives, site chrome, lawyer card, filter panel, charts
```

## Validating the core flows

`scripts/e2e-validate.mjs` drives the built app in Chromium and asserts the interactions that matter:
search and every filter, all five sort orders, the promoted-placement rules (a paid slot never enters
the ranking and hiding it leaves the list identical), review filtering and distribution, the four-step
submission with its validation guards, the admin passcode gate, checklist-gated approval, publication
into the directory, mobile layout with no horizontal overflow, and console hygiene.

```bash
npm run build && npm start &           # serves http://localhost:3000
npm i -D playwright && node scripts/e2e-validate.mjs
```

All 69 checks pass on the current build; screenshots land in `.e2e-shots/`. The auth checks create a
real Firebase account and delete it again at the end of the run.

## Accounts (Firebase Authentication)

The header's **Sign in** button opens a combined sign-in / create-account dialog backed by Firebase Auth
(`src/lib/firebase.ts`, `src/auth.tsx`): email + password, plus Google sign-in. Two things to know:

- **Google sign-in** needs the site's domain listed under Firebase console → Authentication → Settings →
  Authorized domains. Email/password works from any origin. The dialog says exactly this when the domain
  is not authorised rather than failing silently.
- **Sandboxed hosts** (the private artifact host, for instance) block outbound calls to Google. Sign-in
  then *reports* that Firebase is unreachable and offers an explicit "continue in offline demo mode"
  button. It never signs you in silently — an earlier version did, which made a wrong password look
  like a successful sign-in.

The Firebase web config is a public client identifier, not a secret — protection comes from the console's
authorised domains, enabled providers, and security rules. Reviewer access is by email allowlist
(`ADMIN_EMAILS` in `src/auth.tsx`).

## Reviewer console — separate and unlinked

`/admin` has its own route segment and layout (`src/app/admin/`), shares none of the public site's
chrome, and is **not linked from anywhere on the site** — two tests assert that, including on the
submission-confirmation screen. Open it directly at `/admin`. It holds:

| Section | What it does |
| --- | --- |
| Dashboard | KPIs, a verification funnel with clearance rate, submission/sign-up trends over a selectable range, coverage and rating spread, and a decision queue whose items open the right section |
| Verification queue | Submitted details and documents, a six-point checklist that gates approval, and request-changes / reject with a recorded note |
| Review moderation | Disputed reviews, kept or removed against a **policy reason** with a required note |
| Lawyers | Search and sort, suspend / restore a listing with a reason, and paid placement with an end date |
| Public users | Accounts with status filters; accounts created on this device are marked |
| Activity log | Every decision, with actor and detail |

### What moderation cannot do

A lawyer can dispute a review; they cannot remove one. Removal requires one of four policy reasons
(not a client, abusive, confidential detail, conflict of interest) plus a reviewer note, and the
profile keeps a visible line saying a review was removed — the rating still counts every review
received, so moderation can never quietly raise a score. Disagreeing with a rating is not a reason,
and the console says so on the page.

Suspending a profile removes it from the directory, ends any paid placement immediately, and shows a
notice on the profile itself; the record, reviews and verification history are kept. Placement
lapses on its end date on its own and can never be sold to an unverified or suspended profile.

## Private preview build

The preview host serves static files from a path the build cannot know, and reserves published
paths beginning with `_`. So the preview is a **single document**: `NEXT_PUBLIC_PREVIEW=1` makes the
app navigate by hash (see `src/components/AppLink.tsx`), and the script rewrites every asset URL
relative — including the chunk base compiled into the Turbopack runtime.

```bash
NEXT_PUBLIC_PREVIEW=1 ARTIFACT_EXPORT=1 npm run build
node scripts/build-preview.mjs      # out-artifact/ + artifact-page.html
```

The two modes use separate build directories, because `NEXT_PUBLIC_*` values are compiled into the
output and a shared cache leaks the preview flag into the normal build. None of this affects the
Vercel build, which keeps real URLs.
