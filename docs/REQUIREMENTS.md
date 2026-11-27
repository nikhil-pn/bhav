# Requirements map

Official text: https://www.loops.house/agents-open-for-business (read 21 Nov 2026). Each row gets a proof link when it is done.

## All tracks
| Requirement | Status | Proof |
|---|---|---|
| Celo mainnet only | ✅ | agent #10088 on mainnet |
| Agent registered on ERC-8004 | ✅ | [tx](https://celoscan.io/tx/0xd041f1b77e5a7d1791dc0c3e4e6158cb3a4c44f2c4471d5e2c5d4c3c34d1bab4), agent #10088 |
| Self Agent ID (recommended for all, required for the Self Agent ID track) | ✅ | Self Agent ID #211, [tx](https://celoscan.io/tx/0x37226569553840e5e0afbbf2f62af16a2e6530c2b0eb79174beafde4ec51b71b) |
| Public GitHub repo at registration | ✅ | this repo |
| Attribution tag in every counted transaction; x402 PayTo address registered | 🟡 | tag verified by Loops on the ERC-8004 tx; PayTo address pending |
| Code written from 20 Nov | ✅ | `git log` |
| Named user, real job done | ⏳ | |
| Independent users (wallets outside the team, not funded by us) | ⏳ | |

## Self Agent ID: Verified Agent Payments
Judging: integration 30%, innovation and value 30%, named user and real job 25%, real use 15%.
| Requirement | Status | Proof |
|---|---|---|
| A service where Self Agent ID decides who is served, paid or limited | ✅ | `src/app.mjs` gate + free quota per human (Self nullifier); live at https://devbox.tail84790b.ts.net/v1/quote; `npm test` |
| Payments through x402 on Celo | ✅ | $0.01 USDC on mainnet, [settlement tx](https://celoscan.io/tx/0x6113bb79235a96b96b362d88002cb4eec62a2d1a59f68db9cb9d2ce7b37b7090); `npm run test:live` confirms it on chain |
| Demo shows an agent with no human behind it being refused or limited (host's tip) | ✅ | refusal button on https://bhav.exprmnts.fun; `curl -si https://devbox.tail84790b.ts.net/v1/quote?q=eggs` → 403 |

## Agent Vault: Online & Onchain Checkouts
Judging: same as above.
| Requirement | Status | Proof |
|---|---|---|
| The agent signs in on a regular website through Agent Vault (meets the requirement) | ✅ | instacart.com, 28 Nov 22:06 UTC: login opened by Agent Vault (owner approved; vault-minted password), captcha solved by the owner on the live page, account page reached: [log](proof/instacart-signin-2026-11-28.log), [screenshot](proof/instacart-signed-in-via-agent-vault-live-page.png). amazon.in tried first: blocked as automated after the password |
| Optional: a real, low-value checkout | — | not planned |
| A spending limit or rule in Agent Vault, and the demo shows the agent hitting it (livestream, 24 Nov) | ✅ | agent card $0.05/payment, $0.10/week: two $0.04 store lookups paid, the third refused "over the weekly limit", card auto-paused ([screenshot](proof/agent-vault-weekly-budget-refusal.png)); earlier with a $0.02 cap, refused "over the per-transaction cap" ([screenshot](proof/agent-vault-cap-refusal.png)) |
| The agent never sees the card number or password | ✅ by design | agent holds tokens only; Agent Vault pays and signs in (`src/vault.mjs`, `src/vault-signin.mjs`); test checks no secret crosses `pay()` |
| A public post by a team member with demo clip + repo link (livestream, 24 Nov) | ⏳ | owner posts after the demo video |
| Pays onchain with x402 | 🟡 | Bhav's own x402 [settlement tx](https://celoscan.io/tx/0x6113bb79235a96b96b362d88002cb4eec62a2d1a59f68db9cb9d2ce7b37b7090) |
