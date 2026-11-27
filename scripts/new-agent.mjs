// Make a fresh agent key for a new Bhav user (your own agent, your own wallet).
// Usage: npm run agent:new            → writes my-agent.env (chmod 600, git-ignored) and prints its address
// The key stays on your machine. Next: `npm run agent:link` (Self Agent ID) and fund the address with USDC on Celo.
import { existsSync, writeFileSync, readFileSync, chmodSync } from 'node:fs';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const FILE = process.env.BHAV_BUYER_ENV || 'my-agent.env';
if (existsSync(FILE)) {
  const key = readFileSync(FILE, 'utf8').match(/^BUYER_PRIVATE_KEY=(.*)$/m)?.[1]?.trim();
  console.log(`${FILE} already exists. Your agent address: ${key ? privateKeyToAccount(key).address : '(no key found in the file)'}`);
  process.exit(0);
}
const key = generatePrivateKey();
writeFileSync(FILE, `# Your Bhav agent's private key. Never share this file.\nBUYER_PRIVATE_KEY=${key}\n`, { mode: 0o600 });
chmodSync(FILE, 0o600);
const { address } = privateKeyToAccount(key);
console.log(`New agent key saved to ${FILE} (only you can read it).

Your agent address: ${address}

Next:
  1. npm run agent:link      → open the link on your phone and confirm in the Self app
  2. send 0.10 USDC on Celo (from your own wallet) to ${address}
  3. npm run ask -- "eggs 30"`);
