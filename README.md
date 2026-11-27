# Bhav

> **भाव** (*bhav*): Hindi for "price", as in *mandi bhav*, the market rate.

**Live demo: https://bhav.exprmnts.fun** · API on Celo mainnet: `https://devbox.tail84790b.ts.net` ([one-minute check for judges and agents](AGENTS.md))

Celo hackathon *Agents Open for Business* ([loops.house](https://www.loops.house/agents-open-for-business)), tracks Self Agent ID and Agent Vault.

Bhav sells live grocery prices to AI agents, and only to agents that have a real human behind them.

1. **It knows the price.** Live prices from Zepto, Blinkit and Instamart (Kochi), with a deal check against our price history, sold per request over [x402](https://x402.celo.org) on Celo mainnet. ✅ live
2. **One fair quota per human.** Every caller must sign its request with a [Self Agent ID](https://docs.self.xyz/docs/agent-id/overview/), a zero-knowledge proof that a real, unique human stands behind the agent. Each **human** (not each agent) gets 3 free answers a day, then pays $0.01 USDC per answer. An agent with no human behind it is refused. ✅ live
3. **It acts for the household through [Agent Vault](https://agentvault.io).** The household agent pays for Buy services from the owner's Agent Vault wallet on Celo, under an agent card with hard limits ($0.02 per payment, $0.10 a week): a cheap call goes through, a $0.04 one is refused and the card pauses itself. It signs in to amazon.in with the owner's saved login without ever seeing the password; Amazon's one-time code goes to the owner's phone. ✅ wallet payments and the limit refusal live on mainnet · ⏳ amazon.in sign-in waiting for the owner to save the login

## Try it
| Who | How |
|---|---|
| A person | open **https://bhav.exprmnts.fun**, ask for an item (free, rate-limited website lane), and press the button that sends a request with no Self Agent ID to watch it get refused |
| An agent | `curl -si "https://devbox.tail84790b.ts.net/v1/quote?q=eggs"` → `403 human_backed_agents_only`; a human-backed agent uses `node src/buyer.mjs "eggs 30"` (steps in [AGENTS.md](AGENTS.md)) |
| Anyone | live counters and settlement tx hashes: `curl -s https://devbox.tail84790b.ts.net/v1/stats` |

## The household agent, end to end
```bash
node scripts/household.mjs "chicken curry cut"
```
1. **Self Agent ID**: it signs its request (Self Agent ID #212, a real human behind it) and asks Bhav for the cheapest price: free answers first, then $0.01 USDC over x402.
2. **Agent Vault sign-in**: it signs in to amazon.in with a login the owner saved in Agent Vault. It holds only tokens; Agent Vault's proxy browser types the real email and password, and the one-time code is handed to the owner's phone (`src/vault-signin.mjs`).
3. **Agent Vault wallet**: it pays $0.005 on [Buy](https://usebuy.ai) for recent deal posts about the item, from the owner's Agent Vault wallet on Celo mainnet (`src/household.mjs`, `src/vault.mjs`).
4. **Agent Vault limit**: it tries a $0.04 Buy service (nearby supermarkets). The agent card allows $0.02 per payment, so Agent Vault refuses it (`limit_reached`, nothing paid) and pauses the card until the owner resumes it. [Screenshot of the refusal](docs/proof/agent-vault-cap-refusal.png).

## Tests
```bash
npm ci && npm test        # 24 tests, no network, no keys, no money
npm run test:live         # read-only check of the live mainnet API; confirms each settlement on Celo
```
`npm test` runs the real service (`src/app.mjs`), the real buyer agent (`src/agent.mjs`), the real Self Agent ID verifier
and the real x402 libraries. Only the chain and the facilitator are local fakes (`test/fakes.mjs`), and the fake
facilitator checks the buyer's EIP-3009 USDC signature (payee, amount, asset, deadline, nonce) the way Celo's does.
Covered: refusal with no Self Agent ID, with no human in the registry, with an expired proof, with a non-Self proof provider,
replayed and re-targeted signatures; 3 free answers then a $0.01 x402 payment with a matching settlement; 402 terms when the agent
does not pay; free quota shared by all agents of one human; the buyer's spending cap; a forged payment; quota reset at midnight
and across restarts; failed lookups never using up a free answer; the website lane; stats. The Agent Vault side (`test/vault.test.mjs`)
runs against a fake Agent Vault that answers like the live one: a cheap Buy payment and its answer, the owner's first-seller approval,
the per-payment cap refusing and pausing the card, an empty wallet, a key with no wallet, and no secret ever crossing `pay()`. CI runs it on every push.

## Tracks
| Track | Sponsor | What we show |
|---|---|---|
| Self Agent ID: Verified Agent Payments | Self | Agent ID decides who is served, how much is free, and who pays, with payments over x402 ✅ |
| Agent Vault: Online & Onchain Checkouts | Self | the agent pays Buy services from the Agent Vault wallet under hard limits and is refused over the cap ✅; it signs in to amazon.in without seeing the password ⏳ |

Agent wallet: `0x33A80697Ac038279ca8d70F4c2Cef82672683b9F` · attribution tag: `celo_bc5d483f879e`.

Every agent is registered on [ERC-8004](https://docs.celo.org/build-on-celo/build-with-ai/8004), and every transaction Bhav itself sends carries our [attribution tag](https://github.com/celo-org/attribution-tags).

## Proof (Celo mainnet unless noted)
| What | Link |
|---|---|
| ERC-8004 identity: agent **#10088**, registered with our attribution tag | [celoscan tx](https://celoscan.io/tx/0xd041f1b77e5a7d1791dc0c3e4e6158cb3a4c44f2c4471d5e2c5d4c3c34d1bab4) |
| **Self Agent ID #211**: a real, unique human (Aadhaar, age 18+, zero-knowledge) stands behind this agent; proof fresh until Nov 2027 | [celoscan tx](https://celoscan.io/tx/0x37226569553840e5e0afbbf2f62af16a2e6530c2b0eb79174beafde4ec51b71b) |
| Household buyer agent `0x964F…7334` = **Self Agent ID #212** (same human, second agent) | mainnet registry `isVerifiedAgent` = true |
| **Mainnet**: Bhav live at `https://devbox.tail84790b.ts.net/v1/quote?q=…`; buyer #212 got 3 free answers, then paid **$0.01 USDC over x402** for the 4th | [celoscan settlement](https://celoscan.io/tx/0x6113bb79235a96b96b362d88002cb4eec62a2d1a59f68db9cb9d2ce7b37b7090) |
| Demo buyer funded with 1 USDC from the Bhav wallet (tagged) | [celoscan](https://celoscan.io/tx/0xc1406282959a48e30cb9b903a604ebde5533b636a9a35c1af3734b327e76b249) |
| Testnet run of the full loop: agent with no Self ID → 403; human-backed agent → 1 free answer, then **$0.01 USDC paid over x402** | [Sepolia settlement](https://celo-sepolia.blockscout.com/tx/0x1ab8b241e1e26650d47c5e7443d227fdad9d7136b04a2dd38aef940b1bc630ad) |
| Testnet run with **real Kochi prices**: buyer #212 asked "eggs 30" after its free answer, paid $0.01 → "₹8.87/egg on Swiggy Instamart (30 for ₹266), about its usual price" | [Sepolia settlement](https://celo-sepolia.blockscout.com/tx/0xbc261bc34f328dec642b7a935fc158cbdb2bf871e1f9eabe5cc288561fd97af0) |
| Same ERC-8004 registration rehearsed first on Celo Sepolia (agent #1040) | [blockscout tx](https://celo-sepolia.blockscout.com/tx/0xb6b0c8a4a0d8db764e27ab9d30bac0876b6d289674a8f7356c805b50980bdd73) |

## Rules we follow
- Celo mainnet only. All code in this repo is written during the hackathon, from 20 Nov 2026.
- How AI was used: [AI_USAGE.md](AI_USAGE.md). Requirements map: [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

## License
[MIT](LICENSE)
