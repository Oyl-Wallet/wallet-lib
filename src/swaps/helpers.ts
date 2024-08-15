import { FormattedUtxo, addressSpendableUtxos } from '../utxo/utxo';
import { Provider } from "provider";
import { AddressType, BidAffordabilityCheck, BuiltPsbt, ConditionalInput, MarketplaceOffer, Marketplaces, PsbtBuilder, UtxosToCoverAmount, marketplaceName } from "../shared/interface";
import { assertHex, getOutputFormat, getTxSizeByAddressType } from "../shared/utils";
import * as bitcoin from 'bitcoinjs-lib'


export const maxTxSizeForOffers: number = 482
export const CONFIRMED_UTXO_ENFORCED_MARKETPLACES: Marketplaces[] = [Marketplaces.UNISAT]
export const ESTIMATE_TX_SIZE: number = 350
export const DUMMY_UTXO_SATS = 600 + 600



export async function getUTXOsToCoverAmount({
    address,
    amountNeeded,
    provider,
    excludedUtxos = [],
    insistConfirmedUtxos = false
}:
    UtxosToCoverAmount
): Promise<FormattedUtxo[]> {
    try {
        const { utxos } = await addressSpendableUtxos({ address, provider });
        let sum = 0
        const result: FormattedUtxo[] = [];
        for await (let utxo of utxos) {
            if (isExcludedUtxo(utxo, excludedUtxos)) {
                // Check if the UTXO should be excluded
                continue
            }
            if (insistConfirmedUtxos && utxo.confirmations == 0) {
                continue
            }
            const currentUTXO = utxo;
            sum += currentUTXO.satoshis
            result.push(currentUTXO)
            if (sum > amountNeeded) {
                return result
            }
        }
        return [];
    } catch (err) {
        throw new Error(err);
    }
}

export function isExcludedUtxo(utxo: FormattedUtxo, excludedUtxos: FormattedUtxo[]): Boolean {
    return excludedUtxos?.some(
        (excluded) => excluded?.txId === utxo?.txId && excluded?.outputIndex === utxo?.outputIndex
    )
}

export function getAllUTXOsWorthASpecificValue(utxos: FormattedUtxo[], value: number): FormattedUtxo[] {
    return utxos.filter((utxo) => utxo?.satoshis === value)
}

export function addInputConditionally(inputData: ConditionalInput, addressType: AddressType, pubKey: string): ConditionalInput {
    if (addressType === AddressType.P2TR) {
        inputData['tapInternalKey'] = assertHex(Buffer.from(pubKey, 'hex'))
    }
    return inputData;
}

export function getBidCostEstimate(offers: MarketplaceOffer[], feeRate: number): number {
    let costEstimate = 0
    for (let i = 0; i < offers?.length; i++) {
        let offerPrice = offers[i]?.price
            ? offers[i].price
            : offers[i]?.totalPrice
        costEstimate += (offerPrice + parseInt((maxTxSizeForOffers * feeRate).toFixed(0)))
    }
    const totalCost = costEstimate
    return totalCost
}

/**
 * 
 * ONLY INSIST retrieving confirmed utxos IF ALL the offers are from CONFIRMED_UTXO_ENFORCED_MARKETPLACES
 * Otherwise if there is AT LEAST ONE offer from a marketplace that does not enforce confirmed
 * utxos, DONT INSIST retrieving confirmed utxos.
 *  */
export async function canAddressAffordBid({ address, estimatedCost, offers, provider }: BidAffordabilityCheck): Promise<Boolean> {
    let insistConfirmedUtxos: boolean = true;
    const { utxos } = await addressSpendableUtxos({ address, provider });
    for (let i = 0; i < offers.length; i++) {
        const mktPlace = marketplaceName[offers[i]?.marketplace]
        if (!(CONFIRMED_UTXO_ENFORCED_MARKETPLACES.includes(mktPlace))) {
            insistConfirmedUtxos = false;
            break;
        }
    }
    const excludedUtxos = getAllUTXOsWorthASpecificValue(utxos, 600).slice(0, 2)
    const retrievedUtxos: FormattedUtxo[] = await getUTXOsToCoverAmount({
        address,
        amountNeeded: estimatedCost,
        provider,
        excludedUtxos,
        insistConfirmedUtxos
    })
    console.log(retrievedUtxos)
    return retrievedUtxos.length > 0
}

export function calculateAmountGathered(utxoArray: FormattedUtxo[]): number {
    return utxoArray?.reduce(
        (prev, currentValue) => prev + currentValue.satoshis,
        0
    )
}

export async function sanitizeFeeRate(provider: Provider, feeRate: number): Promise<number> {
    if (feeRate < 0 || !Number.isSafeInteger(feeRate)) {
        return (await provider.esplora.getFeeEstimates())['1']
    }
    return feeRate
}


