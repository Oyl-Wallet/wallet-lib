"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dummyUtxosPsbt = exports.prepareAddressForOkxPsbt = void 0;
const utxo_1 = require("../utxo/utxo");
const helpers_1 = require("./helpers");
/**
     *
     * Prepare an address for atomic swaps by creating two fresh 600 satoshi UTXOS
     * for building the
     */
async function prepareAddressForOkxPsbt({ address, provider, pubKey, feeRate, addressType, signer }) {
    try {
        const { utxos } = await (0, utxo_1.addressSpendableUtxos)({ address, provider });
        const paddingUtxos = (0, helpers_1.getAllUTXOsWorthASpecificValue)(utxos, 600);
        if (paddingUtxos.length < 2) {
            const { psbtBase64 } = await dummyUtxosPsbt({ address, provider, feeRate, pubKey, addressType });
            const signedPsbtPayload = await signer.signAllInputs({
                rawPsbt: psbtBase64,
                finalize: true,
            });
            const result = await provider.sandshrew.bitcoindRpc.finalizePSBT(signedPsbtPayload.signedPsbt);
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
        return [];
    }
    catch (err) {
        throw new Error('An error occured while preparing address for okx marketplace');
    }
}
exports.prepareAddressForOkxPsbt = prepareAddressForOkxPsbt;
async function dummyUtxosPsbt({ address, provider, feeRate, pubKey, addressType }) {
    const amountNeeded = (helpers_1.DUMMY_UTXO_SATS + parseInt((helpers_1.ESTIMATE_TX_SIZE * feeRate).toFixed(0)));
    const retrievedUtxos = await (0, helpers_1.getUTXOsToCoverAmount)({
        address,
        amountNeeded,
        provider
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
    return await (0, helpers_1.buildPsbtWithFee)({
        inputTemplate: txInputs,
        outputTemplate: txOutputs,
        changeOutput,
        retrievedUtxos,
        spendAddress: address,
        spendPubKey: pubKey,
        amountRetrieved,
        spendAmount: helpers_1.DUMMY_UTXO_SATS,
        feeRate,
        provider,
        addressType
    });
}
exports.dummyUtxosPsbt = dummyUtxosPsbt;
//# sourceMappingURL=okx.js.map