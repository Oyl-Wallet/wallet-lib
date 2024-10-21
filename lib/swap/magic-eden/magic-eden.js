"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.magicEdenSwap = void 0;
const interface_1 = require("../../shared/interface");
const utils_1 = require("../../shared/utils");
const helpers_1 = require("../helpers");
const types_1 = require("../types");
async function magicEdenSwap({ address, offer, receiveAddress, feeRate, pubKey, assetType, provider, utxos, receivePublicKey, signer }) {
    let dummyTxId = null;
    let purchaseTxId = null;
    const addressType = (0, utils_1.getAddressType)(address);
    const marketplaceType = types_1.marketplaceName[offer.marketplace];
    const diffReceiveAddress = receiveAddress != address;
    if (assetType == interface_1.AssetType.COLLECTIBLE && !receivePublicKey && diffReceiveAddress) {
        throw Error(`Marketplace trade failed [${marketplaceType}]:: Public key is required for receive address`);
    }
    const network = provider.network;
    let nUtxos = 0;
    const orders = [];
    if (Array.isArray(offer.offerId)) {
        nUtxos = offer.offerId.length + 1;
        for (let i = 0; i < offer.offerId.length; i++) {
            orders.push({
                orderId: offer.offerId[i],
                price: offer.totalPrice[i],
                amount: offer.amount[i],
                feeRate
            });
        }
    }
    else {
        nUtxos = 2;
        orders.push({
            orderId: offer.offerId,
            price: offer.totalPrice,
            amount: offer.amount,
            feeRate
        });
    }
    const psbtForDummyUtxos = (assetType != interface_1.AssetType.RUNES)
        ?
            await (0, helpers_1.prepareAddressForDummyUtxos)({ address, utxos, network, pubKey, feeRate, nUtxos, addressType })
        :
            null;
    if (psbtForDummyUtxos != null) {
        const { psbtBase64, inputTemplate, outputTemplate } = psbtForDummyUtxos;
        const { signedPsbt } = await signer.signAllInputs({
            rawPsbt: psbtBase64,
            finalize: true,
        });
        const { txId } = await provider.pushPsbt({ psbtBase64: signedPsbt });
        dummyTxId = txId;
        await (0, utils_1.timeout)(60000);
        utxos = await (0, helpers_1.updateUtxos)({
            originalUtxos: utxos,
            txId,
            spendAddress: address,
            provider
        });
    }
    const magicEdenGetSellerPsbt = {
        marketplaceType,
        assetType,
        buyerAddress: address,
        orders,
        ticker: offer.ticker,
        buyerPublicKey: pubKey,
        feeRate,
        receivePublicKey,
        receiveAddress
    };
    const sellerPsbtResponse = await provider.api.getSellerPsbt(magicEdenGetSellerPsbt);
    if (sellerPsbtResponse.statusCode != 200) {
        throw new Error(`Failed to get seller psbt: ${sellerPsbtResponse.error}`);
    }
    const sellerPsbt = sellerPsbtResponse.data;
    const { signedPsbt } = await signer.signAllInputs({
        rawPsbt: sellerPsbt.psbt,
        finalize: false,
    });
    const magicEdenSubmitBuyerPsbt = {
        marketplaceType,
        assetType,
        buyerAddress: address,
        orders,
        receiveAddress,
        psbt: signedPsbt,
        ...sellerPsbt.additionalData
    };
    const submitBuyerPsbtResponse = await provider.api.submitBuyerPsbt(magicEdenSubmitBuyerPsbt);
    if (submitBuyerPsbtResponse.statusCode != 200) {
        throw new Error(`Failed to submit buyer psbt: ${submitBuyerPsbtResponse.error}`);
    }
    const submitBuyerPsbt = submitBuyerPsbtResponse.data;
    purchaseTxId = submitBuyerPsbt.txid;
    return {
        dummyTxId,
        purchaseTxId
    };
}
exports.magicEdenSwap = magicEdenSwap;
//# sourceMappingURL=magic-eden.js.map