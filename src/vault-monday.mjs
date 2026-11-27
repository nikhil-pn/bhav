// The household agent opens the family's grocery board on monday.com through Agent Vault,
// and ends up signed in to it, without ever holding the password.
// Why monday.com: Agent Vault's open recipe registry lists its signup as VERIFIED with no human
// step at all (no code, link or CAPTCHA), so the agent can finish on its own. Our first two choices
// stopped at bot walls the agent does not try to pass: amazon.in (automated-access block page after
// the password) and instacart.com (reCAPTCHA before the email code; the owner's live page dropped).
//
// Flow (registry recipe, verified 2026-09-30): email + Enter → details (name, account name, password,
// "what will you use monday for") → submit → onboarding "Continue" pages → the workspace loads, signed in.
// The password is minted inside Agent Vault when the owner approves the login; nobody ever sees it.
import { chromium, tokensForUrl, createLogin, awaitSignupApproval } from '@agentvault/playwright';
import { vaultEnv, API_URL } from './vault.mjs';

export const MONDAY = {
  site: 'monday.com',
  signup: 'https://auth.monday.com/users/sign_up_new',
  sel: {
    email: '#user\\[email\\]', name: '#user\\[name\\]', account: 'input[id*="account" i]',
    password: '#user\\[password\\]', submit: '[data-testid="submit-button"]',
  },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function mondayLogin() {
  const { apiKey } = vaultEnv();
  const { logins = [] } = await tokensForUrl('https://auth.monday.com/login', { apiKey, baseUrl: API_URL });
  return logins[0] || null;
}

/** Ask Agent Vault for a monday.com login; the owner approves it in the dashboard. Tokens only. */
export async function requestMondayLogin(email, { log = () => {}, timeoutMs = 15 * 60_000 } = {}) {
  const { apiKey } = vaultEnv();
  const existing = await mondayLogin();
  if (existing) return existing;
  const { requestId, status } = await createLogin({ website: MONDAY.site, email, apiKey, baseUrl: API_URL });
  log('signup_requested', { status });
  const { login } = await awaitSignupApproval({ requestId, apiKey, baseUrl: API_URL, timeoutMs });
  log('signup_approved');
  return login;
}

/** Signed in = the monday.com workspace is on screen, no sign-up or sign-in form left. */
async function inWorkspace(page) {
  const forms = await page.locator(`${MONDAY.sel.email}, ${MONDAY.sel.password}, input[type="password"]`).count().catch(() => 0);
  const workspace = await page.locator('#surface, [data-testid*="board" i], [class*="leftpane" i], [aria-label*="workspace" i], text=/Invite (your )?teammates|Add item|Main table/i').count().catch(() => 0);
  return { signedIn: !forms && workspace > 0, forms, workspace };
}

/**
 * @param {{ email: string, fullName?: string, accountName?: string, log?: Function }} o
 * @returns {Promise<{ signedIn: boolean, step: string, message?: string }>}
 */
export async function openGroceryBoard(o) {
  const log = o.log ?? (() => {});
  const { apiKey, proxyUrl } = vaultEnv();
  const login = await requestMondayLogin(o.email, { log });
  if (!login?.tokens?.email || !login.tokens.password) return { signedIn: false, step: 'login_incomplete' };
  const browser = await chromium.launch({ apiKey, proxyUrl });
  const page = await browser.newPage();
  const { sel } = MONDAY;
  try {
    await page.goto(MONDAY.signup, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(sel.email, { state: 'visible', timeout: 30000 });
    await page.fill(sel.email, login.tokens.email);       // token; the proxy types the real address
    await page.press(sel.email, 'Enter');
    log('email_submitted');
    await page.waitForSelector(sel.name, { state: 'visible', timeout: 30000 });
    await page.fill(sel.name, o.fullName ?? 'Bhav Household');
    if (await page.locator(sel.account).count()) await page.fill(sel.account, o.accountName ?? 'Bhav groceries');
    await page.fill(sel.password, login.tokens.password); // token; minted in the vault, seen by nobody
    await page.click('[role="combobox"]');
    await page.click('[role="option"]:has-text("Personal")').catch(async () => page.locator('[role="option"]').first().click());
    await page.click(sel.submit);
    log('details_submitted');

    // Onboarding pages: Continue until the workspace loads (the account exists only after them).
    for (let i = 0; i < 10; i++) {
      await sleep(4000);
      const state = await inWorkspace(page);
      if (state.signedIn) { log('signed_in', state); return { signedIn: true, step: 'signed_in' }; }
      const cont = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Skip")');
      if (await cont.count().catch(() => 0)) { await cont.first().click().catch(() => {}); log('onboarding_continue', { page: i + 1 }); }
      const seen = await page.observe().catch(() => ({}));
      if (seen.error) { log('site_error', { errorText: seen.errorText }); return { signedIn: false, step: 'site_error', message: (seen.errorText || []).join(' ') }; }
    }
    const state = await inWorkspace(page);
    log(state.signedIn ? 'signed_in' : 'not_signed_in', state);
    return { signedIn: state.signedIn, step: state.signedIn ? 'signed_in' : 'not_signed_in' };
  } catch (e) {
    log('error', { code: e.code, message: String(e.message).slice(0, 200) });
    return { signedIn: false, step: 'error', code: e.code, message: String(e.message).slice(0, 300) };
  } finally {
    await browser.close().catch(() => {});
  }
}
