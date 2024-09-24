import * as bitcoin from 'bitcoinjs-lib'
import { ECPair, tweakSigner } from '../shared/utils'
import { ECPairInterface } from 'ecpair'
import { Signer as bipSigner } from 'bip322-js'
import crypto from 'crypto'

export type walletInit = {
  segwitPrivateKey?: string
  taprootPrivateKey?: string
  legacyPrivateKey?: string
  nestedSegwitPrivateKey?: string
}

export class Signer {
  network: bitcoin.Network
  segwitKeyPair: ECPairInterface
  taprootKeyPair: ECPairInterface
  legacyKeyPair: ECPairInterface
  nestedSegwitKeyPair: ECPairInterface
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
    if (keys.legacyPrivateKey) {
      this.legacyKeyPair = ECPair.fromPrivateKey(
        Buffer.from(keys.legacyPrivateKey, 'hex')
      )
    }
    if (keys.nestedSegwitPrivateKey) {
      this.nestedSegwitKeyPair = ECPair.fromPrivateKey(
        Buffer.from(keys.nestedSegwitPrivateKey, 'hex')
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
      this.segwitKeyPair.publicKey
    )
    if (matchingPubKey) {
      unSignedPsbt.signInput(inputNumber, this.segwitKeyPair)
      if (finalize) {
        unSignedPsbt.finalizeInput(inputNumber)
      }
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
    let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt, {
      network: this.network,
    })
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
    const signedHexPsbt = unSignedPsbt.toHex()
    return {
      signedPsbt: signedPsbt,
      raw: unSignedPsbt,
      signedHexPsbt: signedHexPsbt,
    }
  }

  async signAllInputs({
    rawPsbt,
    rawPsbtHex,
    finalize,
  }: {
    rawPsbt?: string
    rawPsbtHex?: string
    finalize: boolean
  }) {
    let unSignedPsbt: bitcoin.Psbt
    if (rawPsbt) {
      unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt, {
        network: this.network,
      })
    }

    if (rawPsbtHex) {
      unSignedPsbt = bitcoin.Psbt.fromHex(rawPsbtHex, {
        network: this.network,
      })
    }

    for (let i = 0; i < unSignedPsbt.inputCount; i++) {
      let tweakedSigner: bitcoin.Signer
      let matchingLegacy: boolean
      let matchingNative: boolean
      let matchingTaprootPubKey: boolean
      let matchingNestedSegwit: boolean

      if (this.taprootKeyPair) {
        tweakedSigner = tweakSigner(this.taprootKeyPair, {
          network: this.network,
        })
        matchingTaprootPubKey = unSignedPsbt.inputHasPubkey(
          i,
          tweakedSigner.publicKey
        )
      }
      if (this.legacyKeyPair) {
        matchingLegacy = unSignedPsbt.inputHasPubkey(
          i,
          this.legacyKeyPair.publicKey
        )
      }
      if (this.segwitKeyPair) {
        matchingNative = unSignedPsbt.inputHasPubkey(
          i,
          this.segwitKeyPair.publicKey
        )
      }
      if (this.nestedSegwitKeyPair) {
        try {
          matchingNestedSegwit = unSignedPsbt.inputHasPubkey(
            i,
            this.nestedSegwitKeyPair.publicKey
          )
        } catch (e) {
          console.log(e)
        }
      }

      switch (true) {
        case matchingTaprootPubKey:
          unSignedPsbt.signTaprootInput(i, tweakedSigner, null, [
            131
          ])
          if (finalize) {
            unSignedPsbt.finalizeInput(i)
          }
          break
        case matchingLegacy:
          unSignedPsbt.signInput(i, this.legacyKeyPair)
          if (finalize) {
            unSignedPsbt.finalizeInput(i)
          }
          break
        case matchingNative:
          unSignedPsbt.signInput(i, this.segwitKeyPair)
          if (finalize) {
            unSignedPsbt.finalizeInput(i)
          }
          break
        case matchingNestedSegwit:
          unSignedPsbt.signInput(i, this.nestedSegwitKeyPair)
          if (finalize) {
            unSignedPsbt.finalizeInput(i)
          }
          break
        default:
      }
    }

    const signedPsbt = unSignedPsbt.toBase64()
    const signedHexPsbt = unSignedPsbt.toHex()

    return { signedPsbt, signedHexPsbt }
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
    let unSignedPsbt = bitcoin.Psbt.fromBase64(rawPsbt, {
      network: this.network,
    })
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
    message,
    address,
    keypair,
    protocol,
  }: {
    message: string
    address?: string
    keypair: ECPairInterface
    protocol: 'ecdsa' | 'bip322'
  }) {
    if (!keypair) {
      throw new Error('Keypair required to sign')
    }

    if (protocol === 'bip322') {
      return bipSigner
        .sign(keypair.toWIF(), address, message)
        .toString('base64')
    }
    if (protocol === 'ecdsa') {
      const hashedMessage = crypto
        .createHash('sha256')
        .update(message)
        .digest()
        .toString('base64')
      const signature = keypair.sign(Buffer.from(hashedMessage, 'base64'))
      return signature.toString('base64')
    }
  }
}
