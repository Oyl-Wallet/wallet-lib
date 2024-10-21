"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPsbt = void 0;
const tslib_1 = require("tslib");
const btc_1 = require("@btc/btc");
const utxo_1 = require("@utxo/utxo");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
const errors_1 = require("errors");
const utils_1 = require("shared/utils");
const createPsbt = async ({ account, txId, provider, vout, value, oylFee, scriptpubkey, toAddress, feeRate, fee, }) => {
    try {
        const minFee = (0, btc_1.minimumFee)({
            taprootInputCount: 1,
            nonTaprootInputCount: 0,
            outputCount: 2,
        });
        const calculatedFee = minFee * feeRate < 250 ? 250 : minFee * feeRate;
        let finalFee = fee ? fee : calculatedFee;
        let gatheredUtxos = await (0, utxo_1.accountSpendableUtxos)({
            account,
            provider,
            spendAmount: finalFee + oylFee,
        });
        let psbt = new bitcoin.Psbt({ network: provider.network });
        psbt.addInput({
            hash: txId,
            index: vout,
            witnessUtxo: {
                script: Buffer.from(scriptpubkey, 'hex'),
                value: value,
            },
        });
        psbt.addOutput({
            address: account.taproot.address,
            value: value,
        });
        if (!fee && gatheredUtxos.utxos.length > 1) {
            const txSize = (0, btc_1.minimumFee)({
                taprootInputCount: gatheredUtxos.utxos.length,
                nonTaprootInputCount: 0,
                outputCount: 2,
            });
            finalFee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
            if (gatheredUtxos.totalAmount < finalFee) {
                gatheredUtxos = await (0, utxo_1.accountSpendableUtxos)({
                    account,
                    provider,
                    spendAmount: finalFee + oylFee,
                });
            }
        }
        for (let i = 0; i < gatheredUtxos.utxos.length; i++) {
            await (0, utils_1.addAnyInput)({
                psbt,
                utxo: gatheredUtxos.utxos[i],
                provider,
                account,
            });
        }
        if (gatheredUtxos.totalAmount < finalFee) {
            throw new errors_1.OylTransactionError(Error('Insufficient Balance'));
        }
        const changeAmount = gatheredUtxos.totalAmount - (finalFee + oylFee);
        if (changeAmount >= 546) {
            psbt.addOutput({
                address: account[account.spendStrategy.changeAddress].address,
                value: changeAmount,
            });
        }
        psbt.addOutput({
            address: toAddress,
            value: oylFee,
        });
        const formattedPsbtTx = await (0, utils_1.formatInputsToSign)({
            _psbt: psbt,
            senderPublicKey: account.taproot.pubkey,
            network: provider.network,
        });
        return { psbt: formattedPsbtTx.toBase64() };
    }
    catch (error) {
        throw new errors_1.OylTransactionError(error);
    }
};
exports.createPsbt = createPsbt;
//# sourceMappingURL=airhead.js.map