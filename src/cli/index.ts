import { Command } from 'commander'
import {
  accountSpendableUtxos,
  addressSpendableUtxos,
  availableBalance,
} from '../utxo/utxo'
import * as btc from '../btc/btc'
import * as brc20 from '../brc20/brc20'
import * as collectible from '../collectible/collectible'
import * as rune from '../rune/rune'

import {
  generateMnemonic,
  getWalletPrivateKeys,
  mnemonicToAccount,
} from '../account/account'
import * as bitcoin from 'bitcoinjs-lib'
import { Provider } from '../provider/provider'
import { Signer } from '../signer/index'
import { Trade } from '../trade'
import { AssetType, MarketplaceOffers } from '../shared/interface'
import { OylTransactionError } from '../errors'

const defaultProvider = {
  bitcoin: new Provider({
    url: 'https://mainnet.sandshrew.io',
    projectId: process.env.SANDSHREW_PROJECT_ID!,
    network: bitcoin.networks.bitcoin,
    networkType: 'mainnet',
    apiUrl: 'https://staging-api.oyl.gg',
  }),
  regtest: new Provider({
    url: 'http://localhost:3000',
    projectId: 'regtest',
    network: bitcoin.networks.regtest,
    networkType: 'mainnet',
    apiUrl: 'https://staging-api.oyl.gg',
  }),
}

const program = new Command()

program
  .name('default')
  .description('All functionality for oyl-sdk in a cli-wrapper')
  .version('0.0.1')

const generateCommand = new Command('generate')
  .description('Creates a new account object')
  .option(
    '-m, --mnemonic <mnemonic>',
    'mnemonic you want to generate an account from'
  )
  .option(
    '-i, --index <index>',
    'index you want to derive your account keys from'
  )
  .option('-n, --network <network>', 'the network you want to derive keys on')
  .action((options) => {
    const account = mnemonicToAccount({
      mnemonic: options.mnemonic,
      opts: {
        index: options.index,
        network: bitcoin.networks[options.network],
      },
    })
    console.log(account)
  })

const privateKeysCommand = new Command('privateKeys')
  .description('Returns private keys for an account object')
  .requiredOption(
    '-m, --mnemonic <mnemonic>',
    'mnemonic you want to get private keys from'
  )
  .option(
    '-i, --index <index>',
    'index you want to derive your account keys from'
  )
  .requiredOption(
    '-n, --network <network>',
    'the network you want to derive keys on'
  )
  .action((options) => {
    const privateKeys = getWalletPrivateKeys({
      mnemonic: options.mnemonic,
      opts: {
        index: options.index,
        network: bitcoin.networks[options.network],
      },
    })
    console.log(privateKeys)
  })

const generateMnemonicCommand = new Command('generateMnemonic')
  .description('Returns a new mnemonic phrase')
  .action(() => {
    const mnemonic = generateMnemonic()
    console.log(mnemonic)
  })

const accountUtxosToSpend = new Command('accountSpendableUtxos')
  .description('Returns available utxos to spend')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network for utxos'
  )
  .requiredOption(
    '-m, --mnemonic <mnemonic>',
    'mnemonic you want to get private keys from'
  )
  /* @dev example call
    oyl utxo addressSpendableUtxos -a bcrt1qcr8te4kr609gcawutmrza0j4xv80jy8zeqchgx -p regtest
  */
  .action(async (options) => {
    const provider: Provider = defaultProvider[options.provider]
    const account = mnemonicToAccount({
      mnemonic: options.mnemonic,
      opts: { network: provider.network },
    })
    console.log(
      await accountSpendableUtxos({
        account,
        provider,
      })
    )
  })

const accountAvailableBalance = new Command('availableBalance')
  .description('Returns available utxos to spend')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network for utxos'
  )
  .requiredOption(
    '-m, --mnemonic <mnemonic>',
    'mnemonic you want to get private keys from'
  )
  /* @dev example call
    oyl utxo availableBalance -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'  -p regtest
  */
  .action(async (options) => {
    const provider: Provider = defaultProvider[options.provider]
    const account = mnemonicToAccount({
      mnemonic: options.mnemonic,
      opts: { network: provider.network },
    })
    console.log(
      await availableBalance({
        account,
        provider,
      })
    )
  })

const addressBRC20Balance = new Command('addressBRC20Balance')
  .description('Returns all BRC20 balances')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network for utxos'
  )
  .requiredOption(
    '-a, --address <address>',
    'address you want to get utxos for'
  )

  .action(async (options) => {
    const provider: Provider = defaultProvider[options.provider]
    console.log((await provider.api.getBrc20sByAddress(options.address)).data)
  })

