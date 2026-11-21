// Shared Celo clients for Bhav scripts. Every wallet client is built with our
// attribution tag, so no transaction can leave untagged.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo, celoSepolia } from 'viem/chains';
import { withAttribution } from '@celo/attribution-tags';

export const TAG = 'celo_bc5d483f879e';

// Secrets live outside the repo: ~/.config/pi/bhav.env (chmod 600).
function loadEnv(path = `${homedir()}/.config/pi/bhav.env`) {
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

export const NETWORKS = {
  mainnet: {
    chain: celo,
    rpc: 'https://forno.celo.org',
    identityRegistry: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    explorer: 'https://celoscan.io',
  },
  testnet: {
    chain: celoSepolia,
    rpc: 'https://forno.celo-sepolia.celo-testnet.org',
    identityRegistry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    explorer: 'https://celo-sepolia.blockscout.com',
  },
};

export function clients(network = process.env.BHAV_NETWORK || 'testnet') {
  const net = NETWORKS[network];
  if (!net) throw new Error(`unknown network ${network}`);
  const env = loadEnv();
  const account = privateKeyToAccount(env.BHAV_AGENT_PRIVATE_KEY);
  const transport = http(net.rpc);
  const publicClient = createPublicClient({ chain: net.chain, transport });
  const walletClient = createWalletClient({ account, chain: net.chain, transport })
    .extend(withAttribution(TAG));
  return { net, network, account, publicClient, walletClient };
}
