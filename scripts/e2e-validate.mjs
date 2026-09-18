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

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

const go = async (hash) => {
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
};

// 1 — directory loads
await go('#/');
const cardCount = await page.getByTestId('lawyer-card').count();
const organic = await page.locator('[data-testid="results"] [data-testid="lawyer-card"]').count();
check('Directory renders seeded lawyers', organic === 12, `${organic} organic cards, ${cardCount} total incl. promoted`);
check('Promoted strip is present and labelled', await page.getByTestId('promoted-strip').isVisible());
await page.screenshot({ path: `${OUT}01-directory.png`, fullPage: false });

// 2 — promoted profiles also keep their organic position (no paid boost, no removal)
const promotedNames = await page.locator('[data-testid="promoted-strip"] [data-testid="lawyer-card"]').evaluateAll(
  (els) => els.map((e) => e.dataset.name),
);
const organicNames = await page.locator('[data-testid="results"] [data-testid="lawyer-card"]').evaluateAll(
  (els) => els.map((e) => e.dataset.name),
);
check('Promoted lawyers still appear in organic results', promotedNames.every((n) => organicNames.includes(n)),
  `promoted: ${promotedNames.join(', ')}`);
const topOrganic = organicNames[0];

// 3 — hiding promoted does not change the ranked list
await page.getByTestId('hide-promoted').click();
await page.waitForTimeout(250);
const afterHide = await page.locator('[data-testid="results"] [data-testid="lawyer-card"]').evaluateAll((els) => els.map((e) => e.dataset.name));
check('Hiding promoted leaves ranking untouched', JSON.stringify(afterHide) === JSON.stringify(organicNames));
check('Ranked list is not led by a paid slot by default', topOrganic === afterHide[0], `top result: ${afterHide[0]}`);

// 4 — search
await go('#/');
await page.getByTestId('search-input').fill('trademark opposition');
await page.waitForTimeout(400);
const searchNames = await page.locator('[data-testid="results"] [data-testid="lawyer-card"]').evaluateAll((els) => els.map((e) => e.dataset.name));
check('Keyword search narrows results', searchNames.length === 1 && searchNames[0] === 'Neha Bhatt', searchNames.join(', ') || 'no matches');

// 5 — empty state
await page.getByTestId('search-input').fill('maritime salvage arbitration in antarctica');
await page.waitForTimeout(400);
check('Empty state shown when nothing matches', await page.locator('.empty h3').first().isVisible());
await page.getByTestId('search-input').fill('');

// 6 — price sort
await go('#/');
await page.getByTestId('sort-select').selectOption('fee-asc');
await page.waitForTimeout(400);
const fees = await page.locator('[data-testid="results"] .fee').evaluateAll((els) => els.map((e) => Number(e.textContent.replace(/[^0-9]/g, ''))));
check('Sort by fee is ascending', fees.every((f, i) => i === 0 || fees[i - 1] <= f), fees.join(' · '));

// 7 — rating sort
await page.getByTestId('sort-select').selectOption('rating');
await page.waitForTimeout(400);
const ratings = await page.locator('[data-testid="results"] .rating-line .value').evaluateAll((els) => els.map((e) => Number(e.textContent)));
check('Sort by rating is descending', ratings.every((r, i) => i === 0 || ratings[i - 1] >= r), ratings.join(' · '));

// 8 — review-count filter
await page.getByTestId('min-reviews-100').click();
await page.waitForTimeout(400);
const filteredCount = Number(await page.getByTestId('result-count').locator('strong').textContent());
const shown = await page.locator('[data-testid="results"] .rating-line .n').evaluateAll((els) => els.map((e) => Number(e.textContent.replace(/[^0-9]/g, ''))));
check('Filter by review volume (100+)', shown.length === filteredCount && shown.every((n) => n >= 100), `${filteredCount} results: ${shown.join(', ')}`);

