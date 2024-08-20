import { minimumFee } from '../btc/btc'
import { Provider } from '../provider/provider'
import * as bitcoin from 'bitcoinjs-lib'
import { FormattedUtxo, accountSpendableUtxos } from '../utxo/utxo'
import { Account } from '../account/account'
import {
  createRuneMintScript,
  createRuneSendScript,
  formatInputsToSign,
  inscriptionSats,
} from '../shared/utils'
import { OylTransactionError } from '../errors'
import { RuneUTXO } from '../shared/interface'
import { getAddressType } from '../shared/utils'
import { Signer } from '../signer'

export const createSendPsbt = async ({
  account,
  runeId,
  provider,
  inscriptionAddress = account.taproot.address,
  toAddress,
  amount,
  feeRate,
  fee,
}: {
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

    let gatheredUtxos: {
      totalAmount: number
      utxos: FormattedUtxo[]
    } = await accountSpendableUtxos({
      account,
      provider,
      spendAmount: finalFee + inscriptionSats,
    })

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

    const script = createRuneSendScript({
      runeId,
      amount,
      divisibility,
      sendOutputIndex: 1,
      pointer: 0,
    })
    const output = { script: script, value: 0 }
    psbt.addOutput(output)

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
  account,
  runeId,
  provider,
  amount,
  feeRate,
  fee,
}: {
  account: Account
  runeId: string
  provider: Provider
  amount: number
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

    let gatheredUtxos: {
      totalAmount: number
      utxos: FormattedUtxo[]
    } = await accountSpendableUtxos({
      account,
      provider,
      spendAmount: finalFee + inscriptionSats,
    })

    let psbt = new bitcoin.Psbt({ network: provider.network })

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
      gatheredUtxos.totalAmount - (finalFee + inscriptionSats)

    psbt.addOutput({
      value: inscriptionSats,
      address: account.taproot.address,
    })

    psbt.addOutput({
      address: account[account.spendStrategy.changeAddress].address,
      value: changeAmount,
    })

    const script = createRuneMintScript({
      runeId,
      amountToMint: amount,
      mintOutPutIndex: 0,
      pointer: 0,
    })
    const output = { script: script, value: 0 }
    psbt.addOutput(output)

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
          divisibility = rune.decimals[index];
        }
      }
    } else {
      break
    }
  }

  return { runeUtxos, runeTotalSatoshis, divisibility }
}

export const actualSendFee = async ({
  account,
  runeId,
  provider,
  inscriptionAddress = account.taproot.address,
  toAddress,
  amount,
  feeRate,
  signer,
}: {
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
  account,
  runeId,
  provider,
  amount,
  feeRate,
  signer,
}: {
  account: Account
  runeId: string
  provider: Provider
  amount: number
  feeRate?: number
  signer: Signer
}) => {
  if (!feeRate) {
    feeRate = (await provider.esplora.getFeeEstimates())['1']
  }

  const { psbt } = await createMintPsbt({
    account,
    runeId,
    provider,
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

  const { psbt: finalPsbt } = await createMintPsbt({
    account,
    runeId,
    provider,
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

export const send = async ({
  toAddress,
  amount,
  runeId,
  inscriptionAddress,
  feeRate,
  account,
  provider,
  signer,
}: {
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
  account,
  runeId,
  provider,
  amount,
  feeRate,
  signer,
}: {
  account: Account
  runeId: string
  provider: Provider
  amount: number
  feeRate?: number
  signer: Signer
}) => {
  const { fee } = await actualMintFee({
    account,
    runeId,
    amount,
    provider,
    feeRate,
    signer,
  })

  const { psbt: finalPsbt } = await createMintPsbt({
    account,
    runeId,
    amount,
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