export function psbtTxAddressTypes({
    psbt,
    network
}: {
    psbt: bitcoin.Psbt,
    network: bitcoin.Network
}): {
    inputAddressTypes: AddressType[],
    outputAddressTypes: AddressType[]
} {
    const psbtInputs = psbt.data.inputs
    const psbtOutputs = psbt.txOutputs
    const inputAddressTypes: AddressType[] = []
    const outputAddressTypes: AddressType[] = []

    if (psbtInputs.length === 0 || psbtOutputs.length === 0) {
        throw new Error("PSBT requires at least one input & one output ")
    }

    psbtInputs.forEach((input) => {
        const witnessScript = input.witnessUtxo && input.witnessUtxo.script ? input.witnessUtxo.script : null

        if (!witnessScript) {
            throw new Error("Invalid script")
        }

        inputAddressTypes.push(getOutputFormat(witnessScript, network))
    })

    psbtOutputs.forEach((output) => {
        outputAddressTypes.push(getOutputFormat(output.script, network))
    })

    return {
        inputAddressTypes,
        outputAddressTypes
    }
}


export function estimatePsbtFee({
    psbt,
    network,
    witness = []
}: {
    psbt: bitcoin.Psbt,
    network: bitcoin.Network,
    witness?: Buffer[],
}): number {
    const { inputAddressTypes, outputAddressTypes } = psbtTxAddressTypes({ psbt, network });
    const witnessHeaderSize = 2
    const inputVB = inputAddressTypes.reduce(
        (j, inputType) => {
            const { input, txHeader, witness } = getTxSizeByAddressType(inputType)
            j.txHeader = txHeader
            j.input += input
            j.witness += witness
            return j
        },
        {
            input: 0,
            witness: 0,
            txHeader: 0
        }
    )
    const outputVB = outputAddressTypes.reduce((k, outputType) => {
        const { output } = getTxSizeByAddressType(outputType)
        k += output

        return k
    }, 0)

    let witnessByteLength = 0
    if (inputAddressTypes.includes(AddressType.P2TR) && witness?.length) {
        witnessByteLength = witness.reduce((u, witness) => (u += witness.byteLength), 0)
    }

    const witnessSize = inputVB.witness + (witness?.length ? witnessByteLength : 0)
    const baseTotal = inputVB.input + inputVB.txHeader + outputVB

    let witnessTotal = 0
    if (witness?.length) {
        witnessTotal = witnessSize
    } else if (witnessSize > 0) {
        witnessTotal = witnessHeaderSize + witnessSize
    }

    const sum = baseTotal + witnessTotal
    const weight = (baseTotal * 3) + sum

    return Math.ceil(weight / 4);
}

export async function buildPsbtWithFee(
    {
    inputTemplate = [], 
    outputTemplate = [],
    changeOutput,
    retrievedUtxos = [],
    spendAddress,
    spendPubKey,
    amountRetrieved,
    spendAmount,
    addressType,
    feeRate,
    provider
    }: PsbtBuilder
    ): Promise<BuiltPsbt> {
    const psbtTx = new bitcoin.Psbt({ network: provider.network });
    if (inputTemplate.length === 0 || outputTemplate.length === 0) {
        throw new Error('Cant create a psbt with 0 inputs & outputs')
    } 

    inputTemplate.forEach(input => psbtTx.addInput(input));
    outputTemplate.forEach(output => psbtTx.addOutput(output));
    if (changeOutput != null) psbtTx.addOutput(changeOutput)

    const finalTxSize = estimatePsbtFee({psbt: psbtTx, network: provider.network});
    const finalFee = parseInt((finalTxSize * feeRate).toFixed(0));
    
    let newAmountNeeded = spendAmount + finalFee;
    let changeAmount = amountRetrieved - newAmountNeeded;
   

    if (changeAmount < 0) { 
        const additionalUtxos = await getUTXOsToCoverAmount({
            address: spendAddress,
            amountNeeded: newAmountNeeded,
            excludedUtxos: retrievedUtxos,
            provider
        });

        if (additionalUtxos.length > 0) {
            // Merge new UTXOs with existing ones and create new templates for recursion
             retrievedUtxos = retrievedUtxos.concat(additionalUtxos);
            additionalUtxos.forEach((utxo) => {
                const input = addInputConditionally({
                    hash: utxo.txId,
                    index: utxo.outputIndex,
                    witnessUtxo: {
                        value: utxo.satoshis,
                        script: Buffer.from(utxo.scriptPk, 'hex'),
                    },
                }, addressType, spendPubKey)
                inputTemplate.push(input)
            })

            amountRetrieved = calculateAmountGathered(retrievedUtxos)
            changeAmount = amountRetrieved - newAmountNeeded
            if (changeAmount > 0) changeOutput = {address: spendAddress, value: changeAmount}

            return await buildPsbtWithFee({spendAddress, spendAmount, feeRate, spendPubKey, amountRetrieved, addressType, provider, changeOutput, retrievedUtxos, inputTemplate, outputTemplate});
        } else {
                throw new Error('Insufficient funds: cannot cover transaction fee with available UTXOs')
        }
    } else {
        const finalPsbtTx = new bitcoin.Psbt({ network: provider.network });
        inputTemplate.forEach(input => finalPsbtTx.addInput(input));
        outputTemplate.forEach(output => finalPsbtTx.addOutput(output));
        if (changeOutput != null) finalPsbtTx.addOutput(changeOutput)
        return {
            psbtHex: finalPsbtTx.toHex(),
            psbtBase64: finalPsbtTx.toBase64()
        };
    }
}
    
