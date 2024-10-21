"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPsbtWithFee = exports.estimatePsbtFee = exports.psbtTxAddressTypes = exports.batchMarketplaceOffer = exports.outputTxCheck = exports.updateUtxos = exports.dummyUtxosPsbt = exports.prepareAddressForDummyUtxos = exports.sanitizeFeeRate = exports.selectSpendAddress = exports.calculateAmountGathered = exports.canAddressAffordBid = exports.getBidCostEstimate = exports.addInputConditionally = exports.getAllUTXOsWorthASpecificValue = exports.isExcludedUtxo = exports.getUTXOsToCoverAmount = exports.DUMMY_UTXO_SATS = exports.ESTIMATE_TX_SIZE = exports.DUMMY_UTXO_ENFORCED_MARKETPLACES = exports.CONFIRMED_UTXO_ENFORCED_MARKETPLACES = exports.maxTxSizeForOffers = void 0;
const tslib_1 = require("tslib");
const types_1 = require("./types");
const interface_1 = require("../shared/interface");
const utils_1 = require("../shared/utils");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
const __1 = require("..");
exports.maxTxSizeForOffers = 482;
exports.CONFIRMED_UTXO_ENFORCED_MARKETPLACES = [
    types_1.Marketplaces.UNISAT,
    types_1.Marketplaces.ORDINALS_WALLET,
];
exports.DUMMY_UTXO_ENFORCED_MARKETPLACES = [
    types_1.Marketplaces.OKX,
    types_1.Marketplaces.ORDINALS_WALLET,
    types_1.Marketplaces.MAGISAT,
    types_1.Marketplaces.MAGIC_EDEN,
];
exports.ESTIMATE_TX_SIZE = 350;
exports.DUMMY_UTXO_SATS = 600 + 600;
function checkPaymentType(payment, network) {
    return (script) => {
        try {
            return payment({ output: script, network: network });
        }
        catch (error) {
            return false;
        }
    };
}
const nativeSegwitFormat = (script, network) => {
    const p2wpkh = checkPaymentType(bitcoin.payments.p2wpkh, network)(script);
    return {
        data: p2wpkh,
    };
};
const nestedSegwitFormat = (script, network) => {
    const p2sh = checkPaymentType(bitcoin.payments.p2sh, network)(script);
    return {
        data: p2sh,
    };
};
const taprootFormat = (script, network) => {
    const p2tr = checkPaymentType(bitcoin.payments.p2tr, network)(script);
    return {
        data: p2tr,
    };
};
function getOutputFormat(script, network) {
    const p2sh = nestedSegwitFormat(script, network);
    if (p2sh.data) {
        return interface_1.AddressType.P2SH_P2WPKH;
    }
    const p2wpkh = nativeSegwitFormat(script, network);
    if (p2wpkh.data) {
        return interface_1.AddressType.P2WPKH;
    }
    const p2tr = taprootFormat(script, network);
    if (p2tr.data) {
        return interface_1.AddressType.P2TR;
    }
}
function getTxSizeByAddressType(addressType) {
    switch (addressType) {
        case interface_1.AddressType.P2TR:
            return { input: 42, output: 43, txHeader: 10.5, witness: 66 };
        case interface_1.AddressType.P2WPKH:
            return { input: 42, output: 43, txHeader: 10.5, witness: 112.5 };
        case interface_1.AddressType.P2SH_P2WPKH:
            return { input: 64, output: 32, txHeader: 10, witness: 105 };
        default:
            throw new Error('Invalid address type');
    }
}
function getUTXOsToCoverAmount({ utxos, amountNeeded, excludedUtxos = [], insistConfirmedUtxos = false, }) {
    try {
        let sum = 0;
        const result = [];
        for (let utxo of utxos) {
            if (isExcludedUtxo(utxo, excludedUtxos)) {
                // Check if the UTXO should be excluded
                continue;
            }
            if (insistConfirmedUtxos && utxo.confirmations == 0) {
                continue;
            }
            const currentUTXO = utxo;
            sum += currentUTXO.satoshis;
            result.push(currentUTXO);
            if (sum > amountNeeded) {
                return result;
            }
        }
        return [];
    }
    catch (err) {
        throw new Error(err);
    }
}
exports.getUTXOsToCoverAmount = getUTXOsToCoverAmount;
function isExcludedUtxo(utxo, excludedUtxos) {
    return excludedUtxos?.some((excluded) => excluded?.txId === utxo?.txId &&
        excluded?.outputIndex === utxo?.outputIndex);
}
exports.isExcludedUtxo = isExcludedUtxo;
function getAllUTXOsWorthASpecificValue(utxos, value) {
    return utxos.filter((utxo) => utxo?.satoshis === value);
}
exports.getAllUTXOsWorthASpecificValue = getAllUTXOsWorthASpecificValue;
function addInputConditionally(inputData, addressType, pubKey) {
    if (addressType === interface_1.AddressType.P2TR) {
        inputData['tapInternalKey'] = (0, utils_1.assertHex)(Buffer.from(pubKey, 'hex'));
    }
    return inputData;
}
exports.addInputConditionally = addInputConditionally;
function getBidCostEstimate(offers, feeRate) {
    let costEstimate = 0;
    for (let i = 0; i < offers?.length; i++) {
        let offerPrice = offers[i]?.price ? offers[i].price : offers[i]?.totalPrice;
        costEstimate +=
            offerPrice + parseInt((exports.maxTxSizeForOffers * feeRate).toFixed(0));
    }
    const totalCost = costEstimate;
    return totalCost;
}
exports.getBidCostEstimate = getBidCostEstimate;
/**
 *
 * ONLY INSIST retrieving confirmed utxos IF ALL the offers are from CONFIRMED_UTXO_ENFORCED_MARKETPLACES
 * Otherwise if there is AT LEAST ONE offer from a marketplace that does not enforce confirmed
 * utxos, DONT INSIST retrieving confirmed utxos.
 *  */
