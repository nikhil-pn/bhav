// Sign the household agent in to amazon.in through Agent Vault.
// The owner saved the Amazon login in Agent Vault (Logins). The agent only ever holds
// mock tokens; Agent Vault's proxy browser types the real email and password. When Amazon
// asks for a one-time code, the live page is handed to the owner's phone and they type it.
// Agent Vault's page object is a cut-down Playwright page (no url(), textContent() or
// waitForTimeout()): the agent reads the page through observe(), which reports flags such as
// passwordField / codeSent / signInPrompt / accountControl and never the values filled.
import { chromium, tokensForUrl } from '@agentvault/playwright';
import { vaultEnv, API_URL } from './vault.mjs';

const OPENID = 'openid.pape.max_auth_age=0&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select'
  + '&openid.assoc_handle=inflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select'
  + '&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0';
export const AMAZON = {
  // Straight to the sign-in form: the home page sits behind an AWS WAF check that hides the account menu.
  signin: `https://www.amazon.in/ap/signin?${OPENID}&openid.return_to=${encodeURIComponent('https://www.amazon.in/gp/css/homepage.html')}`,
  account: 'https://www.amazon.in/gp/css/homepage.html',
};
const ID_FIELDS = ['#ap_email_login', '#ap_email', 'input[name="email"]'];
const OTP_FIELDS = 'input[name="otpCode"], #auth-mfa-otpcode, #cvf-input-code, input[autocomplete="one-time-code"]';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The amazon.in login this key may use, as tokens only. */
export async function amazonLogin() {
  const { apiKey } = vaultEnv();
  const { logins = [], relatedLogins = [] } = await tokensForUrl('https://www.amazon.in/ap/signin', { apiKey, baseUrl: API_URL });
  return logins[0] || relatedLogins.find((l) => /amazon\.in/.test(l.website || '')) || null;
}

async function firstPresent(page, selectors) {
  for (const s of selectors) if (await page.locator(s).count().catch(() => 0)) return s;
  return null;
}

/**
 * @param {{ log?: (step:string, detail?:object)=>void, keepOpen?: boolean }} [o]
 * @returns {Promise<{ signedIn: boolean, step: string, handoff?: object, browser?: object, page?: object }>}
 */
export async function signInToAmazon(o = {}) {
  const log = o.log ?? (() => {});
  const { apiKey, proxyUrl } = vaultEnv();
  const login = await amazonLogin();
  if (!login) return { signedIn: false, step: 'no_login', message: 'No amazon.in login in Agent Vault. The owner adds it under Logins (website amazon.in).' };
  const id = login.tokens.email || login.tokens.username; // Amazon's field takes "mobile number or email"
  if (!id || !login.tokens.password) return { signedIn: false, step: 'login_incomplete', message: 'The amazon.in login needs an email or mobile number and a password.' };
  log('login_found', { site: login.website, hasTotp: !!login.hasTotp });

  const browser = await chromium.launch({ apiKey, proxyUrl });
  const page = await browser.newPage();
  const done = async (r) => { if (!o.keepOpen) await browser.close().catch(() => {}); return o.keepOpen ? { ...r, browser, page } : r; };
  try {
    await page.goto(AMAZON.signin, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(ID_FIELDS.join(', '), { state: 'visible', timeout: 30000 });
    const idField = await firstPresent(page, ID_FIELDS);
    await page.fill(idField, id);                       // a token; the proxy types the real value
    await page.click('#continue');
    log('identifier_submitted');
    await page.waitForSelector('#ap_password', { state: 'visible', timeout: 30000 });
    await page.fill('#ap_password', login.tokens.password);
    await page.click('#signInSubmit');
    log('password_submitted');

    // Second factor: Amazon texts or emails a code to the owner. Only the owner types it.
    for (let i = 0; i < 3; i++) {
      await sleep(5000);
      const seen = await page.observe().catch(() => ({}));
      if (seen.accountControl && !seen.signInPrompt) break;
      const d = await page.detectChallenge({ ownerCode: true }).catch(() => ({ detected: false }));
      const codeField = await page.locator(OTP_FIELDS).count().catch(() => 0);
      if (login.hasTotp && codeField && !d.deliveredCode) {
        await page.fill(OTP_FIELDS, login.tokens.totp); await page.press(OTP_FIELDS, 'Enter'); log('totp_filled'); continue;
      }
      if ((d.detected && !d.ambiguousOnly) || codeField || seen.codeSent || d.ownerCodeHandoffAllowed) {
        log('handoff_to_owner', { challenge: d.types?.join(',') || (seen.codeSent ? 'code_sent' : 'otp') });
        const h = await page.requestChallengeHandoff(d.detected && !d.ambiguousOnly ? {} : { reason: 'owner_code' });
        log('handoff_done', { outcome: h.outcome, seconds: Math.round(h.durationMs / 1000) });
        if (!['solved', 'completed'].includes(h.outcome)) return done({ signedIn: false, step: 'handoff_' + h.outcome, handoff: h });
        continue;
      }
      if (seen.error) { log('site_error', { errorText: seen.errorText }); return done({ signedIn: false, step: 'site_error', message: (seen.errorText || []).join(' ') }); }
    }

    // Amazon may instead push "Was this you?" to the owner's Amazon app: a page with no field at all.
    // Wait for the owner to approve it on their phone (up to approveWaitMs), watching for the page to move on.
    const until = Date.now() + (o.approveWaitMs ?? 180000);
    let announced = false;
    while (Date.now() < until) {
      const seen = await page.observe().catch(() => ({}));
      const orders = await page.locator('a[href*="order-history"], #nav-link-accountList').count().catch(() => 0);
      if (orders || seen.accountControl) break;
      if (seen.codeSent || (await page.locator(OTP_FIELDS).count().catch(() => 0))) {
        log('handoff_to_owner', { challenge: 'code' });
        const h = await page.requestChallengeHandoff({ reason: 'owner_code' });
        log('handoff_done', { outcome: h.outcome, seconds: Math.round(h.durationMs / 1000) });
        break;
      }
      if (!announced) { log('waiting_for_owner_approval', { where: 'Amazon app / SMS on the owner\'s phone' }); announced = true; }
      await sleep(5000);
    }

    // Signed in when the account page opens without asking to sign in.
    await page.goto(AMAZON.account, { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    const seen = await page.observe().catch(() => ({}));
    const signInForm = await page.locator('form[name="signIn"]').count().catch(() => 0);
    // A positive marker too: only a signed-in account page links to the order history.
    const orders = await page.locator('a[href*="order-history"], a[href*="your-orders"]').count().catch(() => 0);
    const signedIn = !signInForm && !seen.signInPrompt && !seen.passwordField && !seen.contactField && orders > 0;
    log(signedIn ? 'signed_in' : 'not_signed_in', { orderLinks: orders, signInForm });
    return done({ signedIn, step: signedIn ? 'signed_in' : 'not_signed_in' });
  } catch (e) {
    log('error', { code: e.code, message: String(e.message).slice(0, 200) });
    return done({ signedIn: false, step: 'error', code: e.code, message: String(e.message).slice(0, 300) });
  }
}
