// Register Bhav's agent on the ERC-8004 Identity Registry.
// The transaction carries our attribution tag, so it is also our first tagged tx.
// Usage: BHAV_NETWORK=testnet|mainnet node scripts/register-8004.mjs [--send]
// Without --send it only simulates and prints what it would do.
import { formatEther, parseEventLogs } from 'viem';
import { fromDataSuffix } from '@celo/attribution-tags';
import { clients } from './chain.mjs';

// BHAV_AGENT_URI picks another agent card (e.g. household-agent.json); BHAV_ENV_FILE picks its key.
const AGENT_URI = process.env.BHAV_AGENT_URI || 'https://raw.githubusercontent.com/nikhil-pn/bhav/main/agent.json';

const abi = [
  { type: 'function', name: 'register', stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }], outputs: [{ name: 'agentId', type: 'uint256' }] },
  { type: 'event', name: 'Registered', inputs: [
    { name: 'agentId', type: 'uint256', indexed: true },
    { name: 'agentURI', type: 'string', indexed: false },
    { name: 'owner', type: 'address', indexed: true } ] },
];

const { net, network, account, publicClient, walletClient } = clients();
const balance = await publicClient.getBalance({ address: account.address });
console.log(`network ${network} · agent ${account.address} · balance ${formatEther(balance)} CELO`);

const { request } = await publicClient.simulateContract({
  account, address: net.identityRegistry, abi, functionName: 'register', args: [AGENT_URI],
});
console.log(`simulation ok · registry ${net.identityRegistry} · uri ${AGENT_URI}`);
if (!process.argv.includes('--send')) process.exit(0);

const hash = await walletClient.writeContract(request);
console.log(`sent ${net.explorer}/tx/${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
const [ev] = parseEventLogs({ abi, eventName: 'Registered', logs: receipt.logs });
const tx = await publicClient.getTransaction({ hash });
console.log(`status ${receipt.status} · agentId ${ev?.args.agentId} · tag ${JSON.stringify(fromDataSuffix(tx.input)?.codes)}`);
