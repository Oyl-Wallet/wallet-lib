import * as bitcoin from 'bitcoinjs-lib'
import { ECPair, assertHex, tweakSigner } from '../shared/utils'
import { ECPairInterface } from 'ecpair'
import { toXOnly } from '@sadoprotocol/ordit-sdk'

type walletInit = {
  segwitPrivateKey?: string
  taprootPrivateKey?: string
}

export class Signer {
  network: bitcoin.Network
  segwitKeyPair: ECPairInterface
  taprootKeyPair: ECPairInterface
  addresses: walletInit
  constructor(network: bitcoin.Network, keys: walletInit) {
    if (keys.segwitPrivateKey) {
      this.segwitKeyPair = ECPair.fromPrivateKey(
        Buffer.from(keys.segwitPrivateKey, 'hex')
      )
    }
    if (keys.taprootPrivateKey) {
      this.taprootKeyPair = ECPair.fromPrivateKey(
        Buffer.from(keys.taprootPrivateKey, 'hex')
      )
    }
    this.network = network
  }

  async signSegwitInput({
    rawPsbt,
    inputNumber,
    finalize,
  }: {
    rawPsbt: string
    inputNumber: number
    finalize: boolean
  }) {
    if (!this.segwitKeyPair) {
      throw new Error('Segwit signer was not initialized')
    }
    let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt)

    const matchingPubKey = unSignedPsbt.inputHasPubkey(
      inputNumber,
      Buffer.from(this.segwitKeyPair.publicKey)
    )
    if (!matchingPubKey) {
      throw new Error('Input does not match signer type')
    }

    unSignedPsbt.signInput(inputNumber, this.segwitKeyPair)
    if (finalize) {
      unSignedPsbt.finalizeInput(inputNumber)
    }

    const signedPsbt = unSignedPsbt.toBase64()

    return { signedPsbt: signedPsbt }
  }

  async signTaprootInput({
    rawPsbt,
    inputNumber,
    finalize,
  }: {
    rawPsbt: string
    inputNumber: number
    finalize: boolean
  }) {
    if (!this.taprootKeyPair) {
      throw new Error('Taproot signer was not initialized')
    }
    let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt, {
      network: this.network,
    })
    const tweakedSigner = tweakSigner(this.taprootKeyPair)

    const matchingPubKey = unSignedPsbt.inputHasPubkey(
      inputNumber,
      tweakedSigner.publicKey
    )
    if (!matchingPubKey) {
      throw new Error('Input does not match signer type')
    }

    unSignedPsbt.signTaprootInput(inputNumber, tweakedSigner)

    if (finalize) {
      unSignedPsbt.finalizeInput(inputNumber)
    }

    const signedPsbt = unSignedPsbt.toBase64()

    return { signedPsbt: signedPsbt }
  }

  async signAllTaprootInputs({
    rawPsbt,
    finalize,
  }: {
    rawPsbt: string
    finalize: boolean
  }) {
    if (!this.taprootKeyPair) {
      throw new Error('Taproot signer was not initialized')
    }
    let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt)
    let tweakedSigner = tweakSigner(this.taprootKeyPair)

    for (let i = 0; i < unSignedPsbt.inputCount; i++) {
      const matchingPubKey = unSignedPsbt.inputHasPubkey(
        i,
        tweakedSigner.publicKey
      )
      if (matchingPubKey) {
        unSignedPsbt.signTaprootInput(i, tweakedSigner)
        if (finalize) {
          unSignedPsbt.finalizeInput(i)
        }
      }
    }

    const signedPsbt = unSignedPsbt.toBase64()

    return { signedPsbt: signedPsbt, raw: unSignedPsbt }
  }

  async signAllSegwitInputs({
    rawPsbt,
    finalize,
  }: {
    rawPsbt: string
    finalize: boolean
  }) {
    if (!this.segwitKeyPair) {
      throw new Error('Segwit signer was not initialized')
    }
    let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt)
    for (let i = 0; i < unSignedPsbt.inputCount; i++) {
      const matchingPubKey = unSignedPsbt.inputHasPubkey(
        i,
        this.segwitKeyPair.publicKey
      )

      if (matchingPubKey) {
        unSignedPsbt.signInput(i, this.segwitKeyPair)
        if (finalize) {
          unSignedPsbt.finalizeInput(i)
        }
      }
    }

    const signedPsbt = unSignedPsbt.toBase64()
    const signedHexPsbt = unSignedPsbt.toHex()

    return { signedPsbt: signedPsbt, signedHexPsbt: signedHexPsbt }
  }

  async signMessage({
    messageToSign,
    keyToUse,
  }: {
    messageToSign: string
    keyToUse: 'segwitKeyPair' | 'taprootKeyPair'
  }) {
    if (!this.taprootKeyPair && keyToUse === 'taprootKeyPair') {
      throw new Error('Taproot signer was not initialized')
    }
    if (!this.taprootKeyPair && keyToUse === 'segwitKeyPair') {
      throw new Error('Taproot signer was not initialized')
    }
    const signedMessage = this[keyToUse].sign(Buffer.from(messageToSign))

    return signedMessage
  }
}
