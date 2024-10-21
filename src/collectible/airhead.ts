import { minimumFee } from '@btc/btc'
import { Account } from '@account/account'
import { FormattedUtxo, accountSpendableUtxos } from '@utxo/utxo'
import * as bitcoin from 'bitcoinjs-lib'
import { OylTransactionError } from 'errors'
import { Provider } from 'provider'
import { addAnyInput, formatInputsToSign } from 'shared/utils'

export const createPsbt = async ({
  account,
  txId,
  provider,
  vout,
  value,
  oylFee,
  scriptpubkey,
  toAddress,
  feeRate,
  fee,
}: {
  account: Account
  txId: string
  provider: Provider
  vout: number
  value: number
  oylFee: number
  scriptpubkey: string
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
      spendAmount: finalFee + oylFee,
    })

    let psbt = new bitcoin.Psbt({ network: provider.network })

    psbt.addInput({
      hash: txId,
      index: vout,
      witnessUtxo: {
        script: Buffer.from(scriptpubkey, 'hex'),
        value: value,
      },
    })

    psbt.addOutput({
      address: account.taproot.address,
      value: value,
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
          spendAmount: finalFee + oylFee,
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

    const changeAmount = gatheredUtxos.totalAmount - (finalFee + oylFee)

    if (changeAmount >= 546) {
      psbt.addOutput({
        address: account[account.spendStrategy.changeAddress].address,
        value: changeAmount,
      })
    }

    psbt.addOutput({
      address: toAddress,
      value: oylFee,
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
