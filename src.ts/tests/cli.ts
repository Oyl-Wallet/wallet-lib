import yargs from 'yargs'
import { camelCase } from 'change-case'
import 'dotenv/config'
import {
  NESTED_SEGWIT_HD_PATH,
  Oyl,
  SEGWIT_HD_PATH,
  TAPROOT_HD_PATH,
} from '../oylib'
import { Signer } from '../signer'
import { Aggregator } from '../PSBTAggregator'
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
  getNetwork,
  signInputs,
  waitForTransaction,
} from '../shared/utils'
import { customPaths } from '../wallet/accountsManager'
import * as transactions from '../transactions'
import { Marketplace } from '../marketplace'

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
    feeRate: parseFloat(process.env.FEE_RATE),
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
  const aggregator = new Aggregator()
  const aggregated = await aggregator.fetchAndAggregateOffers(
    'ordi',
    20,
    110000
  )

  const formatOffers = (offers) =>
    offers.map((offer) => ({
      amount: offer.amount,
      unitPrice: offer.unitPrice,
      nftId: offer.offerId,
      marketplace: offer.marketplace,
    }))

  console.log('Aggregated Offers')
  console.log('Best Price Offers:', formatOffers(aggregated.bestPrice.offers))
  console.log(
    'Closest Match Offers:',
    formatOffers(aggregated.closestMatch.offers)
  )
}

export async function viewPsbt() {
  console.log(
    bitcoin.Psbt.fromBase64(process.env.PSBT_BASE64, {
      network: bitcoin.networks.testnet,
    }).txOutputs
  )
}

