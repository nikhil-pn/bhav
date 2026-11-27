# Bhav demo (2:30): script and shot list

For the Agents Open for Business submission and the public post Self asks for (demo clip + repo link, tagging
@CeloDevs and @selfxyz). Every shot is a real run on Celo mainnet; nothing is mocked. Times are targets.

## 0:00–0:15 · The problem
**Say:** "Indian grocery prices change by the hour across Zepto, Blinkit and Instamart. Agents can find the cheapest one,
but who should a price service serve, and how do you let an agent act for your family without handing it your
password or your money?"
**Show:** https://bhav.exprmnts.fun hero, then the "Ask Bhav" box answering "eggs 30" with live prices.

## 0:15–0:45 · A bot is refused, a human-backed agent is served
**Say:** "Bhav only answers agents with a real, unique human behind them, proven with Self Agent ID. A bot gets nothing."
**Show:**
- website: press the "try being a bot" button → `403 human_backed_agents_only`
- terminal: `node src/buyer.mjs "chicken curry cut"` → `200`, cheapest price, `billing: free`, `human: {adult: true, country: "IND"}`
**Say:** "The free quota belongs to the person, not the agent: my second agent shares it."

## 0:45–1:10 · It pays per answer over x402
**Show:** the 4th request of the day → `402` → the agent signs $0.01 USDC (EIP-3009, no gas) → `200` with a settlement tx →
open the tx on celoscan.
**Say:** "After three free answers a day, it's one cent in USDC on Celo, settled by the x402 facilitator."

## 1:10–1:50 · The household agent's hands: Agent Vault
**Show:** `node scripts/household.mjs "chicken curry cut"` (or the four steps one by one):
1. Self Agent ID quote (as above).
2. Instacart sign-in through Agent Vault: the agent holds only `av_login_…` tokens; Instacart's captcha goes to the phone,
   solved there (phone screen recording); agent continues and lands on the account page.
3. Pays $0.04 on Buy (Google Places) from the Agent Vault wallet: open supermarkets nearby → tx on celoscan.
4. Looks up again → **refused: over the weekly limit** ($0.10/week budget), card paused (Agent Vault Activity page).
**Say:** "The agent never sees a password, a card or a wallet key, and it cannot spend past the limit I set."

## 1:50–2:15 · Proof
**Show:** `/v1/stats` (answers, refusals, humans by country, USDC earned), the README proof table, `npm test` (32 passing).

## 2:15–2:30 · Close
**Say:** "Bhav: the grocery price, from one agent to another. Human-backed, pay-per-answer, and safe to let act for you.
Repo and live demo in the post."
**Show:** repo URL + bhav.exprmnts.fun.

## Before recording
- Agent Vault card active (Agent cards → Resume, if paused by an earlier cap test).
- Agent Vault wallet holds ≥ $0.10 USDC; buyer #212 holds ≥ $0.02 USDC. A fresh week (or a raised weekly limit) gives two paid lookups before the refusal.
- Use a fresh item for the free answers, or record the 4th call of the day for the x402 shot.

## The post (owner)
> Bhav: live Indian grocery prices for AI agents, on @Celo.
> Only human-backed agents get answers (@selfxyz Agent ID), 3 free a day per human, then $0.01 USDC over x402.
> The household agent signs in and pays through Agent Vault, and gets stopped at its spending cap.
> Demo below · Repo: github.com/nikhil-pn/bhav · Live: bhav.exprmnts.fun
> @CeloDevs @selfxyz #AgentsOpenForBusiness
