import { AddressType, AssetType, MarketplaceOffer } from "../shared/interface"
import { Signer } from '../signer'
import { Provider } from "provider"
import { getAddressType } from ".."
import { signBip322Message } from "./BIP322"

export interface UnsignedUnisatBid {
    address: string
    auctionId: string
    bidPrice: number
    pubKey: string
    receiveAddress: string
    altAddressSignature?: string
    feerate: number
    provider: Provider
    assetType: AssetType
  }

  export interface SignedUnisatBid {
    psbtHex: string
    auctionId: string
    bidId: string
    provider: Provider
    assetType: AssetType
  }

export async function getPsbt(unsignedBid: UnsignedUnisatBid) {
    switch (unsignedBid.assetType) {
      case AssetType.BRC20:
        return await unsignedBid.provider.api.initSwapBid(unsignedBid)

      case AssetType.RUNES:
        return await unsignedBid.provider.api.initRuneSwapBid(unsignedBid)

      case AssetType.COLLECTIBLE:
        return await unsignedBid.provider.api.initCollectionSwapBid(unsignedBid)
    }
  }

 export async function submitPsbt(signedBid: SignedUnisatBid) {
    switch (signedBid.assetType) {
      case AssetType.BRC20:
        return await signedBid.provider.api.submitSignedBid({...signedBid, psbtBid: signedBid.psbtHex})

      case AssetType.RUNES:
        return await signedBid.provider.api.submitSignedRuneBid({...signedBid, psbtBid: signedBid.psbtHex})

      case AssetType.COLLECTIBLE:
        return await signedBid.provider.api.submitSignedCollectionBid({...signedBid, psbtBid: signedBid.psbtHex})

    }
  }

  export async function unisatSwap ({
    address, 
    offer,
    receiveAddress,
    feerate,
    pubKey,
    assetType,
    provider,
    signer
}:{
    address: string
    offer: MarketplaceOffer
    receiveAddress: string
    feerate: number
    pubKey: string
    assetType: AssetType
    provider: Provider
    signer: Signer
}) {
    const unsignedBid: UnsignedUnisatBid = {
      address,
      auctionId: offer.offerId,
      bidPrice: offer.totalPrice,
      pubKey,
      receiveAddress,
      feerate,
      provider,
      assetType
    }
    if (
      address != receiveAddress 
    ) {
      const signature = await getMessageSignature({address, receiveAddress, signer})
      unsignedBid['signature'] = signature
    }
    const psbt_ = await getPsbt(unsignedBid)
    console.log(psbt_)

    if (!psbt_?.error) {
      const unsignedPsbt: string = psbt_.psbtBid
      const signedPsbt = await signer.signAllInputs({
        rawPsbtHex: unsignedPsbt,
        finalize: false,
    })
    const data = await submitPsbt({
        psbtHex: signedPsbt.signedHexPsbt,
        auctionId: offer.offerId,
        bidId: psbt_.bidId,
        assetType,
        provider
    })
    if (data.txid) return data.txid
   }
    
  }

  export async function getMessageSignature({
    address,
    receiveAddress,
    signer,
  }): Promise<string> {
     const message = `Please confirm that\nPayment Address: ${address}\nOrdinals Address: ${receiveAddress}`
  if (getAddressType(receiveAddress) == AddressType.P2WPKH) {
    const keyPair = signer.segwitKeyPair
    const privateKey = keyPair.privateKey
    const signature = await signBip322Message({
      message,
      network: 'mainnet',
      privateKey,
      signatureAddress: receiveAddress,
    })
    return signature
  } else if (getAddressType(receiveAddress) == AddressType.P2TR) {
    const keyPair = signer.taprootKeyPair
    const privateKey = keyPair.privateKey
    const signature = await signBip322Message({
      message,
      network: 'mainnet',
      privateKey,
      signatureAddress: receiveAddress,
    })
    return signature
  }
}