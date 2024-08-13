import { FormattedUtxo } from "@utxo/utxo";
import { UtxosToCoverAmount } from "shared/interface";
export declare function getUTXOsToCoverAmount({ address, amountNeeded, provider, excludedUtxos, insistConfirmedUtxos }: UtxosToCoverAmount): Promise<FormattedUtxo[]>;
export declare function isExcludedUtxo(utxo: FormattedUtxo, excludedUtxos: FormattedUtxo[]): boolean;
