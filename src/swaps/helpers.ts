import { FormattedUtxo, addressSpendableUtxos } from "@utxo/utxo";
import { AddressType, BidAffordabilityCheck, ConditionalInput, MarketplaceOffer, Marketplaces, UtxosToCoverAmount, marketplaceName } from "shared/interface";
import { assertHex } from "shared/utils";

export const maxTxSizeForOffers: number = 482
export const CONFIRMED_UTXO_ENFORCED_MARKETPLACES: Marketplaces[] = [Marketplaces.UNISAT]


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
        const { totalAmount, utxos } = await addressSpendableUtxos({ address, provider });
        let sum = 0
        const result: FormattedUtxo[] = [];
        for await (let utxo of utxos) {
            if (isExcludedUtxo(utxo, excludedUtxos)) {
                // Check if the UTXO should be excluded
                continue
            }
            if (insistConfirmedUtxos && utxo.confirmations != 0) {
                continue
            }
            const currentUTXO = utxo;
            sum += currentUTXO.satoshis
            result.push(currentUTXO)
            if (sum > amountNeeded) {
                return result
            }
        }
        return result;
    } catch (err) {
        throw new Error(err);
    }
}

export function isExcludedUtxo(utxo: FormattedUtxo, excludedUtxos: FormattedUtxo[]): Boolean {
    return excludedUtxos.some(
        (excluded) => excluded.txId === utxo.txId && excluded.outputIndex === utxo.outputIndex
    )
}

export function getAllUTXOsWorthASpecificValue(utxos: FormattedUtxo[], value: number): FormattedUtxo[] {
    return utxos.filter((utxo) => utxo.satoshis === value)
}

export function addInputConditionally(inputData: ConditionalInput, addressType: AddressType, pubKey: string): ConditionalInput {
    if (addressType === AddressType.P2TR) {
        inputData['tapInternalKey'] = assertHex(Buffer.from(pubKey, 'hex'))
    }
    return inputData;
}

export function getBidCostEstimate(offers: MarketplaceOffer[], feeRate: number): number {
    let costEstimate = 0
    for (let i = 0; i < offers.length; i++) {
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
export async function canAddressAffordBid({address, estimatedCost, offers, provider}: BidAffordabilityCheck): Promise<Boolean> {
    let insistConfirmedUtxos: boolean = true;
    const { totalAmount, utxos } = await addressSpendableUtxos({ address, provider });
    for(let i = 0; i < offers.length; i++){
        const mktPlace = marketplaceName[offers[i].marketplace]
        if (!(CONFIRMED_UTXO_ENFORCED_MARKETPLACES.includes(mktPlace))){
            insistConfirmedUtxos = false;
            break;
        }
    }
    const excludedUtxos = getAllUTXOsWorthASpecificValue(utxos, 600)
    const retrievedUtxos: FormattedUtxo[] = await getUTXOsToCoverAmount({
      address,
      amountNeeded: estimatedCost,
      provider,
      excludedUtxos,
      insistConfirmedUtxos
    })
    return retrievedUtxos.length > 0
  }