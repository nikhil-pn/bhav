// Send USDC from the agent wallet (tagged with our attribution code like every tx we send).
// Usage: BHAV_NETWORK=mainnet node scripts/send-usdc.mjs <to> <amountUsd> [--send]
import { getAddress, parseUnits, formatUnits, erc20Abi } from 'viem';
import { clients } from './chain.mjs';

const USDC = {
  mainnet: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  testnet: '0x01C5C0122039549AD1493B8220cABEdD739BC44E',
};
const [to, amount] = process.argv.slice(2);
if (!to || !amount) { console.error('usage: send-usdc.mjs <to> <amountUsd> [--send]'); process.exit(1); }

const { net, network, account, publicClient, walletClient } = clients();
const token = getAddress(USDC[network]);
const value = parseUnits(amount, 6);
const bal = await publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] });
console.log(`${network} · from ${account.address} (${formatUnits(bal, 6)} USDC) → ${getAddress(to)} · ${amount} USDC`);
if (bal < value) throw new Error('not enough USDC');
if (!process.argv.includes('--send')) process.exit(0);
const hash = await walletClient.writeContract({ address: token, abi: erc20Abi, functionName: 'transfer', args: [getAddress(to), value] });
const r = await publicClient.waitForTransactionReceipt({ hash });
console.log(`status ${r.status} · ${net.explorer}/tx/${hash}`);