// 9 — fee ceiling filter
await go('#/');
await page.getByTestId('fee-range').fill('1500');
await page.waitForTimeout(400);
const feesUnder = await page.locator('[data-testid="results"] .fee').evaluateAll((els) => els.map((e) => Number(e.textContent.replace(/[^0-9]/g, ''))));
check('Filter by maximum consultation fee', feesUnder.length > 0 && feesUnder.every((f) => f <= 1500), `≤₹1,500: ${feesUnder.join(', ')}`);

// 10 — verified toggle
await go('#/');
check('Verified-only filter is on by default', await page.getByTestId('verified-only').isChecked());

// 11 — profile page
await go('#/lawyer/anaya-rao');
check('Profile header renders', (await page.locator('h1').first().textContent()).includes('Anaya Rao'));
await page.getByTestId('tab-reviews').click();
await page.waitForTimeout(300);
const reviewCount = await page.getByTestId('review').count();
check('Reviews render with distribution', reviewCount === 5 && (await page.locator('.bar-row').count()) === 5, `${reviewCount} reviews shown`);
await page.screenshot({ path: `${OUT}02-profile-reviews.png` });
await page.getByTestId('review-filter-4').click();
await page.waitForTimeout(300);
const fourStar = await page.getByTestId('review').count();
check('Reviews filter by star rating', fourStar === 2, `${fourStar} four-star reviews`);
await page.getByTestId('tab-credentials').click();
await page.waitForTimeout(250);
check('Credentials tab lists checked documents', (await page.locator('.cred-item').count()) === 4);
await page.screenshot({ path: `${OUT}03-profile-credentials.png` });

// 12 — consultation modal makes the no-payments position explicit
await page.getByTestId('tab-about').click();
await page.getByTestId('request-consultation').click();
await page.waitForTimeout(250);
check('Consultation dialog states no payment is collected', (await page.locator('.modal').textContent()).includes('No payment is collected'));
await page.keyboard.press('Escape');

// 13 — lawyer submission flow
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

// validation guard
await page.getByTestId('step-next').click();
await page.waitForTimeout(200);
check('Required credentials block progress', (await page.locator('.error').count()) >= 3, `${await page.locator('.error').count()} field errors shown`);

await page.getByTestId('f-barcouncil').fill('Bar Council of Telangana');
await page.getByTestId('f-enrolment').fill('TS/2210/2017');
await page.getByTestId('f-education').fill('B.A. LL.B., NALSAR, 2016');
for (const doc of ['enrolment', 'degree', 'identity']) await page.getByTestId(`upload-${doc}`).click();
await page.getByTestId('step-next').click();
await page.waitForTimeout(250);
await page.getByTestId('area-Contracts').click();
await page.getByTestId('f-consultation').fill('2400');
await page.getByTestId('f-hourly').fill('6500');
await page.getByTestId('f-about').fill('I advise SaaS and fintech companies on data protection, processing agreements and technology contracts, and act on breach notifications.');
await page.getByTestId('step-next').click();
await page.waitForTimeout(250);
await page.screenshot({ path: `${OUT}04-submission-review.png` });
await page.getByTestId('submit-profile').click();
await page.waitForTimeout(500);
check('Submission confirmed to the lawyer', (await page.locator('h1').first().textContent()).includes('Submitted for verification'));

// 14 — not visible to visitors before approval
await go('#/');
const beforeApproval = await page.locator('[data-testid="results"] [data-testid="lawyer-card"]').evaluateAll((els) => els.map((e) => e.dataset.name));
check('Unverified submission stays out of the directory', !beforeApproval.includes('Rhea Malhotra'));

