# Bhav

> **भाव** (*bhav*): Hindi for "price", as in *mandi bhav*, the market rate.

**Live demo: https://bhav.exprmnts.fun** · API on Celo mainnet: `https://devbox.tail84790b.ts.net` ([one-minute check for judges and agents](AGENTS.md))

Celo hackathon *Agents Open for Business* ([loops.house](https://www.loops.house/agents-open-for-business)), tracks Self Agent ID and Agent Vault.

Bhav sells live grocery prices to AI agents, and only to agents that have a real human behind them.

1. **It knows the price.** Live prices from Zepto, Blinkit and Instamart (Kochi), compared with our own price archive (July–November 2026; items it never tracked say "no history yet"), sold per request over [x402](https://x402.celo.org) on Celo mainnet. (live)
2. **One fair quota per human.** Every caller must sign its request with a [Self Agent ID](https://docs.self.xyz/docs/agent-id/overview/), a zero-knowledge proof that a real, unique human stands behind the agent. Each **human** (not each agent) gets 3 free answers a day, then pays $0.01 USDC per answer. An agent with no human behind it is refused. Every answer also says what the human chose to disclose through Self, only whether they are an adult and their ID's country (e.g. `{"adult":true,"country":"IND"}`); `/v1/stats` counts humans by country. (live)
3. **It acts for the household through [Agent Vault](https://agentvault.io).** When the apps are dear or out of stock, the household agent finds open supermarkets nearby (Google Places on [Buy](https://usebuy.ai), $0.04 a lookup), paid from the owner's Agent Vault wallet on Celo under a weekly grocery-research budget the owner set on its Agent Vault card ($0.10 a week, $0.05 a payment): two lookups fit, the third is refused and the card pauses until the owner resumes it. It also signs in to a store (instacart.com) with a login whose password nobody has seen. [paid lookup](https://celoscan.io/tx/0x8fcb23fb4490a2046fe876f31be7270b0870b7140bac28e03d13fbaa9ccd1a54) · [refused over the weekly budget](docs/proof/agent-vault-weekly-budget-refusal.png) · [Instacart sign-in](docs/proof/instacart-signin-2026-11-28.log)

## Try it
| Who | How |
|---|---|
| A person | open **https://bhav.exprmnts.fun**, ask for an item (free, rate-limited website lane), and press the button that sends a request with no Self Agent ID to watch it get refused |
| An agent | `curl -si "https://devbox.tail84790b.ts.net/v1/quote?q=eggs"` → `403 human_backed_agents_only`; a human-backed agent uses `node src/buyer.mjs "eggs 30"` (steps in [AGENTS.md](AGENTS.md)) |
| Anyone | live counters and settlement tx hashes: `curl -s https://devbox.tail84790b.ts.net/v1/stats` |

## The household agent, end to end
Each step has run for real on Celo mainnet (links below): the x402 payment on 22 Nov, the Agent Vault steps on 28 Nov. Step 1 pays with the household agent's own key, capped at $0.02 per answer in code (`src/agent.mjs`); steps 2–4 hold no secret at all.
```bash
node scripts/household.mjs "chicken curry cut"
```
1. **Self Agent ID**: it signs its request (Self Agent ID #212, a real human behind it) and asks Bhav for the cheapest price: free answers first, then $0.01 USDC over x402.
2. **Agent Vault sign-in**: it signs in to a store with a login kept in Agent Vault. It holds only tokens; Agent Vault's proxy browser types the real values, and any one-time code is handed to the owner's phone. It signs in to **instacart.com** (`src/vault-instacart.mjs`), the one grocery site in Agent Vault's registry with a verified sign-in. Instacart serves the US, not Kochi, so this step shows the capability (a store account the agent can use without ever seeing its secrets); Indian q-commerce sites are not in Agent Vault's registry yet. the login was opened by Agent Vault after the owner approved it, with a password minted in the vault that nobody has seen; Instacart's reCAPTCHA was handed to the owner's phone and solved there. [Log](docs/proof/instacart-signin-2026-11-28.log) · [owner's live view](docs/proof/instacart-signed-in-via-agent-vault-live-page.png). amazon.in (`src/vault-signin.mjs`) was tried first: the proxy types the email and password, then Amazon serves its automated-access block page, so we moved on rather than fight a bot wall.
3. **Agent Vault wallet**: it pays $0.04 on [Buy](https://usebuy.ai) for a Google Places lookup of open supermarkets nearby, from the owner's Agent Vault wallet on Celo mainnet (`src/household.mjs`, `src/vault.mjs`). Live: Finemart Supermarket (open, 4.0) and two more in Kakkanad, Kochi: [tx](https://celoscan.io/tx/0xc2f9f9c9bcdd1986c130174e5220df4ac5ea8dec57f27288e4c7bd98624698bf), [tx](https://celoscan.io/tx/0x8fcb23fb4490a2046fe876f31be7270b0870b7140bac28e03d13fbaa9ccd1a54).
4. **Agent Vault limit**: it looks up again; the third lookup would pass the $0.10 weekly budget, so Agent Vault refuses it (`limit_reached`, nothing paid) and pauses the card until the owner resumes it. [Screenshot](docs/proof/agent-vault-weekly-budget-refusal.png) (Agent Vault labels Buy's Google routes "Buy (Google Cloud VMs)"; it also shows an earlier per-payment-cap refusal and two payments to a failing seller that were released, not paid).

## Tests
```bash
npm ci && npm test        # 32 tests, no network, no keys, no money
npm run test:live         # read-only check of the live mainnet API; confirms each settlement on Celo
```
`npm test` runs the real service (`src/app.mjs`), the real buyer agent (`src/agent.mjs`), the real Self Agent ID verifier
and the real x402 libraries. Only the chain and the facilitator are local fakes (`test/fakes.mjs`), and the fake
facilitator checks the buyer's EIP-3009 USDC signature (payee, amount, asset, deadline, nonce) the way Celo's does.
Covered: refusal with no Self Agent ID, with no human in the registry, with an expired proof, with a non-Self proof provider,
replayed and re-targeted signatures; 3 free answers then a $0.01 x402 payment with a matching settlement; 402 terms when the agent
does not pay; free quota shared by all agents of one human; the buyer's spending cap; a forged payment; quota reset at midnight
and across restarts; failed lookups never using up a free answer; the website lane; stats. The Agent Vault side (`test/vault.test.mjs`)
runs against a fake Agent Vault that answers like the live one: a paid store lookup and its answer (open stores first), the owner's first-seller approval,
the weekly budget refusing the third lookup and the card staying paused, the per-payment cap, an empty wallet, a key with no wallet, and no secret ever crossing `pay()`.
`test/instacart.test.mjs` replays the Instacart sign-in: captcha and email code go to the owner, the agent fills only the email token,
a page released unsolved stops the flow. CI runs it all on every push.

## Tracks
| Track | Sponsor | What we show |
|---|---|---|
| Self Agent ID: Verified Agent Payments | Self | Agent ID decides who is served, how much is free, and who pays, with payments over x402 |
| Agent Vault: Online & Onchain Checkouts | Self | open-store lookups paid from the Agent Vault wallet on Celo; refused at the weekly budget, card paused; signed in to instacart.com without seeing secrets |

Agent wallet: `0x33A80697Ac038279ca8d70F4c2Cef82672683b9F` · attribution tag: `celo_bc5d483f879e`.

Bhav is registered on [ERC-8004](https://docs.celo.org/build-on-celo/build-with-ai/8004) (agent #10088); the household agent's card is ready (`household-agent.json`) and it is registered once it holds gas. Every transaction Bhav itself sends carries our [attribution tag](https://github.com/celo-org/attribution-tags).

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