const addressUtxosToSpend = new Command('addressSpendableUtxos')
  .description('Returns available utxos to spend')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network for utxos'
  )
  .requiredOption(
    '-a, --address <address>',
    'address you want to get utxos for'
  )
  .action(async (options) => {
    const provider = defaultProvider[options.provider]
    console.log(
      await addressSpendableUtxos({
        address: options.address,
        provider,
        spendAmount: 100000,
      })
    )
  })

const btcSend = new Command('send')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network for utxos'
  )
  .requiredOption(
    '-m, --mnemonic <mnemonic>',
    'mnemonic you want to get private keys from'
  )
  .requiredOption('-amt, --amount <amount>', 'amount you want to send')
  .requiredOption('-t, --to <to>', 'address you want to send to')
  .option('-legacy, --legacy <legacy>', 'legacy private key')
  .option('-taproot, --taproot <taproot>', 'taproot private key')
  .option(
    '-nested, --nested-segwit <nestedSegwit>',
    'nested segwit private key'
  )
  .option(
    '-native, --native-segwit <nativeSegwit>',
    'native segwit private key'
  )
  .option('-feeRate, --feeRate <feeRate>', 'fee rate')

  /* @dev example call 
  oyl btc send 
  -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' 
  -native '4604b4b710fe91f584fff084e1a9159fe4f8408fff380596a604948474ce4fa3'
  -p regtest 
  -t bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv 
  -amt 1000
  -feeRate 2
*/

  .action(async (options) => {
    const provider = defaultProvider[options.provider]
    const signer = new Signer(provider.network, {
      segwitPrivateKey: options.nativeSegwit,
      taprootPrivateKey: options.taproot,
      nestedSegwitPrivateKey: options.nestedSegwit,
      legacyPrivateKey: options.legacy,
    })
    const account = mnemonicToAccount({
      mnemonic: options.mnemonic,
      opts: {
        network: provider.network,
      },
    })
    console.log(
      await btc.send({
        toAddress: options.to,
        feeRate: options.feeRate,
        account,
        signer,
        provider,
        amount: options.amount,
      })
    )
  })

const brc20Send = new Command('send')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network for utxos'
  )
  .requiredOption(
    '-m, --mnemonic <mnemonic>',
    'mnemonic you want to get private keys from'
  )
  .requiredOption('-amt, --amount <amount>', 'amount you want to send')
  .requiredOption('-t, --to <to>', 'address you want to send to')
  .requiredOption('-tick', '--ticker <ticker>', 'brc20 ticker to send')
  .option('-legacy, --legacy <legacy>', 'legacy private key')
  .option('-taproot, --taproot <taproot>', 'taproot private key')
  .option(
    '-nested, --nested-segwit <nestedSegwit>',
    'nested segwit private key'
  )
  .option(
    '-native, --native-segwit <nativeSegwit>',
    'native segwit private key'
  )
  .option('-feeRate, --feeRate <feeRate>', 'fee rate')

  /* @dev example call 
  oyl brc20 send 
  -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' 
  -native 4604b4b710fe91f584fff084e1a9159fe4f8408fff380596a604948474ce4fa3
  -taproot 41f41d69260df4cf277826a9b65a3717e4eeddbeedf637f212ca096576479361
  -p regtest 
  -t bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv 
  -tick toyl
  -amt 1000
  -feeRate 2
*/

  .action(async (options) => {
    const provider = defaultProvider[options.provider]
    const signer = new Signer(provider.network, {
      segwitPrivateKey: options.nativeSegwit,
      taprootPrivateKey: options.taproot,
      nestedSegwitPrivateKey: options.nestedSegwit,
      legacyPrivateKey: options.legacy,
    })
    const account = mnemonicToAccount({
      mnemonic: options.mnemonic,
      opts: {
        network: provider.network,
      },
    })
    console.log(
      await brc20.send({
        ticker: options.ticker,
        toAddress: options.to,
        feeRate: options.feeRate,
        account,
        signer,
        provider,
        amount: options.amount,
      })
    )
  })

