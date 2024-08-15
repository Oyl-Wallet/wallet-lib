import * as bitcoin from 'bitcoinjs-lib'
import { FormattedUtxo, addressSpendableUtxos } from '../utxo/utxo';
import { Signer } from '../signer'
import { Provider } from 'provider'
import { DUMMY_UTXO_SATS, ESTIMATE_TX_SIZE, addInputConditionally, buildPsbtWithFee, calculateAmountGathered, getAllUTXOsWorthASpecificValue, getUTXOsToCoverAmount } from './helpers'
import { AddressType, BuiltPsbt, ConditionalInput, OutputTxTemplate } from 'shared/interface'

interface DummyUtxoOptions {
    address: string
    provider: Provider
    feeRate: number
    pubKey: string
    addressType: AddressType
}

interface PrepareOkxAddress {
    address: string
    provider: Provider
    feeRate: number
    pubKey: string
    addressType: AddressType
    signer: Signer
}


/**
     * 
     * Prepare an address for atomic swaps by creating two fresh 600 satoshi UTXOS
     * for building the 
     */
export async function prepareAddressForOkxPsbt({
    address,
    provider,
    pubKey,
    feeRate,
    addressType,
    signer
}:
    PrepareOkxAddress
): Promise<string[]> {
    try {
        const { utxos } = await addressSpendableUtxos({ address, provider });
        const paddingUtxos = getAllUTXOsWorthASpecificValue(utxos, 600)
        if (paddingUtxos.length < 2) {
            const { psbtBase64 } = await dummyUtxosPsbt({ address, provider, feeRate, pubKey, addressType })
            const signedPsbtPayload = await signer.signAllInputs({
                rawPsbt: psbtBase64,
                finalize: true,
            })
            const result = await provider.sandshrew.bitcoindRpc.finalizePSBT(
                signedPsbtPayload.signedPsbt
            )
            const [broadcast] =
                await provider.sandshrew.bitcoindRpc.testMemPoolAccept([
                    result?.hex,
                ])

            if (!broadcast.allowed) {
                throw new Error(result['reject-reason'])
            }
            await provider.sandshrew.bitcoindRpc.sendRawTransaction(result?.hex)
            const txPayload =
                await provider.sandshrew.bitcoindRpc.decodeRawTransaction(
                    result?.hex
                )
            const txId = txPayload.txid
            return [txId]
        }
        return []
    } catch (err) {
        throw new Error(
            'An error occured while preparing address for okx marketplace'
        )
    }
}

export async function dummyUtxosPsbt({ address, provider, feeRate, pubKey, addressType }: DummyUtxoOptions): Promise<BuiltPsbt> {
    const amountNeeded = (DUMMY_UTXO_SATS + parseInt((ESTIMATE_TX_SIZE * feeRate).toFixed(0)))
    const retrievedUtxos = await getUTXOsToCoverAmount({
        address,
        amountNeeded,
        provider
    })
    if (retrievedUtxos.length === 0) {
        throw new Error('No utxos available')
    }

    const txInputs: ConditionalInput[] = []
    const txOutputs: OutputTxTemplate[] = []

    retrievedUtxos.forEach((utxo) => {
        const input = addInputConditionally({
            hash: utxo.txId,
            index: utxo.outputIndex,
            witnessUtxo: {
                value: utxo.satoshis,
                script: Buffer.from(utxo.scriptPk, 'hex'),
            },
        }, addressType, pubKey)
        txInputs.push(input)
    })

    const amountRetrieved = calculateAmountGathered(retrievedUtxos)
    const changeAmount = amountRetrieved - amountNeeded
    let changeOutput: OutputTxTemplate | null = null
    txOutputs.push({
        address,
        value: 600,
    })
    txOutputs.push({
        address,
        value: 600,
    })
    if (changeAmount > 0) changeOutput = { address, value: changeAmount }

    return await buildPsbtWithFee({
        inputTemplate: txInputs,
        outputTemplate: txOutputs,
        changeOutput,
        retrievedUtxos,
        spendAddress: address,
        spendPubKey: pubKey,
        amountRetrieved,
        spendAmount: DUMMY_UTXO_SATS,
        feeRate,
        provider,
        addressType
    })

}