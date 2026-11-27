// The MCP server, driven by a real MCP client over an in-memory transport.
import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.BHAV_BUYER_ENV = '/nonexistent/bhav-test-key.env';
process.env.BHAV_URL = 'http://127.0.0.1:9';   // nothing listens: health shows down, no network needed
const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
const { createServer } = await import('../src/mcp.mjs');

async function connect() {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '1.0.0' });
  await Promise.all([createServer().connect(a), client.connect(b)]);
  return client;
}

test('an MCP agent sees the two Bhav tools with clear descriptions', async () => {
  const c = await connect();
  const { tools } = await c.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ['get_price', 'my_agent']);
  const gp = tools.find((t) => t.name === 'get_price');
  assert.match(gp.description, /Zepto, Blinkit and Instamart/);
  assert.deepEqual(gp.inputSchema.required, ['item']);
});

test('without an agent key, the tool tells the agent exactly what to run', async () => {
  const c = await connect();
  const r = await c.callTool({ name: 'get_price', arguments: { item: 'eggs 30' } });
  assert.match(r.content[0].text, /npm run agent:new/);
  const me = JSON.parse((await c.callTool({ name: 'my_agent', arguments: {} })).content[0].text);
  assert.equal(me.agentAddress, null);
  assert.match(me.problem, /agent:link/);
  assert.deepEqual(me.bhav, { up: false });
});

test('the item is validated before anything is sent', async () => {
  const c = await connect();
  const r = await c.callTool({ name: 'get_price', arguments: { item: 'x' } }).catch((e) => ({ isError: true, e }));
  assert.equal(r.isError, true);
});
