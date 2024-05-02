import * as bitcoin from 'bitcoinjs-lib'
import ECPairFactory from 'ecpair'
import ecc from '@bitcoinerlab/secp256k1'
import {
  AddressType,
  BitcoinPaymentType,
  IBlockchainInfoUTXO,
  Network,
  RuneUtxo,
  ToSignInput,
  TxInput,
  UnspentOutput,
} from '../shared/interface'
import BigNumber from 'bignumber.js'
import { maximumScriptBytes } from './constants'
import axios from 'axios'
import {
  addInscriptionUtxo,
  findUtxosToCoverAmount,
  getUtxosForFees,
  Utxo,
} from '../txbuilder/buildOrdTx'
import { isTaprootInput, toXOnly } from 'bitcoinjs-lib/src/psbt/bip371'
import { SandshrewBitcoinClient } from '../rpclient/sandshrew'
import { EsploraRpc } from '../rpclient/esplora'

bitcoin.initEccLib(ecc)

export interface IBISWalletIx {
  validity: any
  isBrc: boolean
  isSns: boolean
  name: any
  amount: any
  isValidTransfer: any
  operation: any
  ticker: any
  isJson: boolean
  content?: string
  inscription_name: any
  inscription_id: string
  inscription_number: number
  metadata: any
  owner_wallet_addr: string
  mime_type: string
  last_sale_price: any
  slug: any
  collection_name: any
  content_url: string
  bis_url: string

  wallet?: string
  media_length?: number
  genesis_ts?: number
  genesis_height?: number
  genesis_fee?: number
  output_value?: number
  satpoint?: string
  collection_slug?: string
  confirmations?: number
}

export const addressTypeMap = { 0: 'p2pkh', 1: 'p2tr', 2: 'p2sh', 3: 'p2wpkh' }
export const inscriptionSats = 546

export const ECPair = ECPairFactory(ecc)

export const assertHex = (pubKey: Buffer) =>
  pubKey.length === 32 ? pubKey : pubKey.slice(1, 33)

function tapTweakHash(pubKey: Buffer, h: Buffer | undefined): Buffer {
  return bitcoin.crypto.taggedHash(
    'TapTweak',
    Buffer.concat(h ? [pubKey, h] : [pubKey])
  )
}

export function getNetwork(
  value: Network | 'main' | 'mainnet' | 'regtest' | 'testnet'
) {
  if (value === 'mainnet' || value === 'main') {
    return bitcoin.networks['bitcoin']
  }

  return bitcoin.networks[value]
}

export function checkPaymentType(
  payment: bitcoin.PaymentCreator,
  network: Network
) {
  return (script: Buffer) => {
    try {
      return payment({ output: script, network: getNetwork(network) })
    } catch (error) {
      return false
    }
  }
}

export function tweakSigner(
  signer: bitcoin.Signer,
  opts: any = {}
): bitcoin.Signer {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let privateKey: Uint8Array | undefined = signer.privateKey!
  if (!privateKey) {
    throw new Error('Private key required')
  }
  if (signer.publicKey[0] === 3) {
    privateKey = ecc.privateNegate(privateKey)
  }

  const tweakedPrivateKey = ecc.privateAdd(
    privateKey,
    tapTweakHash(assertHex(signer.publicKey), opts.tweakHash)
  )
  if (!tweakedPrivateKey) {
    throw new Error('Invalid tweaked private key!')
  }

  return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
    network: opts.network,
  })
}

