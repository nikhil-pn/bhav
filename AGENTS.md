# AGENTS.md — how to check Bhav in one minute

For judges, AI screeners and agents. Every command below is read-only or costs at most $0.01.
Bhav's API: `https://devbox.tail84790b.ts.net` (Celo **mainnet**). Website: https://bhav.exprmnts.fun

## 1. See it work (no setup)

```bash
curl -s https://devbox.tail84790b.ts.net/health
# → {"ok":true,"network":"mainnet","payTo":"0x33A8…3b9F","freePerDay":3,"price":"$0.01 USDC"}

curl -s "https://devbox.tail84790b.ts.net/v1/demo?q=eggs%2030"
# → {"demo":true,"answer":"Cheapest eggs 30: ₹…/egg on …", "offers":[…]}   (live Zepto/Blinkit/Instamart, 5–15 s)
#   website lane: free, one request per ~12 s for everyone (429 when busy)

curl -s https://devbox.tail84790b.ts.net/v1/stats
# → totals (answers, free, paid, refused, humans, agents, usdcEarned) + settlements with tx hashes
```

## 2. See the gate refuse a bot

```bash
curl -si "https://devbox.tail84790b.ts.net/v1/quote?q=eggs" | head -1
# → HTTP/2 403   {"error":"human_backed_agents_only", …}
```
An agent without a [Self Agent ID](https://docs.self.xyz/docs/agent-id/overview/) is never served.
A signed request from an agent that is not human-backed gets `403 not_a_verified_human_backed_agent`.

## 3. Use it as a human-backed agent (free, then x402)

```bash
git clone https://github.com/nikhil-pn/bhav && cd bhav && npm i
# your agent's key (registered on Self Agent ID, Celo mainnet) in a file you control:
printf 'BUYER_PRIVATE_KEY=0x…\n' > my-agent.env && chmod 600 my-agent.env
BHAV_BUYER_ENV=my-agent.env BHAV_URL=https://devbox.tail84790b.ts.net X402_NETWORK=mainnet \
  node src/buyer.mjs "chicken curry cut"
# answers 1–3 per human per day: {"billing":{"kind":"free","freeLeftToday":2}, …}
# answer 4+: HTTP 402 → the buyer signs $0.01 USDC (EIP-3009, no gas) → {"billing":{"kind":"paid"}, "settlement":{"transaction":"0x…"}}
```
The buyer refuses to sign more than $0.02 per answer (`BHAV_BUYER_MAX`, USDC base units).

## 4. Run the tests

```bash
npm ci && npm test      # 32 tests: the gate, the per-human quota, x402 and the Agent Vault side; no network, no keys, no money
npm run test:live       # read-only: live API health, the refusal, and each settlement confirmed on Celo mainnet
```

## What is where

| Piece | File | What it does |
|---|---|---|
| Service | `src/app.mjs` (wired by `src/server.mjs`) | Self Agent ID check (mainnet registry) → free quota per **human** (Self nullifier) → x402 `exact` USDC via the Celo facilitator |
| Buyer agent | `src/agent.mjs` (CLI `src/buyer.mjs`) | signs each request with its Self Agent ID key, pays x402 under a hard cap |
| Prices | `src/prices/` | live search of the three stores by headless Chrome (reads the JSON the store page itself loads) + deal check against our price archive |
| Identity | `scripts/register-8004.mjs`, `scripts/self-register.mjs` | ERC-8004 registration; Self Agent ID for our **own** key (wallet-free mode, key never leaves the machine) |
| Tagging | `scripts/chain.mjs` | every transaction Bhav sends carries attribution tag `celo_bc5d483f879e` |
| Website | `web/` | Next.js; live demo, live refusal, live stats |
| Tests | `test/` | real app, agent, Self verifier and x402 libs against a local registry + facilitator that check signatures |

## Onchain proof (Celo mainnet)

| Claim | Check |
|---|---|
| ERC-8004 agent #10088, owned by `0x33A80697Ac038279ca8d70F4c2Cef82672683b9F`, tagged | `cast call 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 "ownerOf(uint256)(address)" 10088 --rpc-url https://forno.celo.org` · tx `0xd041f1b7…bab4` |
| Bhav is Self Agent ID #211, human-backed | `cast call 0xaC3DF9ABf80d0F5c020C06B04Cced27763355944 "isVerifiedAgent(bytes32)(bool)" 0x00000000000000000000000033a80697ac038279ca8d70f4c2cef82672683b9f --rpc-url https://forno.celo.org` → true |
| Household agent is ERC-8004 #10164 | `cast call 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432 "ownerOf(uint256)(address)" 10164 --rpc-url https://forno.celo.org` → `0x964F…7334` · tx `0xea427047…01bc7` |
| Household buyer agent is Self Agent ID #212 | same call with `0x…964f176c16f484c4d035b3958a20f5f648897334` → true |
| x402 payment settled on mainnet | tx `0x6113bb79235a96b96b362d88002cb4eec62a2d1a59f68db9cb9d2ce7b37b7090` (USDC 0.01, payer #212 → Bhav) |

## Limits, stated plainly
- Prices are for **Kochi** only (one delivery point per store). Stores change their pages; a store that fails is reported in `errors`, the others still answer.
- The price history comes from our own tracker (collected since July 2026, stopped 10 Nov 2026). It is **data**, not code; all code here was written during the event. Items it never tracked answer "no history yet".
- Self Agent ID proves a **unique human** behind an agent, not that the human is trustworthy. Aadhaar proofs are weaker than passport proofs (Self's own note).
- Payments between our own two agents are a demo of the mechanism, not traction; real use is counted only from wallets outside the team.
- The API runs on one home server (devbox) because the price lookups need a real browser in India. If it is down, the website says so.
- Agent Vault: the cap refusal, a settled wallet payment and an instacart.com sign-in are proven (README). Signing in again from a new browser can show Instacart's captcha, which only the owner may solve.
