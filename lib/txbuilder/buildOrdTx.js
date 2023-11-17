"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildOrdTx = void 0;
function buildOrdTx(psbtTx, segwitUtxos, allUtxos, segwitAddress, toAddress, metaOutputValue, feeRate, inscriptionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { metaUtxos, nonMetaUtxos } = allUtxos.reduce((acc, utxo) => {
            utxo.inscriptions.length
                ? acc.metaUtxos.push(utxo)
                : acc.nonMetaUtxos.push(utxo);
            return acc;
        }, { metaUtxos: [], nonMetaUtxos: [] });
        const { nonMetaSegwitUtxos } = segwitUtxos.reduce((acc, utxo) => {
            utxo.inscriptions.length > 0
                ? acc.metaUtxos.push(utxo)
                : acc.nonMetaSegwitUtxos.push(utxo);
            return acc;
        }, { metaUtxos: [], nonMetaSegwitUtxos: [] });
        const matchedUtxo = metaUtxos.find((utxo) => {
            return utxo.inscriptions.some((inscription) => inscription.id === inscriptionId);
        });
        if (!matchedUtxo || matchedUtxo.inscriptions.length > 1) {
            throw new Error(matchedUtxo
                ? 'Multiple inscriptions! Please split first.'
                : 'Inscription not detected.');
        }
        psbtTx.addInput(matchedUtxo);
        nonMetaSegwitUtxos.sort((a, b) => a.satoshis - b.satoshis);
        const vB = psbtTx.getNumberOfInputs() * 149 + 3 * 32 + 12;
        const fee = vB * feeRate;
        const feeUtxo = nonMetaSegwitUtxos.find((utxo) => {
            return utxo.satoshis - fee > 0 ? utxo : undefined;
        });
        if (!feeUtxo) {
            throw new Error('No available UTXOs');
        }
        psbtTx.addInput(feeUtxo, true);
        psbtTx.addOutput(toAddress, matchedUtxo.satoshis);
        psbtTx.addOutput(segwitAddress, feeUtxo.satoshis - fee);
        psbtTx.outputs[0].value = metaOutputValue;
        const remainingUnspent = psbtTx.getUnspent();
        if (remainingUnspent <= 0) {
            throw new Error('Not enough balance for the fee');
        }
        const psbt = yield psbtTx.createSignedPsbt();
        psbtTx.dumpTx(psbt);
        return psbt;
    });
}
exports.buildOrdTx = buildOrdTx;
//# sourceMappingURL=buildOrdTx.js.map