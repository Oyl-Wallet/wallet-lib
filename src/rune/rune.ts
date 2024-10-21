import { minimumFee } from '../btc/btc'
import { Provider } from '../provider/provider'
import * as bitcoin from 'bitcoinjs-lib'
import { accountSpendableUtxos, accountUtxos } from '../utxo/utxo'
import { Account } from '../account/account'
import {
  createInscriptionScript,
  createRuneEtchScript,
  createRuneMintScript,
  createRuneSendScript,
  formatInputsToSign,
  getOutputValueByVOutIndex,
  hexToLittleEndian,
  inscriptionSats,
  runeFromStr,
  tweakSigner,
} from '../shared/utils'
import { OylTransactionError } from '../errors'
import { FormattedUtxo, GatheredUtxos, RuneUTXO } from '../shared/interface'
import { getAddressType } from '../shared/utils'
import { Signer } from '../signer'
import { toXOnly } from 'bitcoinjs-lib/src/psbt/bip371'
import { LEAF_VERSION_TAPSCRIPT } from 'bitcoinjs-lib/src/payments/bip341'
import { ECPairInterface } from 'ecpair'
import { encodeRunestone } from '@magiceden-oss/runestone-lib'

export const createSendPsbt = async ({
  gatheredUtxos,
  account,
  runeId,
  provider,
  inscriptionAddress = account.taproot.address,
  toAddress,
  amount,
  feeRate,
  fee,
}: {
  gatheredUtxos: GatheredUtxos
  account: Account
  runeId: string
  provider: Provider
  inscriptionAddress: string
  toAddress: string
  amount: number
  feeRate?: number
  fee?: number
}) => {
  try {
    const minFee = minimumFee({
      taprootInputCount: 2,
      nonTaprootInputCount: 0,
      outputCount: 3,
    })
    const calculatedFee = minFee * feeRate < 250 ? 250 : minFee * feeRate
    let finalFee = fee ? fee : calculatedFee

    if (!gatheredUtxos) {
      gatheredUtxos = await accountSpendableUtxos({
        account,
        provider,
        spendAmount: finalFee,
      })
    }

    let psbt = new bitcoin.Psbt({ network: provider.network })
    const { runeUtxos, runeTotalSatoshis, divisibility } = await findRuneUtxos({
      address: inscriptionAddress,
      greatestToLeast: account.spendStrategy.utxoSortGreatestToLeast,
      provider,
      runeId,
      targetNumberOfRunes: amount,
    })

    for await (const utxo of runeUtxos) {
      if (getAddressType(utxo.address) === 0) {
        const previousTxHex: string = await provider.esplora.getTxHex(utxo.txId)
        psbt.addInput({
          hash: utxo.txId,
          index: parseInt(utxo.txIndex),
          nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
        })
      }
      if (getAddressType(utxo.address) === 2) {
        const redeemScript = bitcoin.script.compile([
          bitcoin.opcodes.OP_0,
          bitcoin.crypto.hash160(
            Buffer.from(account.nestedSegwit.pubkey, 'hex')
          ),
        ])

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
        })
      }
      if (
        getAddressType(utxo.address) === 1 ||
        getAddressType(utxo.address) === 3
      ) {
        const previousTxInfo = await provider.esplora.getTxInfo(utxo.txId)

        psbt.addInput({
          hash: utxo.txId,
          index: parseInt(utxo.txIndex),
          witnessUtxo: {
            value: utxo.satoshis,
            script: Buffer.from(
              previousTxInfo.vout[utxo.txIndex].scriptpubkey,
              'hex'
            ),
          },
        })
      }
    }

    if (!fee && gatheredUtxos.utxos.length > 1) {
      const txSize = minimumFee({
        taprootInputCount: gatheredUtxos.utxos.length,
        nonTaprootInputCount: 0,
        outputCount: 3,
      })
      finalFee = txSize * feeRate < 250 ? 250 : txSize * feeRate

      if (gatheredUtxos.totalAmount < finalFee + inscriptionSats) {
        throw new OylTransactionError(Error('Insufficient Balance'))
      }
    }

    if (gatheredUtxos.totalAmount < finalFee + inscriptionSats) {
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

    const script = createRuneSendScript({
      runeId,
      amount,
      divisibility,
      sendOutputIndex: 2,
      pointer: 1,
    })
    const output = { script: script, value: 0 }
    psbt.addOutput(output)

    const changeAmount =
      gatheredUtxos.totalAmount - (finalFee + inscriptionSats)

    psbt.addOutput({
      value: inscriptionSats,
      address: account.taproot.address,
    })

    psbt.addOutput({
      value: runeTotalSatoshis,
      address: toAddress,
    })

    psbt.addOutput({
      address: account[account.spendStrategy.changeAddress].address,
      value: changeAmount,
    })

    const formattedPsbtTx = await formatInputsToSign({
      _psbt: psbt,
      senderPublicKey: account.taproot.pubkey,
      network: provider.network,
    })

    return { psbt: formattedPsbtTx.toBase64() }
  } catch (error) {
    throw new OylTransactionError(error)
  }
}

