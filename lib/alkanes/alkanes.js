"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = exports.deployReveal = exports.deployCommit = exports.actualExecuteFee = exports.actualDeployRevealFee = exports.actualDeployCommitFee = exports.createDeployReveal = exports.createDeployCommit = exports.createExecutePsbt = void 0;
const tslib_1 = require("tslib");
const btc_1 = require("../btc/btc");
const bitcoin = tslib_1.__importStar(require("bitcoinjs-lib"));
const envelope = tslib_1.__importStar(require("alkanes/lib/index.js"));
const utils_1 = require("../shared/utils");
const errors_1 = require("../errors");
const utils_2 = require("../shared/utils");
const bip371_1 = require("bitcoinjs-lib/src/psbt/bip371");
const bip341_1 = require("bitcoinjs-lib/src/payments/bip341");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const node_zlib_1 = require("node:zlib");
const util_1 = require("util");
const index_js_1 = require("alkanes/lib/index.js");
// export const createSendPsbt = async ({
//   gatheredUtxos,
//   account,
//   runeId,
//   provider,
//   inscriptionAddress = account.taproot.address,
//   toAddress,
//   amount,
//   feeRate,
//   fee,
// }: {
//   gatheredUtxos: GatheredUtxos
//   account: Account
//   runeId: string
//   provider: Provider
//   inscriptionAddress: string
//   toAddress: string
//   amount: number
//   feeRate?: number
//   fee?: number
// }) => {
//   try {
//     const originalGatheredUtxos = gatheredUtxos
//     const minFee = minimumFee({
//       taprootInputCount: 2,
//       nonTaprootInputCount: 0,
//       outputCount: 3,
//     })
//     const calculatedFee = minFee * feeRate < 250 ? 250 : minFee * feeRate
//     let finalFee = fee ? fee : calculatedFee
//     gatheredUtxos = findXAmountOfSats(
//       originalGatheredUtxos.utxos,
//       Number(finalFee) + Number(inscriptionSats)
//     )
//     if (gatheredUtxos.utxos.length > 1) {
//       const txSize = minimumFee({
//         taprootInputCount: gatheredUtxos.utxos.length,
//         nonTaprootInputCount: 0,
//         outputCount: 3,
//       })
//       finalFee = Math.max(txSize * feeRate, 250)
//       gatheredUtxos = findXAmountOfSats(
//         originalGatheredUtxos.utxos,
//         Number(finalFee) + Number(amount)
//       )
//     }
//     let psbt = new bitcoin.Psbt({ network: provider.network })
//     const { runeUtxos, runeTotalSatoshis, divisibility } = await findRuneUtxos({
//       address: inscriptionAddress,
//       greatestToLeast: account.spendStrategy.utxoSortGreatestToLeast,
//       provider,
//       runeId,
//       targetNumberOfRunes: amount,
//     })
//     for await (const utxo of runeUtxos) {
//       if (getAddressType(utxo.address) === 0) {
//         const previousTxHex: string = await provider.esplora.getTxHex(utxo.txId)
//         psbt.addInput({
//           hash: utxo.txId,
//           index: parseInt(utxo.txIndex),
//           nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
//         })
//       }
//       if (getAddressType(utxo.address) === 2) {
//         const redeemScript = bitcoin.script.compile([
//           bitcoin.opcodes.OP_0,
//           bitcoin.crypto.hash160(
//             Buffer.from(account.nestedSegwit.pubkey, 'hex')
//           ),
//         ])
//         psbt.addInput({
//           hash: utxo.txId,
//           index: parseInt(utxo.txIndex),
//           redeemScript: redeemScript,
//           witnessUtxo: {
//             value: utxo.satoshis,
//             script: bitcoin.script.compile([
//               bitcoin.opcodes.OP_HASH160,
//               bitcoin.crypto.hash160(redeemScript),
//               bitcoin.opcodes.OP_EQUAL,
//             ]),
//           },
//         })
//       }
//       if (
//         getAddressType(utxo.address) === 1 ||
//         getAddressType(utxo.address) === 3
//       ) {
//         psbt.addInput({
//           hash: utxo.txId,
//           index: parseInt(utxo.txIndex),
//           witnessUtxo: {
//             value: utxo.satoshis,
//             script: Buffer.from(utxo.script, 'hex'),
//           },
//         })
//       }
//     }
//     if (gatheredUtxos.totalAmount < finalFee + inscriptionSats) {
//       throw new OylTransactionError(Error('Insufficient Balance'))
//     }
//     for (let i = 0; i < gatheredUtxos.utxos.length; i++) {
//       if (getAddressType(gatheredUtxos.utxos[i].address) === 0) {
//         const previousTxHex: string = await provider.esplora.getTxHex(
//           gatheredUtxos.utxos[i].txId
//         )
//         psbt.addInput({
//           hash: gatheredUtxos.utxos[i].txId,
//           index: gatheredUtxos.utxos[i].outputIndex,
//           nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
//         })
//       }
//       if (getAddressType(gatheredUtxos.utxos[i].address) === 2) {
//         const redeemScript = bitcoin.script.compile([
//           bitcoin.opcodes.OP_0,
//           bitcoin.crypto.hash160(
//             Buffer.from(account.nestedSegwit.pubkey, 'hex')
//           ),
//         ])
//         psbt.addInput({
//           hash: gatheredUtxos.utxos[i].txId,
//           index: gatheredUtxos.utxos[i].outputIndex,
//           redeemScript: redeemScript,
//           witnessUtxo: {
//             value: gatheredUtxos.utxos[i].satoshis,
//             script: bitcoin.script.compile([
//               bitcoin.opcodes.OP_HASH160,
//               bitcoin.crypto.hash160(redeemScript),
//               bitcoin.opcodes.OP_EQUAL,
//             ]),
//           },
//         })
//       }
//       if (
//         getAddressType(gatheredUtxos.utxos[i].address) === 1 ||
//         getAddressType(gatheredUtxos.utxos[i].address) === 3
//       ) {
//         psbt.addInput({
//           hash: gatheredUtxos.utxos[i].txId,
//           index: gatheredUtxos.utxos[i].outputIndex,
//           witnessUtxo: {
//             value: gatheredUtxos.utxos[i].satoshis,
//             script: Buffer.from(gatheredUtxos.utxos[i].scriptPk, 'hex'),
//           },
//         })
//       }
//     }
//     const script = createRuneSendScript({
//       runeId,
//       amount,
//       divisibility,
//       sendOutputIndex: 2,
//       pointer: 1,
//     })
//     const output = { script: script, value: 0 }
//     psbt.addOutput(output)
//     const changeAmount =
//       gatheredUtxos.totalAmount - (finalFee + inscriptionSats)
//     psbt.addOutput({
//       value: inscriptionSats,
//       address: account.taproot.address,
//     })
//     psbt.addOutput({
//       value: runeTotalSatoshis,
//       address: toAddress,
//     })
//     psbt.addOutput({
//       address: account[account.spendStrategy.changeAddress].address,
//       value: changeAmount,
//     })
//     const formattedPsbtTx = await formatInputsToSign({
//       _psbt: psbt,
//       senderPublicKey: account.taproot.pubkey,
//       network: provider.network,
//     })
//     return { psbt: formattedPsbtTx.toBase64() }
//   } catch (error) {
//     throw new OylTransactionError(error)
//   }
// }
const createExecutePsbt = async ({ gatheredUtxos, account, calldata, provider, feeRate, fee = 0, }) => {
    try {
        const originalGatheredUtxos = gatheredUtxos;
        const minTxSize = (0, btc_1.minimumFee)({
            taprootInputCount: 2,
            nonTaprootInputCount: 0,
            outputCount: 2,
        });
        let calculatedFee = Math.max(minTxSize * feeRate, 250);
        let finalFee = fee === 0 ? calculatedFee : fee;
        gatheredUtxos = (0, utils_1.findXAmountOfSats)(originalGatheredUtxos.utxos, Number(finalFee));
        let psbt = new bitcoin.Psbt({ network: provider.network });
        if (fee === 0 && gatheredUtxos.utxos.length > 1) {
            const txSize = (0, btc_1.minimumFee)({
                taprootInputCount: gatheredUtxos.utxos.length,
                nonTaprootInputCount: 0,
                outputCount: 2,
            });
            finalFee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
            if (gatheredUtxos.totalAmount < finalFee) {
                throw new errors_1.OylTransactionError(Error('Insufficient Balance'));
            }
        }
        if (gatheredUtxos.totalAmount < finalFee) {
            throw new errors_1.OylTransactionError(Error('Insufficient Balance'));
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
        psbt.addOutput({
            value: 546,
            address: account.taproot.address,
        });
        const script = (0, index_js_1.encodeRunestoneProtostone)({
            protostones: [
                envelope.ProtoStone.message({
                    protocolTag: 1n,
                    edicts: [],
                    pointer: 0,
                    refundPointer: 0,
                    calldata: envelope.encipher(calldata),
                }),
            ],
        }).encodedRunestone;
        const output = { script, value: 0 };
        psbt.addOutput(output);
        const changeAmount = gatheredUtxos.totalAmount - finalFee;
        psbt.addOutput({
            address: account[account.spendStrategy.changeAddress].address,
            value: changeAmount,
        });
        const formattedPsbtTx = await (0, utils_1.formatInputsToSign)({
            _psbt: psbt,
            senderPublicKey: account.taproot.pubkey,
            network: provider.network,
        });
        return {
            psbt: formattedPsbtTx.toBase64(),
            psbtHex: formattedPsbtTx.toHex(),
        };
    }
    catch (error) {
        throw new errors_1.OylTransactionError(error);
    }
};
exports.createExecutePsbt = createExecutePsbt;
const createDeployCommit = async ({ payload, gatheredUtxos, tweakedTaprootKeyPair, account, provider, feeRate, fee, }) => {
    try {
        const originalGatheredUtxos = gatheredUtxos;
        const minFee = (0, btc_1.minimumFee)({
            taprootInputCount: 2,
            nonTaprootInputCount: 0,
            outputCount: 2,
        });
        const calculatedFee = minFee * feeRate < 250 ? 250 : minFee * feeRate;
        let finalFee = fee ? fee : calculatedFee;
        let psbt = new bitcoin.Psbt({ network: provider.network });
        if (!payload) {
            const binary = new Uint8Array(Array.from(await fs_extra_1.default.readFile(path_1.default.join(__dirname, './', 'free_mint.wasm'))));
            const gzip = (0, util_1.promisify)(node_zlib_1.gzip);
            payload = {
                body: await gzip(binary, { level: 9 }),
                cursed: false,
                tags: { contentType: '' },
            };
        }
        const script = Buffer.from(envelope.p2tr_ord_reveal((0, bip371_1.toXOnly)(tweakedTaprootKeyPair.publicKey), [
            payload,
        ]).script);
        const inscriberInfo = bitcoin.payments.p2tr({
            internalPubkey: (0, bip371_1.toXOnly)(tweakedTaprootKeyPair.publicKey),
            scriptTree: {
                output: script,
            },
            network: provider.network,
        });
        psbt.addOutput({
            value: 20000 + 546,
            address: inscriberInfo.address,
        });
        gatheredUtxos = (0, utils_1.findXAmountOfSats)(originalGatheredUtxos.utxos, 20000 + Number(utils_1.inscriptionSats));
        if (!fee && gatheredUtxos.utxos.length > 1) {
            const txSize = (0, btc_1.minimumFee)({
                taprootInputCount: gatheredUtxos.utxos.length,
                nonTaprootInputCount: 0,
                outputCount: 2,
            });
            finalFee = txSize * feeRate < 250 ? 250 : txSize * feeRate;
            if (gatheredUtxos.totalAmount < finalFee) {
                gatheredUtxos = (0, utils_1.findXAmountOfSats)(originalGatheredUtxos.utxos, 20000 + Number(utils_1.inscriptionSats));
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
        const changeAmount = gatheredUtxos.totalAmount - (finalFee + 20000 + utils_1.inscriptionSats);
        psbt.addOutput({
            address: account[account.spendStrategy.changeAddress].address,
            value: changeAmount,
        });
        const formattedPsbtTx = await (0, utils_1.formatInputsToSign)({
            _psbt: psbt,
            senderPublicKey: account.taproot.pubkey,
            network: provider.network,
        });
        return { psbt: formattedPsbtTx.toBase64(), script };
    }
    catch (error) {
        throw new errors_1.OylTransactionError(error);
    }
};
exports.createDeployCommit = createDeployCommit;
const createDeployReveal = async ({ createReserveNumber, receiverAddress, script, feeRate, tweakedTaprootKeyPair, provider, fee = 0, commitTxId, }) => {
    try {
        if (!feeRate) {
            feeRate = (await provider.esplora.getFeeEstimates())['1'];
        }
        const psbt = new bitcoin.Psbt({ network: provider.network });
        const minFee = (0, btc_1.minimumFee)({
            taprootInputCount: 1,
            nonTaprootInputCount: 0,
            outputCount: 2,
        });
        const revealTxBaseFee = minFee * feeRate < 250 ? 250 : minFee * feeRate;
        const revealTxChange = fee === 0 ? 0 : Number(revealTxBaseFee) - fee;
        const commitTxOutput = await (0, utils_1.getOutputValueByVOutIndex)({
            txId: commitTxId,
            vOut: 0,
            esploraRpc: provider.esplora,
        });
        if (!commitTxOutput) {
            throw new Error('Error getting vin #0 value');
        }
        const protostone = (0, index_js_1.encodeRunestoneProtostone)({
            protostones: [
                envelope.ProtoStone.message({
                    protocolTag: 1n,
                    edicts: [],
                    pointer: 0,
                    refundPointer: 0,
                    calldata: envelope.encipher([
                        BigInt(3),
                        BigInt(createReserveNumber),
                        BigInt(100),
                    ]),
                }),
            ],
        }).encodedRunestone;
        const p2pk_redeem = { output: script };
        const { output, witness } = bitcoin.payments.p2tr({
            internalPubkey: (0, bip371_1.toXOnly)(tweakedTaprootKeyPair.publicKey),
            scriptTree: p2pk_redeem,
            redeem: p2pk_redeem,
            network: provider.network,
        });
        psbt.addInput({
            hash: commitTxId,
            index: 0,
            witnessUtxo: {
                value: commitTxOutput.value,
                script: output,
            },
            tapLeafScript: [
                {
                    leafVersion: bip341_1.LEAF_VERSION_TAPSCRIPT,
                    script: p2pk_redeem.output,
                    controlBlock: witness[witness.length - 1],
                },
            ],
        });
        psbt.addOutput({
            value: 546,
            address: receiverAddress,
        });
        psbt.addOutput({
            value: 0,
            script: protostone,
        });
        if (revealTxChange > 546) {
            psbt.addOutput({
                value: revealTxChange,
                address: receiverAddress,
            });
        }
        psbt.signInput(0, tweakedTaprootKeyPair);
        psbt.finalizeInput(0);
        return {
            psbt: psbt.toBase64(),
            psbtHex: psbt.extractTransaction().toHex(),
            fee: revealTxChange,
        };
    }
    catch (error) {
        throw new errors_1.OylTransactionError(error);
    }
};
exports.createDeployReveal = createDeployReveal;
// export const findRuneUtxos = async ({
//   address,
//   greatestToLeast,
//   provider,
//   runeId,
//   targetNumberOfRunes,
// }: {
//   address: string
//   greatestToLeast: boolean
//   provider: Provider
//   runeId: string
//   targetNumberOfRunes: number
// }) => {
//   const runeUtxos: RuneUTXO[] = []
//   const runeUtxoOutpoints: any[] = await provider.api.getRuneOutpoints({
//     address: address,
//   })
//   if (greatestToLeast) {
//     runeUtxoOutpoints?.sort((a, b) => b.satoshis - a.satoshis)
//   } else {
//     runeUtxoOutpoints?.sort((a, b) => a.satoshis - b.satoshis)
//   }
//   let runeTotalSatoshis: number = 0
//   let runeTotalAmount: number = 0
//   let divisibility: number
//   for (const rune of runeUtxoOutpoints) {
//     if (runeTotalAmount < targetNumberOfRunes) {
//       const index = rune.rune_ids.indexOf(runeId)
//       if (index !== -1) {
//         const txSplit = rune.output.split(':')
//         const txHash = txSplit[0]
//         const txIndex = txSplit[1]
//         const txDetails = await provider.esplora.getTxInfo(txHash)
//         if (!txDetails?.vout || txDetails.vout.length < 1) {
//           throw new Error('Unable to find rune utxo')
//         }
//         const outputId = `${txHash}:${txIndex}`
//         const [inscriptionsOnOutput] = await Promise.all([
//           provider.ord.getTxOutput(outputId),
//         ])
//         if (inscriptionsOnOutput.inscriptions.length > 0) {
//           throw new Error(
//             'Unable to send from UTXO with multiple inscriptions. Split UTXO before sending.'
//           )
//         }
//         const satoshis = txDetails.vout[txIndex].value
//         const holderAddress = rune.wallet_addr
//         runeUtxos.push({
//           txId: txHash,
//           txIndex: txIndex,
//           script: rune.pkscript,
//           address: holderAddress,
//           amountOfRunes: rune.balances[index],
//           satoshis,
//         })
//         runeTotalSatoshis += satoshis
//         runeTotalAmount += rune.balances[index] / 10 ** rune.decimals[index]
//         if (divisibility === undefined) {
//           divisibility = rune.decimals[index]
//         }
//       }
//     } else {
//       break
//     }
//   }
//   return { runeUtxos, runeTotalSatoshis, divisibility }
// }
// export const actualSendFee = async ({
//   gatheredUtxos,
//   account,
//   runeId,
//   provider,
//   inscriptionAddress = account.taproot.address,
//   toAddress,
//   amount,
//   feeRate,
//   signer,
// }: {
//   gatheredUtxos: GatheredUtxos
//   account: Account
//   runeId: string
//   provider: Provider
//   inscriptionAddress?: string
//   toAddress: string
//   amount: number
//   feeRate?: number
//   signer: Signer
// }) => {
//   if (!feeRate) {
//     feeRate = (await provider.esplora.getFeeEstimates())['1']
//   }
//   const { psbt } = await createSendPsbt({
//     gatheredUtxos,
//     account,
//     runeId,
//     provider,
//     inscriptionAddress,
//     toAddress,
//     amount,
//     feeRate,
//   })
//   const { signedPsbt } = await signer.signAllInputs({
//     rawPsbt: psbt,
//     finalize: true,
//   })
//   let rawPsbt = bitcoin.Psbt.fromBase64(signedPsbt, {
//     network: account.network,
//   })
//   const signedHexPsbt = rawPsbt.extractTransaction().toHex()
//   const vsize = (
//     await provider.sandshrew.bitcoindRpc.testMemPoolAccept([signedHexPsbt])
//   )[0].vsize
//   const correctFee = vsize * feeRate
//   const { psbt: finalPsbt } = await createSendPsbt({
//     gatheredUtxos,
//     account,
//     runeId,
//     provider,
//     inscriptionAddress,
//     toAddress,
//     amount,
//     feeRate,
//     fee: correctFee,
//   })
//   const { signedPsbt: signedAll } = await signer.signAllInputs({
//     rawPsbt: finalPsbt,
//     finalize: true,
//   })
//   let finalRawPsbt = bitcoin.Psbt.fromBase64(signedAll, {
//     network: account.network,
//   })
//   const finalSignedHexPsbt = finalRawPsbt.extractTransaction().toHex()
//   const finalVsize = (
//     await provider.sandshrew.bitcoindRpc.testMemPoolAccept([finalSignedHexPsbt])
//   )[0].vsize
//   const finalFee = finalVsize * feeRate
//   return { fee: finalFee }
// }
// export const actualMintFee = async ({
//   gatheredUtxos,
//   account,
//   runeId,
//   provider,
//   feeRate,
//   signer,
// }: {
//   gatheredUtxos: GatheredUtxos
//   account: Account
//   runeId: string
//   provider: Provider
//   feeRate?: number
//   signer: Signer
// }) => {
//   if (!feeRate) {
//     feeRate = (await provider.esplora.getFeeEstimates())['1']
//   }
//   const { psbt } = await createMintPsbt({
//     gatheredUtxos,
//     account,
//     runeId,
//     provider,
//     feeRate,
//   })
//   const { signedPsbt } = await signer.signAllInputs({
//     rawPsbt: psbt,
//     finalize: true,
//   })
//   let rawPsbt = bitcoin.Psbt.fromBase64(signedPsbt, {
//     network: account.network,
//   })
//   const signedHexPsbt = rawPsbt.extractTransaction().toHex()
//   const vsize = (
//     await provider.sandshrew.bitcoindRpc.testMemPoolAccept([signedHexPsbt])
//   )[0].vsize
//   const correctFee = vsize * feeRate
//   const { psbt: finalPsbt } = await createMintPsbt({
//     gatheredUtxos,
//     account,
//     runeId,
//     provider,
//     feeRate,
//     fee: correctFee,
//   })
//   const { signedPsbt: signedAll } = await signer.signAllInputs({
//     rawPsbt: finalPsbt,
//     finalize: true,
//   })
//   let finalRawPsbt = bitcoin.Psbt.fromBase64(signedAll, {
//     network: account.network,
//   })
//   const finalSignedHexPsbt = finalRawPsbt.extractTransaction().toHex()
//   const finalVsize = (
//     await provider.sandshrew.bitcoindRpc.testMemPoolAccept([finalSignedHexPsbt])
//   )[0].vsize
//   const finalFee = finalVsize * feeRate
//   return { fee: finalFee }
// }
const actualDeployCommitFee = async ({ payload, tweakedTaprootKeyPair, gatheredUtxos, account, provider, feeRate, signer, }) => {
    if (!feeRate) {
        feeRate = (await provider.esplora.getFeeEstimates())['1'];
    }
    const { psbt } = await (0, exports.createDeployCommit)({
        payload,
        gatheredUtxos,
        tweakedTaprootKeyPair,
        account,
        provider,
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
    const { psbt: finalPsbt } = await (0, exports.createDeployCommit)({
        payload,
        gatheredUtxos,
        tweakedTaprootKeyPair,
        account,
        provider,
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
exports.actualDeployCommitFee = actualDeployCommitFee;
const actualDeployRevealFee = async ({ createReserveNumber, tweakedTaprootKeyPair, commitTxId, receiverAddress, script, provider, feeRate, }) => {
    if (!feeRate) {
        feeRate = (await provider.esplora.getFeeEstimates())['1'];
    }
    const { psbtHex } = await (0, exports.createDeployReveal)({
        createReserveNumber,
        commitTxId,
        receiverAddress,
        script,
        tweakedTaprootKeyPair,
        provider,
        feeRate,
    });
    const vsize = (await provider.sandshrew.bitcoindRpc.testMemPoolAccept([psbtHex]))[0].vsize;
    console.log(await provider.sandshrew.bitcoindRpc.testMemPoolAccept([psbtHex]));
    const correctFee = vsize * feeRate;
    console.log(correctFee);
    const { psbtHex: finalPsbtHex } = await (0, exports.createDeployReveal)({
        createReserveNumber,
        commitTxId,
        receiverAddress,
        script,
        tweakedTaprootKeyPair,
        provider,
        feeRate,
        fee: correctFee,
    });
    const finalVsize = (await provider.sandshrew.bitcoindRpc.testMemPoolAccept([finalPsbtHex]))[0].vsize;
    const finalFee = finalVsize * feeRate;
    return { fee: finalFee };
};
exports.actualDeployRevealFee = actualDeployRevealFee;
const actualExecuteFee = async ({ gatheredUtxos, account, calldata, provider, feeRate, signer, }) => {
    if (!feeRate) {
        feeRate = (await provider.esplora.getFeeEstimates())['1'];
    }
    const { psbt } = await (0, exports.createExecutePsbt)({
        gatheredUtxos,
        account,
        calldata,
        provider,
        feeRate,
    });
    const { signedPsbt } = await signer.signAllInputs({
        rawPsbt: psbt,
        finalize: true,
    });
    let rawPsbt = bitcoin.Psbt.fromBase64(signedPsbt, {
        network: account.network,
    })
        .extractTransaction()
        .toHex();
    const vsize = (await provider.sandshrew.bitcoindRpc.testMemPoolAccept([rawPsbt]))[0].vsize;
    const correctFee = vsize * feeRate;
    const { psbt: finalPsbt } = await (0, exports.createExecutePsbt)({
        gatheredUtxos,
        account,
        calldata,
        provider,
        feeRate,
        fee: correctFee,
    });
    const { signedPsbt: finalSignedPsbt } = await signer.signAllInputs({
        rawPsbt: finalPsbt,
        finalize: true,
    });
    let finalRawPsbt = bitcoin.Psbt.fromBase64(finalSignedPsbt, {
        network: account.network,
    })
        .extractTransaction()
        .toHex();
    const finalVsize = (await provider.sandshrew.bitcoindRpc.testMemPoolAccept([finalRawPsbt]))[0].vsize;
    const finalFee = finalVsize * feeRate;
    return { fee: finalFee };
};
exports.actualExecuteFee = actualExecuteFee;
// export const send = async ({
//   gatheredUtxos,
//   toAddress,
//   amount,
//   runeId,
//   inscriptionAddress,
//   feeRate,
//   account,
//   provider,
//   signer,
// }: {
//   gatheredUtxos: GatheredUtxos
//   toAddress: string
//   amount: number
//   runeId: string
//   inscriptionAddress?: string
//   feeRate?: number
//   account: Account
//   provider: Provider
//   signer: Signer
// }) => {
//   if (!inscriptionAddress) {
//     inscriptionAddress = account.taproot.address
//   }
//   const { fee } = await actualSendFee({
//     gatheredUtxos,
//     account,
//     runeId,
//     amount,
//     provider,
//     toAddress,
//     inscriptionAddress,
//     feeRate,
//     signer,
//   })
//   const { psbt: finalPsbt } = await createSendPsbt({
//     gatheredUtxos,
//     account,
//     runeId,
//     amount,
//     provider,
//     toAddress,
//     inscriptionAddress,
//     feeRate,
//     fee,
//   })
//   const { signedPsbt } = await signer.signAllInputs({
//     rawPsbt: finalPsbt,
//     finalize: true,
//   })
//   const result = await provider.pushPsbt({
//     psbtBase64: signedPsbt,
//   })
//   return result
// }
// export const mint = async ({
//   gatheredUtxos,
//   account,
//   runeId,
//   provider,
//   feeRate,
//   signer,
// }: {
//   gatheredUtxos: GatheredUtxos
//   account: Account
//   runeId: string
//   provider: Provider
//   feeRate?: number
//   signer: Signer
// }) => {
//   const { fee } = await actualMintFee({
//     gatheredUtxos,
//     account,
//     runeId,
//     provider,
//     feeRate,
//     signer,
//   })
//   const { psbt: finalPsbt } = await createMintPsbt({
//     gatheredUtxos,
//     account,
//     runeId,
//     provider,
//     feeRate,
//     fee: fee,
//   })
//   const { signedPsbt } = await signer.signAllInputs({
//     rawPsbt: finalPsbt,
//     finalize: true,
//   })
//   const result = await provider.pushPsbt({
//     psbtBase64: signedPsbt,
//   })
//   return result
// }
const deployCommit = async ({ payload, gatheredUtxos, account, provider, feeRate, signer, }) => {
    const tweakedTaprootKeyPair = (0, utils_1.tweakSigner)(signer.taprootKeyPair, {
        network: provider.network,
    });
    const { fee: commitFee } = await (0, exports.actualDeployCommitFee)({
        gatheredUtxos,
        tweakedTaprootKeyPair,
        account,
        provider,
        feeRate,
        signer,
    });
    const { psbt: finalPsbt, script } = await (0, exports.createDeployCommit)({
        payload,
        gatheredUtxos,
        tweakedTaprootKeyPair,
        account,
        provider,
        feeRate,
        fee: commitFee,
    });
    const { signedPsbt } = await signer.signAllInputs({
        rawPsbt: finalPsbt,
        finalize: true,
    });
    const result = await provider.pushPsbt({
        psbtBase64: signedPsbt,
    });
    return { ...result, script: script.toString('hex') };
};
exports.deployCommit = deployCommit;
const deployReveal = async ({ createReserveNumber, commitTxId, script, account, provider, feeRate, signer, }) => {
    const tweakedTaprootKeyPair = (0, utils_1.tweakSigner)(signer.taprootKeyPair, {
        network: provider.network,
    });
    const { fee } = await (0, exports.actualDeployRevealFee)({
        createReserveNumber,
        tweakedTaprootKeyPair,
        receiverAddress: account.taproot.address,
        commitTxId,
        script: Buffer.from(script, 'hex'),
        provider,
        feeRate,
    });
    const { psbt: finalRevealPsbt } = await (0, exports.createDeployReveal)({
        createReserveNumber,
        tweakedTaprootKeyPair,
        receiverAddress: account.taproot.address,
        commitTxId,
        script: Buffer.from(script, 'hex'),
        provider,
        feeRate,
        fee,
    });
    const revealResult = await provider.pushPsbt({
        psbtBase64: finalRevealPsbt,
    });
    return revealResult;
};
exports.deployReveal = deployReveal;
const execute = async ({ gatheredUtxos, account, calldata, provider, feeRate, signer, }) => {
    const { fee } = await (0, exports.actualExecuteFee)({
        gatheredUtxos,
        account,
        calldata,
        provider,
        feeRate,
        signer,
    });
    const { psbt: finalPsbt } = await (0, exports.createExecutePsbt)({
        gatheredUtxos,
        account,
        calldata,
        provider,
        feeRate,
        fee,
    });
    const { signedPsbt } = await signer.signAllInputs({
        rawPsbt: finalPsbt,
        finalize: true,
    });
    const revealResult = await provider.pushPsbt({
        psbtBase64: signedPsbt,
    });
    return revealResult;
};
exports.execute = execute;
//# sourceMappingURL=alkanes.js.map