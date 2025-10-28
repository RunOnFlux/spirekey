## SpireKey (RunOnFlux) – WebAuthn wallet for Kadena

### What it is

SpireKey is a Next.js web app that provides a WebAuthn-based wallet for the
Kadena blockchain. A dApp integrates the `@kadena/spirekey-sdk`, which opens
popup/iframe views to the wallet and communicates via `postMessage` for:

- account connect (register/link a passkey)
- transaction signing
- notifications and status via an embedded iframe

The wallet calls Pact (local/send/poll) against node endpoints and uses Chainweb
Data for read-only views (events/history). When a public GraphQL endpoint is
unavailable, core flows still work thanks to Pact `local` and REST fallbacks.

### Key features

- WebAuthn r: accounts on Kadena (keyset with `WEBAUTHN-...`)
- Connect/sign flows with dedicated popups (`/connect` and `/sign`)
- Notification iframe (`/embedded/notification`)
- On-chain reads via Pact `local` and Chainweb Data REST

### Requirements

- Node 20.x (required: `>=20 <21`)
- pnpm 9.x (recommended via corepack)
- HTTPS reverse proxy (Nginx/Traefik) for production (WebAuthn requires HTTPS,
  except `localhost` in dev)

### Prod Configuration (env)

Create a `.env.production` file in the `spirekey/` folder, for example:

```bash
NAMESPACE=kadena
WALLET_NETWORK_ID=mainnet01
DAPP_NETWORK_ID=mainnet01
CHAIN_ID=4
CHAINWEB_URL=https://chainweb.eckowallet.com
CHAINWEB_DATA=https://chainweb.eckowallet.com
```

- `CHAINWEB_URL`: base for Pact API (`/chainweb/0.0/.../pact`)
- `CHAINWEB_DATA`: base for Chainweb Data REST (`/txs`, `/blocks`,
  `/txs/events`)

### dApp/extension integration

- In a dApp, point the SDK to your wallet:

```ts
initSpireKey({ hostUrl: 'https://<url>' });
```

- In a browser extension, add your wallet domain to `frame-src` (manifest CSP)
  to allow the embedded iframe.

---

## Production deployment (validated steps)

1. Node 20 + pnpm

```bash
nvm install 20
nvm use 20
corepack enable
corepack prepare pnpm@9.5.0 --activate
```

2. Install dependencies

```bash
pnpm install
```

3. Add the published SDK (if you’re not using the full monorepo with `sdk/`)

```bash
pnpm add -C spirekey @kadena/spirekey-sdk@1.0.1
```

4. Create `.env.production`

```bash
cd spirekey
printf '%s\n' \
'NAMESPACE=kadena' \
'WALLET_NETWORK_ID=mainnet01' \
'DAPP_NETWORK_ID=mainnet01' \
'CHAIN_ID=4' \
'CHAINWEB_URL=https://chainweb.eckowallet.com' \
'CHAINWEB_DATA=https://chainweb.eckowallet.com' > .env.production
```

5. Build

```bash
pnpm build
```

6. Start in production

```bash
pnpm start
# the wallet will listen on http://localhost:1337 (put an HTTPS reverse proxy in front)
```

### Proxy notes

- Terminate HTTPS on the public wallet domain (e.g.
  `https://kadena.dapp.runonflux.io`) and forward to `http://127.0.0.1:1337`.
- `https://chainweb.eckowallet.com` should front:
  - Pact API: paths `/{chainweb/0.0/...}/pact` to the nodes (api chainweb)
  - Chainweb Data: paths `/txs`, `/blocks`, `/txs/events` to Chainweb Data

### Graph/GraphQL (optional)

SpireKey can use a public GraphQL endpoint for advanced reads; it’s not required
for core flows. When GraphQL is unavailable, REST fallbacks and Pact `local`
cover the main features (connect/sign/recover, basic account details and tx list
via Chainweb Data).
