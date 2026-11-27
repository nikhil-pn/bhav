// Sign the household agent in to amazon.in through Agent Vault.
// The owner saved the Amazon login in Agent Vault (Logins). The agent only ever holds
// mock tokens; Agent Vault's proxy browser types the real email and password. When Amazon
// asks for a one-time code, the live page is handed to the owner's phone and they type it.
import { chromium, tokensForUrl } from '@agentvault/playwright';
import { vaultEnv, API_URL } from './vault.mjs';

export const AMAZON = { home: 'https://www.amazon.in/', signin: 'https://www.amazon.in/ap/signin' };
const OTP_FIELDS = 'input[name="otpCode"], #auth-mfa-otpcode, #cvf-input-code, input[autocomplete="one-time-code"]';

/** The amazon.in login this key may use, as tokens only. */
export async function amazonLogin() {
  const { apiKey } = vaultEnv();
  const { logins = [], relatedLogins = [] } = await tokensForUrl(AMAZON.signin, { apiKey, baseUrl: API_URL });
  return logins[0] || relatedLogins.find((l) => /amazon\.in/.test(l.website || '')) || null;
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
  log('login_found', { login: login.name || login.website, hasTotp: !!login.hasTotp });

  const browser = await chromium.launch({ apiKey, proxyUrl });
  const page = await browser.newPage();
  const done = async (r) => { if (!o.keepOpen) await browser.close().catch(() => {}); return o.keepOpen ? { ...r, browser, page } : r; };
  try {
    await page.goto(AMAZON.home, { waitUntil: 'domcontentloaded' });
    await page.click('#nav-link-accountList');
    await page.waitForSelector('#ap_email, #ap_email_login, input[name="email"]', { state: 'visible', timeout: 20000 });
    const idField = (await page.locator('#ap_email_login').count()) ? '#ap_email_login' : (await page.locator('#ap_email').count()) ? '#ap_email' : 'input[name="email"]';
    await page.fill(idField, id);                      // a token; the proxy types the real value
    await page.click('#continue, input#continue, span#continue input');
    await page.waitForSelector('#ap_password', { state: 'visible', timeout: 20000 });
    await page.fill('#ap_password', login.tokens.password);
    await page.click('#signInSubmit');
    log('credentials_submitted');

    // Second factor: Amazon texts or emails a code to the owner. Only the owner types it.
    for (let i = 0; i < 2; i++) {
      await page.waitForTimeout(4000);
      const d = await page.detectChallenge({ ownerCode: true }).catch(() => ({ detected: false }));
      const codeField = await page.locator(OTP_FIELDS).count().catch(() => 0);
      if (login.hasTotp && codeField && !d.deliveredCode) { await page.fill(OTP_FIELDS, login.tokens.totp); await page.press(OTP_FIELDS, 'Enter'); continue; }
      if ((d.detected && !d.ambiguousOnly) || codeField || d.ownerCodeHandoffAllowed) {
        log('handoff_to_owner', { challenge: d.type || 'otp' });
        const h = await page.requestChallengeHandoff(d.detected && !d.ambiguousOnly ? {} : { reason: 'owner_code' });
        log('handoff_done', { outcome: h.outcome, seconds: Math.round(h.durationMs / 1000) });
        if (!['solved', 'completed'].includes(h.outcome)) return done({ signedIn: false, step: 'handoff_' + h.outcome, handoff: h });
      } else break;
    }

    // Signed in when Amazon greets by name and the sign-in form is gone.
    await page.goto(AMAZON.home, { waitUntil: 'domcontentloaded' });
    const greet = await page.locator('#nav-link-accountList-nav-line-1').textContent({ timeout: 15000 }).catch(() => '');
    const signedIn = !!greet && !/sign in/i.test(greet);
    log(signedIn ? 'signed_in' : 'not_signed_in');
    return done({ signedIn, step: signedIn ? 'signed_in' : 'not_signed_in' });
  } catch (e) {
    log('error', { code: e.code, message: String(e.message).slice(0, 200) });
    return done({ signedIn: false, step: 'error', code: e.code, message: String(e.message).slice(0, 300) });
  }
}
