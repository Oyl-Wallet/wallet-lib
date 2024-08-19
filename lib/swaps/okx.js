"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.okxSwap = exports.buildDummyAndPaymentUtxos = exports.mergeSignedPsbt = exports.genBrcAndOrdinalUnsignedPsbt = exports.genBrcAndOrdinalSignedPsbt = exports.getBuyerPsbt = exports.submitSignedPsbt = exports.getSellerPsbt = exports.dummyUtxosPsbt = exports.prepareAddressForOkxPsbt = void 0;
const utxo_1 = require("../utxo/utxo");
const __1 = require("..");
const coin_bitcoin_1 = require("@okxweb3/coin-bitcoin");
const helpers_1 = require("./helpers");
const interface_1 = require("../shared/interface");
async function prepareAddressForOkxPsbt({ address, provider, pubKey, feeRate, addressType, }) {
    try {
        const { utxos } = await (0, utxo_1.addressSpendableUtxos)({ address, provider });
        const paddingUtxos = (0, helpers_1.getAllUTXOsWorthASpecificValue)(utxos, 600);
        if (paddingUtxos.length < 2) {
            const network = provider.network;
            const { psbtBase64 } = dummyUtxosPsbt({ address, utxos, network, feeRate, pubKey, addressType });
            return psbtBase64;
        }
        return null;
    }
    catch (err) {
        throw new Error('An error occured while preparing address for okx marketplace');
    }
}
exports.prepareAddressForOkxPsbt = prepareAddressForOkxPsbt;
function dummyUtxosPsbt({ address, utxos, feeRate, pubKey, addressType, network }) {
    const amountNeeded = (helpers_1.DUMMY_UTXO_SATS + parseInt((helpers_1.ESTIMATE_TX_SIZE * feeRate).toFixed(0)));
    const retrievedUtxos = (0, helpers_1.getUTXOsToCoverAmount)({
        utxos,
        amountNeeded,
    });
    if (retrievedUtxos.length === 0) {
        throw new Error('No utxos available');
    }
    const txInputs = [];
    const txOutputs = [];
    retrievedUtxos.forEach((utxo) => {
        const input = (0, helpers_1.addInputConditionally)({
            hash: utxo.txId,
            index: utxo.outputIndex,
            witnessUtxo: {
                value: utxo.satoshis,
                script: Buffer.from(utxo.scriptPk, 'hex'),
            },
        }, addressType, pubKey);
        txInputs.push(input);
    });
    const amountRetrieved = (0, helpers_1.calculateAmountGathered)(retrievedUtxos);
    const changeAmount = amountRetrieved - amountNeeded;
    let changeOutput = null;
    txOutputs.push({
        address,
        value: 600,
    });
    txOutputs.push({
        address,
        value: 600,
    });
    if (changeAmount > 0)
        changeOutput = { address, value: changeAmount };
    return (0, helpers_1.buildPsbtWithFee)({
        inputTemplate: txInputs,
        outputTemplate: txOutputs,
        utxos,
        changeOutput,
        retrievedUtxos,
        spendAddress: address,
        spendPubKey: pubKey,
        amountRetrieved,
        spendAmount: helpers_1.DUMMY_UTXO_SATS,
        feeRate,
        network,
        addressType
    });
}
exports.dummyUtxosPsbt = dummyUtxosPsbt;
async function getSellerPsbt(unsignedBid) {
    switch (unsignedBid.assetType) {
        case interface_1.AssetType.BRC20:
            return await unsignedBid.provider.api.getOkxOfferPsbt({ offerId: unsignedBid.offerId });
        case interface_1.AssetType.RUNES:
            return await unsignedBid.provider.api.getOkxOfferPsbt({ offerId: unsignedBid.offerId, rune: true });
        case interface_1.AssetType.COLLECTIBLE:
            return await unsignedBid.provider.api.getOkxOfferPsbt({ offerId: unsignedBid.offerId });
    }
}
exports.getSellerPsbt = getSellerPsbt;
async function submitSignedPsbt(signedBid) {
    const offer = signedBid.offer;
    switch (signedBid.assetType) {
        case interface_1.AssetType.BRC20:
            const brcPayload = {
                ticker: offer.ticker,
                price: offer.totalPrice,
                amount: parseInt(offer.amount),
                fromAddress: signedBid.fromAddress,
                toAddress: offer.address,
                inscriptionId: offer.inscriptionId,
                buyerPsbt: signedBid.psbt,
                orderId: offer.offerId,
                brc20: true
            };
            return await signedBid.provider.api.submitOkxBid(brcPayload);
        case interface_1.AssetType.RUNES:
            const runePayload = {
                fromAddress: signedBid.fromAddress,
                psbt: signedBid.psbt,
                orderId: offer.offerId,
            };
            return await signedBid.provider.api.submitOkxRuneBid(runePayload);
        case interface_1.AssetType.COLLECTIBLE:
            const collectiblePayload = {
                ticker: offer.ticker,
                price: offer.totalPrice,
                amount: parseInt(offer.amount),
                fromAddress: signedBid.fromAddress,
                toAddress: offer.address,
                inscriptionId: offer.inscriptionId,
                buyerPsbt: signedBid.psbt,
                orderId: offer.offerId,
                brc20: false
            };
            return await signedBid.provider.api.submitOkxBid(collectiblePayload);
    }
}
exports.submitSignedPsbt = submitSignedPsbt;
async function getBuyerPsbt(unsignedPsbt) {
    switch (unsignedPsbt.assetType) {
        case interface_1.AssetType.BRC20:
            if (!unsignedPsbt.signer) {
                return genBrcAndOrdinalUnsignedPsbt(unsignedPsbt);
            }
            else {
                return genBrcAndOrdinalSignedPsbt(unsignedPsbt);
            }
        case interface_1.AssetType.RUNES:
            return;
        case interface_1.AssetType.COLLECTIBLE:
            if (!unsignedPsbt.signer) {
                return genBrcAndOrdinalUnsignedPsbt(unsignedPsbt);
            }
            else {
                return genBrcAndOrdinalSignedPsbt(unsignedPsbt);
            }
    }
}
exports.getBuyerPsbt = getBuyerPsbt;
function genBrcAndOrdinalSignedPsbt({ address, utxos, network, addressType, orderPrice, signer, sellerPsbt, feeRate, receiveAddress }) {
    const keyPair = addressType == interface_1.AddressType.P2WPKH
        ? signer.segwitKeyPair
        : signer.taprootKeyPair;
    const privateKey = keyPair.toWIF();
    const data = buildDummyAndPaymentUtxos({ utxos, feeRate, orderPrice, address, receiveAddress, sellerPsbt });
    const buyingData = data;
    const buyerPsbt = (0, coin_bitcoin_1.genSignedBuyingPSBTWithoutListSignature)(buyingData, privateKey, network);
    //base64 format
    return buyerPsbt;
}
exports.genBrcAndOrdinalSignedPsbt = genBrcAndOrdinalSignedPsbt;
function genBrcAndOrdinalUnsignedPsbt({ address, utxos, network, pubKey, orderPrice, sellerPsbt, feeRate, receiveAddress }) {
    const data = buildDummyAndPaymentUtxos({ utxos, feeRate, orderPrice, address, receiveAddress, sellerPsbt });
    const buyingData = data;
    const buyerPsbt = (0, coin_bitcoin_1.generateUnsignedBuyingPsbt)(buyingData, network, pubKey);
    //base64 format
    return buyerPsbt;
}
exports.genBrcAndOrdinalUnsignedPsbt = genBrcAndOrdinalUnsignedPsbt;
function mergeSignedPsbt(signedBuyerPsbt, sellerPsbt) {
    const mergedPsbt = (0, coin_bitcoin_1.mergeSignedBuyingPsbt)(signedBuyerPsbt, sellerPsbt);
    return mergedPsbt.toBase64();
}
exports.mergeSignedPsbt = mergeSignedPsbt;
function buildDummyAndPaymentUtxos({ utxos, feeRate, orderPrice, address, receiveAddress, sellerPsbt }) {
    const allUtxosWorth600 = (0, helpers_1.getAllUTXOsWorthASpecificValue)(utxos, 600);
    if (allUtxosWorth600.length < 2) {
        throw new Error('not enough padding utxos (600 sat) for marketplace buy');
    }
    const dummyUtxos = [];
    for (let i = 0; i < 2; i++) {
        dummyUtxos.push({
            txHash: allUtxosWorth600[i].txId,
            vout: allUtxosWorth600[i].outputIndex,
            coinAmount: allUtxosWorth600[i].satoshis,
        });
    }
    const amountNeeded = orderPrice + parseInt((helpers_1.ESTIMATE_TX_SIZE * feeRate).toFixed(0));
    const retrievedUtxos = (0, helpers_1.getUTXOsToCoverAmount)({
        utxos,
        amountNeeded,
        excludedUtxos: dummyUtxos
    });
    if (retrievedUtxos.length === 0) {
        throw new Error('Not enough funds to purchase this offer');
    }
    const paymentUtxos = [];
    retrievedUtxos.forEach((utxo) => {
        paymentUtxos.push({
            txHash: utxo.txId,
            vout: utxo.outputIndex,
            coinAmount: utxo.satoshis,
        });
    });
    const data = {
        dummyUtxos,
        paymentUtxos,
    };
    data['receiveNftAddress'] = receiveAddress;
    data['paymentAndChangeAddress'] = address;
    data['feeRate'] = feeRate;
    data['sellerPsbts'] = [sellerPsbt];
    return data;
}
exports.buildDummyAndPaymentUtxos = buildDummyAndPaymentUtxos;
async function okxSwap({ address, offer, receiveAddress, feeRate, pubKey, assetType, provider, signer }) {
    const addressType = (0, __1.getAddressType)(address);
    const psbtForDummyUtxos = await prepareAddressForOkxPsbt({ address, provider, pubKey, feeRate, addressType });
    if (psbtForDummyUtxos != null) {
        const { signedPsbt } = await signer.signAllInputs({
            rawPsbt: psbtForDummyUtxos,
            finalize: true,
        });
        const { txId } = await provider.pushPsbt({ psbtBase64: signedPsbt });
        console.log("preptxid", txId);
    }
    const unsignedBid = {
        offerId: offer.offerId,
        provider,
        assetType
    };
    const sellerData = await getSellerPsbt(unsignedBid);
    const sellerPsbt = sellerData.data.sellerPsbt;
    const network = provider.network;
    const { utxos } = await (0, utxo_1.addressSpendableUtxos)({ address, provider });
    const buyerPsbt = await getBuyerPsbt({
        address,
        utxos,
        feeRate,
        receiveAddress,
        network,
        pubKey,
        addressType,
        sellerPsbt,
        orderPrice: offer.totalPrice,
        assetType
    });
    const { signedPsbt } = await signer.signAllInputs({
        rawPsbt: buyerPsbt,
        finalize: false
    });
    const mergedPsbt = mergeSignedPsbt(signedPsbt, [sellerPsbt]);
    const transaction = await submitSignedPsbt({
        fromAddress: address,
        psbt: mergedPsbt,
        assetType,
        provider,
        offer
    });
    if (transaction.statusCode == 200)
        return transaction.data;
}
exports.okxSwap = okxSwap;
//# sourceMappingURL=okx.js.map