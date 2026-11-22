// Link a real human (Self app proof) to Bhav's OWN agent key on the Self Agent ID registry.
// Wallet-free mode, built locally like the official `self-agent` CLI does, but with our
// existing key (agent #10088's wallet) instead of a freshly generated one. The key never
// leaves this machine: the QR only carries the agent address and a signature.
//
// Any agent key: BHAV_ENV_FILE=~/.config/pi/bhav-buyer.env registers the household buyer agent.
// Usage:
//   BHAV_NETWORK=mainnet node scripts/self-register.mjs link     # prints the URL to open/scan
//   BHAV_NETWORK=mainnet node scripts/self-register.mjs status   # checks the registry
import {
  NETWORKS as SELF_NETWORKS,
  signRegistrationChallenge,
  buildWalletFreeRegisterUserDataAscii,
} from '@selfxyz/agent-sdk';
import { createPublicClient, http, pad, parseAbi } from 'viem';
import { clients } from './chain.mjs';

const network = process.env.BHAV_NETWORK || 'testnet';
const self = SELF_NETWORKS[network];
const chainId = network === 'mainnet' ? 42220 : 11142220;
// Aadhaar proves "a unique human" and age; it cannot pass OFAC, so we ask for age 18 only.
const disclosures = { minimumAge: 18 };

const abi = parseAbi([
  'function agentNonces(address agent) view returns (uint256)',
  'function isVerifiedAgent(bytes32 agentPubKey) view returns (bool)',
  'function getAgentId(bytes32 agentPubKey) view returns (uint256)',
  'function hasHumanProof(uint256 agentId) view returns (bool)',
  'function isProofFresh(uint256 agentId) view returns (bool)',
  'function proofExpiresAt(uint256 agentId) view returns (uint256)',
]);

const { account } = clients(network);
const reader = createPublicClient({ transport: http(self.rpcUrl) });
const read = (functionName, args) =>
  reader.readContract({ address: self.registryAddress, abi, functionName, args });
const pubKey = pad(account.address, { size: 32 });

const cmd = process.argv[2] || 'status';
if (cmd === 'status') {
  const agentId = await read('getAgentId', [pubKey]);
  const verified = await read('isVerifiedAgent', [pubKey]);
  console.log(`network ${network} · agent ${account.address} · selfAgentId ${agentId} · verified ${verified}`);
  if (agentId > 0n) {
    const [human, fresh, exp] = await Promise.all([
      read('hasHumanProof', [agentId]), read('isProofFresh', [agentId]), read('proofExpiresAt', [agentId]),
    ]);
    console.log(`hasHumanProof ${human} · isProofFresh ${fresh} · expires ${new Date(Number(exp) * 1000).toISOString()}`);
  }
} else if (cmd === 'link') {
  const nonce = await read('agentNonces', [account.address]);
  // Wallet-free: the "human identifier" is the agent address itself.
  const { readFileSync } = await import('node:fs');
  const { homedir } = await import('node:os');
  const key = readFileSync(process.env.BHAV_ENV_FILE || `${homedir()}/.config/pi/bhav.env`, 'utf8').match(/^(?:BHAV_AGENT|BUYER)_PRIVATE_KEY=(.*)$/m)[1];
  const signed = await signRegistrationChallenge(key, {
    humanIdentifier: account.address, chainId, registryAddress: self.registryAddress, nonce,
  });
  const userDefinedData = buildWalletFreeRegisterUserDataAscii({
    agentAddress: account.address, signature: { r: signed.r, s: signed.s, v: signed.v }, disclosures,
  });
  const payload = {
    version: 1,
    operation: 'register',
    mode: 'wallet-free',
    chainId,
    registryAddress: self.registryAddress,
    endpointType: network === 'mainnet' ? 'celo' : 'staging_celo',
    appName: 'Self Agent ID',
    scope: 'self-agent-id',
    humanIdentifier: account.address,
    disclosures,
    userDefinedData,
    expiresAt: Date.now() + 30 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  console.log(`nonce ${nonce} · agent ${account.address}`);
  console.log(`https://agent-api.self.xyz/cli/register?payload=${encoded}`);
} else {
  console.error('usage: self-register.mjs link|status');
  process.exit(1);
}
