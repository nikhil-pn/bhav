// Send CELO for gas from Bhav's agent wallet (tagged with our attribution code like every tx we send).
// Usage: BHAV_NETWORK=mainnet node scripts/send-celo.mjs <to> <amountCelo> [--send]
// Without --send it only prints what it would do.
import { getAddress, parseEther, formatEther } from 'viem';
import { clients } from './chain.mjs';

const [to, amount] = process.argv.slice(2);
if (!to || !amount) { console.error('usage: send-celo.mjs <to> <amountCelo> [--send]'); process.exit(1); }
const { net, network, account, publicClient, walletClient } = clients();
const bal = await publicClient.getBalance({ address: account.address });
console.log(`${network} · from ${account.address} (${formatEther(bal)} CELO) → ${getAddress(to)} · ${amount} CELO`);
if (!process.argv.includes('--send')) process.exit(0);
const hash = await walletClient.sendTransaction({ to: getAddress(to), value: parseEther(amount) });
const r = await publicClient.waitForTransactionReceipt({ hash });
console.log(`status ${r.status} · ${net.explorer}/tx/${hash}`);
