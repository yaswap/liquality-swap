/* global localStorage */

import { Client } from '@yaswap/client'
import { BitcoinEsploraBatchApiProvider } from '@yaswap/bitcoin-esplora-batch-api-provider'
import { BitcoinEsploraSwapFindProvider } from '@yaswap/bitcoin-esplora-swap-find-provider'
import { BitcoinRpcProvider } from '@yaswap/bitcoin-rpc-provider'
import { BitcoinLedgerProvider } from '@yaswap/bitcoin-ledger-provider'
import { BitcoinWalletApiProvider } from '@yaswap/bitcoin-wallet-api-provider'
import { BitcoinSwapProvider } from '@yaswap/bitcoin-swap-provider'
import { BitcoinNodeWalletProvider } from '@yaswap/bitcoin-node-wallet-provider'
import { BitcoinRpcFeeProvider } from '@yaswap/bitcoin-rpc-fee-provider'
import { BitcoinFeeApiProvider } from '@yaswap/bitcoin-fee-api-provider'
import { BitcoinNetworks } from '@yaswap/bitcoin-networks'

import { EthereumRpcProvider } from '@yaswap/ethereum-rpc-provider'
import { EthereumLedgerProvider } from '@yaswap/ethereum-ledger-provider'
import { EthereumNetworks } from '@yaswap/ethereum-networks'
import { EthereumSwapProvider } from '@yaswap/ethereum-swap-provider'
import { EthereumScraperSwapFindProvider } from '@yaswap/ethereum-scraper-swap-find-provider'
import { EthereumErc20Provider } from '@yaswap/ethereum-erc20-provider'
import { EthereumErc20SwapProvider } from '@yaswap/ethereum-erc20-swap-provider'
import { EthereumErc20ScraperSwapFindProvider } from '@yaswap/ethereum-erc20-scraper-swap-find-provider'
import { EthereumWalletApiProvider } from '@yaswap/ethereum-wallet-api-provider'
import { EthereumRpcFeeProvider } from '@yaswap/ethereum-rpc-fee-provider'
import { EthereumGasNowFeeProvider } from '@yaswap/ethereum-gas-now-fee-provider'

import { YacoinEsploraApiProvider } from '@yaswap/yacoin-esplora-api-provider'
import { YacoinEsploraSwapFindProvider } from '@yaswap/yacoin-esplora-swap-find-provider'
import { YacoinWalletApiProvider } from '@yaswap/yacoin-wallet-api-provider'
import { YacoinSwapProvider } from '@yaswap/yacoin-swap-provider'
import { YacoinFeeApiProvider } from '@yaswap/yacoin-fee-api-provider'
import { YacoinNetworks } from '@yaswap/yacoin-networks'

import LedgerTransportWebUSB from '@ledgerhq/hw-transport-webusb'

import config from '../config'

function getBitcoinDataProvider (btcConfig) {
  if (btcConfig.api) {
    return new BitcoinEsploraBatchApiProvider({ url: btcConfig.api.url, batchUrl: btcConfig.batchApi.url, network: BitcoinNetworks[btcConfig.network], numberOfBlockConfirmation: btcConfig.feeNumberOfBlocks })
  } else if (btcConfig.rpc) {
    return new BitcoinRpcProvider({ uri: btcConfig.rpc.url, username: btcConfig.rpc.username, password: btcConfig.rpc.password, feeBlockConfirmations: btcConfig.feeNumberOfBlocks })
  }
}

function getBitcoinLedgerDerivationPath (addressType, network) {
  if (addressType === 'bech32') {
    return `m/84'/${network.coinType}'/0'`
  }
  if (addressType === 'legacy') {
    return `m/44'/${network.coinType}'/0'`
  }
}

function createBtcClient (asset, wallet) {
  const btcConfig = config.assets.BTC
  const network = BitcoinNetworks[btcConfig.network]

  const btcClient = new Client()
  if (wallet && wallet.includes('bitcoin_ledger')) {
    let addressType
    if (wallet === 'bitcoin_ledger_legacy') {
      addressType = 'legacy'
    } else if (wallet === 'bitcoin_ledger_nagive_segwit') {
      addressType = 'bech32'
    }
    const ledger = new BitcoinLedgerProvider({ Transport: LedgerTransportWebUSB, network, baseDerivationPath: getBitcoinLedgerDerivationPath(addressType, network), addressType })
    btcClient.addProvider(getBitcoinDataProvider(btcConfig))
    btcClient.addProvider(ledger)
  } else if (wallet === 'bitcoin_node') {
    if (btcConfig.rpc.addressType === 'p2sh-segwit') {
      throw new Error('Wrapped segwit addresses (p2sh-segwit) are currently unsupported.')
    }
    if (btcConfig.api) btcClient.addProvider(new BitcoinEsploraBatchApiProvider({ url: btcConfig.api.url, network: network, numberOfBlockConfirmation: btcConfig.feeNumberOfBlocks }))
    btcClient.addProvider(new BitcoinRpcProvider({ uri: btcConfig.rpc.url, username: btcConfig.rpc.username, password: btcConfig.rpc.password, feeBlockConfirmations: btcConfig.feeNumberOfBlocks }))
    btcClient.addProvider(new BitcoinNodeWalletProvider({ network, uri: btcConfig.rpc.url, username: btcConfig.rpc.username, password: btcConfig.rpc.password, addressType: btcConfig.rpc.addressType }))
  } else if (wallet === 'yaswap') {
    btcClient.addProvider(getBitcoinDataProvider(btcConfig))
    btcClient.addProvider(new BitcoinWalletApiProvider({ network, addressType: 'bech32' }))
  } else {
    // Verify functions required when wallet not connected
    btcClient.addProvider(getBitcoinDataProvider(btcConfig))
  }
  btcClient.addProvider(new BitcoinSwapProvider({ network, mode: btcConfig.swapMode }))
  if (btcConfig.api) btcClient.addProvider(new BitcoinEsploraSwapFindProvider(btcConfig.api.url))

  if (network.isTestnet) btcClient.addProvider(new BitcoinRpcFeeProvider())
  else btcClient.addProvider(new BitcoinFeeApiProvider('https://mempool.space/api/v1/fees/recommended'))

  return btcClient
}