const collectibleSend = new Command('send')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network for utxos'
  )
  .requiredOption(
    '-m, --mnemonic <mnemonic>',
    'mnemonic you want to get private keys from'
  )
  .requiredOption('-t, --to <to>', 'address you want to send to')
  .requiredOption(
    '-inscId, --inscriptionId <inscriptionId>',
    'inscription to send'
  )
  .requiredOption(
    '-inscAdd, --inscriptionAddress <inscriptionAddress>',
    'current holder of inscription to send'
  )
  .option('-legacy, --legacy <legacy>', 'legacy private key')
  .option('-taproot, --taproot <taproot>', 'taproot private key')
  .option(
    '-nested, --nested-segwit <nestedSegwit>',
    'nested segwit private key'
  )
  .option(
    '-native, --native-segwit <nativeSegwit>',
    'native segwit private key'
  )
  .option('-feeRate, --feeRate <feeRate>', 'fee rate')

  /* @dev example call 
  oyl collectible send 
  -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' 
  -native 4604b4b710fe91f584fff084e1a9159fe4f8408fff380596a604948474ce4fa3
  -taproot 41f41d69260df4cf277826a9b65a3717e4eeddbeedf637f212ca096576479361
  -p regtest 
  -t bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv 
  -inscId d0c21b35f27ba6361acd5172fcfafe8f4f96d424c80c00b5793290387bcbcf44i0
  -inscAdd bcrt1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqvg32hk
  -feeRate 2
*/

  .action(async (options) => {
    const provider = defaultProvider[options.provider]
    const signer = new Signer(provider.network, {
      segwitPrivateKey: options.nativeSegwit,
      taprootPrivateKey: options.taproot,
      nestedSegwitPrivateKey: options.nestedSegwit,
      legacyPrivateKey: options.legacy,
    })
    const account = mnemonicToAccount({
      mnemonic: options.mnemonic,
      opts: {
        network: provider.network,
      },
    })
    console.log(
      await collectible.send({
        inscriptionId: options.inscriptionId,
        inscriptionAddress: options.inscriptionAddress,
        toAddress: options.to,
        feeRate: options.feeRate,
        account,
        signer,
        provider,
      })
    )
  })

const runeSend = new Command('send')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network for utxos'
  )
  .requiredOption(
    '-m, --mnemonic <mnemonic>',
    'mnemonic you want to get private keys from'
  )
  .requiredOption('-t, --to <to>', 'address you want to send to')
  .requiredOption('-runeId, --runeId <runeId>', 'runeId to send')
  .requiredOption(
    '-inscAdd, --inscriptionAddress <inscriptionAddress>',
    'current holder of inscription to send'
  )
  .requiredOption('-amt, --amount <amount>', 'amount of runes you want to send')
  .option('-legacy, --legacy <legacy>', 'legacy private key')
  .option('-taproot, --taproot <taproot>', 'taproot private key')
  .option(
    '-nested, --nested-segwit <nestedSegwit>',
    'nested segwit private key'
  )
  .option(
    '-native, --native-segwit <nativeSegwit>',
    'native segwit private key'
  )
  .option('-feeRate, --feeRate <feeRate>', 'fee rate')

  /* @dev example call 
  oyl rune send 
  -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' 
  -native 4604b4b710fe91f584fff084e1a9159fe4f8408fff380596a604948474ce4fa3
  -taproot 41f41d69260df4cf277826a9b65a3717e4eeddbeedf637f212ca096576479361
  -p regtest 
  -t bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv 
  -amt 100
  -runeId 279:1
  -inscAdd bcrt1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqvg32hk
  -feeRate 2
*/

  .action(async (options) => {
    const provider = defaultProvider[options.provider]
    const signer = new Signer(provider.network, {
      segwitPrivateKey: options.nativeSegwit,
      taprootPrivateKey: options.taproot,
      nestedSegwitPrivateKey: options.nestedSegwit,
      legacyPrivateKey: options.legacy,
    })
    const account = mnemonicToAccount({
      mnemonic: options.mnemonic,
      opts: {
        network: provider.network,
      },
    })
    console.log(
      await rune.send({
        runeId: options.runeId,
        amount: options.amount,
        inscriptionAddress: options.inscriptionAddress,
        toAddress: options.to,
        feeRate: options.feeRate,
        account,
        signer,
        provider,
      })
    )
  })

