import { minimumFee } from '../btc/btc'
import { Provider } from '../provider/provider'
import * as bitcoin from 'bitcoinjs-lib'
import * as envelope from 'alkanes/lib/index.js'
import { Account } from '../account/account'
import {
  findXAmountOfSats,
  formatInputsToSign,
  getOutputValueByVOutIndex,
  inscriptionSats,
  tweakSigner,
} from '../shared/utils'
import { OylTransactionError } from '../errors'
import { GatheredUtxos, AlkanesPayload, RuneUTXO } from '../shared/interface'
import { getAddressType } from '../shared/utils'
import { Signer } from '../signer'
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371'
import { LEAF_VERSION_TAPSCRIPT } from 'bitcoinjs-lib/src/payments/bip341'
import path from 'path'
import fs from 'fs-extra'
import { gzip as _gzip } from 'node:zlib'
import { promisify } from 'util'
import { encodeRunestoneProtostone } from 'alkanes/lib/index.js'

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

export const createExecutePsbt = async ({
  gatheredUtxos,
  account,
  calldata,
  provider,
  feeRate,
  fee = 0,
}: {
  gatheredUtxos: GatheredUtxos
  account: Account
  calldata: bigint[]
  provider: Provider
  feeRate?: number
  fee?: number
}) => {
  try {
    const originalGatheredUtxos = gatheredUtxos

    const minTxSize = minimumFee({
      taprootInputCount: 2,
      nonTaprootInputCount: 0,
      outputCount: 2,
    })

    let calculatedFee = Math.max(minTxSize * feeRate, 250)
    let finalFee = fee === 0 ? calculatedFee : fee

    gatheredUtxos = findXAmountOfSats(
      originalGatheredUtxos.utxos,
      Number(finalFee)
    )

    let psbt = new bitcoin.Psbt({ network: provider.network })

    if (fee === 0 && gatheredUtxos.utxos.length > 1) {
      const txSize = minimumFee({
        taprootInputCount: gatheredUtxos.utxos.length,
        nonTaprootInputCount: 0,
        outputCount: 2,
      })
      finalFee = txSize * feeRate < 250 ? 250 : txSize * feeRate

      if (gatheredUtxos.totalAmount < finalFee) {
        throw new OylTransactionError(Error('Insufficient Balance'))
      }
    }

    if (gatheredUtxos.totalAmount < finalFee) {
      throw new OylTransactionError(Error('Insufficient Balance'))
    }
    for (let i = 0; i < gatheredUtxos.utxos.length; i++) {
      if (getAddressType(gatheredUtxos.utxos[i].address) === 0) {
        const previousTxHex: string = await provider.esplora.getTxHex(
          gatheredUtxos.utxos[i].txId
        )
        psbt.addInput({
          hash: gatheredUtxos.utxos[i].txId,
          index: gatheredUtxos.utxos[i].outputIndex,
          nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
        })
      }
      if (getAddressType(gatheredUtxos.utxos[i].address) === 2) {
        const redeemScript = bitcoin.script.compile([
          bitcoin.opcodes.OP_0,
          bitcoin.crypto.hash160(
            Buffer.from(account.nestedSegwit.pubkey, 'hex')
          ),
        ])

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
        })
      }
      if (
        getAddressType(gatheredUtxos.utxos[i].address) === 1 ||
        getAddressType(gatheredUtxos.utxos[i].address) === 3
      ) {
        psbt.addInput({
          hash: gatheredUtxos.utxos[i].txId,
          index: gatheredUtxos.utxos[i].outputIndex,
          witnessUtxo: {
            value: gatheredUtxos.utxos[i].satoshis,
            script: Buffer.from(gatheredUtxos.utxos[i].scriptPk, 'hex'),
          },
        })
      }
    }
    
    psbt.addOutput({
      value: 546,
        address: account.taproot.address,
    });

    const script = encodeRunestoneProtostone({
      protostones: [
        envelope.ProtoStone.message({
          protocolTag: 1n,
          edicts: [],
          pointer: 0,
          refundPointer: 0,
          calldata: envelope.encipher(calldata),
        }),
      ],
    }).encodedRunestone

    const output = { script, value: 0 }
    psbt.addOutput(output)

    const changeAmount = gatheredUtxos.totalAmount - finalFee

    psbt.addOutput({
      address: account[account.spendStrategy.changeAddress].address,
      value: changeAmount,
    })

    const formattedPsbtTx = await formatInputsToSign({
      _psbt: psbt,
      senderPublicKey: account.taproot.pubkey,
      network: provider.network,
    })

    return {
      psbt: formattedPsbtTx.toBase64(),
      psbtHex: formattedPsbtTx.toHex(),
    }
  } catch (error) {
    throw new OylTransactionError(error)
  }
}

