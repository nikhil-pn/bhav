---
name: bhav
description: Get the cheapest live grocery price in Kochi, India (Zepto, Blinkit, Instamart) for one item, priced per kg or per piece, with a deal check against the usual price. Use when a user asks what something costs, where it is cheapest, or whether a price is a good deal, for groceries in Kochi.
---

# Bhav: live grocery prices for human-backed agents

Bhav answers one question: **where is this grocery item cheapest right now in Kochi, and is that a good price?**
It checks Zepto, Blinkit and Instamart live (5–15 s), compares per kg or per piece, and compares with the usual price.

## Before you can call it (once, with your human)
Bhav only serves agents with a **Self Agent ID** (a real, unique person behind the agent). Your human runs, in the bhav repo:
```bash
npm i && npm run agent:new && npm run agent:link   # then confirms in the Self app on their phone
npm run agent:status                               # until "verified true"
```
For answers after the 3 free ones a day, they send about $0.10 USDC on Celo to the agent address `agent:new` printed.

## Use it
**As MCP tools (preferred):** `claude mcp add bhav -- node /path/to/bhav/src/mcp.mjs`
- `get_price({ item })`: e.g. `item: "eggs 30"`, `"chicken curry cut"`, `"milk 1 litre"`, `"onion 1kg"`. Returns `answer` (one sentence),
  `cheapest` (store, product, price, per-kg/per-piece price, product URL, `deal.verdict`), `otherOffers`, `billing`, and `paymentTx` when paid.
- `my_agent()`: the agent's address (to fund) and whether Bhav is up.

**As a command:** `npm run ask -- "eggs 30"` prints the same answer.

**Over HTTP (any language):** `GET https://devbox.tail84790b.ts.net/v1/quote?q=<item>`, signed with the Self Agent ID headers
(`@selfxyz/agent-sdk` `SelfAgent.signRequest`), and paid with x402 (`@x402/fetch`) when the answer is `402`.

## How to read the answer
- `deal.verdict`: `deal` (below its usual price), `normal`, `pricier`, or `unknown` ("no history yet" for items our archive never tracked).
- Prices are for one delivery point in Kochi. Compare the per-kg or per-piece price, not the pack price.
- Tell the user the store, the price, and the verdict in one line, and offer the product link.

## Limits and errors
| Answer | Meaning | Do |
|---|---|---|
| `403 human_backed_agents_only` / `not_a_verified_human_backed_agent` | no or unverified Self Agent ID | ask your human to finish `npm run agent:link` |
| `402` with no answer | the free answers are used and the agent has no USDC | ask your human to fund the agent address |
| `502 price_lookup_failed` | all three stores failed this time | try once more in a minute; do not loop |
| a store in `errors` | that store's page changed or timed out | answer from the other stores and say which one was missing |

Never pay more than the price Bhav names ($0.01); the client refuses anything over $0.02. Never ask your human for their key file.
