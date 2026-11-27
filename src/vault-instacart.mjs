// The household agent's grocery account, opened and used through Agent Vault: instacart.com.
// Why Instacart: Agent Vault's open recipe registry lists it as a VERIFIED signup (account created
// and signed into through the proxy, 2026-10-05). amazon.in, our first choice, answers the proxy's
// sign-in with an automated-access block page, and Agent Vault never gets past bot walls.
//
// Instacart is passwordless: email, Continue, then a code Instacart emails to the account holder.
// The agent never types that code: the live page is handed to the owner, who types it on their phone.
//   signUp(): ask Agent Vault for a login (owner approves in the dashboard), then open the account.
//   signIn(): sign in to the existing account in a fresh proxy session.
import { chromium, tokensForUrl, createLogin, awaitSignupApproval } from '@agentvault/playwright';
import { vaultEnv, API_URL } from './vault.mjs';

export const INSTACART = {
  site: 'instacart.com',
  signup: 'https://www.instacart.com/signup',
  login: 'https://www.instacart.com/login',
  account: 'https://www.instacart.com/store/account',
};
const EMAIL = 'input[name="email"]';
const CODE = 'input[autocomplete="one-time-code"]';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The instacart.com login this key may use (tokens only), or null. */
export async function instacartLogin() {
  const { apiKey } = vaultEnv();
  const { logins = [] } = await tokensForUrl(INSTACART.login, { apiKey, baseUrl: API_URL });
  return logins[0] || null;
}

/** File a signup request; the owner approves it in Agent Vault. Returns the approved login (tokens only). */
export async function requestInstacartLogin(email, { log = () => {}, timeoutMs = 15 * 60_000 } = {}) {
  const { apiKey } = vaultEnv();
  const existing = await instacartLogin();
  if (existing) return existing;
  const { requestId, status } = await createLogin({ website: INSTACART.site, email, apiKey, baseUrl: API_URL });
  log('signup_requested', { status });
  const { login } = await awaitSignupApproval({ requestId, apiKey, baseUrl: API_URL, timeoutMs });
  log('signup_approved');
  return login;
}

/** Email → Continue → code (owner, via handoff). Shared by sign-up and sign-in: Instacart uses one flow. */
async function emailCodeFlow(page, login, url, log) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(EMAIL, { state: 'visible', timeout: 30000 });
  await page.fill(EMAIL, login.tokens.email);           // a token; the proxy types the real address
  await page.click('button:has-text("Continue")');      // the page also has "Log in": press Continue
  log('email_submitted');
  // Instacart may put a reCAPTCHA in front of the code. A human check is the owner's: hand the live
  // page to their phone (Agent Vault streams it), they solve it, the agent carries on.
  let h = null;
  for (let i = 0; i < 12; i++) {
    if (await page.locator(CODE).count().catch(() => 0)) break;
    const d = await page.detectChallenge({ ownerCode: true }).catch(() => ({ detected: false }));
    if (d.detected && !d.ambiguousOnly && (d.types || [d.type]).includes('captcha')) {
      log('captcha_to_owner');
      h = await page.requestChallengeHandoff();
      log('owner_finished_captcha', { outcome: h.outcome, seconds: Math.round(h.durationMs / 1000) });
      if (!['solved', 'completed'].includes(h.outcome)) return h;
    }
    await sleep(5000);
  }
  // The owner may have typed the code during the same handoff; if a code box is still showing, hand it over.
  if (await page.locator(CODE).count().catch(() => 0)) {
    log('code_sent_to_owner');
    h = await page.requestChallengeHandoff({ reason: 'owner_code' });
    log('owner_typed_code', { outcome: h.outcome, seconds: Math.round(h.durationMs / 1000) });
  }
  return h ?? { outcome: 'completed', durationMs: 0 };
}

async function isSignedIn(page) {
  await page.goto(INSTACART.account, { waitUntil: 'domcontentloaded' });
  await sleep(4000);
  const seen = await page.observe().catch(() => ({}));
  const emailBox = await page.locator(EMAIL).count().catch(() => 0);
  const loginBtn = await page.locator('a[href*="/login"], button:has-text("Log in")').count().catch(() => 0);
  return { signedIn: !emailBox && !seen.signInPrompt && !seen.contactField && !loginBtn, seen };
}

async function run(kind, o) {
  const log = o.log ?? (() => {});
  const { apiKey, proxyUrl } = vaultEnv();
  const login = kind === 'signup' ? await requestInstacartLogin(o.email, { log }) : await instacartLogin();
  if (!login) return { signedIn: false, step: 'no_login', message: 'No instacart.com login in Agent Vault yet: run the sign-up first.' };
  if (!login.tokens?.email) return { signedIn: false, step: 'login_incomplete', message: 'The instacart.com login has no email on file.' };
  const browser = await chromium.launch({ apiKey, proxyUrl });
  const page = await browser.newPage();
  try {
    const h = await emailCodeFlow(page, login, kind === 'signup' ? INSTACART.signup : INSTACART.login, log);
    if (!['solved', 'completed'].includes(h.outcome)) return { signedIn: false, step: 'handoff_' + h.outcome };
    const { signedIn } = await isSignedIn(page);
    log(signedIn ? 'signed_in' : 'not_signed_in');
    return { signedIn, step: signedIn ? 'signed_in' : 'not_signed_in' };
  } catch (e) {
    log('error', { code: e.code, message: String(e.message).slice(0, 200) });
    return { signedIn: false, step: 'error', code: e.code, message: String(e.message).slice(0, 300) };
  } finally {
    await browser.close().catch(() => {});
  }
}

/** @param {{ email: string, log?: Function }} o */
export const signUpToInstacart = (o) => run('signup', o);
/** @param {{ log?: Function }} [o] */
export const signInToInstacart = (o = {}) => run('signin', o);
