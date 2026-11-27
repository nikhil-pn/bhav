# Use Bhav with your own agent (10 minutes)

You will make your own AI agent, prove to Self that a real person stands behind it, and let it ask Bhav for
live grocery prices in Kochi: 3 answers a day are free, then each answer costs $0.01 USDC, paid by your agent on Celo.
Everything is yours: your key, your phone, your wallet. Nobody else can spend your money.

## You need
- A phone with the **Self** app ([self.xyz](https://self.xyz), App Store / Play Store) and your **passport or Aadhaar**.
- A laptop (Mac or Linux) with **Node 22+** (`node -v`; if older: `nvm install 22`) and git.
- About **$0.10 of USDC on Celo** in a wallet of your own (MiniPay, Valora, MetaMask on Celo, or withdraw from an exchange that supports Celo).

## Steps
1. **Get the code**
   ```bash
   git clone https://github.com/nikhil-pn/bhav && cd bhav && npm i
   ```
2. **Make your agent**
   ```bash
   npm run agent:new
   ```
   It saves your agent's key to `my-agent.env` (only on your laptop) and prints your **agent address** (`0x…`). Copy it.
3. **Prove a human is behind it (Self Agent ID)**
   ```bash
   npm run agent:link
   ```
   Open the printed link on your phone (or open it on the laptop and scan the QR with the Self app), and confirm in the Self app.
   It shares only that you are a unique person over 18; no name, no document number. Then check:
   ```bash
   npm run agent:status        # wait until it says verified true
   ```
4. **Ask for a price (free)**
   ```bash
   npm run ask -- "eggs 30"
   npm run ask -- "chicken curry cut"
   npm run ask -- "milk 1 litre"
   ```
   Each answer says the cheapest shop, the price per kg or per piece, and whether it is a deal.
5. **Fund your agent**: send **0.10 USDC on Celo** from your own wallet to your agent address (step 2). No CELO is needed for gas.
6. **Ask a 4th time (paid)**
   ```bash
   npm run ask -- "onion 1kg"
   ```
   This time Bhav answers `402 Payment Required`, your agent pays $0.01 USDC on Celo by itself (never more than $0.02), and you get the
   answer plus a transaction link. Copy that link.
7. **Tell us in one line** what you would use it for (e.g. "checking chicken prices before ordering for the weekend"), and send
   us your agent address and the transaction link. We add you to the README as a user, with your permission.

## If something goes wrong
| You see | Do this |
|---|---|
| `403 not_a_verified_human_backed_agent` | step 3 is not finished: run `npm run agent:status` until `verified true` |
| `402` and no answer | your agent has no USDC: do step 5 (USDC on **Celo**, not another chain) |
| `my-agent.env already exists` | fine: it shows your existing agent address |
| anything else | send the whole output to Nikhil |

Your key stays in `my-agent.env` on your laptop; do not share that file. Delete it when you are done if you like.
