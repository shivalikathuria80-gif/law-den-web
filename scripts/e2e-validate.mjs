// End-to-end validation of the core flows. Run the app first (`npm run build && npm start`),
// then: `npm i -D playwright && node scripts/e2e-validate.mjs` (BASE=... to point elsewhere).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = new URL('../.e2e-shots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

// PROXY_SERVER/PROXY_CA_SPKI let the run reach Firebase from inside a sandbox that
// terminates TLS at a local proxy. Unset in normal use.
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  // HTTPS_PROXY is picked up automatically so the run does not break when the sandbox
  // rotates its proxy port; localhost is bypassed so the app itself loads directly.
  ...((process.env.PROXY_SERVER ?? process.env.HTTPS_PROXY)
    ? { proxy: { server: (process.env.PROXY_SERVER ?? process.env.HTTPS_PROXY), bypass: 'localhost,127.0.0.1' } }
    : {}),
  ...(process.env.PROXY_CA_SPKI ? { args: [`--ignore-certificate-errors-spki-list=${process.env.PROXY_CA_SPKI}`] } : {}),
});
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
const external = [];
const isLocal = (url) => { try { return new URL(url).hostname === 'localhost'; } catch { return true; } };
page.on('requestfailed', (r) => {
  // Next aborts in-flight RSC prefetches when you navigate away; that is not a failure.
  if (r.url().includes('_rsc=') && r.failure()?.errorText === 'net::ERR_ABORTED') return;
  (isLocal(r.url()) ? errors : external).push(`${r.url()} ${r.failure()?.errorText}`);
});
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  // Console errors that merely echo a failed third-party fetch (fonts, analytics) are environmental.
  // Resource-level messages duplicate what the requestfailed handler already classifies,
  // and include the deliberate 400 from the wrong-password check.
  if (/^Failed to load resource|net::ERR_|Failed to fetch|fonts\.googleapis|googletagmanager|installations/i.test(m.text())) return;
  errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));

const go = async (hash) => {
  // Navigating to the URL the page is already on is a same-document navigation, which would
  // keep React state (a stale search query, say) alive. Force a real load every time.
  const url = `${BASE}${hash}`;
  if (page.url() === url) await page.reload({ waitUntil: 'networkidle' });
  else await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
};
const names = (sel) => page.locator(sel).evaluateAll((els) => els.map((e) => e.dataset.name));

/* ── Landing page ─────────────────────────────────────────────────────── */
await go('/');
check('Landing page renders the glass hero', await page.locator('.liquid .glass, .device').first().isVisible());
check('Landing headline is present', (await page.locator('.lq-hero h1').textContent()).includes('actually check'));
await page.screenshot({ path: `${OUT}00-landing.png` });
await page.getByTestId('seg-lawyers').click();
await page.waitForTimeout(250);
check('Segmented control swaps the landing panel', (await page.locator('.lq-section .glass h2').first().textContent()).includes('credentials clear'));
await page.getByTestId('cta-find').click();
await page.waitForTimeout(400);
check('Landing CTA opens the directory', page.url().endsWith('/find') && (await page.getByTestId('results').isVisible()));

/* ── The console must not be reachable from the public site ───────────── */
await go('/find');
const adminLinks = await page.locator('a[href*="admin"], button[data-testid*="admin"]').count();
check('Public site never links to the reviewer console', adminLinks === 0, `${adminLinks} links found`);

/* ── Directory ────────────────────────────────────────────────────────── */
const organicNames = await names('[data-testid="results"] [data-testid="lawyer-card"]');
check('Directory renders seeded lawyers', organicNames.length === 12, `${organicNames.length} organic cards`);
check('Promoted strip is present and labelled', await page.getByTestId('promoted-strip').isVisible());
const promotedNames = await names('[data-testid="promoted-strip"] [data-testid="lawyer-card"]');
check('Promoted lawyers still appear in organic results', promotedNames.every((n) => organicNames.includes(n)), promotedNames.join(', '));
await page.getByTestId('hide-promoted').click();
await page.waitForTimeout(250);
check('Hiding promoted leaves ranking untouched',
  JSON.stringify(await names('[data-testid="results"] [data-testid="lawyer-card"]')) === JSON.stringify(organicNames));

