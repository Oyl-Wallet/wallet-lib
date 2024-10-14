import { minimumFee } from '../btc/btc'
import { Provider } from '../provider'
import * as bitcoin from 'bitcoinjs-lib'
import { FormattedUtxo, accountSpendableUtxos } from '../utxo/utxo'
import { Account } from '../account/account'
import { addAnyInput, formatInputsToSign } from '../shared/utils'
import { OylTransactionError } from '../errors'
import { getAddressType } from '../shared/utils'
import { Signer } from '../signer'
import { OrdCollectibleData } from '../shared/interface'

export const createPsbt = async ({
  account,
  inscriptionId,
  provider,
  inscriptionAddress,
  toAddress,
  feeRate,
  fee,
}: {
  account: Account
  inscriptionId: string
  provider: Provider
  inscriptionAddress: string
  toAddress: string
  feeRate?: number
  fee?: number
}) => {
  try {
    const minFee = minimumFee({
      taprootInputCount: 1,
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
      spendAmount: finalFee,
    })

    let psbt = new bitcoin.Psbt({ network: provider.network })
    const { txId, voutIndex, data } = await findCollectible({
      address: inscriptionAddress,
      provider,
      inscriptionId,
    })

    if (getAddressType(inscriptionAddress) === 0) {
      const previousTxHex: string = await provider.esplora.getTxHex(txId)
      psbt.addInput({
        hash: txId,
        index: parseInt(voutIndex),
        nonWitnessUtxo: Buffer.from(previousTxHex, 'hex'),
      })
    }
    if (getAddressType(inscriptionAddress) === 2) {
      const redeemScript = bitcoin.script.compile([
        bitcoin.opcodes.OP_0,
        bitcoin.crypto.hash160(Buffer.from(account.nestedSegwit.pubkey, 'hex')),
      ])

      psbt.addInput({
        hash: txId,
        index: parseInt(voutIndex),
        redeemScript: redeemScript,
        witnessUtxo: {
          value: data.value,
          script: bitcoin.script.compile([
            bitcoin.opcodes.OP_HASH160,
            bitcoin.crypto.hash160(redeemScript),
            bitcoin.opcodes.OP_EQUAL,
          ]),
        },
      })
    }
    if (
      getAddressType(inscriptionAddress) === 1 ||
      getAddressType(inscriptionAddress) === 3
    ) {
      psbt.addInput({
        hash: txId,
        index: parseInt(voutIndex),
        witnessUtxo: {
          script: Buffer.from(data.scriptpubkey, 'hex'),
          value: data.value,
        },
      })
    }

    psbt.addOutput({
      address: toAddress,
      value: data.value,
    })

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
          spendAmount: finalFee,
        })
      }
    }

    for (let i = 0; i < gatheredUtxos.utxos.length; i++) {
      await addAnyInput({
        psbt,
        utxo: gatheredUtxos.utxos[i],
        provider,
        account,
      })
    }

    if (gatheredUtxos.totalAmount < finalFee) {
      throw new OylTransactionError(Error('Insufficient Balance'))
    }

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

    return { psbt: formattedPsbtTx.toBase64() }
  } catch (error) {
    throw new OylTransactionError(error)
  }
}

export const findCollectible = async ({
  address,
  provider,
  inscriptionId,
}: {
  address: string
  provider: Provider
  inscriptionId: string
}) => {
  const collectibleData: OrdCollectibleData =
    await provider.ord.getInscriptionById(inscriptionId)

  if (collectibleData.address !== address) {
    throw new Error('Inscription does not belong to the address given')
  }

  const inscriptionTxId = collectibleData.satpoint.split(':')[0]
  const inscriptionTxVOutIndex = collectibleData.satpoint.split(':')[1]
  const inscriptionUtxoDetails = await provider.esplora.getTxInfo(
    inscriptionTxId
  )
  const inscriptionUtxoData =
    inscriptionUtxoDetails.vout[inscriptionTxVOutIndex]
  const outputId = `${inscriptionTxId}:${inscriptionTxVOutIndex}`
  const [inscriptionsOnOutput, isSpentArray] = await Promise.all([
    provider.ord.getTxOutput(outputId),
    provider.esplora.getTxOutspends(inscriptionTxId),
  ])
  const isSpent = isSpentArray[inscriptionTxVOutIndex]
  if (
    inscriptionsOnOutput.inscriptions.length > 1 ||
    Array.isArray(inscriptionsOnOutput.runes)
      ? Number(inscriptionsOnOutput.runes.length) > 1
      : Object.keys(inscriptionsOnOutput.runes).length > 1
  ) {
    throw new Error(
      'Unable to send from UTXO with multiple inscriptions. Split UTXO before sending.'
    )
  }

  if (isSpent.spent) {
    throw new Error('Inscription is missing')
  }
  return {
    txId: inscriptionTxId,
    voutIndex: inscriptionTxVOutIndex,
    data: inscriptionUtxoData,
  }
}

export const send = async ({
  toAddress,
  inscriptionId,
  inscriptionAddress,
  feeRate,
  account,
  provider,
  signer,
}: {
  toAddress: string
  inscriptionId: string
  inscriptionAddress?: string
  feeRate?: number
  account: Account
  provider: Provider
  signer: Signer
}) => {
  if (!inscriptionAddress) {
    inscriptionAddress = account.taproot.address
  }
  const { fee } = await actualFee({
    account,
    inscriptionId,
    provider,
    inscriptionAddress,
    toAddress,
    feeRate,
    signer,
  })

  const { psbt: finalPsbt } = await createPsbt({
    account,
    inscriptionId,
    provider,
    toAddress,
    inscriptionAddress: inscriptionAddress,
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

export const actualFee = async ({
  account,
  inscriptionId,
  provider,
  inscriptionAddress = account.taproot.address,
  toAddress,
  feeRate,
  signer,
}: {
  account: Account
  inscriptionId: string
  provider: Provider
  inscriptionAddress?: string
  toAddress: string
  feeRate?: number
  signer: Signer
}) => {
  const { psbt } = await createPsbt({
    account,
    inscriptionId,
    provider,
    inscriptionAddress,
    toAddress,
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

  const { psbt: finalPsbt } = await createPsbt({
    account,
    inscriptionId,
    provider,
    inscriptionAddress,
    toAddress,
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