export async function convertPsbt() {
  const psbt = bitcoin.Psbt.fromHex(process.env.PSBT_HEX, {
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
  network?: 'testnet' | 'regtest'
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

const testWallet = new Oyl({
  network: 'testnet',
  baseUrl: 'https://testnet.sandshrew.io',
  version: 'v1',
  projectId: process.env.SANDSHREW_PROJECT_ID,
})

testWallet.apiClient.setAuthToken(process.env.API_TOKEN)

const XVERSE = 'xverse'
const UNISAT = 'unisat'
const MAINNET = 'mainnet'
const TESTNET = 'testnet'

const config = {
  [MAINNET]: {
    mnemonic: process.env.MAINNET_MNEMONIC,
    wallet: tapWallet as Oyl,
    segwitPrivateKey: process.env.TESTNET_SEGWIT_PRIVATEKEY,
    taprootPrivateKey: process.env.TESTNET_TAPROOT_PRIVATEKEY,
    taprootAddress:
      'bc1ppkyawqh6lsgq4w82azgvht6qkd286mc599tyeaw4lr230ax25wgqdcldtm',
    taprootPubkey:
      '02ebb592b5f1a2450766487d451f3a6fb2a584703ef64c6acb613db62797f943be',
    segwitAddress: '3By5YxrxR7eE32ANZSA1Cw45Bf7f68nDic',
    segwitPubKey:
      '03ad1e146771ae624b49b463560766f5950a9341964a936ae6bf1627fda8d3b83b',
    destinationTaprootAddress:
      'bc1p5pvvfjtnhl32llttswchrtyd9mdzd3p7yps98tlydh2dm6zj6gqsfkmcnd',
    feeRate: 25,
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
}

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <command> [options]')
  .option('network', {
    alias: 'n',
    describe: 'Choose network type',
    choices: ['mainnet', 'testnet'],
    default: 'testnet',
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
  const { _, network = TESTNET } = yargs.argv as YargsArguments
  const options = Object.assign({}, yargs.argv) as YargsArguments
  const networkConfig = config[network]

  let segwitSigner: bitcoin.Signer
  const taprootSigner = await tapWallet.createTaprootSigner({
    mnemonic: networkConfig.mnemonic,
    taprootAddress: networkConfig.taprootAddress,
  })

  const { to, amount, feeRate, ticker, psbtBase64, price } = options
  const signer: Signer = new Signer(bitcoin.networks.testnet, {
    segwitPrivateKey: networkConfig.segwitPrivateKey,
    taprootPrivateKey: networkConfig.taprootPrivateKey,
  })
  switch (command) {
    case 'load':
      return await loadRpc(options)
    case 'buy':
      return await testMarketplaceBuy()
    case 'send':
      const res = await networkConfig.wallet.sendBtc({
        toAddress:
          'tb1pdz8aul7226284e57e9yn4mpyd8f52zpxc7z0gz392e6amrf0s4uq6s3sw6',
        feeRate: 67,
        amount: 50,
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
        signer,
        amount: 546,
      })
      console.log(sendEstimateResponse)
      return sendEstimateResponse

    case 'send-brc20-estimate':
      const sendBrc20EstimateResponse =
        await networkConfig.wallet.sendBrc20Estimate({
          feeRate,
          spendAddress: networkConfig.taprootAddress,
          spendPubKey: networkConfig.taprootPubKey,
          altSpendAddress: networkConfig.segwitAddress,
          altSpendPubKey: networkConfig.segwitPubKey,
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
      return sendCollectibleEstimateResponse
    case 'send-brc-20':
      const sendBrc20Response = await networkConfig.wallet.sendBRC20({
        token: ticker,
        amount: 3,
        signer,
        feeRate: 30,
        fromAddress: networkConfig.taprootAddress,
        fromPubKey: networkConfig.taprootPubKey,
        toAddress: to,
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
    case 'send-rune':
      const sendRuneResponse = await networkConfig.wallet.sendRune({
        runeId: '2585328:8',
        toAddress:
          'tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7',
        signer,
        amount: 400,
        feeRate: 40,
        fromAddress: networkConfig.taprootAddress,
        spendAddress: networkConfig.taprootAddress,
        spendPubKey: networkConfig.taprootPubKey,
        altSpendPubKey: networkConfig.segwitPubKey,
        altSpendAddress: networkConfig.segwitAddress,
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
    case 'create-offer':
      try {
        const taprootUtxos = await networkConfig.wallet.getUtxosArtifacts({
          address: networkConfig.taprootAddress,
        })

        const path = networkConfig.segwitHdPath ?? 'oyl'
        const hdPaths = customPaths[path]
        const taprootPrivateKey = await networkConfig.wallet.fromPhrase({
          mnemonic: networkConfig.mnemonic,
          addrType: transactions.getAddressType(networkConfig.taprootAddress),
          hdPath: hdPaths['taprootPath'],
        })

        const content = `{"p":"brc-20","op":"transfer","tick":"${ticker}","amt":"${amount}"}`
        //   const { txId } = await inscribe({
        //     content,
        //     inputAddress: networkConfig.taprootAddress,
        //     outputAddress: networkConfig.taprootAddress,
        //     mnemonic: networkConfig.mnemonic,
        //     taprootPublicKey: networkConfig.taprootPubKey,
        //     segwitPublicKey: networkConfig.segwitPubKey,
        //     segwitAddress: networkConfig.segwitAddress,
        //     isDry: networkConfig.isDry,
        //     segwitSigner: segwitSigner,
        //     taprootSigner: taprootSigner,
        //     feeRate: feeRate,
        //     network: network,
        //     taprootUtxos: taprootUtxos,
        //     taprootPrivateKey:
        //       taprootPrivateKey.keyring.keyring._index2wallet[0][1].privateKey.toString(
        //         'hex'
        //       ),
        //     sandshrewBtcClient: (networkConfig.wallet as Oyl).sandshrewBtcClient,
        //     esploraRpc: (networkConfig.wallet as Oyl).esploraRpc,
        //   })

        //   console.log({ txId })

        //   console.log("WAITING FOR UNISAT TO INDEX THE INSCRIPTION'S UTXO")
        //   await delay(15000)
        //   console.log('DONE WAITING')

        //   const body = {
        //     address: networkConfig.taprootAddress,
        //     ticker,
        //     amount: amount.toString(),
        //     transferableInscription: {
        //       inscription_id: `${txId}i0`,
        //       ticker,
        //       transfer_amount: amount.toString(),
        //       is_valid: true,
        //       is_used: false,
        //       satpoint: `${txId}:0:0`,
        //       min_price: null,
        //       min_unit_price: null,
        //       ordinalswallet_price: null,
        //       ordinalswallet_unit_price: null,
        //       unisat_price: null,
        //       unisat_unit_price: null,
        //     },
        //     price: Number(price),
        //   }

        //   const OMNISAT_API_URL =
        //     'https://omnisat-fe-git-testnet-omnisat-foundation.vercel.app/api'

        //   const { psbtBase64, psbtHex } = await axios
        //     .post(`${OMNISAT_API_URL}/orders/create`, body, {
        //       headers: {
        //         'Content-Type': 'application/json',
        //       },
        //     })
        //     .then((res) => res.data)
        //     .catch((error) => console.error('Error:', error))

        //   const psbtToSign = bitcoin.Psbt.fromBase64(psbtBase64)
        //   const toSignInputs: ToSignInput[] = await formatOptionsToSignInputs({
        //     _psbt: psbtToSign,
        //     pubkey: networkConfig.taprootPubKey,
        //     segwitPubkey: networkConfig.segwitPubKey,
        //     segwitAddress: networkConfig.segwitAddress,
        //     taprootAddress: networkConfig.taprootAddress,
        //     network: getNetwork(network),
        //   })

        //   const signedSendPsbt = await signInputs(
        //     psbtToSign,
        //     toSignInputs,
        //     networkConfig.taprootPubKey,
        //     networkConfig.segwitPubKey,
        //     segwitSigner,
        //     taprootSigner
        //   )

        //   signedSendPsbt.finalizeInput(2)

        //   console.log({
        //     signedSendPsbt: signedSendPsbt.toBase64(),
        //     signedSendPsbtHex: signedSendPsbt.toHex(),
        //   })

        //   const updateBody = {
        //     psbtBase64: signedSendPsbt.toBase64(),
        //     psbtHex: signedSendPsbt.toHex(),
        //     satpoint: txId + ':0:0',
        //   }

        //   const updateResponse = await axios
        //     .put(`${OMNISAT_API_URL}/orders/create`, updateBody, {
        //       headers: {
        //         'Content-Type': 'application/json',
        //       },
        //     })
        //     .then((res) => res.data)
        //     .catch((error) => console.error('Error:', error))
        //   console.log({ updateResponse })

        //   return updateResponse
      } catch (error) {
        console.error(error)
        return
      }
    case 'buy-offer':
    // try {
    //   const orderToBeBought = bitcoin.Psbt.fromBase64(psbtBase64)
    //   const price = orderToBeBought.txOutputs[2].value

    //   const marketplace = new BuildMarketplaceTransaction({
    //     address: networkConfig.taprootAddress,
    //     price: price,
    //     psbtBase64: psbtBase64,
    //     pubKey: networkConfig.taprootPubKey,
    //     wallet: networkConfig.wallet,
    //   })

    //   if (!(await marketplace.isWalletPrepared())) {
    //     console.log('WALLET NOT PREPARED')
    //     const { psbtBase64: preparedPsbtBase64 } =
    //       await marketplace.prepareWallet()
    //     const preparationUtxo = bitcoin.Psbt.fromBase64(preparedPsbtBase64)
    //     const toSignInputs: ToSignInput[] = await formatOptionsToSignInputs({
    //       _psbt: preparationUtxo,
    //       pubkey: networkConfig.taprootPubKey,
    //       segwitPubkey: networkConfig.segwitPubKey,
    //       segwitAddress: networkConfig.segwitAddress,
    //       taprootAddress: networkConfig.fromAddress,
    //       network: getNetwork(network),
    //     })

    //     const signedSendPsbt = await signInputs(
    //       preparationUtxo,
    //       toSignInputs,
    //       networkConfig.taprootPubKey,
    //       networkConfig.segwitPubKey,
    //       segwitSigner,
    //       taprootSigner
    //     )
    //     signedSendPsbt.finalizeAllInputs()

    //     const extractedTx = signedSendPsbt.extractTransaction().toHex()

    //     console.log({ extractedTx })
    //     return
    //   } else {
    //     console.log('WALLET PREPARED')
    //     console.log('WALLET PREPARED')
    //     console.log('WALLET PREPARED')
    //     console.log('WALLET PREPARED')
    //     console.log('WALLET PREPARED')
    //   }

    //   const { psbtHex: buildOrderHex, psbtBase64: builtOrderBase64 } =
    //     await marketplace.psbtBuilder()

    //   console.log({ builtOrderBase64 })

    //   const filledOrderPsbt = bitcoin.Psbt.fromBase64(builtOrderBase64)
    //   const toSignInputs: ToSignInput[] = await formatOptionsToSignInputs({
    //     _psbt: filledOrderPsbt,
    //     pubkey: networkConfig.taprootPubKey,
    //     segwitPubkey: networkConfig.segwitPubKey,
    //     segwitAddress: networkConfig.segwitAddress,
    //     taprootAddress: networkConfig.taprootAddress,
    //     network: getNetwork(network),
    //   })

    //   const signedSendPsbt = await signInputs(
    //     filledOrderPsbt,
    //     toSignInputs,
    //     networkConfig.taprootPubKey,
    //     networkConfig.segwitPubKey,
    //     segwitSigner,
    //     taprootSigner
    //   )

    //   signedSendPsbt.finalizeInput(0)
    //   signedSendPsbt.finalizeInput(1)
    //   signedSendPsbt.finalizeInput(3)

    //   const extractedTx = signedSendPsbt.extractTransaction().toHex()

    //   console.log({ signedSendPsbt: signedSendPsbt.toBase64() })
    //   console.log({ extractedTx })

    //   const { result: offerBuyTxId, error: inscriptionError } =
    //     await callBTCRPCEndpoint('sendrawtransaction', extractedTx, network)

    //   console.log({ offerBuyTxId, inscriptionError })

    //   return offerBuyTxId
    // } catch (error) {
    //   console.error(error)
    //   return
    // }

    case 'view':
      return await viewPsbt()
    // // case 'market':
    // //   return await testMarketplaceBuy()
    // //   break
    // case 'convert':
    //   return await convertPsbt()
    case 'aggregate':
      const aggregator = new Aggregator()
      const aggregated = await aggregator.fetchAndAggregateOffers(
        ticker,
        20,
        1000
      )

      const formatOffers = (offers) =>
        offers.map((offer) => ({
          amount: offer.amount,
          unitPrice: offer.unitPrice,
          nftId: offer.offerId,
          marketplace: offer.marketplace,
        }))

      console.log('Aggregated Offers')
      console.log(
        'Best Price Offers:',
        formatOffers(aggregated.bestPrice.offers)
      )
      console.log(
        'Closest Match Offers:',
        formatOffers(aggregated.closestMatch.offers)
      )
      return
    case 'account-summary':
      return console.log(
        await networkConfig.wallet.getAddressSummary({
          address: networkConfig.taprootAddress,
        })
      )
    case 'inscriptions':
      return console.log(
        await networkConfig.wallet.getInscriptions({
          address: networkConfig.taprootAddress,
        })
      )
    case 'bis-test':
      return console.log(
        await await networkConfig.wallet.apiClient.getAllInscriptionsByAddress(
          'tb1pstyemhl9n2hydg079rgrh8jhj9s7zdxh2g5u8apwk0c8yc9ge4eqp59l22'
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
    default:
      return await callAPI(argv._[0], options)
  }
}
