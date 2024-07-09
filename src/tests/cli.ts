import yargs from 'yargs'
import { camelCase } from 'change-case'
import {
  NESTED_SEGWIT_HD_PATH,
  Oyl,
  SEGWIT_HD_PATH,
  TAPROOT_HD_PATH,
} from '../oylib'
import { Signer } from '../signer'
import * as bitcoin from 'bitcoinjs-lib'
import axios from 'axios'
import * as ecc2 from '@bitcoinerlab/secp256k1'
import { hideBin } from 'yargs/helpers'
import { BuildMarketplaceTransaction } from '../marketplace/buildMarketplaceTx'
import { Network, ToSignInput } from '../shared/interface'
import {
  callBTCRPCEndpoint,
  delay,
  formatOptionsToSignInputs,
  getFee,
  getNetwork,
  signInputs,
  waitForTransaction,
} from '../shared/utils'
import { customPaths } from '../wallet/accountsManager'
import * as transactions from '../transactions'
import { Marketplace } from '../marketplace'
import * as dotenv from 'dotenv'
import { Provider } from '../provider/provider'
import {
  Account,
  MnemonicToAccountOptions,
  mnemonicToAccount,
} from '../account'
import { accountSpendableUtxos } from '../utxo'
import * as btc from '../btc'
import * as rune from '../rune'
import {
  Opts,
  mainnetMnemonic,
  regtestMnemonic,
  regtestOpts,
  regtestProviderConstructorArgs,
} from '../shared/constants'
import * as collectible from '../collectible'
import { commit, reveal, transfer, transferEstimate } from '../brc20'
dotenv.config()

bitcoin.initEccLib(ecc2)

export async function loadRpc(options) {
  const wallet = new Oyl()
  try {
    const newWallet = await wallet.getUtxosArtifacts({
      address: 'bc1pmtkac5u6rx7vkwhcnt0gal5muejwhp8hcrmx2yhvjg8nenu7rp3syw6yp0',
    })
    console.log('newWallet:', newWallet)
  } catch (error) {
    console.error('Error:', error)
  }
}

export async function testMarketplaceBuy() {
  const wallet = new Oyl({
    network: 'testnet',
    baseUrl: 'https://testnet.sandshrew.io',
    version: 'v1',
    projectId: process.env.SANDSHREW_PROJECT_ID,
  })

  const marketplaceOptions = {
    address: process.env.TAPROOT_ADDRESS,
    publicKey: process.env.TAPROOT_PUBKEY,
    mnemonic: process.env.TAPROOT_MNEMONIC,
    hdPath: process.env.HD_PATH,
    feeRate: parseFloat(process.env.FEE_RATE!),
    wallet: wallet,
  }

  const offers = await wallet.apiClient.getAggregatedOffers({
    ticker: 'ordi',
    limitOrderAmount: 2,
  })

  // const quotes = offers.bestPrice.offers
  // console.log(quotes)
  // const marketplace = new Marketplace(marketplaceOptions)
  // const offersToBuy = await marketplace.processAllOffers(quotes)
  // const signedTxs = await marketplace.buyMarketPlaceOffers(offersToBuy)
  // console.log(signedTxs)
}

export async function testAggregator() {
  // const aggregator = new Aggregator()
  // const aggregated = await aggregator.fetchAndAggregateOffers(
  //   'ordi',
  //   20,
  //   110000
  // )
  // const formatOffers = (offers) =>
  //   offers.map((offer) => ({
  //     amount: offer.amount,
  //     unitPrice: offer.unitPrice,
  //     nftId: offer.offerId,
  //     marketplace: offer.marketplace,
  //   }))
  // console.log('Aggregated Offers')
  // console.log('Best Price Offers:', formatOffers(aggregated.bestPrice.offers))
  // console.log(
  //   'Closest Match Offers:',
  //   formatOffers(aggregated.closestMatch.offers)
  // )
}

export async function viewPsbt() {
  console.log(
    bitcoin.Psbt.fromBase64(process.env.PSBT_BASE64!, {
      network: bitcoin.networks.testnet,
    }).txOutputs
  )
}