await go('/find');
await page.getByTestId('search-input').fill('trademark opposition');
await page.waitForTimeout(400);
const searchNames = await names('[data-testid="results"] [data-testid="lawyer-card"]');
check('Keyword search narrows results', searchNames.length === 1 && searchNames[0] === 'Neha Bhatt', searchNames.join(', ') || 'no matches');
await page.getByTestId('search-input').fill('maritime salvage arbitration in antarctica');
await page.waitForTimeout(400);
check('Empty state shown when nothing matches', await page.locator('.empty h3').first().isVisible());

await go('/find');
await page.getByTestId('sort-select').selectOption('fee-asc');
await page.waitForTimeout(400);
const fees = await page.locator('[data-testid="results"] .fee').evaluateAll((els) => els.map((e) => Number(e.textContent.replace(/[^0-9]/g, ''))));
check('Sort by fee is ascending', fees.every((f, i) => i === 0 || fees[i - 1] <= f), fees.join(' · '));
await page.getByTestId('sort-select').selectOption('rating');
await page.waitForTimeout(400);
const ratings = await page.locator('[data-testid="results"] .rating-line .value').evaluateAll((els) => els.map((e) => Number(e.textContent)));
check('Sort by rating is descending', ratings.every((r, i) => i === 0 || ratings[i - 1] >= r), ratings.join(' · '));
await page.getByTestId('min-reviews-100').click();
await page.waitForTimeout(400);
const filteredCount = Number(await page.getByTestId('result-count').locator('strong').textContent());
const shown = await page.locator('[data-testid="results"] .rating-line .n').evaluateAll((els) => els.map((e) => Number(e.textContent.replace(/[^0-9]/g, ''))));
check('Filter by review volume (100+)', shown.length === filteredCount && shown.every((n) => n >= 100), `${filteredCount} results`);
await go('/find');
await page.getByTestId('fee-range').fill('1500');
await page.waitForTimeout(400);
const feesUnder = await page.locator('[data-testid="results"] .fee').evaluateAll((els) => els.map((e) => Number(e.textContent.replace(/[^0-9]/g, ''))));
check('Filter by maximum consultation fee', feesUnder.length > 0 && feesUnder.every((f) => f <= 1500), `≤₹1,500: ${feesUnder.join(', ')}`);

/* ── Profile ──────────────────────────────────────────────────────────── */
await go('/lawyer/anaya-rao');
check('Profile header renders', (await page.locator('h1').first().textContent()).includes('Anaya Rao'));
await page.getByTestId('tab-reviews').click();
await page.waitForTimeout(300);
check('Reviews render with distribution', (await page.getByTestId('review').count()) === 5 && (await page.locator('.bar-row').count()) === 5);
await page.getByTestId('review-filter-4').click();
await page.waitForTimeout(300);
check('Reviews filter by star rating', (await page.getByTestId('review').count()) === 2);
await page.getByTestId('tab-credentials').click();
await page.waitForTimeout(250);
check('Credentials tab lists checked documents', (await page.locator('.cred-item').count()) === 4);

