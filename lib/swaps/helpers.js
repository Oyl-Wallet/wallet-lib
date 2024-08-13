"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isExcludedUtxo = exports.getUTXOsToCoverAmount = void 0;
const utxo_1 = require("@utxo/utxo");
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
//# sourceMappingURL=helpers.js.map