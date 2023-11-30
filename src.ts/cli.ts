import yargs from 'yargs'
import { camelCase } from 'change-case'
import { Wallet } from './oylib'
import { PSBTTransaction } from './txbuilder/PSBTTransaction'
import * as transactions from './transactions'
import * as bitcoin from 'bitcoinjs-lib'
import { address as PsbtAddress } from 'bitcoinjs-lib'
import { ToSignInput } from './shared/interface'
import {
  assertHex,
  createSegwitSigner,
  createTaprootSigner,
} from './shared/utils'
import axios from 'axios'
import * as ecc2 from '@bitcoinerlab/secp256k1'
import BIP32Factory from 'bip32'
import { BuildMarketplaceTransaction } from './txbuilder/buildMarketplaceTransaction'
import { tap } from 'node:test/reporters'
import * as wasi from 'wasi'

const bip32 = BIP32Factory(ecc2)
bitcoin.initEccLib(ecc2)

export async function loadRpc(options) {
  const wallet = new Wallet()
  try {
    const blockInfo = await wallet.sandshrewBtcClient.bitcoindRpc.decodePSBT(
      process.env.PSBT_BASE64
    )
    const fees = await wallet.esploraRpc.getAddressUtxo(
      process.env.TAPROOT_ADDRESS
    )
    console.log('Block Info:', blockInfo)
  } catch (error) {
    console.error('Error:', error)
  }
}

export async function testMarketplaceBuy() {
  const options = {
    address: process.env.TAPROOT_ADDRESS,
    pubKey: process.env.TAPROOT_PUBKEY,
    feeRate: parseFloat(process.env.FEE_RATE),
    psbtBase64: process.env.PSBT_BASE64,
    price: 0.0005,
  }
  const intent = new BuildMarketplaceTransaction(options)
  const builder = await intent.psbtBuilder()
  console.log(builder)
}

export async function viewPsbt() {
  console.log(
    bitcoin.Psbt.fromBase64(process.env.PSBT_BASE64, {
      network: bitcoin.networks.bitcoin,
    }).data.inputs
  )
}

export async function callAPI(command, data, options = {}) {
  const oylSdk = new Wallet()
  const camelCommand = camelCase(command)
  if (!oylSdk[camelCommand]) throw Error('command not foud: ' + camelCommand)
  const result = await oylSdk[camelCommand](data)
  console.log(JSON.stringify(result, null, 2))
  return result
}

export async function swapFlow() {
  const address = process.env.TAPROOT_ADDRESS
  const feeRate = parseFloat(process.env.FEE_RATE)
  const mnemonic = process.env.TAPROOT_MNEMONIC
  const pubKey = process.env.TAPROOT_PUBKEY

  const psbt = bitcoin.Psbt.fromHex(process.env.PSBT_HEX, {
    network: bitcoin.networks.bitcoin,
  })

  //console.log(psbt)
  const wallet = new Wallet()
  const payload = await wallet.fromPhrase({
    mnemonic: mnemonic.trim(),
    hdPath: process.env.HD_PATH,
    type: process.env.TYPE,
  })

  const keyring = payload.keyring.keyring
  const signer = keyring.signTransaction.bind(keyring)
  const from = address
  const addressType = transactions.getAddressType(from)
  if (addressType == null) throw Error('Invalid Address Type')

  const tx = new PSBTTransaction(signer, from, pubKey, addressType, feeRate)
  const signedPsbt = await tx.signPsbt(psbt)
  //@ts-ignore
  psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = false

  //EXTRACT THE RAW TX
  //const rawtx = signedPsbt.extractTransaction().toHex()
  //console.log('rawtx', rawtx)
  //BROADCAST THE RAW TX TO THE NETWORK
  //const result = await wallet.apiClient.pushTx({ transactionHex: rawtx })
  //GET THE TX_HASH
  //const ready_txId = psbt.extractTransaction().getId()
  //CONFIRM TRANSACTION IS CONFIRMED
}