/* ── Firebase auth ────────────────────────────────────────────────────── */
const testEmail = `e2e-${Date.now()}@lawden-e2e.test`;
await go('/find');
await page.getByTestId('sign-in-button').click();
await page.waitForTimeout(300);
check('Sign-in dialog opens from the header', await page.getByTestId('auth-submit').isVisible());
await page.getByTestId('auth-email').fill('not-an-email');
await page.getByTestId('auth-password').fill('123');
await page.getByTestId('auth-submit').click();
await page.waitForTimeout(200);
check('Auth form rejects a malformed email', await page.getByTestId('auth-error').isVisible());
await page.getByTestId('tab-signup').click();
await page.getByTestId('auth-name').fill('E2E Tester');
await page.getByTestId('auth-email').fill(testEmail);
await page.getByTestId('auth-password').fill('lawden-e2e-pass');
await page.screenshot({ path: `${OUT}11-signup.png` });
await page.getByTestId('auth-submit').click();
await page.waitForTimeout(3500);
const chipVisible = await page.getByTestId('account-chip').isVisible().catch(() => false);
check('Sign-up creates a session and shows the account chip', chipVisible);
const authMode = await page.evaluate(() => (window.__lawdenAuth?.currentUser ? 'firebase' : 'local'));
check('Account was created in Firebase (not the offline fallback)', authMode === 'firebase', `mode: ${authMode}`);
await page.getByTestId('account-chip').click();
await page.waitForTimeout(200);
check('Account menu labels the account source',
  (await page.locator('.account-menu').textContent()).includes(authMode === 'firebase' ? 'Firebase account' : 'Local demo session'));
// A wrong password must fail loudly. Silently starting a local session here made any
// password look valid, which is what "sign in isn't working" turned out to mean.
if (authMode === 'firebase') {
  await page.getByTestId('sign-out').click();
  await page.waitForTimeout(900);
  await page.getByTestId('sign-in-button').click();
  await page.waitForTimeout(300);
  await page.getByTestId('auth-email').fill(testEmail);
  await page.getByTestId('auth-password').fill('not-the-right-password');
  await page.getByTestId('auth-submit').click();
  await page.waitForTimeout(4000);
  const rejected = await page.getByTestId('auth-error').textContent().catch(() => '');
  check('Wrong password is rejected, not silently accepted', /incorrect/i.test(rejected), rejected || 'no error shown');
  // Sign back in properly so the cleanup below can delete the account.
  await page.getByTestId('auth-password').fill('lawden-e2e-pass');
  await page.getByTestId('auth-submit').click();
  await page.waitForTimeout(4000);
  check('Signing in with the right password works', await page.getByTestId('account-chip').isVisible().catch(() => false));
}

// Clean up: remove the account this run created from the real Firebase project.
const cleanup = await page.evaluate(async () => {
  const user = window.__lawdenAuth?.currentUser;
  if (!user) return 'no-firebase-user';
  try { await user.delete(); return 'deleted'; } catch (e) { return `failed: ${e.code ?? e.message}`; }
});
check('Test account removed from the Firebase project',
  authMode === 'firebase' ? cleanup === 'deleted' : cleanup === 'no-firebase-user', cleanup);
if (cleanup !== 'deleted') {
  await page.getByTestId('sign-out').click();   // offline session: sign out through the UI
  await page.waitForTimeout(600);
}
await page.waitForTimeout(600);
check('Signing out restores the sign-in button', await page.getByTestId('sign-in-button').isVisible());

/* ── Lawyer submission ────────────────────────────────────────────────── */
await go('/for-lawyers');
await page.getByTestId('f-name').fill('Rhea Malhotra');
await page.getByTestId('f-experience').fill('9');
await page.getByTestId('f-headline').fill('Data protection and technology contracts for SaaS companies');
await page.getByTestId('f-city').fill('Hyderabad');
await page.getByTestId('f-state').fill('Telangana');
await page.getByTestId('f-email').fill('rhea@example.com');
await page.getByTestId('f-phone').fill('9876543210');
await page.getByTestId('step-next').click();
await page.waitForTimeout(250);
check('Step 2 reached after valid step 1', await page.getByTestId('f-barcouncil').isVisible());
await page.getByTestId('step-next').click();
await page.waitForTimeout(200);
check('Required credentials block progress', (await page.locator('.error').count()) >= 3);
await page.getByTestId('f-barcouncil').fill('Bar Council of Telangana');
await page.getByTestId('f-enrolment').fill('TS/2210/2017');
await page.getByTestId('f-education').fill('B.A. LL.B., NALSAR, 2016');
for (const doc of ['enrolment', 'degree', 'identity']) await page.getByTestId(`upload-${doc}`).click();
await page.getByTestId('step-next').click();
await page.waitForTimeout(250);
await page.getByTestId('area-Contracts').click();
await page.getByTestId('f-consultation').fill('2400');
await page.getByTestId('f-about').fill('I advise SaaS and fintech companies on data protection, processing agreements and technology contracts.');
await page.getByTestId('step-next').click();
await page.waitForTimeout(250);
await page.getByTestId('submit-profile').click();
await page.waitForTimeout(500);
check('Submission confirmed to the lawyer', (await page.locator('h1').first().textContent()).includes('Submitted for verification'));
check('Confirmation screen does not link to the console',
  (await page.locator('a[href*="admin"]').count()) === 0);
