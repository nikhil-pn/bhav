// Bhav as an MCP server: any MCP agent (Claude Code, Claude Desktop, Cursor, Codex…) gets Bhav as tools.
// The agent's own key signs each request with its Self Agent ID and pays x402 under a hard cap,
// exactly like src/buyer.mjs. The key stays in a local file; the model never sees it.
//
//   npm run agent:new && npm run agent:link            # once: your agent key + Self Agent ID
//   claude mcp add bhav -- node /path/to/bhav/src/mcp.mjs
//
// Env: BHAV_BUYER_ENV (default ./my-agent.env next to the repo), BHAV_URL, BHAV_BUYER_MAX (USDC base units, default 20000 = $0.02)
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createBuyerFetch, readReceipt } from './agent.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.BHAV_URL || 'https://devbox.tail84790b.ts.net').replace(/\/+$/, '');
const KEY_FILE = (() => { const f = process.env.BHAV_BUYER_ENV || 'my-agent.env'; return isAbsolute(f) ? f : join(ROOT, f); })();

let buyer = null;
function getBuyer() {
  if (buyer) return buyer;
  if (!existsSync(KEY_FILE)) throw new Error(`No agent key at ${KEY_FILE}. Run "npm run agent:new" and "npm run agent:link" in the bhav folder first (see docs/JOIN.md).`);
  const key = readFileSync(KEY_FILE, 'utf8').match(/^BUYER_PRIVATE_KEY=(.*)$/m)?.[1]?.trim();
  if (!key) throw new Error(`${KEY_FILE} has no BUYER_PRIVATE_KEY line.`);
  buyer = createBuyerFetch({ privateKey: key, net: 'mainnet', maxPerPayment: process.env.BHAV_BUYER_MAX || '20000' });
  return buyer;
}

const text = (o) => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 2) }] });

export function createServer() {
  const server = new McpServer({ name: 'bhav', version: '1.0.0' }, {
    instructions: 'Bhav gives the cheapest live grocery price in Kochi, India across Zepto, Blinkit and Instamart. '
      + 'Use get_price for any grocery item (e.g. "eggs 30", "chicken curry cut", "milk 1 litre"). '
      + 'Three answers a day per human are free; after that each answer costs $0.01 USDC on Celo, paid automatically (never more than $0.02).',
  });

  server.registerTool('get_price', {
    title: 'Cheapest grocery price in Kochi',
    description: 'Checks Zepto, Blinkit and Instamart live for one item and returns the cheapest offer, its price per kg or per piece, '
      + 'whether that is a deal against the usual price, and the other offers. Signed with your Self Agent ID; may pay $0.01 USDC over x402.',
    inputSchema: { item: z.string().min(2).max(60).describe('The grocery item, with size or count if it matters, e.g. "eggs 30"') },
  }, async ({ item }) => {
    try {
      const res = await getBuyer().fetch(`${BASE}/v1/quote?q=${encodeURIComponent(item)}`);
      const body = await res.json().catch(() => ({}));
      if (res.status === 403) return text(`Refused: ${body.reason || body.error}. Your agent needs a Self Agent ID: run "npm run agent:link" and confirm in the Self app.`);
      if (res.status === 402) return text('Payment needed but not made: fund your agent address with USDC on Celo (docs/JOIN.md step 5).');
      if (!res.ok) return text(`Bhav answered ${res.status}: ${body.message || body.error || 'error'}`);
      const r = readReceipt(res);
      return text({
        answer: body.answer,
        cheapest: body.best ?? body.offers?.[0],
        otherOffers: (body.offers || []).slice(1, 6),
        billing: body.billing,
        paymentTx: r?.transaction ? `https://celoscan.io/tx/${r.transaction}` : undefined,
      });
    } catch (e) {
      return text(`Could not ask Bhav: ${e.message}`);
    }
  });

  server.registerTool('my_agent', {
    title: 'My Bhav agent',
    description: 'Shows this agent\'s address (fund it with USDC on Celo for paid answers) and whether Bhav is up.',
    inputSchema: {},
  }, async () => {
    let address = null; let problem = null;
    try { address = getBuyer().address; } catch (e) { problem = e.message; }
    const health = await fetch(`${BASE}/health`).then((r) => r.json()).catch(() => null);
    return text({ agentAddress: address, problem, bhav: health ? { up: true, price: health.price, freePerHumanPerDay: health.freePerDay } : { up: false } });
  });

  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await createServer().connect(new StdioServerTransport());
}