// 15 — admin review + approval
await go('#/admin');
await page.getByTestId('admin-pass').fill('wrong-passcode');
await page.getByTestId('admin-unlock').click();
await page.waitForTimeout(200);
check('Admin gate rejects a bad passcode', await page.locator('.field .error').isVisible());
await page.getByTestId('admin-pass').fill('lawden-admin');
await page.getByTestId('admin-unlock').click();
await page.waitForTimeout(350);
await page.getByTestId('queue-rhea-malhotra').click();
await page.waitForTimeout(250);
check('Approve is blocked until every check passes', await page.getByTestId('approve-btn').isDisabled());
await page.screenshot({ path: `${OUT}05-admin-queue.png` });
for (const id of ['identity', 'enrolment', 'degree', 'standing', 'practice', 'fees']) {
  await page.getByTestId(`check-${id}`).check();
}
await page.getByTestId('review-note').fill('Enrolment certificate matches the Telangana bar register. Fees complete.');
check('Approve unlocks once the checklist is complete', await page.getByTestId('approve-btn').isEnabled());
await page.getByTestId('approve-btn').click();
await page.waitForTimeout(250);
await page.getByTestId('confirm-action').click();
await page.waitForTimeout(500);

// 16 — approved profile now public and verified
await go('#/');
const afterApproval = await page.locator('[data-testid="results"] [data-testid="lawyer-card"]').evaluateAll((els) => els.map((e) => e.dataset.name));
check('Approved profile appears in the directory', afterApproval.includes('Rhea Malhotra'), `${afterApproval.length} listed`);
await go('#/lawyer/rhea-malhotra');
const newProfile = await page.locator('main').textContent();
check('New profile shows verified badge and no invented reviews',
  newProfile.includes('Verified') && newProfile.includes('no reviews yet'));

// 17 — admin can toggle premium placement
await go('#/admin');
await page.getByTestId('admin-pass').fill('lawden-admin');
await page.getByTestId('admin-unlock').click();
await page.waitForTimeout(300);
await page.getByTestId('tab-placement').click();
await page.waitForTimeout(250);
await page.getByTestId('promote-rhea-malhotra').check();
await page.waitForTimeout(300);
await go('#/');
const promotedAfter = await page.locator('[data-testid="promoted-strip"] [data-testid="lawyer-card"]').evaluateAll((els) => els.map((e) => e.dataset.name));
check('Admin-granted placement shows in the labelled promoted box', promotedAfter.includes('Rhea Malhotra'), promotedAfter.join(', '));
const organicAfterPromo = await page.locator('[data-testid="results"] [data-testid="lawyer-card"]').evaluateAll((els) => els.map((e) => e.dataset.name));
check('Paid placement does not move the lawyer up the ranked list',
  organicAfterPromo[0] !== 'Rhea Malhotra' && organicAfterPromo.includes('Rhea Malhotra'),
  `rank ${organicAfterPromo.indexOf('Rhea Malhotra') + 1} of ${organicAfterPromo.length}`);

// 18 — dark theme + mobile
await page.locator('.icon-btn').first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}06-directory-dark.png` });
check('Theme toggle switches the document theme', (await page.locator('html').getAttribute('data-theme')) === 'dark');
await page.locator('.icon-btn').first().click();

const mobile = await ctx.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto(`${BASE}/#/`, { waitUntil: 'networkidle' });
await mobile.waitForTimeout(500);
const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('No horizontal overflow at 390px', overflow <= 1, `${overflow}px overflow`);
await mobile.screenshot({ path: `${OUT}07-mobile.png`, fullPage: false });
await mobile.locator('.mobile-only').first().click();
await mobile.waitForTimeout(300);
check('Mobile filter drawer opens', await mobile.locator('.filters.open').isVisible());
await mobile.screenshot({ path: `${OUT}08-mobile-filters.png` });

// 19 — trust page
await go('#/trust');
check('Transparency page states the prototype disclaimer',
  (await page.locator('main').textContent()).includes('fictional sample data'));
await page.screenshot({ path: `${OUT}09-trust.png`, fullPage: false });

// 20 — console hygiene
const appErrors = errors.filter((e) => !/ERR_CERT_AUTHORITY_INVALID|fonts.googleapis/.test(e));
check('No application console or page errors during the run', appErrors.length === 0, appErrors.slice(0, 3).join(' / '));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