export const createDeployCommit = async ({
  payload,
  gatheredUtxos,
  tweakedTaprootKeyPair,
  account,
  provider,
  feeRate,
  fee,
}: {
  payload?: AlkanesPayload
  gatheredUtxos: GatheredUtxos
  tweakedTaprootKeyPair: bitcoin.Signer
  account: Account
  provider: Provider
  feeRate?: number
  fee?: number
}) => {
  try {
    const originalGatheredUtxos = gatheredUtxos

    const minFee = minimumFee({
      taprootInputCount: 2,
      nonTaprootInputCount: 0,
      outputCount: 2,
    })
    const calculatedFee = minFee * feeRate < 250 ? 250 : minFee * feeRate
    let finalFee = fee ? fee : calculatedFee

    let psbt = new bitcoin.Psbt({ network: provider.network })

    if (!payload) { 
      const binary = new Uint8Array(
        Array.from(
          await fs.readFile(path.join(__dirname, './', 'free_mint.wasm'))
        )
      )
      const gzip = promisify(_gzip)

      payload = {
        body: await gzip(binary, { level: 9 }),
        cursed: false,
        tags: { contentType: '' },
      }
    }

    const script = Buffer.from(
      envelope.p2tr_ord_reveal(toXOnly(tweakedTaprootKeyPair.publicKey), [
        payload,
      ]).script
    )

    const inscriberInfo = bitcoin.payments.p2tr({
      internalPubkey: toXOnly(tweakedTaprootKeyPair.publicKey),
      scriptTree: {
        output: script,
      },
      network: provider.network,
    })

    psbt.addOutput({
      value: 20000 + 546,
      address: inscriberInfo.address,
    })

    gatheredUtxos = findXAmountOfSats(
      originalGatheredUtxos.utxos,
      20000 + Number(inscriptionSats)
    )

    if (!fee && gatheredUtxos.utxos.length > 1) {
      const txSize = minimumFee({
        taprootInputCount: gatheredUtxos.utxos.length,
        nonTaprootInputCount: 0,
        outputCount: 2,
      })
      finalFee = txSize * feeRate < 250 ? 250 : txSize * feeRate

      if (gatheredUtxos.totalAmount < finalFee) {
        gatheredUtxos = findXAmountOfSats(
          originalGatheredUtxos.utxos,
          20000 + Number(inscriptionSats)
        )
      }
    }

    for (let i = 0; i < gatheredUtxos.utxos.length; i++) {
      if (getAddressType(gatheredUtxos.utxos[i].address) === 0) {
        const previousTxHex: string = await provider.esplora.getTxHex(
          gatheredUtxos.utxos[i].txId
        )
        psbt.addInput({
          hash: gatheredUtxos.utxos[i].txId,
          index: gatheredUtxos.utxos[i].outputIndex,
          nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
        })
      }
      if (getAddressType(gatheredUtxos.utxos[i].address) === 2) {
        const redeemScript = bitcoin.script.compile([
          bitcoin.opcodes.OP_0,
          bitcoin.crypto.hash160(
            Buffer.from(account.nestedSegwit.pubkey, 'hex')
          ),
        ])

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
        })
      }
      if (
        getAddressType(gatheredUtxos.utxos[i].address) === 1 ||
        getAddressType(gatheredUtxos.utxos[i].address) === 3
      ) {
        psbt.addInput({
          hash: gatheredUtxos.utxos[i].txId,
          index: gatheredUtxos.utxos[i].outputIndex,
          witnessUtxo: {
            value: gatheredUtxos.utxos[i].satoshis,
            script: Buffer.from(gatheredUtxos.utxos[i].scriptPk, 'hex'),
          },
        })
      }
    }

    if (gatheredUtxos.totalAmount < finalFee + inscriptionSats) {
      throw new OylTransactionError(Error('Insufficient Balance'))
    }

    const changeAmount =
      gatheredUtxos.totalAmount - (finalFee + 20000 + inscriptionSats)

    psbt.addOutput({
      address: account[account.spendStrategy.changeAddress].address,
      value: changeAmount,
    })

    const formattedPsbtTx = await formatInputsToSign({
      _psbt: psbt,
      senderPublicKey: account.taproot.pubkey,
      network: provider.network,
    })

    return { psbt: formattedPsbtTx.toBase64(), script }
  } catch (error) {
    throw new OylTransactionError(error)
  }
}