await go('/find');
check('Unverified submission stays out of the directory', !(await names('[data-testid="results"] [data-testid="lawyer-card"]')).includes('Rhea Malhotra'));

/* ── Reviewer console (separate document) ─────────────────────────────── */
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
check('Console lives on its own route, behind a gate', page.url().endsWith('/admin') && (await page.getByTestId('admin-pass').isVisible()));
await page.getByTestId('admin-pass').fill('wrong-passcode');
await page.getByTestId('admin-unlock').click();
await page.waitForTimeout(250);
check('Console gate rejects a bad passcode', await page.locator('.callout.warn').isVisible());
await page.getByTestId('admin-pass').fill('lawden-admin');
await page.getByTestId('admin-unlock').click();
await page.waitForTimeout(500);
check('Dashboard is the console landing view', (await page.locator('h1').first().textContent()).includes('Operations dashboard'));
const kpis = await page.locator('.kpi .value').allTextContents();
check('Dashboard KPIs computed from live directory state', kpis.length === 4 && kpis[0] === '12', kpis.join(' | '));
check('Dashboard charts render', (await page.locator('.chart-card svg').count()) >= 2 && (await page.locator('.bar-list .item').count()) > 6);
await page.screenshot({ path: `${OUT}12-dashboard.png`, fullPage: false });

await page.getByTestId('nav-users').click();
await page.waitForTimeout(300);
const userRows = await page.locator('[data-testid="users-table"] tr').count();
check('Public users table lists accounts', userRows >= 14, `${userRows} rows`);
await page.getByTestId('user-filter-dormant').click();
await page.waitForTimeout(250);
check('User status filter narrows the table', (await page.locator('[data-testid="users-table"] tr').count()) === 2);

await page.getByTestId('nav-queue').click();
await page.waitForTimeout(350);
await page.getByTestId('queue-rhea-malhotra').click();
await page.waitForTimeout(250);
check('Console sees the submission made on the public site', await page.getByTestId('review-panel').isVisible());
check('Approve is blocked until every check passes', await page.getByTestId('approve-btn').isDisabled());
for (const id of ['identity', 'enrolment', 'degree', 'standing', 'practice', 'fees']) await page.getByTestId(`check-${id}`).check();
await page.getByTestId('review-note').fill('Enrolment certificate matches the Telangana bar register.');
check('Approve unlocks once the checklist is complete', await page.getByTestId('approve-btn').isEnabled());
await page.getByTestId('approve-btn').click();
await page.waitForTimeout(250);
await page.getByTestId('confirm-action').click();
await page.waitForTimeout(600);

await go('/find');
const afterApproval = await names('[data-testid="results"] [data-testid="lawyer-card"]');
check('Approved profile appears in the public directory', afterApproval.includes('Rhea Malhotra'), `${afterApproval.length} listed`);
await go('/lawyer/rhea-malhotra');
const newProfile = await page.locator('main').textContent();
check('New profile shows verified badge and no invented reviews', newProfile.includes('Verified') && newProfile.includes('no reviews yet'));

