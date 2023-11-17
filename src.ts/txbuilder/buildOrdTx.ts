import { PSBTTransaction } from './PSBTTransaction'

export async function buildOrdTx(
  psbtTx: PSBTTransaction,
  segwitUtxos: any[],
  allUtxos: any[],
  segwitAddress: string,
  toAddress: string,
  metaOutputValue: any,
  feeRate: number,
  inscriptionId: string
) {
  const { metaUtxos, nonMetaUtxos } = allUtxos.reduce(
    (acc, utxo) => {
      utxo.inscriptions.length
        ? acc.metaUtxos.push(utxo)
        : acc.nonMetaUtxos.push(utxo)
      return acc
    },
    { metaUtxos: [], nonMetaUtxos: [] }
  )

  const { nonMetaSegwitUtxos } = segwitUtxos.reduce(
    (acc, utxo) => {
      utxo.inscriptions.length > 0
        ? acc.metaUtxos.push(utxo)
        : acc.nonMetaSegwitUtxos.push(utxo)
      return acc
    },
    { metaUtxos: [], nonMetaSegwitUtxos: [] }
  )
  const matchedUtxo = metaUtxos.find((utxo) => {
    return utxo.inscriptions.some(
      (inscription) => inscription.id === inscriptionId
    )
  })
  if (!matchedUtxo || matchedUtxo.inscriptions.length > 1) {
    throw new Error(
      matchedUtxo
        ? 'Multiple inscriptions! Please split first.'
        : 'Inscription not detected.'
    )
  }
  psbtTx.addInput(matchedUtxo)
  nonMetaSegwitUtxos.sort((a, b) => a.satoshis - b.satoshis)
  const vB = psbtTx.getNumberOfInputs() * 149 + 3 * 32 + 12
  const fee = vB * feeRate
  const feeUtxo = nonMetaSegwitUtxos.find((utxo) => {
    return utxo.satoshis - fee > 0 ? utxo : undefined
  })

  if (!feeUtxo) {
    throw new Error('No available UTXOs')
  }

  psbtTx.addInput(feeUtxo, true)
  psbtTx.addOutput(toAddress, matchedUtxo.satoshis)
  psbtTx.addOutput(segwitAddress, feeUtxo.satoshis - fee)
  psbtTx.outputs[0].value = metaOutputValue

  const remainingUnspent = psbtTx.getUnspent()
  if (remainingUnspent <= 0) {
    throw new Error('Not enough balance for the fee')
  }

  const psbt = await psbtTx.createSignedPsbt()

  psbtTx.dumpTx(psbt)

  return psbt
}
