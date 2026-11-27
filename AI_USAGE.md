# How AI built Bhav

Bhav is built by Nikhil P N working with an AI coding agent, [Claude Code](https://claude.com/claude-code) (Anthropic),
running in a terminal on our own always-on Linux machine and driven from a phone.

- **Written by the agent:** the code, tests, scripts, website and docs in this repository.
- **Done by the human:** choosing what to build, product and design decisions, reviewing the work, and every step only a
  person can do: signing in, the Self identity proof, typing OTPs and approving any payment.
- **Commits:** made by the agent in small steps during the hackathon, under the owner's git name with a `Co-Authored-By` line.

This file will grow as the build goes on: where the agent was wrong, and how each part was checked on Celo mainnet.

## How each part was checked
| Part | How the agent checked it | Where |
|---|---|---|
| Self Agent ID gate, free quota per human, x402 | 24 tests run the real verifier and x402 libraries against a local registry and a facilitator that check signatures; the agent then broke the code four ways on purpose (gate open, quota per agent, never charging, ignoring the verifier) and the tests failed every time | `test/service.test.mjs` |
| Live mainnet service | a read-only check: health, the refusal, and every listed settlement confirmed on Celo | `npm run test:live` |
| Agent Vault payments and limits | tests against a fake Agent Vault that answers like the live one; then live: a $0.04 payment refused by the $0.02 cap, a $0.005 Buy payment settled on Celo | `test/vault.test.mjs`, `docs/proof/` |
| CI | `npm ci && npm test` on every push | `.github/workflows/test.yml` |

## Where the agent was wrong (and what fixed it)
| When | Mistake | Caught by | Fix |
|---|---|---|---|
| 28 Nov | README said Agent Vault wallet payments were live before any had settled | an independent judge agent asked to review the repo | docs now say exactly what is proven; a payment settled later that night |
| 28 Nov | the first live smoke test failed on a settlement tx that does exist | re-reading the tx on three RPCs | public RPCs drop requests: the check now retries and falls back |
| 28 Nov | the agent's own smoke-test refusals were counted as real refused agents in the public stats | reading `/v1/stats` before and after | checks send `x-bhav-check: smoke` and are left out |
| 28 Nov | the amazon.in sign-in looked successful (no sign-in form on the page) | adding a positive check (order links) | it was Amazon's automated-access block page; see below |
| 28 Nov | the deal-posts step used Buy's X search, whose seller failed twice after payment | Agent Vault answered `payment_outcome_unknown` | switched to Buy's Reddit search, which settled |

## Things that did not work, on purpose left in
- **amazon.in through Agent Vault.** The proxy reaches the sign-in form and types the email and password, then Amazon serves its
  automated-access block page (no form, two links, two images). Agent Vault's own registry marks amazon.in "partial". The agent does
  not try to get past bot walls, so the household agent signs in to a site Agent Vault has verified instead.
