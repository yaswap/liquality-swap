/* global localStorage */

import { Client } from '@liquality/client'
import { BitcoinEsploraBatchApiProvider } from '@yac-swap/bitcoin-esplora-batch-api-provider'
import { BitcoinEsploraSwapFindProvider } from '@yac-swap/bitcoin-esplora-swap-find-provider'
import { BitcoinRpcProvider } from '@yac-swap/bitcoin-rpc-provider'
import { BitcoinLedgerProvider } from '@yac-swap/bitcoin-ledger-provider'
import { BitcoinWalletApiProvider } from '@yac-swap/bitcoin-wallet-api-provider'
import { BitcoinSwapProvider } from '@yac-swap/bitcoin-swap-provider'
import { BitcoinNodeWalletProvider } from '@yac-swap/bitcoin-node-wallet-provider'
import { BitcoinRpcFeeProvider } from '@yac-swap/bitcoin-rpc-fee-provider'
import { BitcoinFeeApiProvider } from '@yac-swap/bitcoin-fee-api-provider'
import { BitcoinNetworks } from '@yac-swap/bitcoin-networks'

import { EthereumRpcProvider } from '@yac-swap/ethereum-rpc-provider'
import { EthereumLedgerProvider } from '@yac-swap/ethereum-ledger-provider'
import { EthereumNetworks } from '@yac-swap/ethereum-networks'
import { EthereumSwapProvider } from '@yac-swap/ethereum-swap-provider'
import { EthereumScraperSwapFindProvider } from '@yac-swap/ethereum-scraper-swap-find-provider'
import { EthereumErc20Provider } from '@yac-swap/ethereum-erc20-provider'
import { EthereumErc20SwapProvider } from '@yac-swap/ethereum-erc20-swap-provider'
import { EthereumErc20ScraperSwapFindProvider } from '@yac-swap/ethereum-erc20-scraper-swap-find-provider'
import { EthereumWalletApiProvider } from '@yac-swap/ethereum-wallet-api-provider'
import { EthereumRpcFeeProvider } from '@yac-swap/ethereum-rpc-fee-provider'
import { EthereumGasNowFeeProvider } from '@yac-swap/ethereum-gas-now-fee-provider'

import { YacoinEsploraApiProvider } from '@yac-swap/yacoin-esplora-api-provider'
import { YacoinEsploraSwapFindProvider } from '@yac-swap/yacoin-esplora-swap-find-provider'
import { YacoinWalletApiProvider } from '@yac-swap/yacoin-wallet-api-provider'
import { YacoinSwapProvider } from '@yac-swap/yacoin-swap-provider'
import { YacoinFeeApiProvider } from '@yac-swap/yacoin-fee-api-provider'
import { YacoinNetworks } from '@yac-swap/yacoin-networks'

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
  } else if (wallet === 'liquality') {
    btcClient.addProvider(getBitcoinDataProvider(btcConfig))
    btcClient.addProvider(new BitcoinWalletApiProvider({ network, addressType: 'bech32' }))
  } else {
    // Verify functions required when wallet not connected
    btcClient.addProvider(getBitcoinDataProvider(btcConfig))
  }
  btcClient.addProvider(new BitcoinSwapProvider({ network, mode: btcConfig.swapMode }))
  if (btcConfig.api) btcClient.addProvider(new BitcoinEsploraSwapFindProvider(btcConfig.api.url))

  if (network.isTestnet) btcClient.addProvider(new BitcoinRpcFeeProvider())
  else btcClient.addProvider(new BitcoinFeeApiProvider('https://liquality.io/swap/mempool/v1/fees/recommended'))

  return btcClient
}

function createYacClient(asset, wallet) {
  const yacConfig = config.assets.YAC;
  const network = YacoinNetworks[yacConfig.network];

  const yacClient = new Client();
  if (wallet === "liquality") {
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
      "https://liquality.io/swap/mempool/v1/fees/recommended"
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
