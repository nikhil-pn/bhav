// One shared headless browser for every store. Launching Chrome is the slow part
// (~1-2 s), so it is started once, lazily, and closed after a quiet spell.
//
// Playwright is not a dependency of this repo. We try a normal import first, then
// fall back to a copy installed elsewhere on the machine (BHAV_PLAYWRIGHT_DIR, or a
// few known spots on devbox) through createRequire.

import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const IDLE_CLOSE_MS = Number(process.env.BHAV_BROWSER_IDLE_MS || 5 * 60 * 1000);

/** Real desktop Chrome passes the stores' bot checks more reliably than bundled Chromium. */
const SYSTEM_CHROME = process.env.BHAV_CHROME || '/opt/google/chrome/chrome';

export const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36';

let chromiumPromise = null;
let browserPromise = null;
let idleTimer = null;
const onClose = new Set();

async function loadChromium() {
  for (const name of ['playwright', 'playwright-core']) {
    try { return (await import(name)).chromium; } catch { /* not resolvable from here */ }
  }
  const dirs = [process.env.BHAV_PLAYWRIGHT_DIR].filter(Boolean);
  for (const dir of dirs) {
    const req = createRequire(join(dir, 'package.json'));
    for (const name of ['playwright', 'playwright-core']) {
      try { return req(name).chromium; } catch { /* try next */ }
    }
  }
  throw new Error('playwright not found: npm i playwright, or set BHAV_PLAYWRIGHT_DIR to a folder that has it');
}

function armIdleClose() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { closeBrowser().catch(() => {}); }, IDLE_CLOSE_MS);
  idleTimer.unref?.();
}

/**
 * Get the shared browser, launching it on first use.
 * @returns {Promise<import('playwright').Browser>}
 */
export async function getBrowser() {
  armIdleClose();
  if (!browserPromise) {
    browserPromise = (async () => {
      chromiumPromise ??= loadChromium();
      const chromium = await chromiumPromise;
      const opts = {
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
      };
      if (existsSync(SYSTEM_CHROME)) opts.executablePath = SYSTEM_CHROME;
      const browser = await chromium.launch(opts);
      browser.on('disconnected', () => { browserPromise = null; onClose.forEach((f) => f()); });
      return browser;
    })().catch((e) => { browserPromise = null; throw e; });
  }
  return browserPromise;
}


/** Register a callback run when the browser goes away (stores drop their contexts). */
export function onBrowserClose(fn) { onClose.add(fn); }

/** Close the shared browser (call before process exit in scripts). */
export async function closeBrowser() {
  clearTimeout(idleTimer);
  const p = browserPromise;
  browserPromise = null;
  if (p) { try { await (await p).close(); } catch { /* already gone */ } }
}

/**
 * Open a page, collect every JSON response whose URL contains `apiPath` (or matches it, if a RegExp), run
 * `drive(page)` to make the page fire its search, then wait until at least one
 * response arrived (or `waitMs` passes). The page is always closed.
 * @param {import('playwright').BrowserContext} ctx
 * @param {string|RegExp} apiPath
 * @param {(page: import('playwright').Page) => Promise<void>} drive
 * @param {{waitMs?: number, settleMs?: number}} [opts]
 * @returns {Promise<object[]>} captured JSON bodies
 */
export async function captureJson(ctx, apiPath, drive, { waitMs = 12000, settleMs = 1500 } = {}) {
  const page = await ctx.newPage();
  const bodies = [];
  const pending = [];
  page.on('response', (resp) => {
    const url = resp.url();
    if (typeof apiPath === 'string' ? !url.includes(apiPath) : !apiPath.test(url)) return;
    pending.push(resp.json().then((j) => bodies.push(j), () => {}));
  });
  try {
    await drive(page);
    const until = Date.now() + waitMs;
    while (bodies.length === 0 && Date.now() < until) await page.waitForTimeout(400);
    if (bodies.length) await page.waitForTimeout(settleMs); // let paged/extra responses land
    await Promise.allSettled(pending);
    return bodies;
  } finally {
    await page.close().catch(() => {});
  }
}