const runeMint = new Command('mint')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network for utxos'
  )
  .requiredOption(
    '-m, --mnemonic <mnemonic>',
    'mnemonic you want to get private keys from'
  )
  .requiredOption('-runeId, --runeId <runeId>', 'runeId to send')
  .requiredOption('-amt, --amount <amount>', 'amount of runes you want to send')
  .option('-legacy, --legacy <legacy>', 'legacy private key')
  .option('-taproot, --taproot <taproot>', 'taproot private key')
  .option(
    '-nested, --nested-segwit <nestedSegwit>',
    'nested segwit private key'
  )
  .option(
    '-native, --native-segwit <nativeSegwit>',
    'native segwit private key'
  )
  .option('-feeRate, --feeRate <feeRate>', 'fee rate')

  /* @dev example call 
  oyl rune mint 
  -m 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about' 
  -native 4604b4b710fe91f584fff084e1a9159fe4f8408fff380596a604948474ce4fa3
  -taproot 41f41d69260df4cf277826a9b65a3717e4eeddbeedf637f212ca096576479361
  -p regtest 
  -amt 1000
  -runeId 279:1
  -feeRate 2
*/

  .action(async (options) => {
    const provider = defaultProvider[options.provider]
    const signer = new Signer(provider.network, {
      segwitPrivateKey: options.nativeSegwit,
      taprootPrivateKey: options.taproot,
      nestedSegwitPrivateKey: options.nestedSegwit,
      legacyPrivateKey: options.legacy,
    })
    const account = mnemonicToAccount({
      mnemonic: options.mnemonic,
      opts: {
        network: provider.network,
      },
    })
    console.log(
      await rune.mint({
        runeId: options.runeId,
        amount: options.amount,
        feeRate: options.feeRate,
        account,
        signer,
        provider,
      })
    )
  })

const getRuneByName = new Command('getRuneByName')
  .description('Returns rune details based on name provided')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use when querying the network for utxos'
  )
  .requiredOption('-name, --name <name>', 'name of the rune you want to fetch')
  /* @dev example call
    oyl rune getRuneByName -name ETCHSGSXCUMYO -p regtest
  */
  .action(async (options) => {
    const provider: Provider = defaultProvider[options.provider]
    console.log(await provider.ord.getRuneByName(options.name))
  })

const apiProviderCall = new Command('api')
  .description('Returns data based on api method invoked')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use to access the network.'
  )
  .requiredOption(
    '-method, --method <method>',
    'name of the method you want to call for the api.'
  )
  .option(
    '-params, --parameters <parameters>',
    'parameters for the api method you are calling.'
  )
  /* @dev example call
    oyl provider api -method getUnisatTickerOffers -params '{"ticker":"ordi"}' -p bitcoin

    please note the json format if you need to pass an object.
  */
  .action(async (options) => {
    const provider: Provider = defaultProvider[options.provider]
    let isJson: object
    try {
      isJson = JSON.parse(options.parameters)
      console.log(await provider.api[options.method](isJson))
    } catch (error) {
      console.log(await provider.api[options.method](options.parameters))
    }
  })

const ordProviderCall = new Command('ord')
  .description('Returns data based on ord method invoked')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use to access the network.'
  )
  .requiredOption(
    '-method, --method <method>',
    'name of the method you want to call for the api.'
  )
  .option(
    '-params, --parameters <parameters>',
    'parameters for the ord method you are calling.'
  )
  /* @dev example call
    oyl provider ord -method getTxOutput -params '{"ticker":"ordi"}' -p bitcoin

    please note the json format if you need to pass an object.
  */
  .action(async (options) => {
    const provider: Provider = defaultProvider[options.provider]
    let isJson: object
    try {
      isJson = JSON.parse(options.parameters)
      console.log(await provider.ord[options.method](isJson))
    } catch (error) {
      console.log(await provider.ord[options.method](options.parameters))
    }
  })

const opiProviderCall = new Command('opi')
  .description('Returns data based on opi query')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use to access the network.'
  )
  .requiredOption(
    '-method, --method <method>',
    'name of the method you want to call for the api.'
  )
  .option(
    '-params, --parameters <parameters>',
    'parameters for the ord method you are calling.'
  )
  /* @dev example call
    oyl provider opi -method getBrc20Balance -params '{"address":"bcrt1qzr9vhs60g6qlmk7x3dd7g3ja30wyts48sxuemv","ticker":"ordi"}' -p bitcoin

    please note the json format if you need to pass an object.
  */
  .action(async (options) => {
    const provider: Provider = defaultProvider[options.provider]
    let isJson: object
    try {
      isJson = JSON.parse(options.parameters)
      console.log(await provider.opi[options.method](isJson))
    } catch (error) {
      console.log(await provider.opi[options.method](options.parameters))
    }
  })

