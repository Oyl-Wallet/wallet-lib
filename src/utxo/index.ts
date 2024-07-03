import * as bitcoin from 'bitcoinjs-lib'
import { Provider } from '../provider/provider'
import { Account, SpendStrategy } from '../account'
import { UTXO_DUST } from '../shared/constants'
import { OylTransactionError } from 'errors'

export interface EsploraUtxo {
  txid: string
  vout: number
  status: {
    confirmed: boolean
    block_height: number
    block_hash: string
    block_time: number
  }
  value: number
}

export interface FormattedUtxo {
  txId: string
  outputIndex: number
  satoshis: number
  scriptPk: string
  address: string
  inscriptions: any[]
  confirmations: number
}

export const availableBalance = async ({
  account,
  provider,
}: {
  account: Account
  provider: Provider
}) => {
  let totalAmount: number = 0
  for (let i = 0; i < account.spendStrategy.addressOrder.length; i++) {
    const address = account[account.spendStrategy.addressOrder[i]].address

    const { totalAmount: addressTotal } = await addressSpendableUtxos({
      address,
      provider,
      spendStrategy: account.spendStrategy,
    })
    totalAmount += addressTotal
  }
  return { balance: totalAmount }
}

export const addressSpendableUtxos = async ({
  address,
  provider,
  spendAmount,
  spendStrategy,
}: {
  address: string
  provider: Provider
  spendAmount?: number
  spendStrategy?: SpendStrategy
}) => {
  let totalAmount: number = 0
  const formattedUtxos: FormattedUtxo[] = []
  const utxos: EsploraUtxo[] = await provider.esplora.getAddressUtxo(address)
  const utxoSortGreatestToLeast =
    spendStrategy?.utxoSortGreatestToLeast !== undefined
      ? spendStrategy.utxoSortGreatestToLeast
      : true
  if (utxoSortGreatestToLeast) {
    utxos.sort((a, b) => b.value - a.value)
  } else {
    utxos.sort((a, b) => a.value - b.value)
  }

  utxos.filter((utxo) => {
    return (
      utxo.value > UTXO_DUST &&
      utxo.value != 546 &&
      utxo.status.confirmed === true
    )
  })

  for (let i = 0; i < utxos.length; i++) {
    if (spendAmount && totalAmount >= spendAmount) {
      return { totalAmount, utxos: formattedUtxos }
    }

    const hasInscription = await provider.ord.getTxOutput(
      utxos[i].txid + ':' + utxos[i].vout
    )
    let hasRune: any = false
    if (provider.network != bitcoin.networks.regtest) {
      hasRune = await provider.api.getOutputRune({
        output: utxos[i].txid + ':' + utxos[i].vout,
      })
    }
    if (
      hasInscription.inscriptions.length === 0 &&
      hasInscription.runes.length === 0 &&
      hasInscription.value !== 546 &&
      !hasRune?.output
    ) {
      const transactionDetails = await provider.esplora.getTxInfo(utxos[i].txid)
      const voutEntry = transactionDetails.vout.find(
        (v) => v.scriptpubkey_address === address
      )
      formattedUtxos.push({
        txId: utxos[i].txid,
        outputIndex: utxos[i].vout,
        satoshis: utxos[i].value,
        confirmations: utxos[i].status.confirmed ? 3 : 0,
        scriptPk: voutEntry.scriptpubkey,
        address: address,
        inscriptions: [],
      })
      totalAmount += utxos[i].value
    }
  }
  return { totalAmount, utxos: formattedUtxos }
}

export const accountSpendableUtxos = async ({
  account,
  provider,
  spendAmount,
}: {
  account: Account
  provider: Provider
  spendAmount?: number
}) => {
  let totalAmount: number = 0
  let allUtxos: FormattedUtxo[] = []
  let remainingSpendAmount = spendAmount
  for (let i = 0; i < account.spendStrategy.addressOrder.length; i++) {
    const address = account[account.spendStrategy.addressOrder[i]].address

    const { totalAmount: addressTotal, utxos: formattedUtxos } =
      await addressSpendableUtxos({
        address,
        provider,
        spendAmount: remainingSpendAmount,
        spendStrategy: account.spendStrategy,
      })
    totalAmount += addressTotal
    allUtxos = [...allUtxos, ...formattedUtxos]
    if (spendAmount && totalAmount >= spendAmount) {
      return { totalAmount, utxos: allUtxos }
    }
    remainingSpendAmount -= addressTotal
  }
  return { totalAmount, utxos: allUtxos }
}
