import { FormattedUtxo, addressSpendableUtxos } from "@utxo/utxo";
import { AddressType, ConditionalInput, UtxosToCoverAmount } from "shared/interface";
import { assertHex } from "shared/utils";

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