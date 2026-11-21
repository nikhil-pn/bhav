# Bhav

> **भाव** (*bhav*): Hindi for "price", as in *mandi bhav*, the market rate.

**Deadline: Mon 7 Dec 2026, 09:00 GMT (14:30 IST).** Celo hackathon *Agents Open for Business* ([loops.house](https://www.loops.house/agents-open-for-business)).

Bhav is a grocery agent for Indian households that does the whole job:

1. **It knows the price.** Bhav sells live grocery prices from Zepto, Blinkit and Instamart (Kochi) to other agents, per request, over [x402](https://x402.celo.org) on Celo.
2. **It serves people, not bot farms.** Every caller must carry a [Self Agent ID](https://docs.self.xyz/docs/agent-id/overview/), a zero-knowledge proof that a real, unique human stands behind the agent. Each human gets a fair free quota; an agent with no human behind it is limited or refused.
3. **It fills the cart.** The household's agent picks the cheapest offer, signs in to the store through [Agent Vault](https://agentvault.io) (it never sees the password or card) and fills the cart. The person approves the payment on their phone.

## Tracks
| Track | Sponsor | What we show |
|---|---|---|
| Self Agent ID: Verified Agent Payments | Self | Agent ID decides who is served, how much is free, and who pays, with payments over x402 |
| Agent Vault: Online & Onchain Checkouts | Self | the agent signs in and checks out on a real store without seeing secrets, and pays for data over x402 |

Agent wallet: `0x33A80697Ac038279ca8d70F4c2Cef82672683b9F` · attribution tag: `celo_bc5d483f879e`.

Every agent is registered on [ERC-8004](https://docs.celo.org/build-on-celo/build-with-ai/8004), and every transaction carries our [attribution tag](https://github.com/celo-org/attribution-tags).

## Status
Day 1 (21 Nov 2026): repo created, enrolled on Loops House, agent wallet registered with the event. The build log, proof table and setup steps will be added as each part works on Celo mainnet.

## Proof (Celo mainnet unless noted)
| What | Link |
|---|---|
| ERC-8004 identity: agent **#10088**, registered with our attribution tag | [celoscan tx](https://celoscan.io/tx/0xd041f1b77e5a7d1791dc0c3e4e6158cb3a4c44f2c4471d5e2c5d4c3c34d1bab4) |
| Same registration rehearsed first on Celo Sepolia (agent #1040) | [blockscout tx](https://celo-sepolia.blockscout.com/tx/0xb6b0c8a4a0d8db764e27ab9d30bac0876b6d289674a8f7356c805b50980bdd73) |

## Rules we follow
- Celo mainnet only. All code in this repo is written during the hackathon, from 20 Nov 2026.
- How AI was used: [AI_USAGE.md](AI_USAGE.md). Requirements map: [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

## License
[MIT](LICENSE)
