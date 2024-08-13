"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMessageSignature = exports.unisatSwap = exports.submitPsbt = exports.getPsbt = void 0;
const interface_1 = require("../shared/interface");
const __1 = require("..");
const BIP322_1 = require("./BIP322");
async function getPsbt(unsignedBid) {
    switch (unsignedBid.assetType) {
        case interface_1.AssetType.BRC20:
            return await unsignedBid.provider.api.initSwapBid(unsignedBid);
        case interface_1.AssetType.RUNES:
            return await unsignedBid.provider.api.initRuneSwapBid(unsignedBid);
        case interface_1.AssetType.COLLECTIBLE:
            return await unsignedBid.provider.api.initCollectionSwapBid(unsignedBid);
    }
}
exports.getPsbt = getPsbt;
async function submitPsbt(signedBid) {
    switch (signedBid.assetType) {
        case interface_1.AssetType.BRC20:
            return await signedBid.provider.api.submitSignedBid({ ...signedBid, psbtBid: signedBid.psbtHex });
        case interface_1.AssetType.RUNES:
            return await signedBid.provider.api.submitSignedRuneBid({ ...signedBid, psbtBid: signedBid.psbtHex });
        case interface_1.AssetType.COLLECTIBLE:
            return await signedBid.provider.api.submitSignedCollectionBid({ ...signedBid, psbtBid: signedBid.psbtHex });
    }
}
exports.submitPsbt = submitPsbt;
async function unisatSwap({ address, offer, receiveAddress, feerate, pubKey, assetType, provider, signer }) {
    const unsignedBid = {
        address,
        auctionId: offer.offerId,
        bidPrice: offer.totalPrice,
        pubKey,
        receiveAddress,
        feerate,
        provider,
        assetType
    };
    if (address != receiveAddress) {
        const signature = await getMessageSignature({ address, receiveAddress, signer });
        unsignedBid['signature'] = signature;
    }
    const psbt_ = await getPsbt(unsignedBid);
    console.log(psbt_);
    if (!psbt_?.error) {
        const unsignedPsbt = psbt_.psbtBid;
        const signedPsbt = await signer.signAllInputs({
            rawPsbtHex: unsignedPsbt,
            finalize: false,
        });
        const data = await submitPsbt({
            psbtHex: signedPsbt.signedHexPsbt,
            auctionId: offer.offerId,
            bidId: psbt_.bidId,
            assetType,
            provider
        });
        if (data.txid)
            return data.txid;
    }
}
exports.unisatSwap = unisatSwap;
async function getMessageSignature({ address, receiveAddress, signer, }) {
    const message = `Please confirm that\nPayment Address: ${address}\nOrdinals Address: ${receiveAddress}`;
    if ((0, __1.getAddressType)(receiveAddress) == interface_1.AddressType.P2WPKH) {
        const keyPair = signer.segwitKeyPair;
        const privateKey = keyPair.privateKey;
        const signature = await (0, BIP322_1.signBip322Message)({
            message,
            network: 'mainnet',
            privateKey,
            signatureAddress: receiveAddress,
        });
        return signature;
    }
    else if ((0, __1.getAddressType)(receiveAddress) == interface_1.AddressType.P2TR) {
        const keyPair = signer.taprootKeyPair;
        const privateKey = keyPair.privateKey;
        const signature = await (0, BIP322_1.signBip322Message)({
            message,
            network: 'mainnet',
            privateKey,
            signatureAddress: receiveAddress,
        });
        return signature;
    }
}
exports.getMessageSignature = getMessageSignature;
//# sourceMappingURL=unisat.js.map