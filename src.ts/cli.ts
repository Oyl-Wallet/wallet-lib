import yargs from 'yargs'
import { camelCase } from 'change-case'
import { Wallet } from './oylib'
import { PSBTTransaction } from './txbuilder/PSBTTransaction'
import * as transactions from './transactions'
import * as bitcoin from 'bitcoinjs-lib'
import { Inscriber } from '@sadoprotocol/ordit-sdk'
import { BRC_20_TRANSFER_META } from './shared/constants'
import { InscribeTransfer } from './shared/interface'

export async function loadRpc(options) {
  const rpcOptions = {
    host: options.host,
    port: options.port,
    network: options.network,
    auth: options.apiKey,
  }
  const wallet = new Wallet()
  const rpc = wallet.fromProvider(rpcOptions)
  return rpc
}

export async function callAPI(command, data, options = {}) {
  const oylSdk = new Wallet()
  const camelCommand = camelCase(command)
  if (!oylSdk[camelCommand]) throw Error('command not foud: ' + camelCommand)
  const result = await oylSdk[camelCommand](data)
  console.log(JSON.stringify(result, null, 2))
  return result
}

export async function swapFlow(options) {
  const address = options.address
  const feeRate = options.feeRate
  const mnemonic = options.mnemonic
  const pubKey = options.pubKey

  const psbt = bitcoin.Psbt.fromHex(options.psbt, {
    network: bitcoin.networks.bitcoin,
  })
  const wallet = new Wallet()
  const payload = await wallet.fromPhrase({
    mnemonic: mnemonic.trim(),
    hdPath: options.hdPath,
    type: options.type,
  })

  const keyring = payload.keyring.keyring
  const signer = keyring.signTransaction.bind(keyring)
  const from = address
  const addressType = transactions.getAddressType(from)
  if (addressType == null) throw Error('Invalid Address Type')

  const tx = new PSBTTransaction(signer, from, pubKey, addressType, feeRate)

  const psbt_ = await tx.signPsbt(psbt)

  return psbt_.toHex()
}

async function inscribeTest(options: InscribeTransfer) {
  //WORKFLOW TO INSCRIBE
  //GET & PASS PUBLIC KEY, ADDRESS SENDING FROM, ADDRESS INSCRIPTIOM WILL END UP IN, AND CHANGE ADDRESS
  //PASS THE MEDIA CONTENT (e.g: 'Hello World'), MEDIA TYPE (e.g 'text/plain'), AND META (which will be encoded )
  //PASS feerate and postage (default 1500)
  //Initialize the Inscriber class with these values
  const transaction = new Inscriber({
    network: 'mainnet',
    address: options.feeFromAddress,
    publicKey: options.taprootPublicKey,
    changeAddress: options.feeFromAddress,
    destinationAddress: options.destinationAddress,
    mediaContent: BRC_20_TRANSFER_META.mediaContent,
    mediaType: BRC_20_TRANSFER_META.mediaType,
    feeRate: options.feeRate,
    meta: BRC_20_TRANSFER_META.meta,
    postage: options?.postage || 1500, // base value of the inscription in sats
  })
  //GENERATE COMMIT PAYMENT REQUEST - THIS DUMPS AN ADDRESS FROM THE PUBKEY & TOTAL COST FOR INSCRIPTION
  const revealed = await transaction.generateCommit()
  //SEND BITCOIN FROM REGULAR ADDRESS TO THE DUMPED ADDRESS
  const wallet = new Wallet()
  const depositRevealFee = await wallet.createPsbtTx({
    publicKey: options.taprootPublicKey,
    from: options.feeFromAddress,
    to: revealed.address,
    changeAddress: options.feeFromAddress,
    amount: (revealed.revealFee / 100000000).toString(),
    fee: options.feeRate,
    signer: options.signer,
  })
  console.log('deposit reveal fee', depositRevealFee)
  //COLLECT_TX_HASH
  const tx_hash = depositRevealFee.txId
  //WAIT FOR TRANSACTION TO BE CONFIRMED BEFORE PROCEEDING
  //ONCE THE TX IS CONFIRMED, CHECK IF ITS READY TO BE BUILT
  const ready = await transaction.isReady()
  if (ready) {
    //IF READY, BUILD THE REVEAL TX
    await transaction.build()
    //YOU WILL GET THE PSBT HEX
    const psbtHex = transaction.toHex()
    console.log('transaction: ', psbtHex)
    //PREPARE THE PSBT FOR SIGNING
    const vPsbt = bitcoin.Psbt.fromHex(psbtHex, {
      network: bitcoin.networks.bitcoin,
    })
    //SIGN THE PSBT
    await signInscriptionPsbt(
      vPsbt,
      options.feeRate,
      options.taprootPublicKey,
      options.signer
    )
  }
}

async function signInscriptionPsbt(psbt, fee, pubKey, signer, address = '') {
  //INITIALIZE NEW PSBTTransaction INSTANCE
  const wallet = new Wallet()
  const addressType = transactions.getAddressType(address)
  if (addressType == null) throw Error('Invalid Address Type')
  const tx = new PSBTTransaction(signer, address, pubKey, addressType, fee)

  //SIGN AND FINALIZE THE PSBT
  const signedPsbt = await tx.signPsbt(psbt, true, true)
  //@ts-ignore
  psbt.__CACHE.__UNSAFE_SIGN_NONSEGWIT = false

  //EXTRACT THE RAW TX
  const rawtx = signedPsbt.extractTransaction().toHex()
  console.log('rawtx', rawtx)
  //BROADCAST THE RAW TX TO THE NETWORK
  const result = await wallet.apiClient.pushTx({ transactionHex: rawtx })
  //GET THE TX_HASH
  const ready_txId = psbt.extractTransaction().getId()
  //CONFIRM TRANSACTION IS CONFIRMED
}

async function createOrdPsbtTx() {
  const wallet = new Wallet()
  const test0 = await wallet.createOrdPsbtTx({
    changeAddress: '',
    fromAddress: '',
    inscriptionId: '',
    taprootPubKey: '',
    segwitAddress: '',
    segwitPubKey: '',
    toAddress: '',
    txFee: 0,
    mnemonic: '',
  })
  console.log(test0)
}

export async function runCLI() {
  const [command] = yargs.argv._
  const options = Object.assign({}, yargs.argv)

  delete options._
  switch (command) {
    case 'load':
      return await loadRpc(options)
      break
    case 'recover':
      return await createOrdPsbtTx()
      break
    default:
      return await callAPI(yargs.argv._[0], options)
      break
  }
}
