// The Instacart sign-in flow against a fake Agent Vault page that behaves the way the live one did on
// 28 Nov 2026: email, Continue, a reCAPTCHA handed to the owner, sometimes an email code after it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailCodeFlow, INSTACART } from '../src/vault-instacart.mjs';

const login = { tokens: { email: 'av_login_instacart_email_x1', password: 'av_login_instacart_password_x1' } };

function fakePage({ captcha = true, codeAfter = false, outcomes = ['solved'] } = {}) {
  const calls = [];
  let captchaUp = captcha, codeUp = false;
  const count = (sel) => (sel.includes('one-time-code') ? (codeUp ? 1 : 0) : 1);
  return {
    calls,
    goto: async (u) => calls.push(['goto', u]),
    waitForSelector: async () => {},
    fill: async (sel, v) => calls.push(['fill', sel, v]),
    click: async (sel) => calls.push(['click', sel]),
    locator: (sel) => ({ count: async () => count(sel) }),
    detectChallenge: async () => (captchaUp ? { detected: true, type: 'captcha', types: ['captcha'] } : { detected: false, types: [] }),
    requestChallengeHandoff: async (opts = {}) => {
      calls.push(['handoff', opts.reason || 'challenge']);
      const outcome = outcomes.shift() ?? 'solved';
      if (outcome === 'solved' || outcome === 'completed') { if (captchaUp) { captchaUp = false; codeUp = codeAfter; } else codeUp = false; }
      return { outcome, challengeType: 'captcha', durationMs: 1000 };
    },
  };
}

test('captcha goes to the owner; the agent carries on once it is solved', async () => {
  const p = fakePage();
  const h = await emailCodeFlow(p, login, INSTACART.signup, undefined, { pollMs: 1 });
  assert.equal(h.outcome, 'solved');
  assert.deepEqual(p.calls.filter((c) => c[0] === 'handoff'), [['handoff', 'challenge']]);
});

test('an email code after the captcha is the owner\'s too, never typed by the agent', async () => {
  const p = fakePage({ codeAfter: true });
  await emailCodeFlow(p, login, INSTACART.signup, undefined, { pollMs: 1 });
  assert.deepEqual(p.calls.filter((c) => c[0] === 'handoff').map((c) => c[1]), ['challenge', 'owner_code']);
  const fills = p.calls.filter((c) => c[0] === 'fill');
  assert.equal(fills.length, 1, 'the agent fills only the email');
  assert.equal(fills[0][2], login.tokens.email, 'and only as an Agent Vault token');
});

test('a page released with the captcha still up stops the flow (first try on 28 Nov)', async () => {
  const p = fakePage({ outcomes: ['released_unsolved'] });
  const h = await emailCodeFlow(p, login, INSTACART.signup, undefined, { pollMs: 1 });
  assert.equal(h.outcome, 'released_unsolved');
  assert.equal(p.calls.filter((c) => c[0] === 'handoff').length, 1, 'no second handoff on its own');
});

test('no captcha at all: no handoff, nothing asked of the owner', async () => {
  const p = fakePage({ captcha: false });
  const h = await emailCodeFlow(p, login, INSTACART.login, undefined, { pollMs: 1 });
  assert.equal(h.outcome, 'completed');
  assert.equal(p.calls.filter((c) => c[0] === 'handoff').length, 0);
});

test('it presses Continue, not "Log in" (the page has both)', async () => {
  const p = fakePage({ captcha: false });
  await emailCodeFlow(p, login, INSTACART.signup, undefined, { pollMs: 1 });
  assert.deepEqual(p.calls.find((c) => c[0] === 'click'), ['click', 'button:has-text("Continue")']);
});
