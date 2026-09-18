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