function createYacClient(asset, wallet) {
  const yacConfig = config.assets.YAC;
  const network = YacoinNetworks[yacConfig.network];

  const yacClient = new Client();
  if (wallet === "yaswap") {
    yacClient.addProvider(
      new YacoinEsploraApiProvider({
        url: yacConfig.api.esploraUrl,
        network: YacoinNetworks[yacConfig.network],
        numberOfBlockConfirmation: yacConfig.feeNumberOfBlocks,
      })
    );
    yacClient.addProvider(
      new YacoinWalletApiProvider({
        network: YacoinNetworks[yacConfig.network],
        addressType: "legacy",
      })
    );
  } else {
    // Verify functions required when wallet not connected
    yacClient.addProvider(
      new YacoinEsploraApiProvider({
        url: yacConfig.api.esploraUrl,
        network: YacoinNetworks[yacConfig.network],
        numberOfBlockConfirmation: yacConfig.feeNumberOfBlocks,
      })
    );
  }
  yacClient.addProvider(
    new YacoinSwapProvider({ network, mode: yacConfig.swapMode })
  );
  if (yacConfig.api)
    yacClient.addProvider(new YacoinEsploraSwapFindProvider(yacConfig.api.esploraSwapUrl));

  yacClient.addProvider(
    new YacoinFeeApiProvider(
      "https://mempool.space/api/v1/fees/recommended"
    )
  );

  return yacClient;
}

function createEthClient (asset, wallet) {
  const assetConfig = config.assets[asset]
  const network = EthereumNetworks[assetConfig.network]
  const isERC20 = assetConfig.type === 'erc20'
  const ethClient = new Client()
  ethClient.addProvider(new EthereumRpcProvider({ uri: assetConfig.rpc.url }))
  if (wallet === 'metamask') {
    ethClient.addProvider(new EthereumWalletApiProvider(window.ethereum, network))
  } else if (wallet === 'ethereum_ledger') {
    const ledger = new EthereumLedgerProvider({ network, Transport: LedgerTransportWebUSB, derivationPath: `m/44'/${network.coinType}'/0'/0/0` })

    if (window.useWebBle || localStorage.useWebBle) {
      ledger.useWebBle()
    }

    ethClient.addProvider(ledger)
  }
  if (isERC20) {
    ethClient.addProvider(new EthereumErc20Provider(assetConfig.contractAddress))
    ethClient.addProvider(new EthereumErc20SwapProvider())
  } else {
    ethClient.addProvider(new EthereumSwapProvider())
  }

  if (assetConfig.api && assetConfig.api.type === 'scraper') {
    if (isERC20) ethClient.addProvider(new EthereumErc20ScraperSwapFindProvider(assetConfig.api.url))
    else ethClient.addProvider(new EthereumScraperSwapFindProvider(assetConfig.api.url))
  }

  ethClient.addProvider(new EthereumRpcFeeProvider())

  return ethClient
}

const clientCreators = {
  BTC: createBtcClient,
  ETH: createEthClient,
  RBTC: createEthClient,
  erc20: createEthClient,
  MATIC: createEthClient,
  YAC: createYacClient
}

const clients = {}

function getClient (asset, wallet) {
  if (!(asset in clients)) {
    clients[asset] = {}
  }
  if (wallet in clients[asset]) return clients[asset][wallet]
  const assetConfig = config.assets[asset]
  const creator = clientCreators[asset] || clientCreators[assetConfig.type]
  const client = creator(asset, wallet)
  clients[asset][wallet] = client
  return client
}

function getNetworkClient (asset, wallet) {
  const assetConfig = config.assets[asset]
  if (assetConfig.type === 'erc20') {
    return getClient('ETH', wallet)
  } else {
    return getClient(asset, wallet)
  }
}

export { getClient, getNetworkClient }