export async function convertPsbt() {
  const psbt = bitcoin.Psbt.fromHex(process.env.PSBT_HEX!, {
    network: bitcoin.networks.bitcoin,
  }).toBase64()
  console.log(psbt)
  console.log(
    bitcoin.Psbt.fromBase64(psbt, {
      network: bitcoin.networks.bitcoin,
    }).data.inputs
  )
}

export async function callAPI(command, data, options = {}) {
  const oylSdk = new Oyl()
  const camelCommand = camelCase(command)
  if (!oylSdk[camelCommand]) throw Error('command not foud: ' + camelCommand)
  const result = await oylSdk[camelCommand](data)
  console.log(JSON.stringify(result, null, 2))
  return result
}

export const MEMPOOL_SPACE_API_V1_URL = 'https://mempool.space/api/v1'

export const createInscriptionScript = (pubKey: any, content: any) => {
  const mimeType = 'text/plain;charset=utf-8'
  const textEncoder = new TextEncoder()
  const marker = textEncoder.encode('ord')
  return [
    pubKey,
    'OP_CHECKSIG',
    'OP_0',
    'OP_IF',
    marker,
    '01',
    textEncoder.encode(mimeType),
    'OP_0',
    textEncoder.encode(content),
    'OP_ENDIF',
  ]
}

const INSCRIPTION_PREPARE_SAT_AMOUNT = 4000

// Define an interface to represent the expected structure of the arguments.
interface YargsArguments {
  _: string[]
  network?: 'testnet' | 'regtest' | 'mainnet'
  to?: string
  ticker?: string
  amount?: number
  feeRate?: number
  price?: number
  mnemonic?: string
  inscriptionId?: string
  psbtBase64?: string
  isDry?: boolean
}

const tapWallet = new Oyl({
  network: 'mainnet',
  baseUrl: 'https://mainnet.sandshrew.io',
  version: 'v1',
  projectId: process.env.SANDSHREW_PROJECT_ID,
})

export const provider = new Provider({
  url: 'https://mainnet.sandshrew.io',
  projectId: process.env.SANDSHREW_PROJECT_ID!,
  network: bitcoin.networks.bitcoin,
  networkType: 'mainnet',
})

const regtestAccount = mnemonicToAccount({
  mnemonic: regtestMnemonic,
  opts: regtestOpts,
})
const account: Account = mnemonicToAccount({
  mnemonic: mainnetMnemonic,
  opts: Opts,
})

const testWallet = new Oyl({
  network: 'testnet',
  baseUrl: 'https://testnet.sandshrew.io',
  version: 'v1',
  projectId: process.env.SANDSHREW_PROJECT_ID,
})

testWallet.apiClient.setAuthToken(process.env.API_TOKEN!)
tapWallet.apiClient.setAuthToken(process.env.API_TOKEN!)

const XVERSE = 'xverse'
const UNISAT = 'unisat'
const MAINNET = 'mainnet'
const REGTEST = 'regtest'
const TESTNET = 'testnet'