const formatOptionsToSignInputs = async (
  _psbt: string | bitcoin.Psbt,
  isRevealTx: boolean = false,
  pubkey: string,
  tapAddress: string
) => {
  let toSignInputs: ToSignInput[] = []
  const psbtNetwork = bitcoin.networks.bitcoin

  const psbt =
    typeof _psbt === 'string'
      ? bitcoin.Psbt.fromHex(_psbt as string, { network: psbtNetwork })
      : (_psbt as bitcoin.Psbt)

  psbt.data.inputs.forEach((v, index: number) => {
    let script: any = null
    let value = 0
    const tapInternalKey = assertHex(Buffer.from(pubkey, 'hex'))
    const p2tr = bitcoin.payments.p2tr({
      internalPubkey: tapInternalKey,
      network: bitcoin.networks.bitcoin,
    })
    if (v.witnessUtxo?.script.toString('hex') == p2tr.output?.toString('hex')) {
      v.tapInternalKey = tapInternalKey
    }
    if (v.witnessUtxo) {
      script = v.witnessUtxo.script
      value = v.witnessUtxo.value
    } else if (v.nonWitnessUtxo) {
      const tx = bitcoin.Transaction.fromBuffer(v.nonWitnessUtxo)
      const output = tx.outs[psbt.txInputs[index].index]
      script = output.script
      value = output.value
    }
    const isSigned = v.finalScriptSig || v.finalScriptWitness
    if (script && !isSigned) {
      console.log('not signed')
      const address = PsbtAddress.fromOutputScript(script, psbtNetwork)
      if (isRevealTx || tapAddress === address) {
        console.log('entered', index)
        if (v.tapInternalKey) {
          toSignInputs.push({
            index: index,
            publicKey: pubkey,
            sighashTypes: v.sighashType ? [v.sighashType] : undefined,
          })
        }
      }
      // else {
      //   toSignInputs.push({
      //     index: index,
      //     publicKey: this.segwitPubKey,
      //     sighashTypes: v.sighashType ? [v.sighashType] : undefined,
      //   })
      // }
    }
  })

  return toSignInputs
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

export const RPC_ADDR =
  'https://node.oyl.gg/v1/6e3bc3c289591bb447c116fda149b094'

export const callBTCRPCEndpoint = async (
  method: string,
  params: string | string[]
) => {
  const data = JSON.stringify({
    jsonrpc: '2.0',
    id: method,
    method: method,
    params: [params],
  })

  // @ts-ignore
  return await axios
    .post(RPC_ADDR, data, {
      headers: {
        'content-type': 'application/json',
      },
    })
    .then((res) => res.data)
    .catch((e) => {
      console.error(e.response)
      throw e
    })
}

// async function createOrdPsbtTx() {
//   const wallet = new Wallet()
//   const test0 = await wallet.createOrdPsbtTx({
//     changeAddress: '',
//     fromAddress: '',
//     inscriptionId: '',
//     taprootPubKey: '',
//     segwitAddress: '',
//     segwitPubKey: '',
//     toAddress: '',
//     txFee: 0,
//     mnemonic: '',
//   })
//   console.log(test0)
// }

export async function runCLI() {
  const RequiredPath = [
    "m/44'/0'/0'/0", // P2PKH (Legacy)
    "m/49'/0'/0'/0", // P2SH-P2WPKH (Nested SegWit)
    "m/84'/0'/0'/0", // P2WPKH (SegWit)
    "m/86'/0'/0'/0", // P2TR (Taproot)
  ]
  const [command] = yargs.argv._
  const options = Object.assign({}, yargs.argv)
  const tapWallet = new Wallet()

  const mnemonic =
    'rich baby hotel region tape express recipe amazing chunk flavor oven obtain'

  const taprootSigner = await createTaprootSigner({
    mnemonic: mnemonic,
    taprootAddress:
      'bc1ppkyawqh6lsgq4w82azgvht6qkd286mc599tyeaw4lr230ax25wgqdcldtm',
  })

  const segwitSigner = await createSegwitSigner({
    mnemonic: mnemonic,
    segwitAddress: '3By5YxrxR7eE32ANZSA1Cw45Bf7f68nDic',
    segwitPubKey:
      '03ad1e146771ae624b49b463560766f5950a9341964a936ae6bf1627fda8d3b83b',
  })

  delete options._
  switch (command) {
    case 'load':
      return await loadRpc(options)
      break
    case 'send':
      const taprootResponse = await tapWallet.createPsbtTx({
        amount: 4000,
        changeAddress:
          'bc1ppkyawqh6lsgq4w82azgvht6qkd286mc599tyeaw4lr230ax25wgqdcldtm',
        feeRate: 62,
        from: 'bc1ppkyawqh6lsgq4w82azgvht6qkd286mc599tyeaw4lr230ax25wgqdcldtm',
        publicKey:
          '02ebb592b5f1a2450766487d451f3a6fb2a584703ef64c6acb613db62797f943be',
        signer: taprootSigner,
        to: 'bc1p5pvvfjtnhl32llttswchrtyd9mdzd3p7yps98tlydh2dm6zj6gqsfkmcnd',
        isDry: true,
      })
      console.log({ taprootResponse })

      const segwitResponse = await tapWallet.createPsbtTx({
        amount: 4000,
        changeAddress: '3By5YxrxR7eE32ANZSA1Cw45Bf7f68nDic',
        feeRate: 62,
        from: '3By5YxrxR7eE32ANZSA1Cw45Bf7f68nDic',
        publicKey:
          '03ad1e146771ae624b49b463560766f5950a9341964a936ae6bf1627fda8d3b83b',
        signer: segwitSigner,
        to: 'bc1p5pvvfjtnhl32llttswchrtyd9mdzd3p7yps98tlydh2dm6zj6gqsfkmcnd',
        isDry: true,
      })
      console.log({ segwitResponse })

      return
    case 'test':
      // 'rich baby hotel region tape express recipe amazing chunk flavor oven obtain'

      return await tapWallet.sendBRC20({
        feeFromAddress:
          'bc1ppkyawqh6lsgq4w82azgvht6qkd286mc599tyeaw4lr230ax25wgqdcldtm',
        taprootPublicKey:
          '02ebb592b5f1a2450766487d451f3a6fb2a584703ef64c6acb613db62797f943be',
        changeAddress:
          'bc1ppkyawqh6lsgq4w82azgvht6qkd286mc599tyeaw4lr230ax25wgqdcldtm',
        destinationAddress:
          'bc1p5pvvfjtnhl32llttswchrtyd9mdzd3p7yps98tlydh2dm6zj6gqsfkmcnd',
        feeRate: 75,
        token: 'BONK',
        segwitAddress: '3By5YxrxR7eE32ANZSA1Cw45Bf7f68nDic',
        segwitPubkey:
          '03ad1e146771ae624b49b463560766f5950a9341964a936ae6bf1627fda8d3b83b',
        mnemonic: mnemonic,
        amount: 40,
        payFeesWithSegwit: true,
      })

    // async function createOrdPsbtTx() {
    //   const wallet = new Wallet()
    //   const test0 = await wallet.createOrdPsbtTx({
    //     changeAddress: '3By5YxrxR7eE32ANZSA1Cw45Bf7f68nDic',
    //     fromAddress:
    //       'bc1ppkyawqh6lsgq4w82azgvht6qkd286mc599tyeaw4lr230ax25wgqdcldtm',
    //     inscriptionId:
    //       '68069fc341a462cd9a01ef4808b0bda0db7c0c6ea5dfffdc35b8992450cecb5bi0',
    //     taprootPubKey:
    //       '02ebb592b5f1a2450766487d451f3a6fb2a584703ef64c6acb613db62797f943be',
    //     segwitAddress: '3By5YxrxR7eE32ANZSA1Cw45Bf7f68nDic',
    //     segwitPubKey:
    //       '03ad1e146771ae624b49b463560766f5950a9341964a936ae6bf1627fda8d3b83b',
    //     toAddress:
    //       'bc1pkvt4pj7jgj02s95n6sn56fhgl7t7cfx5mj4dedsqyzast0whpchs7ujd7y',
    //     txFee: 68,
    //     payFeesWithSegwit: true,
    //     mnemonic:
    //       'rich baby hotel region tape express recipe amazing chunk flavor oven obtain',
    //   })
    //   console.log(test0)
    // }
    // await createOrdPsbtTx()
    // break
    case 'view':
      return await viewPsbt()
      break
    case 'market':
      return await testMarketplaceBuy()
      break
    case 'swap':
      return await swapFlow()
      break
    default:
      return await callAPI(yargs.argv._[0], options)
      break
  }
}