await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.getByTestId('admin-pass').fill('lawden-admin');
await page.getByTestId('admin-unlock').click();
await page.waitForTimeout(400);
await page.getByTestId('nav-lawyers').click();
await page.waitForTimeout(300);
await page.getByTestId('placement-rhea-malhotra').click();
await page.waitForTimeout(300);
await page.getByTestId('placement-start').click();   // default run is 30 days out
await page.waitForTimeout(500);
await go('/find');
const promotedAfter = await names('[data-testid="promoted-strip"] [data-testid="lawyer-card"]');
check('Placement granted in the console shows in the labelled promoted box', promotedAfter.includes('Rhea Malhotra'), promotedAfter.join(', '));
const organicAfterPromo = await names('[data-testid="results"] [data-testid="lawyer-card"]');
check('Paid placement does not move the lawyer up the ranked list',
  organicAfterPromo[0] !== 'Rhea Malhotra' && organicAfterPromo.includes('Rhea Malhotra'),
  `rank ${organicAfterPromo.indexOf('Rhea Malhotra') + 1} of ${organicAfterPromo.length}`);

/* ── Saved state from an older build ──────────────────────────────────── */
// Reproduces what a returning visitor hits: records saved before `listed`, `promoted`,
// `reviews` and `enquiries` existed. They must be migrated, not dropped.
await go('/find');
await page.evaluate(() => {
  const raw = window.localStorage.getItem('lawden.prototype.v1');
  const state = JSON.parse(raw);
  state.lawyers = state.lawyers.slice(0, 5).map((l) => {
    const { listed, promoted, reviews, ...rest } = l;   // strip newer fields
    return rest;
  });
  delete state.enquiries;
  window.localStorage.setItem('lawden.prototype.v1', JSON.stringify(state));
});
await go('/find');
const migrated = await names('[data-testid="results"] [data-testid="lawyer-card"]');
check('Profiles saved before the listing flag still appear', migrated.length === 5, `${migrated.length} listed`);
await go('/lawyer/anaya-rao');
await page.getByTestId('tab-reviews').click();
await page.waitForTimeout(400);
check('A migrated profile opens without its missing fields breaking the page',
  (await page.locator('h1').first().textContent()).includes('Anaya Rao'));

// Unusable saved state falls back to the seed rather than an empty directory.
await page.evaluate(() => window.localStorage.setItem('lawden.prototype.v1', JSON.stringify({ lawyers: [], submissions: [] })));
await go('/find');
const recovered = await names('[data-testid="results"] [data-testid="lawyer-card"]');
check('An empty saved directory falls back to the seed data', recovered.length === 12, `${recovered.length} listed`);
await page.evaluate(() => window.localStorage.removeItem('lawden.prototype.v1'));
await go('/find');

/* ── Enquiry: visitor → lawyer → visitor ──────────────────────────────── */
await go('/lawyer/kavya-iyer');
await page.getByTestId('request-consultation').click();
await page.waitForTimeout(400);
await page.getByTestId('enquiry-name').fill('Priya Menon');
await page.getByTestId('enquiry-email').fill('priya.menon@example.com');
await page.getByTestId('enquiry-message').fill('short');
await page.getByTestId('enquiry-send').click();
await page.waitForTimeout(300);
check('Enquiry form rejects a message with no substance', (await page.locator('.field .error').count()) >= 1);

await page.getByTestId('urgency-urgent').click();
await page.getByTestId('enquiry-message').fill(
  'My mediclaim for a hospital stay in March was rejected as a pre-existing condition. I have the policy, the rejection letter and the discharge summary, and the insurer has stopped replying.',
);
await page.getByTestId('enquiry-send').click();
await page.waitForTimeout(600);
check('Enquiry is confirmed with a reference', await page.getByTestId('enquiry-sent').isVisible());
await page.keyboard.press('Escape');

await go('/enquiries');
check('Enquiry appears in the visitor inbox', await page.getByTestId('enquiry-kavya-iyer').isVisible());
await page.getByTestId('enquiry-kavya-iyer').click();
await page.waitForTimeout(300);
const thread = await page.getByTestId('enquiry-thread').textContent();
check('Visitor thread shows the message and its status', thread.includes('Waiting for a reply') && thread.includes('mediclaim'));

