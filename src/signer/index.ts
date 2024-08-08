import * as bitcoin from 'bitcoinjs-lib'
import { ECPair, tweakSigner } from '../shared/utils'
import { ECPairInterface } from 'ecpair'
type walletInit = {
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
      const keyPair = ECPair.fromPrivateKey(
        Buffer.from(keys.segwitPrivateKey, 'hex')
      )
      this.segwitKeyPair = keyPair
    }
    if (keys.taprootPrivateKey) {
      const keyPair = ECPair.fromPrivateKey(
        Buffer.from(keys.taprootPrivateKey, 'hex')
      )
      this.taprootKeyPair = keyPair
    }
    if (keys.legacyPrivateKey) {
      const keyPair = ECPair.fromPrivateKey(
        Buffer.from(keys.legacyPrivateKey, 'hex')
      )
      this.legacyKeyPair = keyPair
    }
    if (keys.nestedSegwitPrivateKey) {
      const keyPair = ECPair.fromPrivateKey(
        Buffer.from(keys.nestedSegwitPrivateKey, 'hex')
      )
      this.nestedSegwitKeyPair = keyPair
    }
    this.network = network
  }

  async signInput({
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
        matchingNestedSegwit = unSignedPsbt.inputHasPubkey(
          i,
          this.nestedSegwitKeyPair.publicKey
        )
      }

      switch (true) {
        case matchingTaprootPubKey:
          unSignedPsbt.signTaprootInput(i, tweakedSigner)
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
    const signedHexPsbt = unSignedPsbt.extractTransaction().toHex()

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