export const createDeployReveal = async ({
  createReserveNumber,
  receiverAddress,
  script,
  feeRate,
  tweakedTaprootKeyPair,
  provider,
  fee = 0,
  commitTxId,
}: {
  createReserveNumber: string
  receiverAddress: string
  script: Buffer
  feeRate: number
  tweakedTaprootKeyPair: bitcoin.Signer
  provider: Provider
  fee?: number
  commitTxId: string
}) => {
  try {
    if (!feeRate) {
      feeRate = (await provider.esplora.getFeeEstimates())['1']
    }

    const psbt: bitcoin.Psbt = new bitcoin.Psbt({ network: provider.network })
    const minFee = minimumFee({
      taprootInputCount: 1,
      nonTaprootInputCount: 0,
      outputCount: 2,
    })

    const revealTxBaseFee = minFee * feeRate < 250 ? 250 : minFee * feeRate
    const revealTxChange = fee === 0 ? 0 : Number(revealTxBaseFee) - fee

    const commitTxOutput = await getOutputValueByVOutIndex({
      txId: commitTxId,
      vOut: 0,
      esploraRpc: provider.esplora,
    })

    if (!commitTxOutput) {
      throw new Error('Error getting vin #0 value')
    }

    const protostone = encodeRunestoneProtostone({
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
    }).encodedRunestone

    const p2pk_redeem = { output: script }

    const { output, witness } = bitcoin.payments.p2tr({
      internalPubkey: toXOnly(tweakedTaprootKeyPair.publicKey),
      scriptTree: p2pk_redeem,
      redeem: p2pk_redeem,
      network: provider.network,
    })

    psbt.addInput({
      hash: commitTxId,
      index: 0,
      witnessUtxo: {
        value: commitTxOutput.value,
        script: output,
      },
      tapLeafScript: [
        {
          leafVersion: LEAF_VERSION_TAPSCRIPT,
          script: p2pk_redeem.output,
          controlBlock: witness![witness!.length - 1],
        },
      ],
    })

    psbt.addOutput({
      value: 546,
      address: receiverAddress,
    })

    psbt.addOutput({
      value: 0,
      script: protostone,
    })

    if (revealTxChange > 546) {
      psbt.addOutput({
        value: revealTxChange,
        address: receiverAddress,
      })
    }

    psbt.signInput(0, tweakedTaprootKeyPair)
    psbt.finalizeInput(0)

    return {
      psbt: psbt.toBase64(),
      psbtHex: psbt.extractTransaction().toHex(),
      fee: revealTxChange,
    }
  } catch (error) {
    throw new OylTransactionError(error)
  }
}

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

export const actualDeployCommitFee = async ({
  payload,
  tweakedTaprootKeyPair,
  gatheredUtxos,
  account,
  provider,
  feeRate,
  signer,
}: {
  payload?: AlkanesPayload
  tweakedTaprootKeyPair: bitcoin.Signer
  gatheredUtxos: GatheredUtxos
  account: Account
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  if (!feeRate) {
    feeRate = (await provider.esplora.getFeeEstimates())['1']
  }

  const { psbt } = await createDeployCommit({
    payload,
    gatheredUtxos,
    tweakedTaprootKeyPair,
    account,
    provider,
    feeRate,
  })
  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: psbt,
    finalize: true,
  })

  let rawPsbt = bitcoin.Psbt.fromBase64(signedPsbt, {
    network: account.network,
  })

  const signedHexPsbt = rawPsbt.extractTransaction().toHex()

  const vsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([signedHexPsbt])
  )[0].vsize

  const correctFee = vsize * feeRate

  const { psbt: finalPsbt } = await createDeployCommit({
    payload,
    gatheredUtxos,
    tweakedTaprootKeyPair,
    account,
    provider,
    feeRate,
    fee: correctFee,
  })

  const { signedPsbt: signedAll } = await signer.signAllInputs({
    rawPsbt: finalPsbt,
    finalize: true,
  })

  let finalRawPsbt = bitcoin.Psbt.fromBase64(signedAll, {
    network: account.network,
  })

  const finalSignedHexPsbt = finalRawPsbt.extractTransaction().toHex()

  const finalVsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([finalSignedHexPsbt])
  )[0].vsize

  const finalFee = finalVsize * feeRate

  return { fee: finalFee }
}

export const actualDeployRevealFee = async ({
  createReserveNumber,
  tweakedTaprootKeyPair,
  commitTxId,
  receiverAddress,
  script,
  provider,
  feeRate,
}: {
  createReserveNumber: string
  tweakedTaprootKeyPair: bitcoin.Signer
  commitTxId: string
  receiverAddress: string
  script: Buffer
  provider: Provider
  feeRate?: number
}) => {
  if (!feeRate) {
    feeRate = (await provider.esplora.getFeeEstimates())['1']
  }

  const { psbtHex } = await createDeployReveal({
    createReserveNumber,
    commitTxId,
    receiverAddress,
    script,
    tweakedTaprootKeyPair,
    provider,
    feeRate,
  })

  const vsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([psbtHex])
  )[0].vsize

  console.log(await provider.sandshrew.bitcoindRpc.testMemPoolAccept([psbtHex]))

  const correctFee = vsize * feeRate

  console.log(correctFee)

  const { psbtHex: finalPsbtHex } = await createDeployReveal({
    createReserveNumber,
    commitTxId,
    receiverAddress,
    script,
    tweakedTaprootKeyPair,
    provider,
    feeRate,
    fee: correctFee,
  })

  const finalVsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([finalPsbtHex])
  )[0].vsize

  const finalFee = finalVsize * feeRate

  return { fee: finalFee }
}

