"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.magisatSwap = void 0;
const interface_1 = require("../../shared/interface");
const utils_1 = require("../../shared/utils");
const helpers_1 = require("../helpers");
const types_1 = require("../types");
async function magisatSwap({ address, offer, receiveAddress, feeRate, pubKey, assetType, provider, utxos, signer }) {
    let dummyTxId = null;
    let purchaseTxId = null;
    const addressType = (0, utils_1.getAddressType)(address);
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
                inscriptionId: offer.inscriptionId[i],
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
            inscriptionId: offer.inscriptionId,
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
    const magisatGetSellerPsbt = {
        marketplaceType: types_1.Marketplaces.MAGISAT,
        assetType,
        buyerAddress: address,
        orders,
        buyerPublicKey: pubKey,
        feeRate,
        receiveAddress
    };
    const sellerPsbtResponse = await provider.api.getSellerPsbt(magisatGetSellerPsbt);
    if (sellerPsbtResponse.statusCode != 200) {
        throw new Error(`Failed to get seller psbt: ${sellerPsbtResponse.error}`);
    }
    const sellerPsbt = sellerPsbtResponse.data;
    const { signedPsbt } = await signer.signAllInputs({
        rawPsbtHex: sellerPsbt.psbt,
        finalize: true,
    });
    const magisatSubmitBuyerPsbt = {
        marketplaceType: types_1.Marketplaces.MAGISAT,
        assetType,
        buyerAddress: address,
        orders,
        buyerPublicKey: pubKey,
        receiveAddress,
        psbt: signedPsbt
    };
    const submitBuyerPsbtResponse = await provider.api.submitBuyerPsbt(magisatSubmitBuyerPsbt);
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
exports.magisatSwap = magisatSwap;
//# sourceMappingURL=magisat.js.map