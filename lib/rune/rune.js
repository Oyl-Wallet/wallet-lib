"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mint = exports.send = exports.actualMintFee = exports.actualSendFee = exports.findRuneUtxos = exports.createMintPsbt = exports.createSendPsbt = void 0;
const tslib_1 = require("tslib");
const btc_1 = require("../btc/btc");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
const utxo_1 = require("../utxo/utxo");
const utils_1 = require("../shared/utils");
const errors_1 = require("../errors");
const utils_2 = require("../shared/utils");
const createSendPsbt = async ({ account, runeId, provider, inscriptionAddress = account.taproot.address, toAddress, amount, feeRate, fee, }) => {
    try {
        const minFee = (0, btc_1.minimumFee)({
            taprootInputCount: 2,
            nonTaprootInputCount: 0,
            outputCount: 3,
        });
        const calculatedFee = minFee * feeRate < 250 ? 250 : minFee * feeRate;
        let finalFee = fee ? fee : calculatedFee;
        let gatheredUtxos = await (0, utxo_1.accountSpendableUtxos)({
            account,
            provider,
            spendAmount: finalFee + utils_1.inscriptionSats,
        });
        let psbt = new bitcoin.Psbt({ network: provider.network });
        const { runeUtxos, runeTotalSatoshis, divisibility } = await (0, exports.findRuneUtxos)({
            address: inscriptionAddress,
            greatestToLeast: account.spendStrategy.utxoSortGreatestToLeast,
            provider,
            runeId,
            targetNumberOfRunes: amount,
        });
        for await (const utxo of runeUtxos) {
            if ((0, utils_2.getAddressType)(utxo.address) === 0) {
                const previousTxHex = await provider.esplora.getTxHex(utxo.txId);
                psbt.addInput({
                    hash: utxo.txId,
                    index: parseInt(utxo.txIndex),
                    nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
                });
            }
            if ((0, utils_2.getAddressType)(utxo.address) === 2) {
                const redeemScript = bitcoin.script.compile([
                    bitcoin.opcodes.OP_0,
                    bitcoin.crypto.hash160(Buffer.from(account.nestedSegwit.pubkey, 'hex')),
                ]);
                psbt.addInput({
                    hash: utxo.txId,
                    index: parseInt(utxo.txIndex),
                    redeemScript: redeemScript,
                    witnessUtxo: {
                        value: utxo.satoshis,
                        script: bitcoin.script.compile([
                            bitcoin.opcodes.OP_HASH160,
                            bitcoin.crypto.hash160(redeemScript),
                            bitcoin.opcodes.OP_EQUAL,
                        ]),
                    },
                });
            }
            if ((0, utils_2.getAddressType)(utxo.address) === 1 ||
                (0, utils_2.getAddressType)(utxo.address) === 3) {
                const previousTxInfo = await provider.esplora.getTxInfo(utxo.txId);
                psbt.addInput({
                    hash: utxo.txId,
                    index: parseInt(utxo.txIndex),
                    witnessUtxo: {
                        value: utxo.satoshis,
                        script: Buffer.from(previousTxInfo.vout[utxo.txIndex].scriptpubkey, 'hex'),
                    },
                });
            }
        }
        if (!fee && gatheredUtxos.utxos.length > 1) {
            const txSize = (0, btc_1.minimumFee)({
                taprootInputCount: gatheredUtxos.utxos.length,
                nonTaprootInputCount: 0,
                outputCount: 3,
            });
            finalFee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
            if (gatheredUtxos.totalAmount < finalFee) {
                gatheredUtxos = await (0, utxo_1.accountSpendableUtxos)({
                    account,
                    provider,
                    spendAmount: finalFee + utils_1.inscriptionSats,
                });
            }
        }
        for (let i = 0; i < gatheredUtxos.utxos.length; i++) {
            if ((0, utils_2.getAddressType)(gatheredUtxos.utxos[i].address) === 0) {
                const previousTxHex = await provider.esplora.getTxHex(gatheredUtxos.utxos[i].txId);
                psbt.addInput({
                    hash: gatheredUtxos.utxos[i].txId,
                    index: gatheredUtxos.utxos[i].outputIndex,
                    nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
                });
            }
            if ((0, utils_2.getAddressType)(gatheredUtxos.utxos[i].address) === 2) {
                const redeemScript = bitcoin.script.compile([
                    bitcoin.opcodes.OP_0,
                    bitcoin.crypto.hash160(Buffer.from(account.nestedSegwit.pubkey, 'hex')),
                ]);
                psbt.addInput({
                    hash: gatheredUtxos.utxos[i].txId,
                    index: gatheredUtxos.utxos[i].outputIndex,
                    redeemScript: redeemScript,
                    witnessUtxo: {
                        value: gatheredUtxos.utxos[i].satoshis,
                        script: bitcoin.script.compile([
                            bitcoin.opcodes.OP_HASH160,
                            bitcoin.crypto.hash160(redeemScript),
                            bitcoin.opcodes.OP_EQUAL,
                        ]),
                    },
                });
            }
            if ((0, utils_2.getAddressType)(gatheredUtxos.utxos[i].address) === 1 ||
                (0, utils_2.getAddressType)(gatheredUtxos.utxos[i].address) === 3) {
                psbt.addInput({
                    hash: gatheredUtxos.utxos[i].txId,
                    index: gatheredUtxos.utxos[i].outputIndex,
                    witnessUtxo: {
                        value: gatheredUtxos.utxos[i].satoshis,
                        script: Buffer.from(gatheredUtxos.utxos[i].scriptPk, 'hex'),
                    },
                });
            }
        }
        if (gatheredUtxos.totalAmount < finalFee + utils_1.inscriptionSats) {
            throw new errors_1.OylTransactionError(Error('Insufficient Balance'));
        }
        const changeAmount = gatheredUtxos.totalAmount - (finalFee + utils_1.inscriptionSats);
        psbt.addOutput({
            value: utils_1.inscriptionSats,
            address: account.taproot.address,
        });
        psbt.addOutput({
            value: runeTotalSatoshis,
            address: toAddress,
        });
        psbt.addOutput({
            address: account[account.spendStrategy.changeAddress].address,
            value: changeAmount,
        });
        const script = (0, utils_1.createRuneSendScript)({
            runeId,
            amount,
            divisibility,
            sendOutputIndex: 1,
            pointer: 0,
        });
        const output = { script: script, value: 0 };
        psbt.addOutput(output);
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
exports.createSendPsbt = createSendPsbt;
const createMintPsbt = async ({ account, runeId, provider, amount, feeRate, fee, }) => {
    try {
        const minFee = (0, btc_1.minimumFee)({
            taprootInputCount: 2,
            nonTaprootInputCount: 0,
            outputCount: 2,
        });
        const calculatedFee = minFee * feeRate < 250 ? 250 : minFee * feeRate;
        let finalFee = fee ? fee : calculatedFee;
        let gatheredUtxos = await (0, utxo_1.accountSpendableUtxos)({
            account,
            provider,
            spendAmount: finalFee + utils_1.inscriptionSats,
        });
        let psbt = new bitcoin.Psbt({ network: provider.network });
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
                    spendAmount: finalFee + utils_1.inscriptionSats,
                });
            }
        }
        for (let i = 0; i < gatheredUtxos.utxos.length; i++) {
            if ((0, utils_2.getAddressType)(gatheredUtxos.utxos[i].address) === 0) {
                const previousTxHex = await provider.esplora.getTxHex(gatheredUtxos.utxos[i].txId);
                psbt.addInput({
                    hash: gatheredUtxos.utxos[i].txId,
                    index: gatheredUtxos.utxos[i].outputIndex,
                    nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
                });
            }
            if ((0, utils_2.getAddressType)(gatheredUtxos.utxos[i].address) === 2) {
                const redeemScript = bitcoin.script.compile([
                    bitcoin.opcodes.OP_0,
                    bitcoin.crypto.hash160(Buffer.from(account.nestedSegwit.pubkey, 'hex')),
                ]);
                psbt.addInput({
                    hash: gatheredUtxos.utxos[i].txId,
                    index: gatheredUtxos.utxos[i].outputIndex,
                    redeemScript: redeemScript,
                    witnessUtxo: {
                        value: gatheredUtxos.utxos[i].satoshis,
                        script: bitcoin.script.compile([
                            bitcoin.opcodes.OP_HASH160,
                            bitcoin.crypto.hash160(redeemScript),
                            bitcoin.opcodes.OP_EQUAL,
                        ]),
                    },
                });
            }
            if ((0, utils_2.getAddressType)(gatheredUtxos.utxos[i].address) === 1 ||
                (0, utils_2.getAddressType)(gatheredUtxos.utxos[i].address) === 3) {
                psbt.addInput({
                    hash: gatheredUtxos.utxos[i].txId,
                    index: gatheredUtxos.utxos[i].outputIndex,
                    witnessUtxo: {
                        value: gatheredUtxos.utxos[i].satoshis,
                        script: Buffer.from(gatheredUtxos.utxos[i].scriptPk, 'hex'),
                    },
                });
            }
        }
        if (gatheredUtxos.totalAmount < finalFee + utils_1.inscriptionSats) {
            throw new errors_1.OylTransactionError(Error('Insufficient Balance'));
        }
        const changeAmount = gatheredUtxos.totalAmount - (finalFee + utils_1.inscriptionSats);
        psbt.addOutput({
            value: utils_1.inscriptionSats,
            address: account.taproot.address,
        });
        psbt.addOutput({
            address: account[account.spendStrategy.changeAddress].address,
            value: changeAmount,
        });
        const script = (0, utils_1.createRuneMintScript)({
            runeId,
            amountToMint: amount,
            mintOutPutIndex: 0,
            pointer: 0,
        });
        const output = { script: script, value: 0 };
        psbt.addOutput(output);
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
exports.createMintPsbt = createMintPsbt;
const findRuneUtxos = async ({ address, greatestToLeast, provider, runeId, targetNumberOfRunes, }) => {
    const runeUtxos = [];
    const runeUtxoOutpoints = await provider.api.getRuneOutpoints({
        address: address,
    });
    if (greatestToLeast) {
        runeUtxoOutpoints?.sort((a, b) => b.satoshis - a.satoshis);
    }
    else {
        runeUtxoOutpoints?.sort((a, b) => a.satoshis - b.satoshis);
    }
    let runeTotalSatoshis = 0;
    let runeTotalAmount = 0;
    let divisibility;
    for (const rune of runeUtxoOutpoints) {
        if (runeTotalAmount < targetNumberOfRunes) {
            const index = rune.rune_ids.indexOf(runeId);
            if (index !== -1) {
                const txSplit = rune.output.split(':');
                const txHash = txSplit[0];
                const txIndex = txSplit[1];
                const txDetails = await provider.esplora.getTxInfo(txHash);
                if (!txDetails?.vout || txDetails.vout.length < 1) {
                    throw new Error('Unable to find rune utxo');
                }
                const satoshis = txDetails.vout[txIndex].value;
                const holderAddress = rune.wallet_addr;
                runeUtxos.push({
                    txId: txHash,
                    txIndex: txIndex,
                    script: rune.pkscript,
                    address: holderAddress,
                    amountOfRunes: rune.balances[index],
                    satoshis: satoshis,
                });
                runeTotalSatoshis += satoshis;
                runeTotalAmount += rune.balances[index] / 10 ** rune.decimals[index];
                if (divisibility === undefined) {
                    divisibility = rune.decimals[index];
                }
            }
        }
        else {
            break;
        }
    }
    return { runeUtxos, runeTotalSatoshis, divisibility };
};
exports.findRuneUtxos = findRuneUtxos;
const actualSendFee = async ({ account, runeId, provider, inscriptionAddress = account.taproot.address, toAddress, amount, feeRate, signer, }) => {
    if (!feeRate) {
        feeRate = (await provider.esplora.getFeeEstimates())['1'];
    }
    const { psbt } = await (0, exports.createSendPsbt)({
        account,
        runeId,
        provider,
        inscriptionAddress,
        toAddress,
        amount,
        feeRate,
    });
    const { signedPsbt } = await signer.signAllInputs({
        rawPsbt: psbt,
        finalize: true,
    });
    let rawPsbt = bitcoin.Psbt.fromBase64(signedPsbt, {
        network: account.network,
    });
    const signedHexPsbt = rawPsbt.extractTransaction().toHex();
    const vsize = (await provider.sandshrew.bitcoindRpc.testMemPoolAccept([signedHexPsbt]))[0].vsize;
    const correctFee = vsize * feeRate;
    const { psbt: finalPsbt } = await (0, exports.createSendPsbt)({
        account,
        runeId,
        provider,
        inscriptionAddress,
        toAddress,
        amount,
        feeRate,
        fee: correctFee,
    });
    const { signedPsbt: signedAll } = await signer.signAllInputs({
        rawPsbt: finalPsbt,
        finalize: true,
    });
    let finalRawPsbt = bitcoin.Psbt.fromBase64(signedAll, {
        network: account.network,
    });
    const finalSignedHexPsbt = finalRawPsbt.extractTransaction().toHex();
    const finalVsize = (await provider.sandshrew.bitcoindRpc.testMemPoolAccept([finalSignedHexPsbt]))[0].vsize;
    const finalFee = finalVsize * feeRate;
    return { fee: finalFee };
};
exports.actualSendFee = actualSendFee;
const actualMintFee = async ({ account, runeId, provider, amount, feeRate, signer, }) => {
    if (!feeRate) {
        feeRate = (await provider.esplora.getFeeEstimates())['1'];
    }
    const { psbt } = await (0, exports.createMintPsbt)({
        account,
        runeId,
        provider,
        amount,
        feeRate,
    });
    const { signedPsbt } = await signer.signAllInputs({
        rawPsbt: psbt,
        finalize: true,
    });
    let rawPsbt = bitcoin.Psbt.fromBase64(signedPsbt, {
        network: account.network,
    });
    const signedHexPsbt = rawPsbt.extractTransaction().toHex();
    const vsize = (await provider.sandshrew.bitcoindRpc.testMemPoolAccept([signedHexPsbt]))[0].vsize;
    const correctFee = vsize * feeRate;
    const { psbt: finalPsbt } = await (0, exports.createMintPsbt)({
        account,
        runeId,
        provider,
        amount,
        feeRate,
        fee: correctFee,
    });
    const { signedPsbt: signedAll } = await signer.signAllInputs({
        rawPsbt: finalPsbt,
        finalize: true,
    });
    let finalRawPsbt = bitcoin.Psbt.fromBase64(signedAll, {
        network: account.network,
    });
    const finalSignedHexPsbt = finalRawPsbt.extractTransaction().toHex();
    const finalVsize = (await provider.sandshrew.bitcoindRpc.testMemPoolAccept([finalSignedHexPsbt]))[0].vsize;
    const finalFee = finalVsize * feeRate;
    return { fee: finalFee };
};
exports.actualMintFee = actualMintFee;
const send = async ({ toAddress, amount, runeId, inscriptionAddress, feeRate, account, provider, signer, }) => {
    if (!inscriptionAddress) {
        inscriptionAddress = account.taproot.address;
    }
    const { fee } = await (0, exports.actualSendFee)({
        account,
        runeId,
        amount,
        provider,
        toAddress,
        inscriptionAddress,
        feeRate,
        signer,
    });
    const { psbt: finalPsbt } = await (0, exports.createSendPsbt)({
        account,
        runeId,
        amount,
        provider,
        toAddress,
        inscriptionAddress,
        feeRate,
        fee: fee,
    });
    const { signedPsbt } = await signer.signAllInputs({
        rawPsbt: finalPsbt,
        finalize: true,
    });
    const result = await provider.pushPsbt({
        psbtBase64: signedPsbt,
    });
    return result;
};
exports.send = send;
const mint = async ({ account, runeId, provider, amount, feeRate, signer, }) => {
    const { fee } = await (0, exports.actualMintFee)({
        account,
        runeId,
        amount,
        provider,
        feeRate,
        signer,
    });
    const { psbt: finalPsbt } = await (0, exports.createMintPsbt)({
        account,
        runeId,
        amount,
        provider,
        feeRate,
        fee: fee,
    });
    const { signedPsbt } = await signer.signAllInputs({
        rawPsbt: finalPsbt,
        finalize: true,
    });
    const result = await provider.pushPsbt({
        psbtBase64: signedPsbt,
    });
    return result;
};
exports.mint = mint;
//# sourceMappingURL=rune.js.map