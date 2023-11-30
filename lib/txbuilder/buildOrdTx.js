"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.getUtxosForFees = exports.buildOrdTx = void 0;
const bitcoin = __importStar(require("bitcoinjs-lib"));
const transactions_1 = require("../transactions");
function buildOrdTx({ psbtTx, allUtxos, toAddress, metaOutputValue, feeRate, inscriptionId, taprootAddress, payFeesWithSegwit, segwitAddress, segwitUtxos, segwitPubKey, }) {
    return __awaiter(this, void 0, void 0, function* () {
        const { metaUtxos, nonMetaUtxos } = allUtxos.reduce((acc, utxo) => {
            utxo.inscriptions.length
                ? acc.metaUtxos.push(utxo)
                : acc.nonMetaUtxos.push(utxo);
            return acc;
        }, { metaUtxos: [], nonMetaUtxos: [] });
        yield addInscriptionUtxo({
            metaUtxos: metaUtxos,
            inscriptionId: inscriptionId,
            toAddress: toAddress,
            psbtTx: psbtTx,
        });
        psbtTx.outputs[0].value = metaOutputValue;
        yield (0, exports.getUtxosForFees)({
            payFeesWithSegwit: payFeesWithSegwit,
            psbtTx: psbtTx,
            feeRate: feeRate,
            taprootUtxos: nonMetaUtxos,
            taprootAddress: taprootAddress,
            segwitUtxos: segwitUtxos,
            segwitAddress: segwitAddress,
            segwitPubKey: segwitPubKey,
        });
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
const getUtxosForFees = ({ payFeesWithSegwit, psbtTx, feeRate, taprootUtxos, taprootAddress, segwitUtxos, segwitAddress, segwitPubKey, }) => __awaiter(void 0, void 0, void 0, function* () {
    if (payFeesWithSegwit && segwitUtxos) {
        yield addSegwitFeeUtxo({
            segwitUtxos: segwitUtxos,
            feeRate: feeRate,
            psbtTx: psbtTx,
            segwitAddress: segwitAddress,
            segwitPubKey: segwitPubKey,
        });
    }
    else {
        yield addTaprootFeeUtxo({
            taprootUtxos: taprootUtxos,
            feeRate: feeRate,
            psbtTx: psbtTx,
            taprootAddress: taprootAddress,
        });
    }
    return;
});
exports.getUtxosForFees = getUtxosForFees;
const addSegwitFeeUtxo = ({ segwitUtxos, feeRate, psbtTx, segwitAddress, segwitPubKey, }) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isBitcoinJSLib = psbtTx instanceof bitcoin.Psbt;
        const { nonMetaSegwitUtxos } = segwitUtxos.reduce((acc, utxo) => {
            utxo.inscriptions.length > 0
                ? acc.metaUtxos.push(utxo)
                : acc.nonMetaSegwitUtxos.push(utxo);
            return acc;
        }, { metaUtxos: [], nonMetaSegwitUtxos: [] });
        nonMetaSegwitUtxos.sort((a, b) => a.satoshis - b.satoshis);
        const inputCount = isBitcoinJSLib
            ? psbtTx.txInputs.length === 0
                ? 1
                : psbtTx.txInputs.length
            : psbtTx.getNumberOfInputs() === 0
                ? 1
                : psbtTx.getNumberOfInputs();
        const vB = inputCount * 1 * 149 + 3 * 32 + 12;
        const fee = vB * feeRate;
        const feeUtxo = nonMetaSegwitUtxos.find((utxo) => {
            return utxo.satoshis - fee > 0 ? utxo : undefined;
        });
        if (!feeUtxo) {
            throw new Error('No available UTXOs');
        }
        const addressType = (0, transactions_1.getAddressType)(segwitAddress);
        let redeemScript;
        if (addressType === 1) {
            const p2shObj = bitcoin.payments.p2sh({
                redeem: bitcoin.payments.p2sh({
                    pubkey: Buffer.from(segwitPubKey, 'hex'),
                    network: bitcoin.networks.bitcoin,
                }),
            });
            redeemScript = p2shObj.redeem.output;
        }
        if (addressType === 2) {
            try {
                const p2wpkh = bitcoin.payments.p2wpkh({
                    pubkey: Buffer.from(segwitPubKey, 'hex'),
                    network: bitcoin.networks.bitcoin,
                });
                const p2sh = bitcoin.payments.p2sh({
                    redeem: p2wpkh,
                    network: bitcoin.networks.bitcoin,
                });
                redeemScript = p2sh.redeem.output;
            }
            catch (error) {
                console.log(error);
            }
        }
        if (isBitcoinJSLib) {
            psbtTx.addInput({
                hash: feeUtxo.txId,
                index: feeUtxo.outputIndex,
                witnessUtxo: {
                    value: feeUtxo.satoshis,
                    script: Buffer.from(feeUtxo.scriptPk, 'hex'),
                },
                redeemScript: redeemScript,
            });
            psbtTx.addOutput({
                address: segwitAddress,
                value: feeUtxo.satoshis - fee,
            });
        }
        else {
            psbtTx.addInput(feeUtxo, true);
            psbtTx.addOutput(segwitAddress, feeUtxo.satoshis - fee);
        }
        return;
    }
    catch (e) {
        console.error(e);
        return;
    }
});
const addTaprootFeeUtxo = ({ taprootUtxos, feeRate, psbtTx, taprootAddress, }) => __awaiter(void 0, void 0, void 0, function* () {
    const isBitcoinJSLib = psbtTx instanceof bitcoin.Psbt;
    const { nonMetaTaprootUtxos } = taprootUtxos.reduce((acc, utxo) => {
        utxo.inscriptions.length > 0
            ? acc.metaUtxos.push(utxo)
            : acc.nonMetaTaprootUtxos.push(utxo);
        return acc;
    }, { metaUtxos: [], nonMetaTaprootUtxos: [] });
    nonMetaTaprootUtxos.sort((a, b) => a.satoshis - b.satoshis);
    const inputCount = isBitcoinJSLib
        ? psbtTx.txInputs.length === 0
            ? 1
            : psbtTx.txInputs.length
        : psbtTx.getNumberOfInputs() === 0
            ? 1
            : psbtTx.getNumberOfInputs();
    const vB = inputCount * 149 + 3 * 32 + 12;
    const fee = vB * feeRate;
    const feeUtxo = nonMetaTaprootUtxos.find((utxo) => {
        return utxo.satoshis - fee > 0 ? utxo : undefined;
    });
    if (!feeUtxo) {
        throw new Error('No available UTXOs');
    }
    if (isBitcoinJSLib) {
        psbtTx.addInput({
            hash: feeUtxo.txId,
            index: feeUtxo.outputIndex,
            witnessUtxo: {
                value: feeUtxo.satoshis,
                script: Buffer.from(feeUtxo.scriptPk, 'hex'),
            },
        });
        psbtTx.addOutput({
            address: taprootAddress,
            value: feeUtxo.satoshis - fee,
        });
    }
    else {
        psbtTx.addInput(feeUtxo);
        psbtTx.addOutput(taprootAddress, feeUtxo.satoshis - fee);
    }
    return;
});
const addInscriptionUtxo = ({ metaUtxos, inscriptionId, toAddress, psbtTx, }) => __awaiter(void 0, void 0, void 0, function* () {
    const matchedUtxo = metaUtxos.find((utxo) => {
        return utxo.inscriptions.some((inscription) => inscription.id === inscriptionId);
    });
    if (!matchedUtxo || matchedUtxo.inscriptions.length > 1) {
        throw new Error(matchedUtxo
            ? 'Multiple inscriptions! Please split first.'
            : 'Inscription not detected.');
    }
    psbtTx.addInput(matchedUtxo);
    psbtTx.addOutput(toAddress, matchedUtxo.satoshis);
    return;
});
//# sourceMappingURL=buildOrdTx.js.map