export const createMintPsbt = async ({
  gatheredUtxos,
  account,
  runeId,
  provider,
  feeRate,
  fee,
}: {
  gatheredUtxos: GatheredUtxos
  account: Account
  runeId: string
  provider: Provider
  feeRate?: number
  fee?: number
}) => {
  try {
    const minFee = minimumFee({
      taprootInputCount: 2,
      nonTaprootInputCount: 0,
      outputCount: 2,
    })
    const calculatedFee = minFee * feeRate < 250 ? 250 : minFee * feeRate
    let finalFee = fee ? fee : calculatedFee
    if (!gatheredUtxos) {
      gatheredUtxos = await accountSpendableUtxos({
        account,
        provider,
        spendAmount: finalFee,
      })
    }
    let psbt = new bitcoin.Psbt({ network: provider.network })

    if (!fee && gatheredUtxos.utxos.length > 1) {
      const txSize = minimumFee({
        taprootInputCount: gatheredUtxos.utxos.length,
        nonTaprootInputCount: 0,
        outputCount: 2,
      })
      finalFee = txSize * feeRate < 250 ? 250 : txSize * feeRate

      if (gatheredUtxos.totalAmount < finalFee + inscriptionSats) {
        throw new OylTransactionError(Error('Insufficient Balance'))
      }
    }

    if (gatheredUtxos.totalAmount < finalFee + inscriptionSats) {
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

    if (gatheredUtxos.totalAmount < finalFee + inscriptionSats) {
      throw new OylTransactionError(Error('Insufficient Balance'))
    }

    const script = createRuneMintScript({
      runeId,
      pointer: 1,
    })

    const output = { script, value: 0 }
    psbt.addOutput(output)

    const changeAmount =
      gatheredUtxos.totalAmount - (finalFee + inscriptionSats)

    psbt.addOutput({
      value: inscriptionSats,
      address: account.taproot.address,
    })

    psbt.addOutput({
      address: account[account.spendStrategy.changeAddress].address,
      value: changeAmount,
    })

    const formattedPsbtTx = await formatInputsToSign({
      _psbt: psbt,
      senderPublicKey: account.taproot.pubkey,
      network: provider.network,
    })

    return { psbt: formattedPsbtTx.toBase64() }
  } catch (error) {
    throw new OylTransactionError(error)
  }
}

export const createEtchCommit = async ({
  gatheredUtxos,
  taprootKeyPair,
  tweakedTaprootKeyPair,
  runeName,
  account,
  provider,
  feeRate,
  fee,
}: {
  gatheredUtxos: GatheredUtxos
  taprootKeyPair: bitcoin.Signer
  tweakedTaprootKeyPair: bitcoin.Signer
  runeName: string
  account: Account
  provider: Provider
  feeRate?: number
  fee?: number
}) => {
  try {
    const minFee = minimumFee({
      taprootInputCount: 2,
      nonTaprootInputCount: 0,
      outputCount: 2,
    })
    const calculatedFee = minFee * feeRate < 250 ? 250 : minFee * feeRate
    let finalFee = fee ? fee : calculatedFee

    let psbt = new bitcoin.Psbt({ network: provider.network })

    let runeNameHex = runeFromStr(runeName).toString(16)
    if (runeNameHex.length % 2 !== 0) {
      runeNameHex = '0' + runeNameHex
    }

    const runeNameLittleEndian = hexToLittleEndian(runeNameHex)
    const runeNameLittleEndianUint8 = Uint8Array.from(
      Buffer.from(runeNameLittleEndian, 'hex')
    )

    let script: bitcoin.Stack = [
      toXOnly(tweakedTaprootKeyPair.publicKey),
      bitcoin.opcodes.OP_CHECKSIG,
      bitcoin.opcodes.OP_0,
      bitcoin.opcodes.OP_IF,
      Buffer.from(runeNameLittleEndianUint8),
      bitcoin.opcodes.OP_ENDIF,
    ]

    const outputScript = bitcoin.script.compile(script)

    const inscriberInfo = bitcoin.payments.p2tr({
      internalPubkey: toXOnly(tweakedTaprootKeyPair.publicKey),
      scriptTree: { output: outputScript },
      network: provider.network,
    })

    psbt.addOutput({
      value: Number(finalFee) + 546,
      address: inscriberInfo.address,
    })

    if (!gatheredUtxos) {
      gatheredUtxos = await accountSpendableUtxos({
        account,
        provider,
        spendAmount: finalFee,
      })
    }

    if (!fee && gatheredUtxos.utxos.length > 1) {
      const txSize = minimumFee({
        taprootInputCount: gatheredUtxos.utxos.length,
        nonTaprootInputCount: 0,
        outputCount: 2,
      })
      finalFee = txSize * feeRate < 250 ? 250 : txSize * feeRate

      if (gatheredUtxos.totalAmount < finalFee) {
        gatheredUtxos = await accountSpendableUtxos({
          account,
          provider,
          spendAmount: finalFee + inscriptionSats,
        })
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
      gatheredUtxos.totalAmount - (finalFee * 2 + inscriptionSats)

    psbt.addOutput({
      address: account[account.spendStrategy.changeAddress].address,
      value: changeAmount,
    })

    const formattedPsbtTx = await formatInputsToSign({
      _psbt: psbt,
      senderPublicKey: account.taproot.pubkey,
      network: provider.network,
    })

    return { psbt: formattedPsbtTx.toBase64(), script: outputScript }
  } catch (error) {
    throw new OylTransactionError(error)
  }
}

export const createEtchReveal = async ({
  symbol,
  cap,
  premine,
  perMintAmount,
  turbo,
  divisibility,
  runeName,
  receiverAddress,
  script,
  feeRate,
  tweakedTaprootKeyPair,
  taprootKeyPair,
  provider,
  fee = 0,
  commitTxId,
}: {
  symbol: string
  cap: bigint
  premine: bigint
  perMintAmount: bigint
  turbo: boolean
  divisibility: number
  runeName: string
  receiverAddress: string
  script: Buffer
  feeRate: number
  tweakedTaprootKeyPair: bitcoin.Signer
  taprootKeyPair: bitcoin.Signer
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

    const runestone = encodeRunestone({
      etching: {
        runeName,
        divisibility,
        symbol,
        premine,
        terms: {
          cap,
          amount: perMintAmount,
        },
        turbo,
      },
      pointer: 1,
    }).encodedRunestone

    psbt.addOutput({
      value: 0,
      script: runestone,
    })

    psbt.addOutput({
      value: 546,
      address: receiverAddress,
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

export const findRuneUtxos = async ({
  address,
  greatestToLeast,
  provider,
  runeId,
  targetNumberOfRunes,
}: {
  address: string
  greatestToLeast: boolean
  provider: Provider
  runeId: string
  targetNumberOfRunes: number
}) => {
  const runeUtxos: RuneUTXO[] = []
  const runeUtxoOutpoints: any[] = await provider.api.getRuneOutpoints({
    address: address,
  })
  if (greatestToLeast) {
    runeUtxoOutpoints?.sort((a, b) => b.satoshis - a.satoshis)
  } else {
    runeUtxoOutpoints?.sort((a, b) => a.satoshis - b.satoshis)
  }
  let runeTotalSatoshis: number = 0
  let runeTotalAmount: number = 0
  let divisibility: number

  for (const rune of runeUtxoOutpoints) {
    if (runeTotalAmount < targetNumberOfRunes) {
      const index = rune.rune_ids.indexOf(runeId)
      if (index !== -1) {
        const txSplit = rune.output.split(':')
        const txHash = txSplit[0]
        const txIndex = txSplit[1]
        const txDetails = await provider.esplora.getTxInfo(txHash)

        if (!txDetails?.vout || txDetails.vout.length < 1) {
          throw new Error('Unable to find rune utxo')
        }

        const outputId = `${txHash}:${txIndex}`
        const [inscriptionsOnOutput, hasRune] = await Promise.all([
          provider.ord.getTxOutput(outputId),
          provider.api.getOutputRune({ output: outputId }),
        ])

        if (
          inscriptionsOnOutput.inscriptions.length > 0 ||
          Array.isArray(inscriptionsOnOutput.runes)
            ? Number(inscriptionsOnOutput.runes.length) > 1
            : Object.keys(inscriptionsOnOutput.runes).length > 1 ||
              hasRune?.rune_ids.length > 1
        ) {
          throw new Error(
            'Unable to send from UTXO with multiple inscriptions. Split UTXO before sending.'
          )
        }
        const satoshis = txDetails.vout[txIndex].value
        const holderAddress = rune.wallet_addr

        runeUtxos.push({
          txId: txHash,
          txIndex: txIndex,
          script: rune.pkscript,
          address: holderAddress,
          amountOfRunes: rune.balances[index],
          satoshis: satoshis,
        })
        runeTotalSatoshis += satoshis
        runeTotalAmount += rune.balances[index] / 10 ** rune.decimals[index]

        if (divisibility === undefined) {
          divisibility = rune.decimals[index]
        }
      }
    } else {
      break
    }
  }

  return { runeUtxos, runeTotalSatoshis, divisibility }
}

export const actualSendFee = async ({
  gatheredUtxos,
  account,
  runeId,
  provider,
  inscriptionAddress = account.taproot.address,
  toAddress,
  amount,
  feeRate,
  signer,
}: {
  gatheredUtxos: GatheredUtxos
  account: Account
  runeId: string
  provider: Provider
  inscriptionAddress?: string
  toAddress: string
  amount: number
  feeRate?: number
  signer: Signer
}) => {
  if (!feeRate) {
    feeRate = (await provider.esplora.getFeeEstimates())['1']
  }

  const { psbt } = await createSendPsbt({
    gatheredUtxos,
    account,
    runeId,
    provider,
    inscriptionAddress,
    toAddress,
    amount,
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

  const { psbt: finalPsbt } = await createSendPsbt({
    gatheredUtxos,
    account,
    runeId,
    provider,
    inscriptionAddress,
    toAddress,
    amount,
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

export const actualMintFee = async ({
  gatheredUtxos,
  account,
  runeId,
  provider,
  feeRate,
  signer,
}: {
  gatheredUtxos: GatheredUtxos
  account: Account
  runeId: string
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  if (!feeRate) {
    feeRate = (await provider.esplora.getFeeEstimates())['1']
  }

  const { psbt } = await createMintPsbt({
    gatheredUtxos,
    account,
    runeId,
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

  const { psbt: finalPsbt } = await createMintPsbt({
    gatheredUtxos,
    account,
    runeId,
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

export const actualEtchCommitFee = async ({
  tweakedTaprootKeyPair,
  taprootKeyPair,
  gatheredUtxos,
  account,
  runeName,
  provider,
  feeRate,
  signer,
}: {
  tweakedTaprootKeyPair: bitcoin.Signer
  taprootKeyPair: bitcoin.Signer
  gatheredUtxos: GatheredUtxos
  account: Account
  runeName: string
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  if (!feeRate) {
    feeRate = (await provider.esplora.getFeeEstimates())['1']
  }

  const { psbt } = await createEtchCommit({
    gatheredUtxos,
    taprootKeyPair,
    tweakedTaprootKeyPair,
    runeName,
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

  const { psbt: finalPsbt } = await createEtchCommit({
    gatheredUtxos,
    taprootKeyPair,
    tweakedTaprootKeyPair,
    runeName,
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

export const actualEtchRevealFee = async ({
  tweakedTaprootKeyPair,
  taprootKeyPair,
  symbol,
  cap,
  premine,
  perMintAmount,
  turbo,
  divisibility,
  runeName,
  commitTxId,
  receiverAddress,
  script,
  account,
  provider,
  feeRate,
  signer,
}: {
  tweakedTaprootKeyPair: bitcoin.Signer
  taprootKeyPair: bitcoin.Signer
  symbol: string
  cap: bigint
  premine: bigint
  perMintAmount: bigint
  turbo: boolean
  divisibility: number
  runeName: string
  commitTxId: string
  receiverAddress: string
  script: Buffer
  account: Account
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  if (!feeRate) {
    feeRate = (await provider.esplora.getFeeEstimates())['1']
  }

  const { psbt } = await createEtchReveal({
    taprootKeyPair,
    commitTxId,
    receiverAddress,
    script,
    tweakedTaprootKeyPair,
    symbol,
    cap,
    premine,
    perMintAmount,
    turbo,
    divisibility,
    runeName,
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

  const { psbt: finalPsbt } = await createEtchReveal({
    taprootKeyPair,
    commitTxId,
    receiverAddress,
    script,
    tweakedTaprootKeyPair,
    symbol,
    cap,
    premine,
    perMintAmount,
    turbo,
    divisibility,
    runeName,
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

export const send = async ({
  gatheredUtxos,
  toAddress,
  amount,
  runeId,
  inscriptionAddress,
  feeRate,
  account,
  provider,
  signer,
}: {
  gatheredUtxos: GatheredUtxos
  toAddress: string
  amount: number
  runeId: string
  inscriptionAddress?: string
  feeRate?: number
  account: Account
  provider: Provider
  signer: Signer
}) => {
  if (!inscriptionAddress) {
    inscriptionAddress = account.taproot.address
  }
  const { fee } = await actualSendFee({
    gatheredUtxos,
    account,
    runeId,
    amount,
    provider,
    toAddress,
    inscriptionAddress,
    feeRate,
    signer,
  })

  const { psbt: finalPsbt } = await createSendPsbt({
    gatheredUtxos,
    account,
    runeId,
    amount,
    provider,
    toAddress,
    inscriptionAddress,
    feeRate,
    fee: fee,
  })

  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: finalPsbt,
    finalize: true,
  })

  const result = await provider.pushPsbt({
    psbtBase64: signedPsbt,
  })

  return result
}

export const mint = async ({
  gatheredUtxos,
  account,
  runeId,
  provider,
  feeRate,
  signer,
}: {
  gatheredUtxos: GatheredUtxos
  account: Account
  runeId: string
  provider: Provider
  feeRate?: number
  signer: Signer
}) => {
  const { fee } = await actualMintFee({
    gatheredUtxos,
    account,
    runeId,
    provider,
    feeRate,
    signer,
  })

  const { psbt: finalPsbt } = await createMintPsbt({
    gatheredUtxos,
    account,
    runeId,
    provider,
    feeRate,
    fee: fee,
  })

  const { signedPsbt } = await signer.signAllInputs({
    rawPsbt: finalPsbt,
    finalize: true,
  })

  const result = await provider.pushPsbt({
    psbtBase64: signedPsbt,
  })

  return result
}

export const etchCommit = async ({
  gatheredUtxos,
  runeName,
  account,
  provider,
  feeRate,
  signer,
}: {
  gatheredUtxos: GatheredUtxos
  runeName: string
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
  const { fee: commitFee } = await actualEtchCommitFee({
    gatheredUtxos,
    taprootKeyPair: signer.taprootKeyPair,
    tweakedTaprootKeyPair,
    runeName,
    account,
    provider,
    feeRate,
    signer,
  })

  const { psbt: finalPsbt, script } = await createEtchCommit({
    gatheredUtxos,
    taprootKeyPair: signer.taprootKeyPair,
    tweakedTaprootKeyPair,
    runeName,
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

export const etchReveal = async ({
  symbol,
  cap,
  premine,
  perMintAmount,
  turbo,
  divisibility,
  commitTxId,
  script,
  runeName,
  account,
  provider,
  feeRate,
  signer,
}: {
  symbol: string
  cap?: bigint
  premine?: bigint
  perMintAmount: bigint
  turbo?: boolean
  divisibility?: number
  commitTxId: string
  script: string
  runeName: string
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

  const { fee } = await actualEtchRevealFee({
    taprootKeyPair: signer.taprootKeyPair,
    tweakedTaprootKeyPair,
    receiverAddress: account.taproot.address,
    commitTxId,
    script: Buffer.from(script, 'hex'),
    symbol,
    cap,
    premine,
    perMintAmount,
    turbo,
    divisibility,
    runeName,
    account,
    provider,
    feeRate,
    signer,
  })

  const { psbt: finalRevealPsbt } = await createEtchReveal({
    taprootKeyPair: signer.taprootKeyPair,
    tweakedTaprootKeyPair,
    receiverAddress: account.taproot.address,
    commitTxId,
    script: Buffer.from(script, 'hex'),
    symbol,
    cap,
    premine,
    perMintAmount,
    turbo,
    divisibility,
    runeName,
    provider,
    feeRate,
    fee,
  })

  const { signedPsbt: revealSignedPsbt } = await signer.signAllInputs({
    rawPsbt: finalRevealPsbt,
    finalize: true,
  })

  const revealResult = await provider.pushPsbt({
    psbtBase64: revealSignedPsbt,
  })

  return revealResult
}
