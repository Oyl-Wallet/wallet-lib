import { FormattedUtxo } from "@utxo/utxo";
import { AddressType, ConditionalInput, UtxosToCoverAmount } from "shared/interface";
export declare function getUTXOsToCoverAmount({ address, amountNeeded, provider, excludedUtxos, insistConfirmedUtxos }: UtxosToCoverAmount): Promise<FormattedUtxo[]>;
export declare function isExcludedUtxo(utxo: FormattedUtxo, excludedUtxos: FormattedUtxo[]): Boolean;
export declare function getAllUTXOsWorthASpecificValue(utxos: FormattedUtxo[], value: number): FormattedUtxo[];
export declare function addInputConditionally(inputData: ConditionalInput, addressType: AddressType, pubKey: string): ConditionalInput;