async function canAddressAffordBid({ estimatedCost, offers, utxos }) {
    let insistConfirmedUtxos = true;
    for (let i = 0; i < offers.length; i++) {
        const mktPlace = types_1.marketplaceName[offers[i]?.marketplace];
        if (!exports.CONFIRMED_UTXO_ENFORCED_MARKETPLACES.includes(mktPlace)) {
            insistConfirmedUtxos = false;
            break;
        }
    }
    const excludedUtxos = getAllUTXOsWorthASpecificValue(utxos, 600).slice(0, 2);
    const retrievedUtxos = getUTXOsToCoverAmount({
        utxos,
        amountNeeded: estimatedCost,
        excludedUtxos,
        insistConfirmedUtxos,
    });
    retrievedUtxos.push(...excludedUtxos);
    return {
        offers_: offers,
        estimatedCost,
        retrievedUtxos,
        canAfford: retrievedUtxos.length > 0,
    };
}
exports.canAddressAffordBid = canAddressAffordBid;
function calculateAmountGathered(utxoArray) {
    return utxoArray?.reduce((prev, currentValue) => prev + currentValue.satoshis, 0);
}
exports.calculateAmountGathered = calculateAmountGathered;
async function selectSpendAddress({ offers, provider, feeRate, account, utxos }) {
    feeRate = await sanitizeFeeRate(provider, feeRate);
    const estimatedCost = getBidCostEstimate(offers, feeRate);
    for (let i = 0; i < account.spendStrategy.addressOrder.length; i++) {
        if (account.spendStrategy.addressOrder[i] === 'taproot' ||
            account.spendStrategy.addressOrder[i] === 'nativeSegwit') {
            const address = account[account.spendStrategy.addressOrder[i]].address;
            let pubkey = account[account.spendStrategy.addressOrder[i]].pubkey;
            const addrUtxos = utxos.filter((utxo) => utxo.address === address);
            const afford = await canAddressAffordBid({
                estimatedCost,
                offers,
                utxos: addrUtxos,
            });
            const { retrievedUtxos, canAfford, offers_ } = afford;
            if (canAfford) {
                const selectedSpendAddress = address;
                const selectedSpendPubkey = pubkey;
                const addressType = (0, __1.getAddressType)(selectedSpendAddress);
                return {
                    address: selectedSpendAddress,
                    pubKey: selectedSpendPubkey,
                    addressType,
                    utxos: retrievedUtxos,
                    offers: offers_,
                };
            }
        }
        if (i === account.spendStrategy.addressOrder.length - 1) {
            throw new Error('Not enough (confirmed) satoshis available to buy marketplace offers, need  ' +
                estimatedCost +
                ' sats');
        }
        if (i === account.spendStrategy.addressOrder.length - 1) {
            throw new Error('Not enough (confirmed) satoshis available to buy marketplace offers, need  ' +
                estimatedCost +
                ' sats');
        }
    }
}
exports.selectSpendAddress = selectSpendAddress;
async function sanitizeFeeRate(provider, feeRate) {
    if (feeRate < 0 || !Number.isSafeInteger(feeRate)) {
        return (await provider.esplora.getFeeEstimates())['1'];
    }
    return feeRate;
}
exports.sanitizeFeeRate = sanitizeFeeRate;
async function prepareAddressForDummyUtxos({ address, network, pubKey, feeRate, addressType, nUtxos = 2, utxos = [], }) {
    try {
        const paddingUtxos = getAllUTXOsWorthASpecificValue(utxos, 600);
        if (paddingUtxos.length < nUtxos) {
            return dummyUtxosPsbt({
                address,
                utxos,
                network,
                feeRate,
                pubKey,
                addressType,
                nUtxos: nUtxos - paddingUtxos.length,
            });
        }
        return null;
    }
    catch (err) {
        throw new Error(`An error occured while preparing address for dummy utxos ${err.message}`);
    }
}
exports.prepareAddressForDummyUtxos = prepareAddressForDummyUtxos;
function dummyUtxosPsbt({ address, utxos, feeRate, pubKey, addressType, network, nUtxos = 2, }) {
    const txInputs = [];
    const txOutputs = [];
    const amountNeeded = exports.DUMMY_UTXO_SATS + parseInt((exports.ESTIMATE_TX_SIZE * feeRate).toFixed(0));
    const retrievedUtxos = getUTXOsToCoverAmount({
        utxos,
        amountNeeded,
    });
    if (retrievedUtxos.length === 0) {
        throw new Error('No utxos available');
    }
    retrievedUtxos.forEach((utxo) => {
        const input = addInputConditionally({
            hash: utxo.txId,
            index: utxo.outputIndex,
            witnessUtxo: {
                value: utxo.satoshis,
                script: Buffer.from(utxo.scriptPk, 'hex'),
            },
        }, addressType, pubKey);
        txInputs.push(input);
    });
    const amountRetrieved = calculateAmountGathered(retrievedUtxos);
    const changeAmount = amountRetrieved - amountNeeded;
    let changeOutput = null;
    for (let i = 0; i < nUtxos; i++) {
        txOutputs.push({
            address,
            value: 600,
        });
    }
    if (changeAmount > 0)
        changeOutput = { address, value: changeAmount };
    return buildPsbtWithFee({
        inputTemplate: txInputs,
        outputTemplate: txOutputs,
        utxos,
        changeOutput,
        retrievedUtxos,
        spendAddress: address,
        spendPubKey: pubKey,
        amountRetrieved,
        spendAmount: exports.DUMMY_UTXO_SATS,
        feeRate,
        network,
        addressType,
    });
}
exports.dummyUtxosPsbt = dummyUtxosPsbt;
async function updateUtxos({ originalUtxos, txId, spendAddress, provider, }) {
    const txInfo = await provider.esplora.getTxInfo(txId);
    const spentInputs = txInfo.vin.map((input) => ({
        txId: input.txid,
        outputIndex: input.vout,
    }));
    const updatedUtxos = originalUtxos.filter((utxo) => !spentInputs.some((input) => input.txId === utxo.txId && input.outputIndex === utxo.outputIndex));
    // Add new UTXOs
    txInfo.vout.forEach((output, index) => {
        if (output.scriptpubkey_address === spendAddress &&
            output.value > __1.UTXO_DUST) {
            const newUtxo = {
                txId: txId,
                outputIndex: index,
                satoshis: output.value,
                scriptPk: output.scriptpubkey,
                address: output.scriptpubkey_address,
                inscriptions: [],
                confirmations: txInfo.status.confirmed ? 1 : 0,
            };
            updatedUtxos.push(newUtxo);
        }
    });
    return updatedUtxos;
}
exports.updateUtxos = updateUtxos;
function outputTxCheck({ blueprint, swapTx, output, index, }) {
    const matchAddress = blueprint.address == output.address;
    const dustAmount = output.value > __1.UTXO_DUST;
    const nonInscriptionUtxo = !(swapTx == true && index == 1);
    if (matchAddress && dustAmount && nonInscriptionUtxo) {
        return true;
    }
    else {
        return false;
    }
}
exports.outputTxCheck = outputTxCheck;
function batchMarketplaceOffer(offers) {
    const groupedOffers = {};
    // Group offers by marketplace
    offers.forEach((offer) => {
        if (!groupedOffers[offer.marketplace]) {
            groupedOffers[offer.marketplace] = [];
        }
        groupedOffers[offer.marketplace].push(offer);
    });
    return Object.entries(groupedOffers).flatMap(([marketplace, marketplaceOffers]) => {
        if (marketplace === 'unisat' ||
            marketplace === 'ordinals-wallet' ||
            marketplace === 'magisat' ||
            marketplace === 'magic-eden') {
            const batchOffer = {
                ticker: marketplaceOffers[0].ticker,
                offerId: [],
                marketplace,
                price: [],
                unitPrice: [],
                totalPrice: [],
                amount: [],
                address: [],
                inscriptionId: [],
                outpoint: [],
            };
            marketplaceOffers.forEach((offer) => {
                batchOffer.offerId.push(offer.offerId);
                batchOffer.price?.push(offer.price || 0);
                batchOffer.unitPrice?.push(offer.unitPrice || 0);
                batchOffer.totalPrice?.push(offer.totalPrice || 0);
                if (marketplace === 'unisat' || marketplace === 'magisat' || marketplace === 'magic-eden') {
                    batchOffer.amount?.push(offer.amount || '');
                    batchOffer.address?.push(offer.address || '');
                }
                else if (marketplace === 'ordinals-wallet') {
                    batchOffer.inscriptionId?.push(offer.inscriptionId || '');
                    batchOffer.outpoint?.push(offer.outpoint || '');
                }
            });
            return [batchOffer];
        }
        else {
            return marketplaceOffers;
        }
    });
}
exports.batchMarketplaceOffer = batchMarketplaceOffer;
function psbtTxAddressTypes({ psbt, network, }) {
    const psbtInputs = psbt.data.inputs;
    const psbtOutputs = psbt.txOutputs;
    const inputAddressTypes = [];
    const outputAddressTypes = [];
    if (psbtInputs.length === 0 || psbtOutputs.length === 0) {
        throw new Error('PSBT requires at least one input & one output ');
    }
    psbtInputs.forEach((input) => {
        const witnessScript = input.witnessUtxo && input.witnessUtxo.script
            ? input.witnessUtxo.script
            : null;
        if (!witnessScript) {
            throw new Error('Invalid script');
        }
        inputAddressTypes.push(getOutputFormat(witnessScript, network));
    });
    psbtOutputs.forEach((output) => {
        outputAddressTypes.push(getOutputFormat(output.script, network));
    });
    return {
        inputAddressTypes,
        outputAddressTypes,
    };
}
exports.psbtTxAddressTypes = psbtTxAddressTypes;
function estimatePsbtFee({ txAddressTypes, witness = [], }) {
    const { inputAddressTypes, outputAddressTypes } = txAddressTypes;
    const witnessHeaderSize = 2;
    const inputVB = inputAddressTypes.reduce((j, inputType) => {
        const { input, txHeader, witness } = getTxSizeByAddressType(inputType);
        j.txHeader = txHeader;
        j.input += input;
        j.witness += witness;
        return j;
    }, {
        input: 0,
        witness: 0,
        txHeader: 0,
    });
    const outputVB = outputAddressTypes.reduce((k, outputType) => {
        const { output } = getTxSizeByAddressType(outputType);
        k += output;
        return k;
    }, 0);
    let witnessByteLength = 0;
    if (inputAddressTypes.includes(interface_1.AddressType.P2TR) && witness?.length) {
        witnessByteLength = witness.reduce((u, witness) => (u += witness.byteLength), 0);
    }
    const witnessSize = inputVB.witness + (witness?.length ? witnessByteLength : 0);
    const baseTotal = inputVB.input + inputVB.txHeader + outputVB;
    let witnessTotal = 0;
    if (witness?.length) {
        witnessTotal = witnessSize;
    }
    else if (witnessSize > 0) {
        witnessTotal = witnessHeaderSize + witnessSize;
    }
    const sum = baseTotal + witnessTotal;
    const weight = baseTotal * 3 + sum;
    return Math.ceil(weight / 4);
}
exports.estimatePsbtFee = estimatePsbtFee;
function buildPsbtWithFee({ inputTemplate = [], outputTemplate = [], utxos, changeOutput, retrievedUtxos = [], spendAddress, spendPubKey, amountRetrieved, spendAmount, addressType, feeRate, network, }) {
    if (inputTemplate.length === 0 || outputTemplate.length === 0) {
        throw new Error('Cant create a psbt with 0 inputs & outputs');
    }
    const inputAddressTypes = [];
    const outputAddressTypes = [];
    inputTemplate.forEach((input) => inputAddressTypes.push(getOutputFormat(input.witnessUtxo.script, network)));
    outputTemplate.forEach((output) => outputAddressTypes.push((0, __1.getAddressType)(output.address)));
    if (changeOutput != null)
        outputAddressTypes.push((0, __1.getAddressType)(changeOutput.address));
    const txAddressTypes = { inputAddressTypes, outputAddressTypes };
    const finalTxSize = estimatePsbtFee({ txAddressTypes });
    const finalFee = parseInt((finalTxSize * feeRate).toFixed(0));
    let newAmountNeeded = spendAmount + finalFee;
    let changeAmount = amountRetrieved - newAmountNeeded;
    if (changeAmount < 0) {
        const additionalUtxos = getUTXOsToCoverAmount({
            utxos,
            amountNeeded: newAmountNeeded,
            excludedUtxos: retrievedUtxos,
        });
        if (additionalUtxos.length > 0) {
            // Merge new UTXOs with existing ones and create new templates for recursion
            retrievedUtxos = retrievedUtxos.concat(additionalUtxos);
            additionalUtxos.forEach((utxo) => {
                const input = addInputConditionally({
                    hash: utxo.txId,
                    index: utxo.outputIndex,
                    witnessUtxo: {
                        value: utxo.satoshis,
                        script: Buffer.from(utxo.scriptPk, 'hex'),
                    },
                }, addressType, spendPubKey);
                inputTemplate.push(input);
            });
            amountRetrieved = calculateAmountGathered(retrievedUtxos);
            changeAmount = amountRetrieved - newAmountNeeded;
            if (changeAmount > 0)
                changeOutput = { address: spendAddress, value: changeAmount };
            return buildPsbtWithFee({
                spendAddress,
                utxos,
                spendAmount,
                feeRate,
                spendPubKey,
                amountRetrieved,
                addressType,
                network,
                changeOutput,
                retrievedUtxos,
                inputTemplate,
                outputTemplate,
            });
        }
        else {
            throw new Error('Insufficient funds: cannot cover transaction fee with available UTXOs');
        }
    }
    else {
        if (changeAmount > 0)
            outputTemplate.push({ address: spendAddress, value: changeAmount });
        const finalPsbtTx = new bitcoin.Psbt({ network });
        inputTemplate.forEach((input) => finalPsbtTx.addInput(input));
        outputTemplate.forEach((output) => finalPsbtTx.addOutput(output));
        return {
            psbtHex: finalPsbtTx.toHex(),
            psbtBase64: finalPsbtTx.toBase64(),
            inputTemplate,
            outputTemplate,
        };
    }
}
exports.buildPsbtWithFee = buildPsbtWithFee;
//# sourceMappingURL=helpers.js.map