const config = {
  [MAINNET]: {
    mnemonic: process.env.MAINNET_MNEMONIC,
    wallet: tapWallet as Oyl,
    segwitPrivateKey: process.env.MAINNET_SEGWIT_PRIVATEKEY,
    taprootPrivateKey: process.env.MAINNET_TAPROOT_PRIVATEKEY,
    nestedSegwitPrivateKey: process.env.MAINNET_NESTED_SEGWIT_PRIVATEKEY,
    taprootAddress:
      'bc1ppkyawqh6lsgq4w82azgvht6qkd286mc599tyeaw4lr230ax25wgqdcldtm',
    taprootPubKey:
      '02ebb592b5f1a2450766487d451f3a6fb2a584703ef64c6acb613db62797f943be',
    segwitAddress: 'bc1qac6u4rxej8n275tmk8k4aeadxulwlxxa72dxhr',
    segwitPubKey:
      '03ea758e8b0d4da67e1f784d7c01cbec13e7f109fe12093332b7df31d65b308bad',
    destinationTaprootAddress:
      'bc1p5pvvfjtnhl32llttswchrtyd9mdzd3p7yps98tlydh2dm6zj6gqsfkmcnd',
    feeRate: 15,
  },
  [TESTNET]: {
    mnemonic: process.env.TESTNET_MNEMONIC,
    wallet: testWallet as Oyl,
    segwitPrivateKey: process.env.TESTNET_SEGWIT_PRIVATEKEY,
    segwitHdPath: SEGWIT_HD_PATH,
    taprootPrivateKey: process.env.TESTNET_TAPROOT_PRIVATEKEY,
    taprootHdPath: TAPROOT_HD_PATH,
    taprootAddress:
      'tb1ppkm55mpx6nx2mex4u6f25tp8wwgswy2fjn4qwkkdrsge0wyp902szjsm9r',
    taprootPubKey:
      '038e37e6d2e10e56dfc7a0570d7ba6821a1a5c77e7f16c2d8ad5187841eb76d29a',
    segwitAddress: 'tb1qwxnhtpp07dwh8y9s4dej9zplfksewz73xkfgje',
    segwitPubKey:
      '03d307e838fbeffe6cfaaf5c4eb6a21cc00dff4acceb88760e5c511921173fda47',
    destinationTaprootAddress:
      'tb1pstyemhl9n2hydg079rgrh8jhj9s7zdxh2g5u8apwk0c8yc9ge4eqp59l22',
    feeRate: 1,
  },
  [REGTEST]: {
    mnemonic: process.env.REGTEST1,
    account: regtestAccount as Account,
    wallet: testWallet as Oyl,
    segwitPrivateKey:
      '4604b4b710fe91f584fff084e1a9159fe4f8408fff380596a604948474ce4fa3',
    taprootPrivateKey:
      '41f41d69260df4cf277826a9b65a3717e4eeddbeedf637f212ca096576479361',
    taprootAddress:
      'bcrt1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqvg32hk',
    taprootPubKey:
      '03cc8a4bc64d897bddc5fbc2f670f7a8ba0b386779106cf1223c6fc5d7cd6fc115',
    segwitAddress: 'bcrt1qcr8te4kr609gcawutmrza0j4xv80jy8zeqchgx',
    segwitPubKey:
      '0330d54fd0dd420a6e5f8d3624f5f3482cae350f79d5f0753bf5beef9c2d91af3c',
    destinationTaprootAddress:
      'bcrt1p4qhjn9zdvkux4e44uhx8tc55attvtyu358kutcqkudyccelu0waslcutpz',
    feeRate: 2,
  },
}

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <command> [options]')
  .option('network', {
    alias: 'n',
    describe: 'Choose network type',
    choices: ['mainnet', 'testnet', 'regtest'],
    default: 'mainnet',
  })
  .command('load', 'Load RPC command', {})
  .command('send', 'Send btc', (yargs) => {
    return yargs
      .option('to', {
        alias: 't',
        describe: 'Destination address for the transaction',
        type: 'string',
        default: config[yargs.argv['network']].destinationTaprootAddress,
      })
      .option('amount', {
        alias: 'a',
        describe: 'Amount of currency to send',
        type: 'number',
        default: 600,
      })
      .option('feeRate', {
        alias: 'f',
        describe: 'Fee rate for the transaction',
        type: 'number',
        default: config[yargs.argv['network']].feeRate,
      })
      .option('mnemonic', {
        describe: 'Mnemonic for the wallet',
        type: 'string',
        default: config[yargs.argv['network']].mnemonic,
      })
      .help().argv
  })
  .command('send-brc-20', 'Send BRC20 tokens', (yargs) => {
    return yargs
      .option('to', {
        alias: 't',
        describe: 'Destination address for the brc-20',
        type: 'string',
        default: config[yargs.argv['network']].destinationTaprootAddress,
      })
      .option('ticker', {
        alias: 'tik',
        describe: 'brc-20 ticker to send',
        type: 'string',
        demandOption: true,
      })
      .option('amount', {
        alias: 'a',
        describe: 'Amount of brc-20 to send',
        type: 'number',
        default: 5,
        demandOption: true,
      })
      .option('feeRate', {
        alias: 'f',
        describe: 'Fee rate for the transaction',
        type: 'number',
        default: config[yargs.argv['network']].feeRate,
      })
      .option('mnemonic', {
        describe: 'Mnemonic for the wallet',
        type: 'string',
        default: config[yargs.argv['network']].mnemonic,
      })
      .option('isDry', {
        describe: 'Dry run',
        type: 'string',
        default: false,
      })
      .help().argv
  })
  .command('send-collectible', 'Send a collectible', (yargs) => {
    return yargs
      .option('to', {
        alias: 't',
        describe: 'Destination address for the collectible',
        type: 'string',
        default: config[yargs.argv['network']].destinationTaprootAddress,
      })
      .option('inscriptionId', {
        alias: 'ixId',
        describe: 'Inscription to be sent',
        type: 'string',
        demandOption: true,
        default:
          '615e568c9dd877635743439ea50df6fe11f6aef583f066fc2f917a1d62d03c5di0',
      })
      .option('feeRate', {
        alias: 'f',
        describe: 'Fee rate for the transaction',
        type: 'number',
        default: config[yargs.argv['network']].feeRate,
      })
      .option('mnemonic', {
        describe: 'Mnemonic for the wallet',
        type: 'string',
        default: config[yargs.argv['network']].mnemonic,
      })
      .option('isDry', {
        describe: 'Dry run',
        type: 'boolean',
        default: false,
      })
      .help().argv
  })
  .command('send-collectible-estimate', 'Get collectible estimate', (yargs) => {
    return yargs
      .option('to', {
        alias: 't',
        describe: 'Destination address for the collectible',
        type: 'string',
        default: config[yargs.argv['network']].destinationTaprootAddress,
      })
      .option('feeRate', {
        alias: 'f',
        describe: 'Fee rate for the transaction',
        type: 'number',
        default: config[yargs.argv['network']].feeRate,
      })
      .option('mnemonic', {
        describe: 'Mnemonic for the wallet',
        type: 'string',
        default: config[yargs.argv['network']].mnemonic,
      })
      .option('isDry', {
        describe: 'Dry run',
        type: 'boolean',
        default: false,
      })
      .help().argv
  })
  .command('view', 'View PSBT', {})
  .command('convert', 'Convert PSBT', {})
  .command('aggregate', 'Test Aggregator', {})
  .command(
    'create-offer',
    'create an offer in the omnisat offers api',
    (yargs) => {
      return yargs
        .option('ticker', {
          describe: "ticker of brc-20 you'd like to sell",
          alias: 't',
          type: 'string',
          demandOption: true,
        })
        .option('amount', {
          describe: "the number of brc-20 tokens you're selling",
          type: 'number',
          demandOption: true,
        })
        .option('feeRate', {
          alias: 'f',
          describe: 'Fee rate for the transaction',
          type: 'number',
          default: config[yargs.argv['network']].feeRate,
        })
        .option('price', {
          describe: 'the price of the offer in sats',
          type: 'number',
          demandOption: true,
        })
        .help().argv
    }
  )
  .command(
    'buy-offer',
    'buy and offer from the omnisat offers api',
    (yargs) => {
      return yargs
        .option('psbtBase64', {
          describe: 'offer psbt base64',
          alias: 'p',
          type: 'string',
          demandOption: true,
        })
        .option('feeRate', {
          alias: 'f',
          describe: 'Fee rate for the transaction',
          type: 'number',
          default: config[yargs.argv['network']].feeRate,
        })
        .help().argv
    }
  )
  .command('aggregate', 'aggregate offers based on ticker', (yargs) => {
    return yargs
      .option('ticker', {
        describe: "ticker of brc-20 you'd like to sell",
        alias: 't',
        type: 'string',
        demandOption: true,
      })
      .option('feeRate', {
        alias: 'f',
        describe: 'Fee rate for the transaction',
        type: 'number',
        default: config[yargs.argv['network']].feeRate,
      })
      .option('price', {
        describe: 'the price of the offer in sats',
        type: 'number',
        // demandOption: true,
      })
      .help().argv
  })
  .command('txn-history', 'Transaction history', {})
  .command('gen-testnet-wallet', 'Generate testnet wallet', {})
  .demandCommand(1, 'You need at least one command before moving on')
  .help().argv as unknown as YargsArguments

