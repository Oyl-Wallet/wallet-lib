"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addInputConditionally = exports.getAllUTXOsWorthASpecificValue = exports.isExcludedUtxo = exports.getUTXOsToCoverAmount = void 0;
const utxo_1 = require("@utxo/utxo");
const interface_1 = require("shared/interface");
const utils_1 = require("shared/utils");
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
//# sourceMappingURL=helpers.js.map