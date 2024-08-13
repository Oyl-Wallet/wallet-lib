import { FormattedUtxo } from "@utxo/utxo";
import { AddressType, BidAffordabilityCheck, ConditionalInput, MarketplaceOffer, Marketplaces, UtxosToCoverAmount } from "shared/interface";
export declare const maxTxSizeForOffers: number;
export declare const CONFIRMED_UTXO_ENFORCED_MARKETPLACES: Marketplaces[];
export declare function getUTXOsToCoverAmount({ address, amountNeeded, provider, excludedUtxos, insistConfirmedUtxos }: UtxosToCoverAmount): Promise<FormattedUtxo[]>;
export declare function isExcludedUtxo(utxo: FormattedUtxo, excludedUtxos: FormattedUtxo[]): Boolean;
export declare function getAllUTXOsWorthASpecificValue(utxos: FormattedUtxo[], value: number): FormattedUtxo[];
export declare function addInputConditionally(inputData: ConditionalInput, addressType: AddressType, pubKey: string): ConditionalInput;
export declare function getBidCostEstimate(offers: MarketplaceOffer[], feeRate: number): number;
/**
 *
 * ONLY INSIST retrieving confirmed utxos IF ALL the offers are from CONFIRMED_UTXO_ENFORCED_MARKETPLACES
 * Otherwise if there is AT LEAST ONE offer from a marketplace that does not enforce confirmed
 * utxos, DONT INSIST retrieving confirmed utxos.
 *  */
export declare function canAddressAffordBid({ address, estimatedCost, offers, provider }: BidAffordabilityCheck): Promise<Boolean>;
