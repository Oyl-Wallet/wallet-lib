"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ordinalWalletSwap = exports.submitPsbt = exports.getSellerPsbt = void 0;
const tslib_1 = require("tslib");
const interface_1 = require("../../shared/interface");
const __1 = require("../..");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
async function getSellerPsbt(unsignedBid) {
    const { assetType, address, publicKey, feeRate, provider, inscriptions, outpoints, receiveAddress, } = unsignedBid;
    switch (assetType) {
        case interface_1.AssetType.BRC20:
            return await provider.api.getOrdinalsWalletNftOfferPsbt({
                address,
                publicKey,
                feeRate,
                inscriptions,
                receiveAddress,
            });
        case interface_1.AssetType.RUNES:
            return await provider.api.getOrdinalsWalletRuneOfferPsbt({
                address,
                publicKey,
                feeRate,
                outpoints,
                receiveAddress,
            });
        case interface_1.AssetType.COLLECTIBLE:
            return await provider.api.getOrdinalsWalletNftOfferPsbt({
                address,
                publicKey,
                feeRate,
                inscriptions,
                receiveAddress,
            });
    }
}
exports.getSellerPsbt = getSellerPsbt;
async function submitPsbt(signedBid) {
    const { assetType, psbt, provider, setupPsbt } = signedBid;
    switch (assetType) {
        case interface_1.AssetType.BRC20:
            return await provider.api.submitOrdinalsWalletBid({ psbt, setupPsbt });
        case interface_1.AssetType.RUNES:
            return await provider.api.submitOrdinalsWalletRuneBid({ psbt, setupPsbt });
        case interface_1.AssetType.COLLECTIBLE:
            return await provider.api.submitOrdinalsWalletBid({ psbt, setupPsbt });
    }
}
exports.submitPsbt = submitPsbt;
async function ordinalWalletSwap({ address, offer, receiveAddress, feeRate, pubKey, assetType, provider, utxos, signer, }) {
    let dummyTxId = null;
    let purchaseTxId = null;
    let setupTx = null;
    const unsignedBid = {
        address,
        publicKey: pubKey,
        feeRate,
        provider,
        receiveAddress,
        assetType,
    };
    if (assetType === interface_1.AssetType.RUNES) {
        unsignedBid['outpoints'] = Array.isArray(offer.outpoint)
            ? offer.outpoint
            : [offer.outpoint];
    }
    else {
        unsignedBid['inscriptions'] = Array.isArray(offer.inscriptionId)
            ? offer.inscriptionId
            : [offer.inscriptionId];
    }
    const sellerData = await getSellerPsbt(unsignedBid);
    if (sellerData.data.setup) {
        const dummyPsbt = sellerData.data.setup;
        const signedDummyPsbt = await signer.signAllInputs({
            rawPsbtHex: dummyPsbt,
            finalize: true,
        });
        const extractedDummyTx = bitcoin.Psbt.fromHex(signedDummyPsbt.signedHexPsbt).extractTransaction();
        setupTx = extractedDummyTx.toHex();
    }
    const sellerPsbt = sellerData.data.purchase;
    const signedPsbt = await signer.signAllInputs({
        rawPsbtHex: sellerPsbt,
        finalize: true,
    });
    const finalizeResponse = await submitPsbt({
        psbt: signedPsbt.signedHexPsbt,
        setupPsbt: setupTx,
        assetType,
        provider,
    });
    const data = finalizeResponse.data;
    if (data.success) {
        purchaseTxId = data.purchase;
        if (setupTx)
            await (0, __1.timeout)(5000);
    }
    return {
        dummyTxId,
        purchaseTxId,
    };
}
exports.ordinalWalletSwap = ordinalWalletSwap;
//# sourceMappingURL=ordinals-wallet.js.map