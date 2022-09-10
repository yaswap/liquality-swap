# Yaswap <img align="right" src="https://raw.githubusercontent.com/yaswap/chainabstractionlayer/master/yaswap-logo.png" height="80px" />


[![Standard Code Style](https://img.shields.io/badge/codestyle-standard-brightgreen.svg)](https://github.com/standard/standard)
[![MIT License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](./LICENSE.md)
[![Telegram](https://img.shields.io/badge/chat-on%20telegram-blue.svg)](https://t.me/yaswap)

Trustless swaps application

## How to run

### Requirements

- Git
- Node.Js

Steps:

```
git clone https://github.com/yaswap/liquality-swap.git
cd liquality-swap
npm install
```

Update the configuration file at `config.js` ([config.js](src/config/config.js)) with your preferred network and nodes. An example mainnet configuration is available here [atomic_swap_mainnet_manual.config.js](configs/atomic_swap_mainnet_manual.config.js). For maximum security, use your own nodes!

Now run the app:

`npm start`


## Development

### Run locally

> U2F (`@ledgerhq/hw-transport-u2f`) requires HTTPS.

```bash
npm install
npm start
```

### Build for production

```bash
npm run build
```


## License

MIT