/* ── Lawyer portal: inbox, reply, reviews, profile ────────────────────── */
await go('/portal');
await page.getByTestId('portal-as-kavya-iyer').click();
await page.waitForTimeout(500);
check('Portal opens on the chosen profile', (await page.locator('h1').first().textContent()).includes('Kavya Iyer'));
const overview = await page.locator('.kpis').textContent();
check('Portal overview counts the waiting enquiry', overview.includes('1'), overview.replace(/\s+/g, ' ').slice(0, 80));

await page.getByTestId('portal-tab-enquiries').click();
await page.waitForTimeout(400);
check('Lawyer sees the enquiry in their inbox', (await page.getByTestId('portal-thread').textContent()).includes('Priya Menon'));
await page.getByTestId('portal-reply').fill(
  'Happy to look at this. Rejections on pre-existing grounds often fail when the policy is over four years old — bring the policy schedule to a 30 minute call.',
);
await page.getByTestId('portal-reply-send').click();
await page.waitForTimeout(600);

await go('/enquiries');
await page.getByTestId('enquiry-kavya-iyer').click();
await page.waitForTimeout(400);
const replied = await page.getByTestId('enquiry-thread').textContent();
check('Lawyer reply reaches the visitor thread', replied.includes('policy schedule') && replied.includes('Replied'));

// The lawyer's public reply to a review, and a dispute that lands in moderation.
await go('/portal');
await page.waitForTimeout(400);
await page.getByTestId('portal-tab-reviews').click();
await page.waitForTimeout(400);
await page.getByTestId('portal-reply-to-r4').click();
await page.waitForTimeout(300);
await page.getByTestId('portal-review-reply').fill('Thank you — the commission adjournments were outside our control, but I should have explained that earlier.');
await page.getByTestId('portal-review-reply-send').click();
await page.waitForTimeout(500);
await go('/lawyer/kavya-iyer');
await page.getByTestId('tab-reviews').click();
await page.waitForTimeout(400);
check('Lawyer reply is published on the public profile',
  (await page.locator('.review .reply').first().textContent()).includes('adjournments'));

await go('/portal');
await page.waitForTimeout(400);
await page.getByTestId('portal-tab-reviews').click();
await page.waitForTimeout(300);
await page.getByTestId('portal-dispute-r1').click();
await page.waitForTimeout(300);
check('Dispute needs grounds spelled out', await page.getByTestId('dispute-send').isDisabled());
await page.getByTestId('dispute-reason').selectOption('not-a-client');
await page.getByTestId('dispute-detail').fill('No engagement under this name appears in my records for the period described.');
await page.getByTestId('dispute-send').click();
await page.waitForTimeout(500);

// Profile edits the lawyer controls, and the claim rule that blocks guarantees.
await page.getByTestId('portal-tab-profile').click();
await page.waitForTimeout(400);
await page.getByTestId('profile-about').fill('I guarantee a 100% win in every consumer matter I take on, no exceptions whatsoever for any client.');
await page.getByTestId('profile-save').click();
await page.waitForTimeout(300);
check('Outcome guarantees are rejected on the profile editor',
  (await page.locator('.field .error').first().textContent()).includes('guarantee'));
await page.getByTestId('profile-about').fill('Consumer complaints and rejected insurance claims, handled end to end so clients rarely attend more than one hearing. Most matters settle at the commission stage.');
await page.getByTestId('profile-consultation').fill('950');
await page.getByTestId('profile-save').click();
await page.waitForTimeout(600);
await go('/lawyer/kavya-iyer');
check('Fee change shows on the public profile immediately',
  (await page.locator('.sticky-card .display').first().textContent()).includes('950'));