export const actualExecuteFee = async ({
  gatheredUtxos,
  account,
  calldata,
  provider,
  feeRate,
  signer,
}: {
  gatheredUtxos: GatheredUtxos
  account: Account
  calldata: bigint[]
  provider: Provider
  feeRate: number
  signer: Signer
}) => {
  if (!feeRate) {
    feeRate = (await provider.esplora.getFeeEstimates())['1']
  }

  const { psbt } = await createExecutePsbt({
    gatheredUtxos,
    account,
    calldata,
    provider,
    feeRate,
  })

  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: psbt,
    finalize: true,
  })

  let rawPsbt = bitcoin.Psbt.fromBase64(signedPsbt, {
    network: account.network,
  })
    .extractTransaction()
    .toHex()

  const vsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([rawPsbt])
  )[0].vsize

  const correctFee = vsize * feeRate

  const { psbt: finalPsbt } = await createExecutePsbt({
    gatheredUtxos,
    account,
    calldata,
    provider,
    feeRate,
    fee: correctFee,
  })

  const { signedPsbt: finalSignedPsbt } = await signer.signAllInputs({
    rawPsbt: finalPsbt,
    finalize: true,
  })

  let finalRawPsbt = bitcoin.Psbt.fromBase64(finalSignedPsbt, {
    network: account.network,
  })
    .extractTransaction()
    .toHex()

  const finalVsize = (
    await provider.sandshrew.bitcoindRpc.testMemPoolAccept([finalRawPsbt])
  )[0].vsize

  const finalFee = finalVsize * feeRate

  return { fee: finalFee }
}

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

export const deployCommit = async ({
  payload,
  gatheredUtxos,
  account,
  provider,
  feeRate,
  signer,
}: {
  payload?: AlkanesPayload
  gatheredUtxos: GatheredUtxos
  account: Account
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  const tweakedTaprootKeyPair: bitcoin.Signer = tweakSigner(
    signer.taprootKeyPair,
    {
      network: provider.network,
    }
  )
  const { fee: commitFee } = await actualDeployCommitFee({
    gatheredUtxos,
    tweakedTaprootKeyPair,
    account,
    provider,
    feeRate,
    signer,
  })

  const { psbt: finalPsbt, script } = await createDeployCommit({
    payload,
    gatheredUtxos,
    tweakedTaprootKeyPair,
    account,
    provider,
    feeRate,
    fee: commitFee,
  })

  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: finalPsbt,
    finalize: true,
  })

  const result = await provider.pushPsbt({
    psbtBase64: signedPsbt,
  })

  return { ...result, script: script.toString('hex') }
}

export const deployReveal = async ({
  createReserveNumber,
  commitTxId,
  script,
  account,
  provider,
  feeRate,
  signer,
}: {
  createReserveNumber: string
  commitTxId: string
  script: string
  account: Account
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  const tweakedTaprootKeyPair: bitcoin.Signer = tweakSigner(
    signer.taprootKeyPair,
    {
      network: provider.network,
    }
  )

  const { fee } = await actualDeployRevealFee({
    createReserveNumber,
    tweakedTaprootKeyPair,
    receiverAddress: account.taproot.address,
    commitTxId,
    script: Buffer.from(script, 'hex'),
    provider,
    feeRate,
  })

  const { psbt: finalRevealPsbt } = await createDeployReveal({
    createReserveNumber,
    tweakedTaprootKeyPair,
    receiverAddress: account.taproot.address,
    commitTxId,
    script: Buffer.from(script, 'hex'),
    provider,
    feeRate,
    fee,
  })

  const revealResult = await provider.pushPsbt({
    psbtBase64: finalRevealPsbt,
  })

  return revealResult
}

export const execute = async ({
  gatheredUtxos,
  account,
  calldata,
  provider,
  feeRate,
  signer,
}: {
  gatheredUtxos: GatheredUtxos
  account: Account
  calldata: bigint[]
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  const { fee } = await actualExecuteFee({
    gatheredUtxos,
    account,
    calldata,
    provider,
    feeRate,
    signer,
  })

  const { psbt: finalPsbt } = await createExecutePsbt({
    gatheredUtxos,
    account,
    calldata,
    provider,
    feeRate,
    fee,
  })

  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: finalPsbt,
    finalize: true,
  })

  const revealResult = await provider.pushPsbt({
    psbtBase64: signedPsbt,
  })

  return revealResult
}
