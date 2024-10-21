import { ProcessOfferOptions, SwapResponse } from '../types'
import { Provider } from '../../provider'
import { AssetType } from '../../shared/interface'
import { getAddressType, timeout } from '../..'
import * as bitcoin from 'bitcoinjs-lib'

export interface UnsignedOrdinalsWalletBid {
  address: string
  publicKey: string
  feeRate: number
  receiveAddress: string
  provider: Provider
  assetType: AssetType
  inscriptions?: string[]
  outpoints?: string[]
}

export interface signedOrdinalsWalletBid {
  psbt: string
  setupPsbt?: string
  provider: Provider
  assetType: AssetType
}

export async function getSellerPsbt(unsignedBid: UnsignedOrdinalsWalletBid) {
  const {
    assetType,
    address,
    publicKey,
    feeRate,
    provider,
    inscriptions,
    outpoints,
    receiveAddress,
  } = unsignedBid
  switch (assetType) {
    case AssetType.BRC20:
      return await provider.api.getOrdinalsWalletNftOfferPsbt({
        address,
        publicKey,
        feeRate,
        inscriptions,
        receiveAddress,
      })

    case AssetType.RUNES:
      return await provider.api.getOrdinalsWalletRuneOfferPsbt({
        address,
        publicKey,
        feeRate,
        outpoints,
        receiveAddress,
      })

    case AssetType.COLLECTIBLE:
      return await provider.api.getOrdinalsWalletNftOfferPsbt({
        address,
        publicKey,
        feeRate,
        inscriptions,
        receiveAddress,
      })
  }
}

export async function submitPsbt(signedBid: signedOrdinalsWalletBid) {
  const { assetType, psbt, provider, setupPsbt } = signedBid
  switch (assetType) {
    case AssetType.BRC20:
      return await provider.api.submitOrdinalsWalletBid({ psbt, setupPsbt })

    case AssetType.RUNES:
      return await provider.api.submitOrdinalsWalletRuneBid({ psbt, setupPsbt })

    case AssetType.COLLECTIBLE:
      return await provider.api.submitOrdinalsWalletBid({ psbt, setupPsbt })
  }
}

export async function ordinalWalletSwap({
  address,
  offer,
  receiveAddress,
  feeRate,
  pubKey,
  assetType,
  provider,
  utxos,
  signer,
}: ProcessOfferOptions): Promise<SwapResponse> {
  let dummyTxId: string | null = null
  let purchaseTxId: string | null = null

  let setupTx: string | null = null

  const unsignedBid: UnsignedOrdinalsWalletBid = {
    address,
    publicKey: pubKey,
    feeRate,
    provider,
    receiveAddress,
    assetType,
  }
  if (assetType === AssetType.RUNES) {
    unsignedBid['outpoints'] = Array.isArray(offer.outpoint)
      ? offer.outpoint
      : [offer.outpoint]
  } else {
    unsignedBid['inscriptions'] = Array.isArray(offer.inscriptionId)
      ? offer.inscriptionId
      : [offer.inscriptionId]
  }

  const sellerData = await getSellerPsbt(unsignedBid)
  if (sellerData.data.setup) {
    const dummyPsbt = sellerData.data.setup
    const signedDummyPsbt = await signer.signAllInputs({
      rawPsbtHex: dummyPsbt,
      finalize: true,
    })

    const extractedDummyTx = bitcoin.Psbt.fromHex(
      signedDummyPsbt.signedHexPsbt
    ).extractTransaction()
    setupTx = extractedDummyTx.toHex()
  }
  const sellerPsbt = sellerData.data.purchase

  const signedPsbt = await signer.signAllInputs({
    rawPsbtHex: sellerPsbt,
    finalize: true,
  })

  const finalizeResponse = await submitPsbt({
    psbt: signedPsbt.signedHexPsbt,
    setupPsbt: setupTx,
    assetType,
    provider,
  })
  const data = finalizeResponse.data
  if (data.success) {
    purchaseTxId = data.purchase
    if (setupTx) await timeout(5000)
  }
  return {
    dummyTxId,
    purchaseTxId,
  }
}
