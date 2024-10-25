import { AssetType } from "../../shared/interface";
import { getAddressType, timeout } from "../../shared/utils";
import { prepareAddressForDummyUtxos, updateUtxos } from "../helpers";
import { GetSellerPsbtRequest, GetSellerPsbtResponse, Marketplaces, ProcessOfferOptions, SubmitBuyerPsbtRequest, SubmitBuyerPsbtResponse, SwapResponse } from "../types";

export async function magisatSwap ({
    address, 
    offer,
    receiveAddress,
    feeRate,
    pubKey,
    assetType,
    provider,
    utxos,
    signer
}:ProcessOfferOptions
) : Promise<SwapResponse> {
    let dummyTxId: string | null = null;
    let purchaseTxId: string | null = null;
    const addressType = getAddressType(address);

    const network = provider.network
    let nUtxos = 0;
    const orders = [];
    if (Array.isArray(offer.offerId)) {
        nUtxos = offer.offerId.length + 1
        for (let i = 0; i < offer.offerId.length; i++) {
            orders.push({
                orderId: offer.offerId[i],
                price: offer.totalPrice[i],
                amount: offer.amount[i],
                inscriptionId: offer.inscriptionId[i],
                feeRate
            })
        }
    } else {
        nUtxos = 2;
        orders.push({
            orderId: offer.offerId,
            price: offer.totalPrice,
            amount: offer.amount,
            inscriptionId: offer.inscriptionId,
            feeRate
        })
    }

    const psbtForDummyUtxos =
    (assetType != AssetType.RUNES) 
    ?
    await prepareAddressForDummyUtxos({address, utxos, network, pubKey, feeRate, nUtxos, addressType})
    :
    null
    if (psbtForDummyUtxos != null){
        const { psbtBase64, inputTemplate, outputTemplate} = psbtForDummyUtxos
        const {signedPsbt} = await signer.signAllInputs({
            rawPsbt: psbtBase64,
            finalize: true,
        })

        const {txId} = await provider.pushPsbt({psbtBase64: signedPsbt})
        dummyTxId = txId;
        await timeout(60000)
        utxos = await updateUtxos({
            originalUtxos: utxos,
            txId, 
            spendAddress: address,
            provider    
        })
    }

    const magisatGetSellerPsbt: GetSellerPsbtRequest = {
        marketplaceType: Marketplaces.MAGISAT,
        assetType,
        buyerAddress: address,
        orders,
        buyerPublicKey: pubKey,
        feeRate,
        receiveAddress
    }
    const sellerPsbtResponse = await provider.api.getSellerPsbt(magisatGetSellerPsbt);
    if (sellerPsbtResponse.statusCode != 200) {
        throw new Error(`Failed to get seller psbt: ${sellerPsbtResponse.error}`)
    }
    const sellerPsbt: GetSellerPsbtResponse = sellerPsbtResponse.data;
    const {signedPsbt} = await signer.signAllInputs({
        rawPsbtHex: sellerPsbt.psbt,
        finalize: true,
    })

    const magisatSubmitBuyerPsbt: SubmitBuyerPsbtRequest = {
        marketplaceType: Marketplaces.MAGISAT,
        assetType,
        buyerAddress: address,
        orders,
        buyerPublicKey: pubKey,
        receiveAddress,
        psbt: signedPsbt
    }
    const submitBuyerPsbtResponse = await provider.api.submitBuyerPsbt(magisatSubmitBuyerPsbt);
    if (submitBuyerPsbtResponse.statusCode != 200) {
        throw new Error(`Failed to submit buyer psbt: ${submitBuyerPsbtResponse.error}`)
    }
    const submitBuyerPsbt: SubmitBuyerPsbtResponse = submitBuyerPsbtResponse.data;
    purchaseTxId = submitBuyerPsbt.txid;
    return {
        dummyTxId,
        purchaseTxId
    }
}