export function satoshisToAmount(val: number) {
  const num = new BigNumber(val)
  return num.dividedBy(100000000).toFixed(8)
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function amountToSatoshis(val: any) {
  const num = new BigNumber(val)
  return num.multipliedBy(100000000).toNumber()
}

export const validator = (
  pubkey: Buffer,
  msghash: Buffer,
  signature: Buffer
): boolean => ECPair.fromPublicKey(pubkey).verify(msghash, signature)

export function utxoToInput(utxo: UnspentOutput, publicKey: Buffer): TxInput {
  let data
  switch (utxo.addressType) {
    case AddressType.P2TR:
      data = {
        hash: utxo.txId,
        index: utxo.outputIndex,
        witnessUtxo: {
          value: utxo.satoshis,
          script: Buffer.from(utxo.scriptPk, 'hex'),
        },
        tapInternalKey: assertHex(publicKey),
      }
      return {
        data,
        utxo,
      }

    case AddressType.P2WPKH:
      data = {
        hash: utxo.txId,
        index: utxo.outputIndex,
        witnessUtxo: {
          value: utxo.satoshis,
          script: Buffer.from(utxo.scriptPk, 'hex'),
        },
      }
      return {
        data,
        utxo,
      }

    case AddressType.P2PKH:
      data = {
        hash: utxo.txId,
        index: utxo.outputIndex,
        witnessUtxo: {
          value: utxo.satoshis,
          script: Buffer.from(utxo.scriptPk, 'hex'),
        },
      }
      return {
        data,
        utxo,
      }

    case AddressType.P2SH_P2WPKH:
      const redeemData = bitcoin.payments.p2wpkh({ pubkey: publicKey })
      data = {
        hash: utxo.txId,
        index: utxo.outputIndex,
        witnessUtxo: {
          value: utxo.satoshis,
          script: Buffer.from(utxo.scriptPk, 'hex'),
        },
        redeemScript: redeemData.output,
      }
      return {
        data,
        utxo,
      }

    default:
      data = {
        hash: '',
        index: 0,
        witnessUtxo: {
          value: 0,
          script: Buffer.from(utxo.scriptPk, 'hex'),
        },
      }
      return {
        data,
        utxo,
      }
  }
}

export const getWitnessDataChunk = function (
  content: string,
  encodeType: BufferEncoding = 'utf8'
) {
  const buffered = Buffer.from(content, encodeType)
  const contentChunks: Buffer[] = []
  let chunks = 0

  while (chunks < buffered.byteLength) {
    const split = buffered.subarray(chunks, chunks + maximumScriptBytes)
    chunks += split.byteLength
    contentChunks.push(split)
  }

  return contentChunks
}

export const getSatpointFromUtxo = (utxo: IBlockchainInfoUTXO) => {
  return `${utxo.tx_hash_big_endian}:${utxo.tx_output_n}:0`
}

export const getInscriptionsByWalletBIS = async (
  walletAddress: string,
  offset: number = 0
) => {
  return (await axios
    .get(
      `https://api.bestinslot.xyz/v3/wallet/inscriptions?address=${walletAddress}&sort_by=inscr_num&order=asc&offset=${offset}&count=100`,
      {
        headers: {
          'X-Api-Key': 'abbfff3d-49fa-4f7f-883a-0a5fce48a9f1',
        },
      }
    )
    .then((res) => res.data?.data)) as IBISWalletIx[]
}

export function calculateAmountGathered(utxoArray: IBlockchainInfoUTXO[]) {
  return utxoArray?.reduce((prev, currentValue) => prev + currentValue.value, 0)
}

export function calculateAmountGatheredUtxo(utxoArray: Utxo[]) {
  return utxoArray?.reduce(
    (prev, currentValue) => prev + currentValue.satoshis,
    0
  )
}

export const formatOptionsToSignInputs = async ({
  _psbt,
  pubkey,
  segwitPubkey,
  segwitAddress,
  taprootAddress,
  network,
}: {
  _psbt: bitcoin.Psbt
  pubkey: string
  segwitPubkey: string
  segwitAddress: string
  taprootAddress: string
  network: bitcoin.Network
}) => {
  let toSignInputs: ToSignInput[] = []
  let index = 0
  for await (const v of _psbt.data.inputs) {
    let script: any = null
    let value = 0
    const isSigned = v.finalScriptSig || v.finalScriptWitness
    const lostInternalPubkey = !v.tapInternalKey
    if (v.witnessUtxo) {
      script = v.witnessUtxo.script
      value = v.witnessUtxo.value
    } else if (v.nonWitnessUtxo) {
      const tx = bitcoin.Transaction.fromBuffer(v.nonWitnessUtxo)
      const output = tx.outs[_psbt.txInputs[index].index]
      script = output.script
      value = output.value
    }

    if (!isSigned || lostInternalPubkey) {
      const tapInternalKey = assertHex(Buffer.from(pubkey, 'hex'))
      const p2tr = bitcoin.payments.p2tr({
        internalPubkey: tapInternalKey,
        network: network,
      })
      if (
        v.witnessUtxo?.script.toString('hex') == p2tr.output?.toString('hex')
      ) {
        v.tapInternalKey = tapInternalKey
        if (v.tapInternalKey) {
          toSignInputs.push({
            index: index,
            publicKey: pubkey,
            sighashTypes: v.sighashType ? [v.sighashType] : undefined,
          })
        }
      }
    }

    if (script && !isSigned && !isTaprootInput(v)) {
      toSignInputs.push({
        index: index,
        publicKey: segwitPubkey,
        sighashTypes: v.sighashType ? [v.sighashType] : undefined,
      })
    }

    index++
  }

  return toSignInputs
}

export const formatInputsToSign = async ({
  _psbt,
  senderPublicKey,
  network,
}: {
  _psbt: bitcoin.Psbt
  senderPublicKey: string
  network: bitcoin.Network
}) => {
  let index = 0
  for await (const v of _psbt.data.inputs) {
    const isSigned = v.finalScriptSig || v.finalScriptWitness
    const lostInternalPubkey = !v.tapInternalKey
    if (!isSigned || lostInternalPubkey) {
      const tapInternalKey = toXOnly(Buffer.from(senderPublicKey, 'hex'))
      const p2tr = bitcoin.payments.p2tr({
        internalPubkey: tapInternalKey,
        network: network,
      })
      if (
        v.witnessUtxo?.script.toString('hex') === p2tr.output?.toString('hex')
      ) {
        v.tapInternalKey = tapInternalKey
      }
    }
    index++
  }

  return _psbt
}

export const timeout = async (n) =>
  await new Promise((resolve) => setTimeout(resolve, n))

export const signInputs = async (
  psbt: bitcoin.Psbt,
  toSignInputs: ToSignInput[],
  taprootPubkey: string,
  segwitPubKey: string,
  segwitSigner: any,
  taprootSigner: any
) => {
  const taprootInputs: ToSignInput[] = []
  const segwitInputs: ToSignInput[] = []
  const inputs = psbt.data.inputs
  toSignInputs.forEach(({ publicKey }, i) => {
    const input = inputs[i]
    if (publicKey === taprootPubkey && !input.finalScriptWitness) {
      taprootInputs.push(toSignInputs[i])
    }
    if (segwitPubKey && segwitSigner) {
      if (publicKey === segwitPubKey) {
        segwitInputs.push(toSignInputs[i])
      }
    }
  })
  if (taprootInputs.length > 0) {
    await taprootSigner(psbt, taprootInputs)
  }
  if (segwitSigner && segwitInputs.length > 0) {
    await segwitSigner(psbt, segwitInputs)
  }
  return psbt
}

export const createInscriptionScript = (pubKey: string, content: any) => {
  const mimeType = 'text/plain;charset=utf-8'
  const textEncoder = new TextEncoder()
  const mimeTypeHex = Buffer.from(textEncoder.encode(mimeType)).toString('hex')
  const contentHex = Buffer.from(textEncoder.encode(content)).toString('hex')
  const markerHex = '6f7264'

  return `${pubKey} OP_CHECKSIG OP_0 OP_IF ${markerHex} 01 ${mimeTypeHex} OP_0 ${contentHex} OP_ENDIF`
}

function encodeToBase26(inputString: string): string {
  const baseCharCode = 'a'.charCodeAt(0)
  return inputString
    .toLowerCase()
    .split('')
    .map((char) => {
      const charCode = char.charCodeAt(0)
      if (charCode >= baseCharCode && charCode < baseCharCode + 26) {
        return String.fromCharCode(charCode - baseCharCode + 97) // Convert to base26 (a-z)
      } else {
        return char
      }
    })
    .join('')
}

export const createRuneSendScript = ({
  runeId,
  amount,
  sendOutputIndex = 1,
  pointer = 0,
}: {
  runeId: string
  amount: number
  sendOutputIndex?: number
  pointer: number
}) => {
  const pointerFlag = encodeVarint(BigInt(22)).varint
  const pointerVarint = encodeVarint(BigInt(pointer)).varint
  const bodyFlag = encodeVarint(BigInt(0)).varint
  const amountToSend = encodeVarint(BigInt(amount)).varint
  const encodedOutputIndex = encodeVarint(BigInt(sendOutputIndex)).varint
  const splitIdString = runeId.split(':')
  const block = Number(splitIdString[0])
  const blockTx = Number(splitIdString[1])

  const encodedBlock = encodeVarint(BigInt(block)).varint
  const encodedBlockTxNumber = encodeVarint(BigInt(blockTx)).varint

  const runeStone = Buffer.concat([
    pointerFlag,
    pointerVarint,
    bodyFlag,
    encodedBlock,
    encodedBlockTxNumber,
    amountToSend,
    encodedOutputIndex,
  ])

  let runeStoneLength: string = runeStone.byteLength.toString(16)

  if (runeStoneLength.length % 2 !== 0) {
    runeStoneLength = '0' + runeStone.byteLength.toString(16)
  }

  const script: Buffer = Buffer.concat([
    Buffer.from('6a', 'hex'),
    Buffer.from('5d', 'hex'),
    Buffer.from(runeStoneLength, 'hex'),
    runeStone,
  ])
  return script
}

export const createRuneMintScript = ({
  runeId,
  amountToMint,
  mintOutPutIndex = 1,
  pointer = 1,
}: {
  runeId: string
  amountToMint: number
  mintOutPutIndex: number
  pointer?: number
}) => {
  const pointerFlag = encodeVarint(BigInt(22)).varint
  const pointerVarint = encodeVarint(BigInt(pointer)).varint
  const bodyFlag = encodeVarint(BigInt(0)).varint
  const mintFlag = encodeVarint(BigInt(20)).varint

  const mintAmount = encodeVarint(BigInt(amountToMint)).varint
  const encodedOutputIndex = encodeVarint(BigInt(mintOutPutIndex)).varint
  const splitIdString = runeId.split(':')
  const block = Number(splitIdString[0])
  const blockTx = Number(splitIdString[1])

  const encodedBlock = encodeVarint(BigInt(block)).varint
  const encodedBlockTxNumber = encodeVarint(BigInt(blockTx)).varint

  const runeStone = Buffer.concat([
    pointerFlag,
    pointerVarint,
    mintFlag,
    encodedBlock,
    mintFlag,
    encodedBlockTxNumber,
    bodyFlag,
    encodedBlock,
    encodedBlockTxNumber,
    mintAmount,
    encodedOutputIndex,
  ])

  let runeStoneLength: string = runeStone.byteLength.toString(16)

  if (runeStoneLength.length % 2 !== 0) {
    runeStoneLength = '0' + runeStone.byteLength.toString(16)
  }

  const script = Buffer.concat([
    Buffer.from('6a', 'hex'),
    Buffer.from('5d', 'hex'),
    Buffer.from(runeStoneLength, 'hex'),
    runeStone,
  ])
  return script
}

export let RPC_ADDR =
  'https://mainnet.sandshrew.io/v1/6e3bc3c289591bb447c116fda149b094'

export const callBTCRPCEndpoint = async (
  method: string,
  params: string | string[],
  network: string
) => {
  if (network === 'testnet') {
    RPC_ADDR =
      'https://testnet.sandshrew.io/v1/6e3bc3c289591bb447c116fda149b094'
  }
  if (network === 'regtest') {
    RPC_ADDR === 'http://localhost:3000/v1/regtest'
  }
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

export async function waitForTransaction({
  txId,
  sandshrewBtcClient,
}: {
  txId: string
  sandshrewBtcClient: SandshrewBitcoinClient
}) {
  const timeout = 60000 // 1 minute in milliseconds
  const startTime = Date.now()

  while (true) {
    try {
      const result = await sandshrewBtcClient.bitcoindRpc.getMemPoolEntry(txId)

      if (result) {
        break
      }

      // Check for timeout
      if (Date.now() - startTime > timeout) {
        throw new Error(
          `Timeout: Could not find transaction in mempool: ${txId}`
        )
      }

      // Wait for 5 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000))
    } catch (error) {
      // Check for timeout
      if (Date.now() - startTime > timeout) {
        throw new Error(
          `Timeout: Could not find transaction in mempool: ${txId}`
        )
      }

      // Wait for 5 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }
  }
}

export async function getOutputValueByVOutIndex({
  txId,
  vOut,
  esploraRpc,
}: {
  txId: string
  vOut: number
  esploraRpc: EsploraRpc
}): Promise<{ value: number; script: string } | null> {
  const timeout: number = 60000 // 1 minute in milliseconds
  const startTime: number = Date.now()

  while (true) {
    const txDetails = await esploraRpc.getTxInfo(txId)

    if (txDetails?.vout && txDetails.vout.length > 0) {
      return {
        value: txDetails.vout[vOut].value,
        script: txDetails.vout[vOut].scriptpubkey,
      }
    }

    // Check for timeout
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout reached, stopping search.')
    }

    // Wait for 5 seconds before retrying
    await new Promise((resolve) => setTimeout(resolve, 5000))
  }
}

export function calculateTaprootTxSize(
  taprootInputCount: number,
  nonTaprootInputCount: number,
  outputCount: number
): number {
  const baseTxSize = 10 // Base transaction size without inputs/outputs

  // Size contributions from inputs
  const taprootInputSize = 64 // Average size of a Taproot input (can vary)
  const nonTaprootInputSize = 42 // Average size of a non-Taproot input (can vary)

  const outputSize = 40

  const totalInputSize =
    taprootInputCount * taprootInputSize +
    nonTaprootInputCount * nonTaprootInputSize
  const totalOutputSize = outputCount * outputSize

  return baseTxSize + totalInputSize + totalOutputSize
}

export async function getRawTxnHashFromTxnId(txnId: string) {
  const res = await axios.post(
    'https://mainnet.sandshrew.io/v1/6e3bc3c289591bb447c116fda149b094',
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'btc_getrawtransaction',
      params: [txnId],
    },
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )

  return res.data
}

export const isP2PKH = (
  script: Buffer,
  network: Network
): BitcoinPaymentType => {
  const p2pkh = checkPaymentType(bitcoin.payments.p2pkh, network)(script)
  return {
    type: 'p2pkh',
    payload: p2pkh,
  }
}
export const isP2WPKH = (
  script: Buffer,
  network: Network
): BitcoinPaymentType => {
  const p2wpkh = checkPaymentType(bitcoin.payments.p2wpkh, network)(script)
  return {
    type: 'p2wpkh',
    payload: p2wpkh,
  }
}
export const isP2WSHScript = (
  script: Buffer,
  network: Network
): BitcoinPaymentType => {
  const p2wsh = checkPaymentType(bitcoin.payments.p2wsh, network)(script)
  return {
    type: 'p2sh',
    payload: p2wsh,
  }
}
export const isP2SHScript = (
  script: Buffer,
  network: Network
): BitcoinPaymentType => {
  const p2sh = checkPaymentType(bitcoin.payments.p2sh, network)(script)
  return {
    type: 'p2sh',
    payload: p2sh,
  }
}
export const isP2TR = (
  script: Buffer,
  network: Network
): BitcoinPaymentType => {
  const p2tr = checkPaymentType(bitcoin.payments.p2tr, network)(script)
  return {
    type: 'p2tr',
    payload: p2tr,
  }
}

export const sendCollectible = async ({
  inscriptionId,
  inputAddress,
  outputAddress,
  taprootPublicKey,
  segwitPublicKey,
  segwitAddress,
  isDry,
  segwitSigner,
  taprootSigner,
  payFeesWithSegwit = false,
  feeRate,
  network,
  taprootUtxos,
  segwitUtxos,
  metaOutputValue,
  sandshrewBtcClient,
}: {
  inscriptionId: string
  inputAddress: string
  outputAddress: string
  mnemonic: string
  taprootPublicKey: string
  segwitPublicKey: string
  segwitAddress: string
  isDry?: boolean
  feeRate: number
  segwitSigner: any
  taprootSigner: any
  payFeesWithSegwit?: boolean
  network: 'testnet' | 'main' | 'regtest'
  taprootUtxos: Utxo[]
  segwitUtxos: Utxo[]
  metaOutputValue: number
  sandshrewBtcClient: SandshrewBitcoinClient
}) => {
  const psbt = new bitcoin.Psbt({ network: getNetwork(network) })

  const utxosToSend = await insertCollectibleUtxo({
    taprootUtxos: taprootUtxos,
    inscriptionId: inscriptionId,
    toAddress: outputAddress,
    psbt: psbt,
  })

  psbt.txOutputs[0].value = metaOutputValue

  await getUtxosForFees({
    payFeesWithSegwit: payFeesWithSegwit,
    psbtTx: psbt,
    taprootUtxos: taprootUtxos,
    segwitUtxos: segwitUtxos,
    segwitAddress: segwitAddress,
    feeRate: feeRate,
    taprootAddress: inputAddress,
    segwitPubKey: segwitPublicKey,
    utxosToSend: utxosToSend,
    network: getNetwork(network),
    fromAddress: inputAddress,
  })

  const toSignInputs: ToSignInput[] = await formatOptionsToSignInputs({
    _psbt: psbt,
    pubkey: taprootPublicKey,
    segwitPubkey: segwitPublicKey,
    segwitAddress: segwitAddress,
    taprootAddress: inputAddress,
    network: getNetwork(network),
  })

  const signedPsbt = await signInputs(
    psbt,
    toSignInputs,
    taprootPublicKey,
    segwitPublicKey,
    segwitSigner,
    taprootSigner
  )

  signedPsbt.finalizeAllInputs()

  const rawTx = signedPsbt.extractTransaction().toHex()
  const txId = signedPsbt.extractTransaction().getId()

  const [result] = await sandshrewBtcClient.bitcoindRpc.testMemPoolAccept([
    rawTx,
  ])

  if (!result.allowed) {
    throw new Error(result['reject-reason'])
  }

  if (!isDry) {
    await sandshrewBtcClient.bitcoindRpc.sendRawTransaction(rawTx)
  }

  return { txId, rawTx }
}

const insertCollectibleUtxo = async ({
  taprootUtxos,
  inscriptionId,
  toAddress,
  psbt,
}: {
  taprootUtxos: any[]
  inscriptionId: string
  toAddress: string
  psbt: bitcoin.Psbt
}) => {
  const { metaUtxos } = taprootUtxos.reduce(
    (acc, utxo) => {
      utxo.inscriptions.length
        ? acc.metaUtxos.push(utxo)
        : acc.nonMetaUtxos.push(utxo)
      return acc
    },
    { metaUtxos: [], nonMetaUtxos: [] }
  )

  return await addInscriptionUtxo({
    metaUtxos: metaUtxos,
    inscriptionId: inscriptionId,
    toAddress: toAddress,
    psbtTx: psbt,
  })
}

export const filterTaprootUtxos = async ({
  taprootUtxos,
}: {
  taprootUtxos: any[]
}) => {
  if (!taprootUtxos || taprootUtxos.length === 0) {
    return null
  }
  const { nonMetaUtxos } = taprootUtxos.reduce(
    (acc, utxo) => {
      utxo.inscriptions.length > 0 || utxo.satoshis === 546
        ? acc.metaUtxos.push(utxo)
        : acc.nonMetaUtxos.push(utxo)
      return acc
    },
    { metaUtxos: [], nonMetaUtxos: [] }
  )
  const sortedNonMetaUtxos = nonMetaUtxos.sort(
    (a, b) => b.satoshis - a.satoshis
  )

  return sortedNonMetaUtxos
}

export const filterUtxos = async ({ utxos }: { utxos: any[] }) => {
  const { nonMetaUtxos } = utxos.reduce(
    (acc, utxo) => {
      utxo.value === 546 && utxo.vout === 0
        ? acc.metaUtxos.push(utxo)
        : acc.nonMetaUtxos.push(utxo)
      return acc
    },
    { metaUtxos: [], nonMetaUtxos: [] }
  )
  return nonMetaUtxos
}

export const addBtcUtxo = async ({
  spendUtxos,
  toAddress,
  psbt,
  amount,
  feeRate,
  network,
  spendAddress,
  spendPubKey,
  altSpendPubKey,
  altSpendUtxos,
  fee,
}: {
  spendUtxos: any[]
  toAddress: string
  psbt: bitcoin.Psbt
  feeRate: number
  amount: number
  network: bitcoin.Network
  spendAddress: string
  spendPubKey: string
  altSpendPubKey?: string
  altSpendUtxos?: Utxo[]
  fee?: number
}) => {
  const txSize = calculateTaprootTxSize(1, 0, 2)
  let calculatedFee = txSize * feeRate < 250 ? 250 : txSize * feeRate
  let finalFee = fee ? fee : calculatedFee
  let utxosToSend: any = findUtxosToCoverAmount(spendUtxos, amount + finalFee)
  let usingAlt = false

  if (utxosToSend?.selectedUtxos.length > 1) {
    const txSize = calculateTaprootTxSize(
      utxosToSend.selectedUtxos.length,
      0,
      2
    )
    fee = txSize * feeRate < 250 ? 250 : txSize * feeRate

    utxosToSend = findUtxosToCoverAmount(spendUtxos, amount + finalFee)
  }

  if (!utxosToSend) {
    utxosToSend = findUtxosToCoverAmount(altSpendUtxos, amount + finalFee)

    if (utxosToSend?.selectedUtxos.length > 1) {
      const txSize = calculateTaprootTxSize(
        utxosToSend.selectedUtxos.length,
        0,
        2
      )
      fee = txSize * feeRate < 250 ? 250 : txSize * feeRate

      utxosToSend = findUtxosToCoverAmount(spendUtxos, amount + finalFee)
    }
    if (!utxosToSend) {
      throw new Error('Insufficient Balance')
    }
    usingAlt = true
  }
  const amountGathered = calculateAmountGatheredUtxo(utxosToSend.selectedUtxos)

  for (let i = 0; i < utxosToSend.selectedUtxos.length; i++) {
    psbt.addInput({
      hash: utxosToSend.selectedUtxos[i].txId,
      index: utxosToSend.selectedUtxos[i].outputIndex,
      witnessUtxo: {
        value: utxosToSend.selectedUtxos[i].satoshis,
        script: Buffer.from(utxosToSend.selectedUtxos[i].scriptPk, 'hex'),
      },
    })
  }

  psbt.addOutput({
    address: toAddress,
    value: amount,
  })

  const changeAmount = amountGathered - (finalFee + amount)

  psbt.addOutput({
    address: spendAddress,
    value: changeAmount,
  })

  const updatedPsbt = await formatInputsToSign({
    _psbt: psbt,
    senderPublicKey: usingAlt ? altSpendPubKey : spendPubKey,
    network,
  })

  return { psbt: updatedPsbt, fee: finalFee }
}

export const isValidJSON = (str: string) => {
  try {
    JSON.parse(str)
    return true
  } catch (e) {
    return false
  }
}

export const encodeVarint = (bigIntValue: any) => {
  const bufferArray = []
  let num = bigIntValue

  do {
    let byte = num & BigInt(0x7f) // Get the next 7 bits of the number.
    num >>= BigInt(7) // Remove the 7 bits we just processed.
    if (num !== BigInt(0)) {
      // If there are more bits to process,
      byte |= BigInt(0x80) // set the continuation bit.
    }
    bufferArray.push(Number(byte))
  } while (num !== BigInt(0))

  return { varint: Buffer.from(bufferArray) }
}

export function findRuneUtxosToSpend(utxos: RuneUtxo[], target: number) {
  if (!utxos || utxos.length === 0) {
    return undefined
  }
  let totalAmount = 0
  const selectedUtxos: RuneUtxo[] = []

  for (const utxo of utxos) {
    if (totalAmount >= target) break

    selectedUtxos.push(utxo)
    totalAmount += utxo.amount
  }

  if (totalAmount >= target) {
    return {
      selectedUtxos,
      change: totalAmount - target,
    }
  } else {
    return undefined
  }
}