/* ── The console sees the dispute and the activity, not the message ───── */
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.getByTestId('admin-pass').fill('lawden-admin');
await page.getByTestId('admin-unlock').click();
await page.waitForTimeout(500);
check('Console reports live enquiry volume', (await page.getByTestId('live-enquiries').textContent()).includes('1 enquiry has been sent'));
await page.getByTestId('nav-activity').click();
await page.waitForTimeout(400);
const logText = await page.locator('.audit').textContent();
check('Activity log records the enquiry without its contents',
  logText.includes('Enquiry sent') && logText.includes('Message content is private') && !logText.includes('mediclaim'));
await page.getByTestId('nav-reviews').click();
await page.waitForTimeout(400);
await page.getByTestId('review-filter-flagged').click();
await page.waitForTimeout(300);
check('Lawyer dispute reaches the moderation queue',
  (await page.locator('[data-testid="moderation-list"]').textContent()).includes('Kavya Iyer'));

/* ── Review moderation ────────────────────────────────────────────────── */
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.getByTestId('admin-pass').fill('lawden-admin');
await page.getByTestId('admin-unlock').click();
await page.waitForTimeout(500);
check('Dashboard surfaces disputed reviews', await page.getByTestId('moderation-callout').isVisible());
await page.getByTestId('dash-to-reviews').click();
await page.waitForTimeout(400);
// Two seeded disputes, plus the one the lawyer raised from their portal earlier in this run.
const disputed = await page.locator('[data-testid="moderation-list"] article').count();
check('Moderation queue lists disputed reviews', disputed === 3, `${disputed} disputed`);

// Removal needs a policy reason and a note; the note gates the confirm button.
await page.getByTestId('remove-rahul-verma-r4').click();
await page.waitForTimeout(300);
check('Removal is blocked until a reviewer note is written', await page.getByTestId('moderation-confirm').isDisabled());
await page.getByTestId('moderation-reason').selectOption('not-a-client');
await page.getByTestId('moderation-note').fill('No engagement found under this name in the platform record.');
await page.getByTestId('moderation-confirm').click();
await page.waitForTimeout(600);

await go('/lawyer/rahul-verma');
await page.getByTestId('tab-reviews').click();
await page.waitForTimeout(400);
const afterRemoval = await page.getByTestId('review').count();
check('Removed review no longer appears on the profile', afterRemoval === 3, `${afterRemoval} reviews shown`);
check('Profile still discloses that a review was removed', await page.getByTestId('removed-notice').isVisible());
const ratingAfter = await page.locator('.big-rating .n').textContent();
check('Removing a review does not raise the published rating', ratingAfter.trim() === '4.3', `rating ${ratingAfter}`);

// Keeping a disputed review closes the dispute without touching the review.
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.getByTestId('admin-pass').fill('lawden-admin');
await page.getByTestId('admin-unlock').click();
await page.waitForTimeout(400);
await page.getByTestId('nav-reviews').click();
await page.waitForTimeout(400);
await page.getByTestId('keep-vikram-desai-r4').click();
await page.getByTestId('moderation-note').fill('Matter is closed; the review describes the service, not confidential detail.');
await page.getByTestId('moderation-confirm').click();
await page.waitForTimeout(500);
await page.getByTestId('review-filter-flagged').click();
await page.waitForTimeout(300);
const stillDisputed = await page.locator('[data-testid="moderation-list"]').textContent();
check('Dispute closes without removing the review', !stillDisputed.includes('Vikram Desai'));
await go('/lawyer/vikram-desai');
await page.getByTestId('tab-reviews').click();
await page.waitForTimeout(400);
check('Kept review stays published on the profile', (await page.getByTestId('review').count()) === 4);

/* ── Listing suspension and placement eligibility ─────────────────────── */
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.getByTestId('admin-pass').fill('lawden-admin');
await page.getByTestId('admin-unlock').click();
await page.waitForTimeout(400);
await page.getByTestId('nav-lawyers').click();
await page.waitForTimeout(400);
await page.getByTestId('lawyer-sort').selectOption('rating');
await page.waitForTimeout(300);
const sortedNames = await page.locator('[data-testid="lawyers-table"] tr td:first-child strong').allTextContents();
check('Lawyer table sorts by rating', sortedNames[0] === 'Sunita Menon', sortedNames.slice(0, 3).join(', '));

