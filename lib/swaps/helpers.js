"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPsbtWithFee = exports.estimatePsbtFee = exports.psbtTxAddressTypes = exports.sanitizeFeeRate = exports.broadcastSignedTx = exports.calculateAmountGathered = exports.canAddressAffordBid = exports.getBidCostEstimate = exports.addInputConditionally = exports.getAllUTXOsWorthASpecificValue = exports.isExcludedUtxo = exports.getUTXOsToCoverAmount = exports.DUMMY_UTXO_SATS = exports.ESTIMATE_TX_SIZE = exports.CONFIRMED_UTXO_ENFORCED_MARKETPLACES = exports.maxTxSizeForOffers = void 0;
const tslib_1 = require("tslib");
const utxo_1 = require("../utxo/utxo");
const interface_1 = require("../shared/interface");
const utils_1 = require("../shared/utils");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
exports.maxTxSizeForOffers = 482;
exports.CONFIRMED_UTXO_ENFORCED_MARKETPLACES = [interface_1.Marketplaces.UNISAT];
exports.ESTIMATE_TX_SIZE = 350;
exports.DUMMY_UTXO_SATS = 600 + 600;
function getUTXOsToCoverAmount({ utxos, amountNeeded, excludedUtxos = [], insistConfirmedUtxos = false }) {
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
    return excludedUtxos?.some((excluded) => excluded?.txId === utxo?.txId && excluded?.outputIndex === utxo?.outputIndex);
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
        let offerPrice = offers[i]?.price
            ? offers[i].price
            : offers[i]?.totalPrice;
        costEstimate += (offerPrice + parseInt((exports.maxTxSizeForOffers * feeRate).toFixed(0)));
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
async function canAddressAffordBid({ address, estimatedCost, offers, provider }) {
    let insistConfirmedUtxos = true;
    const { utxos } = await (0, utxo_1.addressSpendableUtxos)({ address, provider });
    for (let i = 0; i < offers.length; i++) {
        const mktPlace = interface_1.marketplaceName[offers[i]?.marketplace];
        if (!(exports.CONFIRMED_UTXO_ENFORCED_MARKETPLACES.includes(mktPlace))) {
            insistConfirmedUtxos = false;
            break;
        }
    }
    const excludedUtxos = getAllUTXOsWorthASpecificValue(utxos, 600).slice(0, 2);
    const retrievedUtxos = getUTXOsToCoverAmount({
        utxos,
        amountNeeded: estimatedCost,
        excludedUtxos,
        insistConfirmedUtxos
    });
    return retrievedUtxos.length > 0;
}
exports.canAddressAffordBid = canAddressAffordBid;
function calculateAmountGathered(utxoArray) {
    return utxoArray?.reduce((prev, currentValue) => prev + currentValue.satoshis, 0);
}
exports.calculateAmountGathered = calculateAmountGathered;
async function broadcastSignedTx(psbt, provider) {
    const result = await provider.sandshrew.bitcoindRpc.finalizePSBT(psbt);
    const [broadcast] = await provider.sandshrew.bitcoindRpc.testMemPoolAccept([
        result?.hex,
    ]);
    if (!broadcast.allowed) {
        throw new Error(result['reject-reason']);
    }
    await provider.sandshrew.bitcoindRpc.sendRawTransaction(result?.hex);
    const txPayload = await provider.sandshrew.bitcoindRpc.decodeRawTransaction(result?.hex);
    const txId = txPayload.txid;
    return [txId];
}
exports.broadcastSignedTx = broadcastSignedTx;
async function sanitizeFeeRate(provider, feeRate) {
    if (feeRate < 0 || !Number.isSafeInteger(feeRate)) {
        return (await provider.esplora.getFeeEstimates())['1'];
    }
    return feeRate;
}
exports.sanitizeFeeRate = sanitizeFeeRate;
function psbtTxAddressTypes({ psbt, network }) {
    const psbtInputs = psbt.data.inputs;
    const psbtOutputs = psbt.txOutputs;
    const inputAddressTypes = [];
    const outputAddressTypes = [];
    if (psbtInputs.length === 0 || psbtOutputs.length === 0) {
        throw new Error("PSBT requires at least one input & one output ");
    }
    psbtInputs.forEach((input) => {
        const witnessScript = input.witnessUtxo && input.witnessUtxo.script ? input.witnessUtxo.script : null;
        if (!witnessScript) {
            throw new Error("Invalid script");
        }
        inputAddressTypes.push((0, utils_1.getOutputFormat)(witnessScript, network));
    });
    psbtOutputs.forEach((output) => {
        outputAddressTypes.push((0, utils_1.getOutputFormat)(output.script, network));
    });
    return {
        inputAddressTypes,
        outputAddressTypes
    };
}
exports.psbtTxAddressTypes = psbtTxAddressTypes;
function estimatePsbtFee({ psbt, network, witness = [] }) {
    const { inputAddressTypes, outputAddressTypes } = psbtTxAddressTypes({ psbt, network });
    const witnessHeaderSize = 2;
    const inputVB = inputAddressTypes.reduce((j, inputType) => {
        const { input, txHeader, witness } = (0, utils_1.getTxSizeByAddressType)(inputType);
        j.txHeader = txHeader;
        j.input += input;
        j.witness += witness;
        return j;
    }, {
        input: 0,
        witness: 0,
        txHeader: 0
    });
    const outputVB = outputAddressTypes.reduce((k, outputType) => {
        const { output } = (0, utils_1.getTxSizeByAddressType)(outputType);
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
    const weight = (baseTotal * 3) + sum;
    return Math.ceil(weight / 4);
}
exports.estimatePsbtFee = estimatePsbtFee;
function buildPsbtWithFee({ inputTemplate = [], outputTemplate = [], utxos, changeOutput, retrievedUtxos = [], spendAddress, spendPubKey, amountRetrieved, spendAmount, addressType, feeRate, network }) {
    const psbtTx = new bitcoin.Psbt({ network });
    if (inputTemplate.length === 0 || outputTemplate.length === 0) {
        throw new Error('Cant create a psbt with 0 inputs & outputs');
    }
    inputTemplate.forEach(input => psbtTx.addInput(input));
    outputTemplate.forEach(output => psbtTx.addOutput(output));
    if (changeOutput != null)
        psbtTx.addOutput(changeOutput);
    const finalTxSize = estimatePsbtFee({ psbt: psbtTx, network });
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
                outputTemplate
            });
        }
        else {
            throw new Error('Insufficient funds: cannot cover transaction fee with available UTXOs');
        }
    }
    else {
        if (changeAmount > 0)
            changeOutput = { address: spendAddress, value: changeAmount };
        const finalPsbtTx = new bitcoin.Psbt({ network });
        inputTemplate.forEach(input => finalPsbtTx.addInput(input));
        outputTemplate.forEach(output => finalPsbtTx.addOutput(output));
        if (changeOutput != null)
            finalPsbtTx.addOutput(changeOutput);
        return {
            psbtHex: finalPsbtTx.toHex(),
            psbtBase64: finalPsbtTx.toBase64()
        };
    }
}
exports.buildPsbtWithFee = buildPsbtWithFee;
//# sourceMappingURL=helpers.js.map