export async function runCLI() {
  const [command] = argv._
  const { _, network } = argv as YargsArguments
  const options = Object.assign({}, argv) as YargsArguments
  const networkConfig = config[network!]

  const { to, amount, feeRate, ticker, psbtBase64, price } = options
  const regtestProvider = new Provider(regtestProviderConstructorArgs)

  const signer: Signer = new Signer(bitcoin.networks.regtest, {
    segwitPrivateKey: networkConfig.segwitPrivateKey,
    taprootPrivateKey: networkConfig.taprootPrivateKey,
    // nestedSegwitPrivateKey: regtestAccount.nestedSegwit,
    //legacyPrivateKey: regtestAccount.legacy.privateKey,
  })
  switch (command) {
    case 'load':
      return await loadRpc(options)
    case 'buy':
      return await testMarketplaceBuy()
    case 'send':
      const res = await networkConfig.wallet.sendBtc({
        toAddress:
          'bc1p948d2jqudflcu8ze2qlme29t63u9wpzvkdxamq545xvfg620mfjs48llv0',
        feeRate: 16,
        amount: 100,
        spendAddress: networkConfig.taprootAddress,
        spendPubKey: networkConfig.taprootPubKey,
        altSpendAddress: networkConfig.segwitAddress,
        altSpendPubKey: networkConfig.segwitPubKey,
        signer,
      })
      console.log(res)
      return res
    case 'send-btc-estimate':
      const sendEstimateResponse = await networkConfig.wallet.sendBtcEstimate({
        feeRate: 1,
        spendAddress: networkConfig.taprootAddress,
        spendPubKey: networkConfig.taprootPubKey,
        altSpendAddress: networkConfig.segwitAddress,
        altSpendPubKey: networkConfig.segwitPubKey,
        // signer,
        amount: 546,
      })
      console.log(sendEstimateResponse)
      return sendEstimateResponse

    case 'send-brc20-estimate':
      const sendBrc20EstimateResponse =
        await networkConfig.wallet.sendBrc20Estimate({
          feeRate,
          spendAddress: networkConfig.taprootAddress,
          // spendPubKey: networkConfig.taprootPubKey,
          altSpendAddress: networkConfig.segwitAddress,
          // altSpendPubKey: networkConfig.segwitPubKey,
        })
      console.log(sendBrc20EstimateResponse)
      return sendBrc20EstimateResponse

    case 'send-collectible-estimate':
      const sendCollectibleEstimateResponse =
        await networkConfig.wallet.sendCollectibleEstimate({
          feeRate,
          spendAddress: networkConfig.segwitAddress,
          altSpendAddress: networkConfig.taprootAddress,
        })

      console.log(sendCollectibleEstimateResponse)
      return sendCollectibleEstimateResponse
    case 'send-rune-estimate':
      const sendRuneEstimate = await networkConfig.wallet.sendRuneEstimate({
        feeRate,
        spendAddress: networkConfig.segwitAddress,
        altSpendAddress: networkConfig.taprootAddress,
      })

      console.log(sendRuneEstimate)
    case 'send-brc-20':
      const sendBrc20Response = await networkConfig.wallet.sendBRC20({
        token: ticker,
        amount: 100,
        signer,
        feeRate: 11,
        fromAddress: networkConfig.taprootAddress,
        fromPubKey: networkConfig.taprootPubKey,
        toAddress: to!,
        spendAddress: networkConfig.taprootAddress,
        spendPubKey: networkConfig.taprootPubKey,
        altSpendAddress: networkConfig.segwitAddress,
        altSpendPubKey: networkConfig.segwitPubKey,
      })
      console.log(sendBrc20Response)
      return sendBrc20Response

    case 'send-collectible':
      const sendInscriptionResponse =
        await networkConfig.wallet.sendOrdCollectible({
          signer,
          inscriptionId:
            '7b0bc2bd44bc336b4730c1c761c4355918adfaec664a99f68f218a0a0e8b9538i0',
          feeRate: 40,
          fromAddress: networkConfig.taprootAddress,
          fromPubKey: networkConfig.taprootPubKey,
          toAddress:
            'tb1pstyemhl9n2hydg079rgrh8jhj9s7zdxh2g5u8apwk0c8yc9ge4eqp59l22',
          spendAddress: networkConfig.segwitAddress,
          spendPubKey: networkConfig.segwitPubKey,
          altSpendPubKey: networkConfig.taprootPubKey,
          altSpendAddress: networkConfig.taprootAddress,
        })

      console.log(sendInscriptionResponse)
      return sendInscriptionResponse
    case 'new-send-collectible':
      const { psbt: collectibleSend } = await collectible.createPsbt({
        inscriptionAddress: account.taproot.address,
        toAddress: networkConfig.destinationTaprootAddress,
        inscriptionId:
          'c00dc846a680884c35aac3b51f21d0b79cc2154e478da5561f6ad3ce0833c629i294',
        feeRate: 20,
        account: account,
        provider: provider,
      })

      const { signedPsbt: collectibleSegwitSigned } =
        await signer.signAllSegwitInputs({
          rawPsbt: collectibleSend!,
          finalize: true,
        })

      const { signedPsbt: collectibleTaprootSigned } =
        await signer.signAllTaprootInputs({
          rawPsbt: collectibleSegwitSigned,
          finalize: true,
        })

      const collectibleVsize = (
        await provider.sandshrew.bitcoindRpc.decodePSBT!(
          collectibleTaprootSigned
        )
      ).tx.vsize

      const correctCollectibleFee = collectibleVsize * 20

      const { psbt: collectibleSend1 } = await collectible.createPsbt({
        toAddress: networkConfig.destinationTaprootAddress,
        inscriptionAddress: account.taproot.address,
        inscriptionId:
          'c00dc846a680884c35aac3b51f21d0b79cc2154e478da5561f6ad3ce0833c629i294',
        feeRate: 20,
        account: account,
        provider: provider,
        fee: correctCollectibleFee,
      })
      const { signedPsbt: collectibleSegwitSigned1 } =
        await signer.signAllSegwitInputs({
          rawPsbt: collectibleSend1!,
          finalize: true,
        })

      const { signedPsbt: collectibleTaprootSigned1 } =
        await signer.signAllTaprootInputs({
          rawPsbt: collectibleSegwitSigned1,
          finalize: true,
        })

      const collectibleResult = await provider.pushPsbt({
        psbtBase64: collectibleTaprootSigned1,
      })

      return console.log(collectibleResult)
    case 'send-rune':
      const sendRuneResponse = await networkConfig.wallet.sendRune({
        runeId: '840000:3',
        toAddress:
          'bc1pstyemhl9n2hydg079rgrh8jhj9s7zdxh2g5u8apwk0c8yc9ge4eqkunss9',
        signer,
        amount: 100,
        feeRate: 15,
        fromAddress: networkConfig.taprootAddress,
        spendAddress: networkConfig.segwitAddress,
        spendPubKey: networkConfig.segwitPubKey,
        altSpendPubKey: networkConfig.taprootPubKey,
        altSpendAddress: networkConfig.taprootAddress,
      })
      console.log(sendRuneResponse)
      return sendRuneResponse
    case 'mint-rune':
      const mintRuneResponse = await networkConfig.wallet.mintRune({
        runeId: '2585328:8',
        toAddress: networkConfig.taprootAddress,
        signer,
        amount: 1000,
        feeRate: 20,
        spendAddress: networkConfig.taprootAddress,
        spendPubKey: networkConfig.taprootPubKey,
        altSpendPubKey: networkConfig.segwitPubKey,
        altSpendAddress: networkConfig.segwitAddress,
      })
      console.log(mintRuneResponse)
      return mintRuneResponse
    case 'view':
      return await viewPsbt()
    case 'aggregate':
      // const aggregator = new Aggregator()
      // const aggregated = await aggregator.fetchAndAggregateOffers(
      //   ticker,
      //   20,
      //   1000
      // )

      // const formatOffers = (offers) =>
      //   offers.map((offer) => ({
      //     amount: offer.amount,
      //     unitPrice: offer.unitPrice,
      //     nftId: offer.offerId,
      //     marketplace: offer.marketplace,
      //   }))

      // console.log('Aggregated Offers')
      // console.log(
      //   'Best Price Offers:',
      //   formatOffers(aggregated.bestPrice.offers)
      // )
      // console.log(
      //   'Closest Match Offers:',
      //   formatOffers(aggregated.closestMatch.offers)
      // )
      return
    case 'available-utxos':
      return console.log(
        await accountSpendableUtxos({
          account: regtestAccount,
          provider: regtestProvider,
          spendAmount: 1000,
        })
      )
    case 'account-summary':
      return console.log(
        await networkConfig.wallet.getAddressSummary({
          address: networkConfig.taprootAddress,
        })
      )
    case 'new-btc-send':
      const { psbt } = await btc.createPsbt({
        toAddress: regtestAccount.nestedSegwit.address,
        amount: 1000000000,
        feeRate: 2,
        account: regtestAccount,
        provider: regtestProvider,
      })
      const { signedPsbt } = await signer.signAllInputs({
        rawPsbt: psbt,
        finalize: true,
      })

      const vsize = (
        await regtestProvider.sandshrew.bitcoindRpc.decodePSBT!(signedPsbt)
      ).tx.vsize

      const correctFee = vsize * 2

      const { psbt: finalPsbt } = await btc.createPsbt({
        toAddress: regtestAccount.nestedSegwit.address,
        amount: 1000000000,
        feeRate: 2,
        fee: correctFee,
        account: regtestAccount,
        provider: regtestProvider,
      })

      const { signedHexPsbt: signedTaproot } = await signer.signAllInputs({
        rawPsbt: finalPsbt,
        finalize: true,
      })

      const result = await regtestProvider.pushPsbt({
        psbtHex: signedTaproot,
      })

      return console.log(result)
    case 'new-rune-send':
      const runeSend = await rune.send({
        account: regtestAccount,
        runeId: '',
        provider: regtestProvider,
        inscriptionAddress: '',
        toAddress: networkConfig.destinationTaprootAddress,
        amount: 100,
        feeRate: 2,
        signer,
      })

      return console.log(runeSend)
    case 'inscriptions':
      return console.log(
        await networkConfig.wallet.getInscriptions({
          address: networkConfig.taprootAddress,
        })
      )
    case 'bis-test':
      return console.log(
        (
          await networkConfig.wallet.apiClient.getAllInscriptionsByAddress(
            'tb1pstyemhl9n2hydg079rgrh8jhj9s7zdxh2g5u8apwk0c8yc9ge4eqp59l22'
          )
        ).data
      )

    case 'utxo-artifacts':
      return console.log(
        await networkConfig.wallet.getUtxosArtifacts({
          address: networkConfig.taprootAddress,
        })
      )

    case 'taproot-txn-history':
      return console.log(
        await networkConfig.wallet.getTaprootTxHistory({
          taprootAddress: networkConfig.taprootAddress,
        })
      )
    //     case 'new-brc-20-send':
    //       let successTxIds: string[] = []
    //       const estimate = await transferEstimate({
    //         toAddress: networkConfig.destinationTaprootAddress,
    //         feeRate: 2,
    //         account: regtestAccount,
    //         provider: regtestProvider,
    //       })

    //       const { psbt: dryCommitPsbt } = await commit({
    //         ticker: 'toyl',
    //         amount: 100,
    //         feeRate: 2,
    //         account: regtestAccount,
    //         provider: regtestProvider,
    //         finalSendFee: estimate.fee,
    //       })

    //       const { signedPsbt: commitSigned } = await signer.signAllInputs({
    //         rawPsbt: dryCommitPsbt!,
    //         finalize: true,
    //       })

    //       const commitFee = await getFee({
    //         provider,
    //         psbt: commitSigned,
    //         feeRate: 2,
    //       })

    //       const { psbt: finalCommitPsbt, script } = await commit({
    //         ticker: 'toyl',
    //         amount: 100,
    //         feeRate: 2,
    //         account: regtestAccount,
    //         provider: regtestProvider,
    //         finalSendFee: estimate.fee,
    //         fee: commitFee,
    //       })

    //       const { signedPsbt: finalCommitSigned } = await signer.signAllInputs({
    //         rawPsbt: finalCommitPsbt!,
    //         finalize: true,
    //       })

    //       const { txId: commitTxId } = await regtestProvider.pushPsbt({
    //         psbtBase64: finalCommitSigned,
    //       })

    //       successTxIds.push(commitTxId)
    //       const { psbt: revealPsbt } = await reveal({
    //         feeRate: 2,
    //         account: regtestAccount,
    //         provider: regtestProvider,
    //         script: script,
    //         commitTxId: commitTxId,
    //         receiverAddress: regtestAccount.taproot.address,
    //       })

    //       const revealFee = await getFee({
    //         provider,
    //         psbt: revealPsbt,
    //         feeRate: 2,
    //       })

    //       const { psbt: finalRevealPsbt } = await reveal({
    //         feeRate: 2,
    //         account: regtestAccount,
    //         provider: regtestProvider,
    //         script: script,
    //         commitTxId: commitTxId,
    //         receiverAddress: regtestAccount.taproot.address,
    //         fee: revealFee,
    //       })

    //       const { txId: revealTxId } = await regtestProvider.pushPsbt({
    //         psbtBase64: finalRevealPsbt,
    //       })

    //       if (!revealTxId) {
    //         throw new Error('Unable to reveal inscription.')
    //       }

    //       successTxIds.push(revealTxId)

    //       await waitForTransaction({
    //         txId: revealTxId,
    //         sandshrewBtcClient: regtestProvider.sandshrew,
    //       })

    //       await delay(5000)

    //       const { psbt: transferPsbt } = await transfer({
    //         feeRate: 2,
    //         account: regtestAccount,
    //         provider: regtestProvider,
    //         revealTxId: revealTxId,
    //         commitChangeUtxoId: commitTxId,
    //         toAddress: networkConfig.destinationTaprootAddress,
    //       })

    //       const { signedPsbt: transferSigned } = await signer.signAllInputs({
    //         rawPsbt: transferPsbt!,
    //         finalize: true,
    //       })

    //       const transferFee = await getFee({
    //         provider,
    //         psbt: transferSigned,
    //         feeRate: 2,
    //       })

    //       const { psbt: finalTransferPsbt } = await transfer({
    //         feeRate: 2,
    //         account: regtestAccount,
    //         provider: regtestProvider,
    //         revealTxId: revealTxId,
    //         commitChangeUtxoId: commitTxId,
    //         toAddress: networkConfig.destinationTaprootAddress,
    //         fee: transferFee,
    //       })

    //       const { signedPsbt: finalTransferSigned } = await signer.signAllInputs({
    //         rawPsbt: finalTransferPsbt!,
    //         finalize: true,
    //       })

    //       const { txId: transferTxId } = await regtestProvider.pushPsbt({
    //         psbtBase64: finalTransferSigned,
    //       })
    //       return console.log({
    //         txId: transferTxId,
    //         rawTxn: finalTransferSigned,
    //         sendBrc20Txids: [...successTxIds, transferTxId],
    //       })
    default:
      return await callAPI(argv._[0], options)
  }
}
