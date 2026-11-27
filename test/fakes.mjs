// Local stand-ins for the two outside services Bhav talks to, so `npm test` needs no
// network, no keys and no money:
//   - a JSON-RPC server that answers like the Self Agent ID registry on Celo, so the REAL
//     SelfAgentVerifier (signature recovery, replay cache, registry checks) runs unchanged;
//   - an x402 facilitator that really checks the buyer's EIP-3009 USDC signature (amount,
//     payee, asset, deadline) the way the Celo facilitator does, then "settles" with a fake tx.
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { ethers } from 'ethers';
import { REGISTRY_ABI, NETWORKS as SELF_NETWORKS } from '@selfxyz/agent-sdk';
import { verifyTypedData, getAddress } from 'viem';

export const SELF_PROVIDER = '0x000000000000000000000000000000000000Se1f'.replace('Se1f', '5e1f');
const REGISTRY = SELF_NETWORKS.mainnet.registryAddress.toLowerCase();

/** agents: Map<lowercase address, { id, human, verified=true, fresh=true, provider=SELF_PROVIDER }> */
export async function startFakeRegistry() {
  const agents = new Map();
  const iface = new ethers.Interface(REGISTRY_ABI);
  const byId = (id) => [...agents.values()].find((a) => BigInt(a.id) === BigInt(id));
  const answer = (name, args) => {
    const key = (k) => agents.get(('0x' + k.slice(-40)).toLowerCase());
    switch (name) {
      case 'isVerifiedAgent': { const a = key(args[0]); return [!!a && a.verified !== false]; }
      case 'getAgentId': return [BigInt(key(args[0])?.id ?? 0)];
      case 'hasHumanProof': return [!!byId(args[0])];
      case 'isProofFresh': return [byId(args[0])?.fresh !== false];
      case 'proofExpiresAt': return [BigInt(Math.floor(Date.now() / 1000) + 365 * 86400)];
      case 'getHumanNullifier': return [BigInt(byId(args[0])?.human ?? 0)];
      case 'getAgentCountForHuman': return [BigInt([...agents.values()].filter((a) => BigInt(a.human) === BigInt(args[0])).length)];
      case 'getProofProvider': return [byId(args[0])?.provider ?? SELF_PROVIDER];
      case 'selfProofProvider': return [SELF_PROVIDER];
      default: throw new Error(`fake registry: ${name} not faked`);
    }
  };
  const handle = (m) => {
    const ok = (result) => ({ jsonrpc: '2.0', id: m.id, result });
    if (m.method === 'eth_chainId') return ok('0xa4ec'); // 42220
    if (m.method === 'net_version') return ok('42220');
    if (m.method === 'eth_blockNumber') return ok('0x1');
    if (m.method === 'eth_call') {
      const { to, data } = m.params[0];
      if (to.toLowerCase() !== REGISTRY) return { jsonrpc: '2.0', id: m.id, error: { code: -32000, message: 'unknown contract' } };
      const fn = iface.parseTransaction({ data });
      return ok(iface.encodeFunctionResult(fn.name, answer(fn.name, fn.args)));
    }
    return { jsonrpc: '2.0', id: m.id, error: { code: -32601, message: `fake registry: ${m.method}` } };
  };
  const server = http.createServer((req, res) => {
    let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
      const msg = JSON.parse(b);
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(Array.isArray(msg) ? msg.map(handle) : handle(msg)));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, agents, close: () => server.close() };
}

/** x402 facilitator for the `exact` scheme on Celo, checking EIP-3009 signatures for real. */
export function fakeFacilitator({ caip = 'eip155:42220', chainId = 42220 } = {}) {
  const settled = [];
  const usedNonces = new Set();
  async function check(payload, req) {
    const p = payload.payload ?? {};
    const a = p.authorization;
    if (!a || !p.signature) return { isValid: false, invalidReason: 'invalid_payload' };
    if (req.network !== caip || payload.accepted?.network && payload.accepted.network !== caip) return { isValid: false, invalidReason: 'invalid_network' };
    if (getAddress(a.to) !== getAddress(req.payTo)) return { isValid: false, invalidReason: 'invalid_exact_evm_payload_recipient_mismatch', payer: a.from };
    if (BigInt(a.value) < BigInt(req.amount)) return { isValid: false, invalidReason: 'invalid_exact_evm_payload_authorization_value', payer: a.from };
    const nowS = BigInt(Math.floor(Date.now() / 1000));
    if (BigInt(a.validBefore) <= nowS || BigInt(a.validAfter) > nowS) return { isValid: false, invalidReason: 'invalid_exact_evm_payload_authorization_valid_before', payer: a.from };
    if (usedNonces.has(a.nonce)) return { isValid: false, invalidReason: 'nonce_already_used', payer: a.from };
    const good = await verifyTypedData({
      address: a.from,
      domain: { name: req.extra?.name, version: req.extra?.version, chainId, verifyingContract: getAddress(req.asset) },
      types: { TransferWithAuthorization: [
        { name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' }, { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' }] },
      primaryType: 'TransferWithAuthorization',
      message: { from: a.from, to: a.to, value: BigInt(a.value), validAfter: BigInt(a.validAfter), validBefore: BigInt(a.validBefore), nonce: a.nonce },
      signature: p.signature,
    });
    return good ? { isValid: true, payer: a.from } : { isValid: false, invalidReason: 'invalid_exact_evm_payload_signature', payer: a.from };
  }
  return {
    settled,
    async getSupported() { return { kinds: [{ x402Version: 2, scheme: 'exact', network: caip }], extensions: [], signers: {} }; },
    async verify(payload, req) { return check(payload, req); },
    async settle(payload, req) {
      const v = await check(payload, req);
      if (!v.isValid) return { success: false, errorReason: v.invalidReason, transaction: '', network: caip, payer: v.payer };
      usedNonces.add(payload.payload.authorization.nonce);
      const tx = '0x' + randomBytes(32).toString('hex');
      settled.push({ tx, from: v.payer, to: payload.payload.authorization.to, value: payload.payload.authorization.value, asset: req.asset });
      return { success: true, transaction: tx, network: caip, payer: v.payer };
    },
  };
}