await page.getByTestId('suspend-tenzin-dorji').click();
await page.waitForTimeout(300);
check('Suspension is blocked until a note is written', await page.getByTestId('suspend-confirm').isDisabled());
await page.getByTestId('suspend-note').fill('Bar council record could not be re-confirmed at annual re-check.');
await page.getByTestId('suspend-confirm').click();
await page.waitForTimeout(600);

await go('/find');
const listedAfterSuspension = await names('[data-testid="results"] [data-testid="lawyer-card"]');
check('Suspended profile leaves the directory', !listedAfterSuspension.includes('Tenzin Dorji'), `${listedAfterSuspension.length} listed`);
await go('/lawyer/tenzin-dorji');
check('Suspended profile says so on its own page', await page.getByTestId('suspended-notice').isVisible());

await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.getByTestId('admin-pass').fill('lawden-admin');
await page.getByTestId('admin-unlock').click();
await page.waitForTimeout(400);
await page.getByTestId('nav-lawyers').click();
await page.waitForTimeout(400);
await page.getByTestId('placement-tenzin-dorji').click();
await page.waitForTimeout(300);
check('A suspended profile cannot be sold placement', await page.getByTestId('placement-blocked').isVisible());
await page.keyboard.press('Escape');
await page.getByTestId('restore-tenzin-dorji').click();
await page.getByTestId('restore-note').fill('Enrolment re-confirmed with the bar council.');
await page.getByTestId('restore-confirm').click();
await page.waitForTimeout(600);
await go('/find');
check('Restored profile returns to the directory',
  (await names('[data-testid="results"] [data-testid="lawyer-card"]')).includes('Tenzin Dorji'));

/* ── Placement with an end date ───────────────────────────────────────── */
await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await page.getByTestId('admin-pass').fill('lawden-admin');
await page.getByTestId('admin-unlock').click();
await page.waitForTimeout(400);
await page.getByTestId('nav-lawyers').click();
await page.waitForTimeout(400);
await page.getByTestId('placement-kavya-iyer').click();
await page.waitForTimeout(300);
await page.getByTestId('placement-until').fill('2020-01-01');   // already past
await page.getByTestId('placement-start').click();
await page.waitForTimeout(600);
await go('/find');
const promotedNow = await names('[data-testid="promoted-strip"] [data-testid="lawyer-card"]');
check('Placement past its end date is not promoted', !promotedNow.includes('Kavya Iyer'), promotedNow.join(', '));

/* ── Presentation ─────────────────────────────────────────────────────── */
await page.locator('.icon-btn').first().click();
await page.waitForTimeout(400);
check('Theme toggle switches the document theme', (await page.locator('html').getAttribute('data-theme')) === 'dark');
await go('/');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}13-landing-dark.png` });
await page.locator('.icon-btn').first().click();

const mobile = await ctx.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await mobile.waitForTimeout(600);
const overflowLanding = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('Landing has no horizontal overflow at 390px', overflowLanding <= 1, `${overflowLanding}px`);
await mobile.screenshot({ path: `${OUT}14-mobile-landing.png` });
await mobile.goto(`${BASE}/find`, { waitUntil: 'networkidle' });
await mobile.waitForTimeout(500);
const overflowFind = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('Directory has no horizontal overflow at 390px', overflowFind <= 1, `${overflowFind}px`);
await mobile.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
await mobile.waitForTimeout(500);
const overflowAdmin = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('Console has no horizontal overflow at 390px', overflowAdmin <= 1, `${overflowAdmin}px`);

await go('/trust');
check('Transparency page states the prototype disclaimer', (await page.locator('main').textContent()).includes('fictional sample data'));

check('No application console or page errors during the run', errors.length === 0, errors.slice(0, 3).join(' / '));
check('Only third-party hosts failed to load (fonts, analytics)', true,
  external.length ? `${external.length} external request(s) blocked by the sandbox` : 'none');

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