const marketPlaceBuy = new Command('buy')

  .description('Returns rune details based on name provided')
  .requiredOption(
    '-p, --provider <provider>',
    'provider to use to access the network.'
  )
  .requiredOption(
    '-m, --mnemonic <mnemonic>',
    'mnemonic you want to get private keys from'
  )
  .requiredOption(
    '-type, --asset-type <assetType>',
    'pass BRC20, COLLECTIBLE or RUNE'
  )
  .requiredOption('-feeRate, --feeRate <feeRate>', 'fee rate')
  .requiredOption(
    '-tick --ticker <ticker>',
    'Asset ticker to fetch quotes for.'
  )
  .option('-legacy, --legacy <legacy>', 'legacy private key')
  .option('-taproot, --taproot <taproot>', 'taproot private key')
  .option(
    '-nested, --nested-segwit <nestedSegwit>',
    'nested segwit private key'
  )
  .option(
    '-native, --native-segwit <nativeSegwit>',
    'native segwit private key'
  )
  .option(
    '-receive, --receive-address <receiveAddress>',
    'address to receieve the assets.'
  )

  /* @dev example call
    oyl marketplace buy -type BRC20 -tick ordi -feeRate 30 -native <nativePrivateKey> -p bitcoin

    please note the json format if you need to pass an object.
  */
  .action(async (options) => {
    const provider: Provider = defaultProvider[options.provider]
    const signer = new Signer(provider.network, {
      segwitPrivateKey: options.nativeSegwit,
      taprootPrivateKey: options.taproot,
      nestedSegwitPrivateKey: options.nestedSegwit,
      legacyPrivateKey: options.legacy,
    })
    const account = mnemonicToAccount({
      mnemonic: options.mnemonic,
      opts: {
        network: provider.network,
        spendStrategy: {
          addressOrder: ['taproot', 'nativeSegwit'],
          utxoSortGreatestToLeast: true,
          changeAddress: 'taproot',
        },
      },
    })
    let quotes: MarketplaceOffers[]
    switch (options.assetType) {
      case 'BRC20':
        options.assetType = AssetType.BRC20
        quotes = await provider.api.getBrc20Offers({
          ticker: options.ticker,
        })

        break
      case 'RUNES':
        options.assetType = AssetType.RUNES
        quotes = await provider.api.getRuneOffers({
          ticker: options.ticker,
        })
        break
      case 'COLLECTIBLE':
        options.assetType = AssetType.COLLECTIBLE
        break
      default:
        throw new OylTransactionError(Error('Incorrect asset type'))
    }
    const marketplace: Trade = new Trade({
      provider: provider,
      receiveAddress:
        options.receiveAddress === undefined
          ? account.taproot.address
          : options.receiveAddress,
      account: account,
      assetType: options.assetType,
      signer,
      feeRate: Number(options.feeRate),
    })
    const offersToBuy = await marketplace.processAllOffers(quotes)
    const signedTxs = await marketplace.buyMarketPlaceOffers(offersToBuy)
    console.log(signedTxs)
  })

const accountCommand = new Command('account')
  .description('Manage accounts')
  .addCommand(generateCommand)
  .addCommand(privateKeysCommand)
  .addCommand(generateMnemonicCommand)

const utxosCommand = new Command('utxo')
  .description('Examine utxos')
  .addCommand(accountUtxosToSpend)
  .addCommand(addressUtxosToSpend)
  .addCommand(accountAvailableBalance)
const btcCommand = new Command('btc')
  .description('Functions for sending bitcoin')
  .addCommand(btcSend)

const brc20Command = new Command('brc20')
  .description('Functions for brc20')
  .addCommand(brc20Send)
  .addCommand(addressBRC20Balance)
const collectibleCommand = new Command('collectible')
  .description('Functions for collectibles')
  .addCommand(collectibleSend)
const runeCommand = new Command('rune')
  .description('Functions for runes')
  .addCommand(runeSend)
  .addCommand(runeMint)
  .addCommand(getRuneByName)

const providerCommand = new Command('provider')
  .description('Functions avaialble for all provider services')
  .addCommand(apiProviderCall)
  .addCommand(ordProviderCall)
  .addCommand(opiProviderCall)

const marketPlaceCommand = new Command('marketplace')
  .description('Functions for marketplace')
  .addCommand(marketPlaceBuy)

program.addCommand(utxosCommand)
program.addCommand(accountCommand)
program.addCommand(btcCommand)
program.addCommand(brc20Command)
program.addCommand(collectibleCommand)
program.addCommand(runeCommand)
program.addCommand(providerCommand)
program.addCommand(marketPlaceCommand)

program.parse(process.argv)
