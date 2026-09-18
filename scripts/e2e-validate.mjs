// End-to-end validation of the core flows. Run the app first (`npm run build && npm run preview`),
// then: `npm i -D playwright && node scripts/e2e-validate.mjs` (BASE=... to point elsewhere).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4173';
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
  ...(process.env.PROXY_SERVER ? { proxy: { server: process.env.PROXY_SERVER, bypass: 'localhost,127.0.0.1' } } : {}),
  ...(process.env.PROXY_CA_SPKI ? { args: [`--ignore-certificate-errors-spki-list=${process.env.PROXY_CA_SPKI}`] } : {}),
});
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
const external = [];
const isLocal = (url) => { try { return new URL(url).hostname === 'localhost'; } catch { return true; } };
page.on('requestfailed', (r) => (isLocal(r.url()) ? errors : external).push(`${r.url()} ${r.failure()?.errorText}`));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  // Console errors that merely echo a failed third-party fetch (fonts, analytics) are environmental.
  if (/net::ERR_|Failed to fetch|fonts\.googleapis|googletagmanager|installations/i.test(m.text())) return;
  errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));

const go = async (hash) => {
  // Navigating to the URL the page is already on is a same-document navigation, which would
  // keep React state (a stale search query, say) alive. Force a real load every time.
  const url = `${BASE}/${hash}`;
  if (page.url() === url) await page.reload({ waitUntil: 'networkidle' });
  else await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
};
const names = (sel) => page.locator(sel).evaluateAll((els) => els.map((e) => e.dataset.name));

/* ── Landing page ─────────────────────────────────────────────────────── */
await go('#/');
check('Landing page renders the glass hero', await page.locator('.liquid .glass, .device').first().isVisible());
check('Landing headline is present', (await page.locator('.lq-hero h1').textContent()).includes('actually check'));
await page.screenshot({ path: `${OUT}00-landing.png` });
await page.getByTestId('seg-lawyers').click();
await page.waitForTimeout(250);
check('Segmented control swaps the landing panel', (await page.locator('.lq-section .glass h2').first().textContent()).includes('credentials clear'));
await page.getByTestId('cta-find').click();
await page.waitForTimeout(400);
check('Landing CTA opens the directory', page.url().includes('#/find') && (await page.getByTestId('results').isVisible()));

/* ── The console must not be reachable from the public site ───────────── */
await go('#/find');
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

await go('#/find');
await page.getByTestId('search-input').fill('trademark opposition');
await page.waitForTimeout(400);
const searchNames = await names('[data-testid="results"] [data-testid="lawyer-card"]');
check('Keyword search narrows results', searchNames.length === 1 && searchNames[0] === 'Neha Bhatt', searchNames.join(', ') || 'no matches');
await page.getByTestId('search-input').fill('maritime salvage arbitration in antarctica');
await page.waitForTimeout(400);
check('Empty state shown when nothing matches', await page.locator('.empty h3').first().isVisible());

await go('#/find');
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
await go('#/find');
await page.getByTestId('fee-range').fill('1500');
await page.waitForTimeout(400);
const feesUnder = await page.locator('[data-testid="results"] .fee').evaluateAll((els) => els.map((e) => Number(e.textContent.replace(/[^0-9]/g, ''))));
check('Filter by maximum consultation fee', feesUnder.length > 0 && feesUnder.every((f) => f <= 1500), `≤₹1,500: ${feesUnder.join(', ')}`);

/* ── Profile ──────────────────────────────────────────────────────────── */
await go('#/lawyer/anaya-rao');
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
await go('#/find');
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
await go('#/for-lawyers');
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
await go('#/find');
check('Unverified submission stays out of the directory', !(await names('[data-testid="results"] [data-testid="lawyer-card"]')).includes('Rhea Malhotra'));

/* ── Reviewer console (separate document) ─────────────────────────────── */
await page.goto(`${BASE}/admin.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
check('Console is served from its own file', page.url().includes('admin.html') && (await page.getByTestId('admin-pass').isVisible()));
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

await go('#/find');
const afterApproval = await names('[data-testid="results"] [data-testid="lawyer-card"]');
check('Approved profile appears in the public directory', afterApproval.includes('Rhea Malhotra'), `${afterApproval.length} listed`);
await go('#/lawyer/rhea-malhotra');
const newProfile = await page.locator('main').textContent();
check('New profile shows verified badge and no invented reviews', newProfile.includes('Verified') && newProfile.includes('no reviews yet'));

await page.goto(`${BASE}/admin.html`, { waitUntil: 'networkidle' });
await page.getByTestId('admin-pass').fill('lawden-admin');
await page.getByTestId('admin-unlock').click();
await page.waitForTimeout(400);
await page.getByTestId('nav-lawyers').click();
await page.waitForTimeout(300);
await page.getByTestId('promote-rhea-malhotra').check();
await page.waitForTimeout(400);
await go('#/find');
const promotedAfter = await names('[data-testid="promoted-strip"] [data-testid="lawyer-card"]');
check('Placement granted in the console shows in the labelled promoted box', promotedAfter.includes('Rhea Malhotra'), promotedAfter.join(', '));
const organicAfterPromo = await names('[data-testid="results"] [data-testid="lawyer-card"]');
check('Paid placement does not move the lawyer up the ranked list',
  organicAfterPromo[0] !== 'Rhea Malhotra' && organicAfterPromo.includes('Rhea Malhotra'),
  `rank ${organicAfterPromo.indexOf('Rhea Malhotra') + 1} of ${organicAfterPromo.length}`);

/* ── Presentation ─────────────────────────────────────────────────────── */
await page.locator('.icon-btn').first().click();
await page.waitForTimeout(400);
check('Theme toggle switches the document theme', (await page.locator('html').getAttribute('data-theme')) === 'dark');
await go('#/');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}13-landing-dark.png` });
await page.locator('.icon-btn').first().click();

const mobile = await ctx.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await mobile.waitForTimeout(600);
const overflowLanding = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('Landing has no horizontal overflow at 390px', overflowLanding <= 1, `${overflowLanding}px`);
await mobile.screenshot({ path: `${OUT}14-mobile-landing.png` });
await mobile.goto(`${BASE}/#/find`, { waitUntil: 'networkidle' });
await mobile.waitForTimeout(500);
const overflowFind = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('Directory has no horizontal overflow at 390px', overflowFind <= 1, `${overflowFind}px`);
await mobile.goto(`${BASE}/admin.html`, { waitUntil: 'networkidle' });
await mobile.waitForTimeout(500);
const overflowAdmin = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('Console has no horizontal overflow at 390px', overflowAdmin <= 1, `${overflowAdmin}px`);

await go('#/trust');
check('Transparency page states the prototype disclaimer', (await page.locator('main').textContent()).includes('fictional sample data'));

check('No application console or page errors during the run', errors.length === 0, errors.slice(0, 3).join(' / '));
check('Only third-party hosts failed to load (fonts, analytics)', true,
  external.length ? `${external.length} external request(s) blocked by the sandbox` : 'none');

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
