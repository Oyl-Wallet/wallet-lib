"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canAddressAffordBid = exports.getBidCostEstimate = exports.addInputConditionally = exports.getAllUTXOsWorthASpecificValue = exports.isExcludedUtxo = exports.getUTXOsToCoverAmount = exports.CONFIRMED_UTXO_ENFORCED_MARKETPLACES = exports.maxTxSizeForOffers = void 0;
const utxo_1 = require("@utxo/utxo");
const interface_1 = require("shared/interface");
const utils_1 = require("shared/utils");
exports.maxTxSizeForOffers = 482;
exports.CONFIRMED_UTXO_ENFORCED_MARKETPLACES = [interface_1.Marketplaces.UNISAT];
async function getUTXOsToCoverAmount({ address, amountNeeded, provider, excludedUtxos = [], insistConfirmedUtxos = false }) {
    try {
        const { totalAmount, utxos } = await (0, utxo_1.addressSpendableUtxos)({ address, provider });
        let sum = 0;
        const result = [];
        for await (let utxo of utxos) {
            if (isExcludedUtxo(utxo, excludedUtxos)) {
                // Check if the UTXO should be excluded
                continue;
            }
            if (insistConfirmedUtxos && utxo.confirmations != 0) {
                continue;
            }
            const currentUTXO = utxo;
            sum += currentUTXO.satoshis;
            result.push(currentUTXO);
            if (sum > amountNeeded) {
                return result;
            }
        }
        return result;
    }
    catch (err) {
        throw new Error(err);
    }
}
exports.getUTXOsToCoverAmount = getUTXOsToCoverAmount;
function isExcludedUtxo(utxo, excludedUtxos) {
    return excludedUtxos.some((excluded) => excluded.txId === utxo.txId && excluded.outputIndex === utxo.outputIndex);
}
exports.isExcludedUtxo = isExcludedUtxo;
function getAllUTXOsWorthASpecificValue(utxos, value) {
    return utxos.filter((utxo) => utxo.satoshis === value);
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
    for (let i = 0; i < offers.length; i++) {
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
    const { totalAmount, utxos } = await (0, utxo_1.addressSpendableUtxos)({ address, provider });
    for (let i = 0; i < offers.length; i++) {
        const mktPlace = interface_1.marketplaceName[offers[i].marketplace];
        if (!(exports.CONFIRMED_UTXO_ENFORCED_MARKETPLACES.includes(mktPlace))) {
            insistConfirmedUtxos = false;
            break;
        }
    }
    const excludedUtxos = getAllUTXOsWorthASpecificValue(utxos, 600);
    const retrievedUtxos = await getUTXOsToCoverAmount({
        address,
        amountNeeded: estimatedCost,
        provider,
        excludedUtxos,
        insistConfirmedUtxos
    });
    return retrievedUtxos.length > 0;
}
exports.canAddressAffordBid = canAddressAffordBid;
//# sourceMappingURL=helpers.js.map